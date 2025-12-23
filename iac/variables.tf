variable "environment" {
  description = "Deployment environment identifier"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Application name used for tagging"
  type        = string
  default     = "competitions"
}

variable "aws_region" {
  description = "AWS region to deploy Lambda and supporting services"
  type        = string
  default     = "eu-north-1"
}

variable "parent_domain" {
  description = "Base Route53 hosted zone domain name"
  type        = string
  default     = "aws.aasan.dev"
}

variable "app_domain" {
  description = "Fully qualified domain name for the application"
  type        = string
  default     = "competitions.aws.aasan.dev"
}

variable "app_url" {
  description = "Public base URL for the application (defaults to https://app_domain)"
  type        = string
  default     = null

  validation {
    condition     = var.app_url == null || trimspace(var.app_url) == "" || can(regex("^https?://", var.app_url))
    error_message = "app_url must be a valid http(s) URL when provided."
  }
}

variable "neon_api_key" {
  description = "Neon API key used by the Terraform provider"
  type        = string
  sensitive   = true
}

variable "neon_project_name" {
  description = "Name for the Neon project"
  type        = string
  default     = "competitions"
}

variable "neon_region" {
  description = "Neon region identifier close to Norway"
  type        = string
  default     = "aws-eu-central-1"
}

variable "neon_pg_version" {
  description = "PostgreSQL version for Neon"
  type        = number
  default     = 17
}

variable "neon_organization_id" {
  description = "Neon organization ID"
  type        = string
}

variable "neon_retention_seconds" {
  description = "Point-in-time backup retention in seconds (free tier maximum is 6 hours (21600 seconds))"
  type        = number
  default     = 21600
}

variable "lambda_runtime" {
  description = "Runtime for the Lambda function"
  type        = string
  default     = "nodejs22.x"
}

variable "lambda_handler" {
  description = "Handler for the Lambda function"
  type        = string
  default     = "run.sh"
}

variable "lambda_memory_size" {
  description = "Memory size for the Lambda function"
  type        = number
  default     = 1024
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_architecture" {
  description = "Lambda architecture"
  type        = string
  default     = "arm64"
}

variable "lambda_log_retention_days" {
  description = "CloudWatch log retention in days for the Lambda function"
  type        = number
  default     = 14
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrent executions for Lambda (prevents runaway scaling)"
  type        = number
  default     = 50
}

variable "lambda_xray_sample_rate" {
  description = "X-Ray tracing sample rate (0-1, e.g., 0.05 = 5%)"
  type        = string
  default     = "0.05"
}

variable "lambda_environment" {
  description = "Base environment variables for the Lambda function"
  type        = map(string)
  default = {
    NODE_ENV                       = "production"
    POWERTOOLS_LOG_LEVEL           = "INFO"
    POWERTOOLS_TRACING_SAMPLE_RATE = "0"
    POWERTOOLS_SERVICE_NAME        = "competitions"
  }
}

variable "better_auth_email_sender" {
  description = "From-address for Better Auth emails (defaults to no-reply@app_domain)"
  type        = string
  default     = null

  validation {
    condition = var.better_auth_email_sender == null || trimspace(var.better_auth_email_sender) == "" || (
      can(regex("^[^@]+@[^@]+$", var.better_auth_email_sender)) &&
      endswith(
        lower(var.better_auth_email_sender),
        lower(coalesce(var.ses_domain, var.app_domain)),
      )
    )
    error_message = "better_auth_email_sender must be an email address under ses_domain (or app_domain when ses_domain is unset)."
  }
}

variable "ses_source_email" {
  description = "From-address for SES invitations (defaults to better_auth_email_sender)"
  type        = string
  default     = null

  validation {
    condition = var.ses_source_email == null || trimspace(var.ses_source_email) == "" || (
      can(regex("^[^@]+@[^@]+$", var.ses_source_email)) &&
      endswith(
        lower(var.ses_source_email),
        lower(coalesce(var.ses_domain, var.app_domain)),
      )
    )
    error_message = "ses_source_email must be an email address under ses_domain (or app_domain when ses_domain is unset)."
  }
}

variable "ses_enabled" {
  description = "Toggle invitation emails via SES"
  type        = bool
  default     = true
}

variable "ses_region" {
  description = "SES region (defaults to aws_region)"
  type        = string
  default     = null

  validation {
    condition     = var.ses_region == null || trimspace(var.ses_region) == "" || var.ses_region == var.aws_region
    error_message = "ses_region must match aws_region when set. SES should run in the same region as Lambda."
  }
}

variable "ses_configuration_set" {
  description = "Optional SES configuration set name"
  type        = string
  default     = null
}

variable "ses_create_configuration_set" {
  description = "Create the SES configuration set if ses_configuration_set is provided"
  type        = bool
  default     = true
}

variable "ses_domain" {
  description = "Domain to verify with SES (defaults to app_domain)"
  type        = string
  default     = null

  validation {
    condition     = var.ses_domain == null || trimspace(var.ses_domain) == "" || endswith(lower(var.ses_domain), lower(var.parent_domain))
    error_message = "ses_domain must be within the parent_domain Route53 zone."
  }
}

variable "ses_mail_from_domain" {
  description = "MAIL FROM domain (defaults to mail.<ses_domain>)"
  type        = string
  default     = null

  validation {
    condition = var.ses_mail_from_domain == null || trimspace(var.ses_mail_from_domain) == "" || endswith(
      lower(var.ses_mail_from_domain),
      lower(coalesce(var.ses_domain, var.app_domain)),
    )
    error_message = "ses_mail_from_domain must be within ses_domain (or app_domain when ses_domain is unset)."
  }
}

variable "ses_event_topic_name" {
  description = "SNS topic name for SES event notifications"
  type        = string
  default     = null
}

variable "ses_dmarc_policy" {
  description = "DMARC policy for the SES domain"
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "quarantine", "reject"], var.ses_dmarc_policy)
    error_message = "ses_dmarc_policy must be one of: none, quarantine, reject."
  }
}

variable "ses_dmarc_rua_email" {
  description = "Optional DMARC aggregate report email (rua)"
  type        = string
  default     = null
}

variable "package_path" {
  description = "Path to the packaged Lambda ZIP archive"
  type        = string
  default     = "./build/function.zip"
}

variable "lwa_layer_arn" {
  description = "AWS Lambda Web Adapter Layer ARN"
  type        = string
  default     = "arn:aws:lambda:eu-north-1:753240598075:layer:LambdaAdapterLayerArm64:25"
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "tags" {
  description = "Additional resource tags"
  type        = map(string)
  default     = {}
}

variable "better_auth_secret" {
  description = "BetterAuth secret used for authentication"
  type        = string
  sensitive   = true
}

variable "better_auth_url" {
  description = "Explicit Better Auth base URL (defaults to app_url)"
  type        = string
  default     = null

  validation {
    condition     = var.better_auth_url == null || trimspace(var.better_auth_url) == "" || can(regex("^https?://", var.better_auth_url))
    error_message = "better_auth_url must be a valid http(s) URL when provided."
  }
}

variable "better_auth_trusted_origins" {
  description = "Comma-separated list of trusted origins for Better Auth (defaults to app_url plus http://turnering.vanvikil.no)"
  type        = string
  default     = null
}
