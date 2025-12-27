###########################
# Neon - PostgreSQL setup
###########################

resource "neon_project" "this" {
  name                      = var.neon_project_name
  region_id                 = var.neon_region
  pg_version                = var.neon_pg_version
  org_id                    = var.neon_organization_id
  history_retention_seconds = var.neon_retention_seconds

  default_endpoint_settings {
    autoscaling_limit_min_cu = 0.25
    autoscaling_limit_max_cu = 1
  }

  branch {
    name          = "main"
    database_name = var.app_name
    role_name     = "app_role"
  }
}

locals {
  database_url_base = neon_project.this.connection_uri_pooler
  database_url      = strcontains(local.database_url_base, "sslmode=") ? local.database_url_base : (strcontains(local.database_url_base, "?") ? "${local.database_url_base}&sslmode=require" : "${local.database_url_base}?sslmode=require")
}

###########################
# AWS Infrastructure
###########################

data "aws_route53_zone" "zone" {
  name         = var.parent_domain
  private_zone = false
}

data "aws_caller_identity" "current" {}

###########################
# Amazon SES (email)
###########################

resource "aws_ses_domain_identity" "app" {
  count  = var.ses_enabled ? 1 : 0
  domain = local.ses_domain
}

resource "aws_route53_record" "ses_verification" {
  count   = var.ses_enabled ? 1 : 0
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "_amazonses.${local.ses_domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.app[0].verification_token]
}

resource "aws_ses_domain_identity_verification" "app" {
  count      = var.ses_enabled ? 1 : 0
  domain     = aws_ses_domain_identity.app[0].domain
  depends_on = [aws_route53_record.ses_verification]
}

resource "aws_ses_domain_dkim" "app" {
  count  = var.ses_enabled ? 1 : 0
  domain = aws_ses_domain_identity.app[0].domain
}

resource "aws_route53_record" "ses_dkim" {
  count = var.ses_enabled ? 3 : 0

  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "${aws_ses_domain_dkim.app[0].dkim_tokens[count.index]}._domainkey.${local.ses_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.app[0].dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "ses_dmarc" {
  count   = var.ses_enabled ? 1 : 0
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "_dmarc.${local.ses_domain}"
  type    = "TXT"
  ttl     = 600
  records = [local.dmarc_value]
}

