locals {
  stack_name = "${var.app_name}-${var.environment}"
  default_tags = merge({
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }, var.tags)

  default_email_sender = "no-reply@${var.app_domain}"

  app_url_input                 = var.app_url == null ? "" : trimspace(var.app_url)
  better_auth_url_input          = var.better_auth_url == null ? "" : trimspace(var.better_auth_url)
  better_auth_trusted_origins_input = var.better_auth_trusted_origins == null ? "" : trimspace(var.better_auth_trusted_origins)

  better_auth_email_sender_input = var.better_auth_email_sender == null ? "" : trimspace(var.better_auth_email_sender)
  ses_source_email_input         = var.ses_source_email == null ? "" : trimspace(var.ses_source_email)
  ses_region_input               = var.ses_region == null ? "" : trimspace(var.ses_region)
  ses_domain_input               = var.ses_domain == null ? "" : trimspace(var.ses_domain)
  ses_mail_from_input            = var.ses_mail_from_domain == null ? "" : trimspace(var.ses_mail_from_domain)
  ses_configuration_set_input    = var.ses_configuration_set == null ? "" : trimspace(var.ses_configuration_set)
  ses_event_topic_input          = var.ses_event_topic_name == null ? "" : trimspace(var.ses_event_topic_name)
  ses_dmarc_rua_input            = var.ses_dmarc_rua_email == null ? "" : trimspace(var.ses_dmarc_rua_email)

  better_auth_email_sender = local.better_auth_email_sender_input != "" ? local.better_auth_email_sender_input : local.default_email_sender
  app_url                 = local.app_url_input != "" ? local.app_url_input : "https://${var.app_domain}"
  better_auth_url          = local.better_auth_url_input != "" ? local.better_auth_url_input : local.app_url
  better_auth_trusted_origins = local.better_auth_trusted_origins_input != "" ? local.better_auth_trusted_origins_input : join(",", distinct(compact([
    local.app_url,
    "http://turnering.vanvikil.no",
  ])))
  ses_source_email         = local.ses_source_email_input != "" ? local.ses_source_email_input : local.better_auth_email_sender
  ses_region               = local.ses_region_input != "" ? local.ses_region_input : var.aws_region
  ses_domain               = local.ses_domain_input != "" ? local.ses_domain_input : var.app_domain
  ses_mail_from_domain     = local.ses_mail_from_input != "" ? local.ses_mail_from_input : "mail.${local.ses_domain}"
  ses_configuration_set_name = local.ses_configuration_set_input != "" ? local.ses_configuration_set_input : (
    var.ses_create_configuration_set ? "${local.stack_name}-ses" : ""
  )
  ses_event_topic_name = local.ses_event_topic_input != "" ? local.ses_event_topic_input : "${local.stack_name}-ses-events"

  dmarc_value = local.ses_dmarc_rua_input != "" ? "v=DMARC1; p=${var.ses_dmarc_policy}; rua=mailto:${local.ses_dmarc_rua_input}" : "v=DMARC1; p=${var.ses_dmarc_policy}"
}
