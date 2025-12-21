locals {
  stack_name = "${var.app_name}-${var.environment}"
  default_tags = merge({
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }, var.tags)

  default_email_sender = "no-reply@${var.app_domain}"

  better_auth_email_sender_input = var.better_auth_email_sender == null ? "" : trimspace(var.better_auth_email_sender)
  ses_source_email_input         = var.ses_source_email == null ? "" : trimspace(var.ses_source_email)
  ses_region_input               = var.ses_region == null ? "" : trimspace(var.ses_region)
  ses_domain_input               = var.ses_domain == null ? "" : trimspace(var.ses_domain)
  ses_mail_from_input            = var.ses_mail_from_domain == null ? "" : trimspace(var.ses_mail_from_domain)

  better_auth_email_sender = local.better_auth_email_sender_input != "" ? local.better_auth_email_sender_input : local.default_email_sender
  ses_source_email         = local.ses_source_email_input != "" ? local.ses_source_email_input : local.better_auth_email_sender
  ses_region               = local.ses_region_input != "" ? local.ses_region_input : var.aws_region
  ses_domain               = local.ses_domain_input != "" ? local.ses_domain_input : var.app_domain
  ses_mail_from_domain     = local.ses_mail_from_input != "" ? local.ses_mail_from_input : "mail.${local.ses_domain}"
}