resource "aws_ses_domain_mail_from" "app" {
  count                  = var.ses_enabled ? 1 : 0
  domain                 = aws_ses_domain_identity.app[0].domain
  mail_from_domain       = local.ses_mail_from_domain
  behavior_on_mx_failure = "UseDefaultValue"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  count   = var.ses_enabled ? 1 : 0
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = local.ses_mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${local.ses_region}.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_txt" {
  count   = var.ses_enabled ? 1 : 0
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = local.ses_mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

resource "aws_ses_configuration_set" "app" {
  count = var.ses_enabled && local.ses_configuration_set_name != "" ? 1 : 0
  name  = local.ses_configuration_set_name

  delivery_options {
    tls_policy = "Require"
  }
}

###########################
# Lambda Dead Letter Queue
###########################

resource "aws_sqs_queue" "lambda_dlq" {
  count = var.enable_lambda_reliability ? 1 : 0

  name                       = "${local.stack_name}-lambda-dlq"
  message_retention_seconds  = 1209600 # 14 days (maximum)
  visibility_timeout_seconds = 300
  tags                       = local.default_tags
}

module "acm" {
  source    = "terraform-aws-modules/acm/aws"
  version   = "6.1.0"
  providers = { aws = aws.us_east_1 }

  domain_name               = var.app_domain
  subject_alternative_names = local.extra_domains
  validation_method         = "DNS"
  create_route53_records    = false
  validate_certificate      = false
  zone_id                   = data.aws_route53_zone.zone.zone_id
  tags                      = local.default_tags
}

resource "aws_route53_record" "acm_validation" {
  for_each = local.managed_validation_zones

  allow_overwrite = true
  zone_id         = each.value
  name            = local.acm_validation_records_by_domain[each.key].name
  type            = local.acm_validation_records_by_domain[each.key].type
  ttl             = 60
  records         = [local.acm_validation_records_by_domain[each.key].value]
}

resource "aws_acm_certificate_validation" "app" {
  provider        = aws.us_east_1
  certificate_arn = module.acm.acm_certificate_arn
  validation_record_fqdns = [
    for dvo in module.acm.acm_certificate_domain_validation_options :
    dvo.resource_record_name
  ]
  depends_on = [aws_route53_record.acm_validation]
}

module "fn" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "8.1.0"

  function_name = local.stack_name
  description   = "Next.js on Lambda via AWS Lambda Web Adapter"
  runtime       = var.lambda_runtime
  handler       = var.lambda_handler
  architectures = [var.lambda_architecture]
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  publish       = true

  # Reliability: reserved concurrency (-1 = unreserved, avoids account concurrency limit issues)
  # Note: Setting a value > 0 requires sufficient account-level concurrency quota
  reserved_concurrent_executions = var.enable_lambda_reliability ? var.lambda_reserved_concurrency : null

  # Reliability: Dead Letter Queue for failed invocations (SQS free tier: 1M requests/month)
  dead_letter_target_arn = var.enable_lambda_reliability ? aws_sqs_queue.lambda_dlq[0].arn : null

  # Observability: X-Ray tracing (free tier: 100K traces/month)
  tracing_mode = var.enable_lambda_reliability ? "Active" : "PassThrough"

  # use pre-built artifact supplied by CI
  create_package         = false
  local_existing_package = var.package_path
  layers                 = compact([var.lwa_layer_arn])

  environment_variables = merge(
    var.lambda_environment,
    {
      AWS_LAMBDA_EXEC_WRAPPER        = "/opt/bootstrap"
      AWS_LWA_ASYNC_INIT             = "true"
      AWS_LWA_ENABLE_COMPRESSION     = "true"
      NODE_ENV                       = "production"
      PORT                           = "3000"
      DATABASE_URL                   = local.database_url
      BETTER_AUTH_SECRET             = var.better_auth_secret
      BETTER_AUTH_EMAIL_SENDER       = local.better_auth_email_sender
      BETTER_AUTH_URL                = local.better_auth_url
      BETTER_AUTH_TRUSTED_ORIGINS    = local.better_auth_trusted_origins
      NEXT_PUBLIC_APP_URL            = local.app_url
      SES_ENABLED                    = tostring(var.ses_enabled)
      SES_REGION                     = local.ses_region
      SES_SOURCE_EMAIL               = local.ses_source_email
      POWERTOOLS_SERVICE_NAME        = lookup(var.lambda_environment, "POWERTOOLS_SERVICE_NAME", var.app_name)
      POWERTOOLS_LOG_LEVEL           = lookup(var.lambda_environment, "POWERTOOLS_LOG_LEVEL", "INFO")
      POWERTOOLS_METRICS_NAMESPACE   = lookup(var.lambda_environment, "POWERTOOLS_METRICS_NAMESPACE", var.app_name)
      POWERTOOLS_TRACING_SAMPLE_RATE = var.lambda_xray_sample_rate
    },
    local.ses_configuration_set_name != "" ? { SES_CONFIGURATION_SET = local.ses_configuration_set_name } : {}
  )

  create_lambda_function_url        = true
  authorization_type                = "AWS_IAM"
  cloudwatch_logs_retention_in_days = var.lambda_log_retention_days
  tags                              = local.default_tags

  attach_policy_statements = var.enable_lambda_reliability
  policy_statements = var.enable_lambda_reliability ? {
    xray = {
      effect    = "Allow"
      actions   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords"]
      resources = ["*"]
    }
    dlq = {
      effect    = "Allow"
      actions   = ["sqs:SendMessage"]
      resources = [aws_sqs_queue.lambda_dlq[0].arn]
    }
  } : {}
}

data "aws_iam_policy_document" "ses_send" {
  count = var.ses_enabled ? 1 : 0

  statement {
    sid       = "AllowSesSend"
    effect    = "Allow"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = [aws_ses_domain_identity.app[0].arn]
  }
}

resource "aws_iam_policy" "ses_send" {
  count  = var.ses_enabled ? 1 : 0
  name   = "${local.stack_name}-ses-send"
  policy = data.aws_iam_policy_document.ses_send[0].json
  tags   = local.default_tags
}

