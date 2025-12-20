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
  database_url = neon_project.this.connection_uri
}

###########################
# AWS Infrastructure
###########################

data "aws_route53_zone" "zone" {
  name         = var.parent_domain
  private_zone = false
}

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
  for_each = var.ses_enabled ? toset(aws_ses_domain_dkim.app[0].dkim_tokens) : toset([])

  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "${each.value}._domainkey.${local.ses_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${each.value}.dkim.amazonses.com"]
}

resource "aws_ses_mail_from" "app" {
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
  count = var.ses_create_configuration_set && var.ses_configuration_set != null ? 1 : 0
  name  = var.ses_configuration_set
}

module "acm" {
  source    = "terraform-aws-modules/acm/aws"
  version   = "6.1.0"
  providers = { aws = aws.us_east_1 }

  domain_name            = var.app_domain
  validation_method      = "DNS"
  create_route53_records = true
  zone_id                = data.aws_route53_zone.zone.zone_id
  tags                   = local.default_tags
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
      SES_ENABLED                    = tostring(var.ses_enabled)
      SES_REGION                     = local.ses_region
      SES_SOURCE_EMAIL               = local.ses_source_email
      POWERTOOLS_SERVICE_NAME        = lookup(var.lambda_environment, "POWERTOOLS_SERVICE_NAME", var.app_name)
      POWERTOOLS_LOG_LEVEL           = lookup(var.lambda_environment, "POWERTOOLS_LOG_LEVEL", "INFO")
      POWERTOOLS_TRACING_SAMPLE_RATE = lookup(var.lambda_environment, "POWERTOOLS_TRACING_SAMPLE_RATE", "0")
    },
    var.ses_configuration_set != null ? { SES_CONFIGURATION_SET = var.ses_configuration_set } : {}
  )

  create_lambda_function_url        = true
  authorization_type                = "AWS_IAM"
  cloudwatch_logs_retention_in_days = var.lambda_log_retention_days
  tags                              = local.default_tags
}

data "aws_iam_policy_document" "ses_send" {
  count = var.ses_enabled ? 1 : 0

  statement {
    sid       = "AllowSesSend"
    effect    = "Allow"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = ["*"]
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

module "cdn" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "5.0.0"

  aliases         = [var.app_domain]
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
    target_origin_id         = "lambda-url"
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    use_forwarded_values     = false
  }

  ordered_cache_behavior = [
    {
      path_pattern             = "/_next/static/*"
      target_origin_id         = "lambda-url"
      viewer_protocol_policy   = "redirect-to-https"
      compress                 = true
      allowed_methods          = ["GET", "HEAD", "OPTIONS"]
      cached_methods           = ["GET", "HEAD"]
      cache_policy_id          = data.aws_cloudfront_cache_policy.caching_optimized.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
      use_forwarded_values     = false
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

  depends_on = [module.acm]
}

resource "aws_lambda_permission" "allow_cloudfront" {
  statement_id           = "AllowCloudFrontInvokeFunctionURL"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = module.fn.lambda_function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = module.cdn.cloudfront_distribution_arn
  function_url_auth_type = "AWS_IAM"
}

module "dns_records" {
  source  = "terraform-aws-modules/route53/aws"
  version = "6.1.0"

  create       = true
  create_zone  = false
  name         = data.aws_route53_zone.zone.name
  private_zone = false

  records = {
    app_a = {
      full_name       = var.app_domain
      type            = "A"
      allow_overwrite = true
      alias = {
        name                   = module.cdn.cloudfront_distribution_domain_name
        zone_id                = module.cdn.cloudfront_distribution_hosted_zone_id
        evaluate_target_health = false
      }
    }

    app_aaaa = {
      full_name       = var.app_domain
      type            = "AAAA"
      allow_overwrite = true
      alias = {
        name                   = module.cdn.cloudfront_distribution_domain_name
        zone_id                = module.cdn.cloudfront_distribution_hosted_zone_id
        evaluate_target_health = false
      }
    }
  }

  tags = local.default_tags

  depends_on = [module.cdn]
}