resource "aws_iam_role_policy_attachment" "ses_send" {
  count      = var.ses_enabled ? 1 : 0
  role       = module.fn.lambda_role_name
  policy_arn = aws_iam_policy.ses_send[0].arn
}

resource "aws_sns_topic" "ses_events" {
  count = var.ses_enabled && local.ses_configuration_set_name != "" ? 1 : 0
  name  = local.ses_event_topic_name
  # Note: Do NOT use KMS encryption for SES event topics.
  # AWS-managed keys (alias/aws/sns) don't allow SES to publish messages.
  # Customer-managed keys require additional KMS policy configuration.
  # https://repost.aws/knowledge-center/encrypted-sns-topic-receives-no-notification
  tags = local.default_tags
}

data "aws_iam_policy_document" "ses_events" {
  count = var.ses_enabled && local.ses_configuration_set_name != "" ? 1 : 0

  statement {
    sid    = "AllowSesPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.ses_events[0].arn]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "ses_events" {
  count  = var.ses_enabled && local.ses_configuration_set_name != "" ? 1 : 0
  arn    = aws_sns_topic.ses_events[0].arn
  policy = data.aws_iam_policy_document.ses_events[0].json
}

resource "aws_ses_event_destination" "ses_events" {
  count                  = var.ses_enabled && local.ses_configuration_set_name != "" ? 1 : 0
  name                   = "ses-events"
  configuration_set_name = aws_ses_configuration_set.app[0].name
  enabled                = true
  matching_types         = ["bounce", "complaint", "delivery"]
  depends_on             = [aws_sns_topic_policy.ses_events]

  sns_destination {
    topic_arn = aws_sns_topic.ses_events[0].arn
  }
}

locals {
  lambda_origin_domain = replace(replace(module.fn.lambda_function_url, "https://", ""), "/", "")
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

module "cdn" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "5.0.0"

  aliases         = distinct(compact(concat([var.app_domain], local.extra_domains)))
  enabled         = true
  is_ipv6_enabled = true
  price_class     = var.cloudfront_price_class

  create_origin_access_control = true
  origin_access_control = {
    lambda = {
      name             = "${local.stack_name}-lambda"
      description      = "Lambda origin access control"
      origin_type      = "lambda"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  origin = {
    lambda = {
      domain_name           = local.lambda_origin_domain
      origin_id             = "lambda-url"
      origin_access_control = "lambda"
      custom_origin_config = {
        http_port              = 443
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior = {
    target_origin_id           = "lambda-url"
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
    use_forwarded_values       = false
  }

  ordered_cache_behavior = [
    {
      path_pattern               = "/_next/static/*"
      target_origin_id           = "lambda-url"
      viewer_protocol_policy     = "redirect-to-https"
      compress                   = true
      allowed_methods            = ["GET", "HEAD", "OPTIONS"]
      cached_methods             = ["GET", "HEAD"]
      cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
      origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
      response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
      use_forwarded_values       = false
    }
  ]

  geo_restriction = {
    restriction_type = "none"
  }

  viewer_certificate = {
    acm_certificate_arn      = module.acm.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.default_tags

  depends_on = [module.acm, aws_acm_certificate_validation.app]
}

resource "aws_lambda_permission" "allow_cloudfront" {
  statement_id           = "AllowCloudFrontInvokeFunctionURL"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = module.fn.lambda_function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = module.cdn.cloudfront_distribution_arn
  function_url_auth_type = "AWS_IAM"
}

resource "aws_route53_record" "app_a" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = var.app_domain
  type    = "A"

  alias {
    name                   = module.cdn.cloudfront_distribution_domain_name
    zone_id                = module.cdn.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_aaaa" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = var.app_domain
  type    = "AAAA"

  alias {
    name                   = module.cdn.cloudfront_distribution_domain_name
    zone_id                = module.cdn.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

###########################
# CloudWatch Alarms (Free Tier: up to 10 alarms)
###########################

locals {
  alarms_topic_arn          = length(aws_sns_topic.alarms) > 0 ? aws_sns_topic.alarms[0].arn : null
  alarms_topic_arn_us_east1 = length(aws_sns_topic.alarms_us_east1) > 0 ? aws_sns_topic.alarms_us_east1[0].arn : null
}

resource "aws_sns_topic" "alarms" {
  count = var.enable_lambda_alarms ? 1 : 0

  name              = "${local.stack_name}-alarms"
  kms_master_key_id = "alias/aws/sns" # AWS-managed key (free tier)
  tags              = local.default_tags
}

resource "aws_sns_topic" "alarms_us_east1" {
  count    = var.enable_lambda_alarms ? 1 : 0
  provider = aws.us_east_1

  name              = "${local.stack_name}-alarms"
  kms_master_key_id = "alias/aws/sns" # AWS-managed key (free tier)
  tags              = local.default_tags
}

# Alarm 1: Lambda errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count = var.enable_lambda_alarms ? 1 : 0

  alarm_name          = "${local.stack_name}-lambda-errors"
  alarm_description   = "Lambda function errors exceeded threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarms_topic_arn == null ? [] : [local.alarms_topic_arn]
  ok_actions          = local.alarms_topic_arn == null ? [] : [local.alarms_topic_arn]

  dimensions = {
    FunctionName = module.fn.lambda_function_name
  }

  tags = local.default_tags
}

# Alarm 2: Lambda throttles
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  count = var.enable_lambda_alarms ? 1 : 0

  alarm_name          = "${local.stack_name}-lambda-throttles"
  alarm_description   = "Lambda function throttles detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarms_topic_arn == null ? [] : [local.alarms_topic_arn]
  ok_actions          = local.alarms_topic_arn == null ? [] : [local.alarms_topic_arn]

  dimensions = {
    FunctionName = module.fn.lambda_function_name
  }

  tags = local.default_tags
}

# Alarm 3: Lambda duration (approaching timeout)
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  count = var.enable_lambda_alarms ? 1 : 0

  alarm_name          = "${local.stack_name}-lambda-duration"
  alarm_description   = "Lambda function duration approaching timeout"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p95"
  threshold           = var.lambda_timeout * 1000 * 0.8 # 80% of timeout in ms
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarms_topic_arn == null ? [] : [local.alarms_topic_arn]

  dimensions = {
    FunctionName = module.fn.lambda_function_name
  }

  tags = local.default_tags
}

# Alarm 4: DLQ messages (failed Lambda invocations)
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  count = var.enable_lambda_alarms && var.enable_lambda_reliability ? 1 : 0

  alarm_name          = "${local.stack_name}-dlq-messages"
  alarm_description   = "Messages in Dead Letter Queue indicate failed invocations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarms_topic_arn == null ? [] : [local.alarms_topic_arn]
  ok_actions          = local.alarms_topic_arn == null ? [] : [local.alarms_topic_arn]

  dimensions = {
    QueueName = aws_sqs_queue.lambda_dlq[0].name
  }

  tags = local.default_tags
}

# Alarm 5: CloudFront 5xx errors
resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx" {
  count = var.enable_lambda_alarms ? 1 : 0

  provider = aws.us_east_1 # CloudFront metrics are only in us-east-1

  alarm_name          = "${local.stack_name}-cloudfront-5xx"
  alarm_description   = "CloudFront 5xx error rate exceeded threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5 # 5% error rate
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarms_topic_arn_us_east1 == null ? [] : [local.alarms_topic_arn_us_east1]
  ok_actions          = local.alarms_topic_arn_us_east1 == null ? [] : [local.alarms_topic_arn_us_east1]

  dimensions = {
    DistributionId = module.cdn.cloudfront_distribution_id
    Region         = "Global"
  }

  tags = local.default_tags
}

# Alarm 6: CloudFront 4xx errors (client errors, may indicate attacks)
resource "aws_cloudwatch_metric_alarm" "cloudfront_4xx" {
  count = var.enable_lambda_alarms ? 1 : 0

  provider = aws.us_east_1 # CloudFront metrics are only in us-east-1

  alarm_name          = "${local.stack_name}-cloudfront-4xx"
  alarm_description   = "CloudFront 4xx error rate exceeded threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 15 # 15% error rate
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarms_topic_arn_us_east1 == null ? [] : [local.alarms_topic_arn_us_east1]

  dimensions = {
    DistributionId = module.cdn.cloudfront_distribution_id
    Region         = "Global"
  }

  tags = local.default_tags
}
