locals {
  stack_name = "${var.app_name}-${var.environment}"
  default_tags = merge({
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }, var.tags)

  default_email_sender = "no-reply@${var.app_domain}"

  app_url_input                     = var.app_url == null ? "" : trimspace(var.app_url)
  better_auth_url_input             = var.better_auth_url == null ? "" : trimspace(var.better_auth_url)
  better_auth_trusted_origins_input = var.better_auth_trusted_origins == null ? "" : trimspace(var.better_auth_trusted_origins)

  better_auth_email_sender_input = var.better_auth_email_sender == null ? "" : trimspace(var.better_auth_email_sender)
  ses_source_email_input         = var.ses_source_email == null ? "" : trimspace(var.ses_source_email)

  ses_domain_input            = var.ses_domain == null ? "" : trimspace(var.ses_domain)
  ses_mail_from_input         = var.ses_mail_from_domain == null ? "" : trimspace(var.ses_mail_from_domain)
  ses_configuration_set_input = var.ses_configuration_set == null ? "" : trimspace(var.ses_configuration_set)
  ses_event_topic_input       = var.ses_event_topic_name == null ? "" : trimspace(var.ses_event_topic_name)
  ses_dmarc_rua_input         = var.ses_dmarc_rua_email == null ? "" : trimspace(var.ses_dmarc_rua_email)
  extra_domains_input         = [for domain in var.extra_domains : trimspace(domain)]
  extra_domain_zone_ids_input = {
    for domain, zone_id in var.extra_domain_zone_ids :
    lower(trimspace(domain)) => trimspace(zone_id)
    if trimspace(domain) != "" && trimspace(zone_id) != ""
  }
  app_domain_normalized = lower(var.app_domain)
  managed_validation_zones = merge(
    { (local.app_domain_normalized) = data.aws_route53_zone.zone.zone_id },
    local.extra_domain_zone_ids,
  )
  acm_validation_records_by_domain = {
    for dvo in module.acm.acm_certificate_domain_validation_options :
    lower(dvo.domain_name) => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }

  better_auth_email_sender    = local.better_auth_email_sender_input != "" ? local.better_auth_email_sender_input : local.default_email_sender
  app_url                     = local.app_url_input != "" ? local.app_url_input : "https://${var.app_domain}"
  better_auth_url             = local.better_auth_url_input != "" ? local.better_auth_url_input : local.app_url
  extra_domains               = distinct(compact(local.extra_domains_input))
  extra_domain_zone_ids       = local.extra_domain_zone_ids_input
  extra_trusted_origins       = [for domain in local.extra_domains : "https://${domain}"]
  better_auth_trusted_origins = local.better_auth_trusted_origins_input != "" ? local.better_auth_trusted_origins_input : join(",", distinct(compact(concat([local.app_url], local.extra_trusted_origins))))
  ses_source_email            = local.ses_source_email_input != "" ? local.ses_source_email_input : local.better_auth_email_sender
  ses_region                  = var.aws_region
  ses_domain                  = local.ses_domain_input != "" ? local.ses_domain_input : var.app_domain
  ses_mail_from_domain        = local.ses_mail_from_input != "" ? local.ses_mail_from_input : "mail.${local.ses_domain}"
  ses_configuration_set_name  = local.ses_configuration_set_input != "" ? local.ses_configuration_set_input : "${local.stack_name}-ses"
  ses_event_topic_name        = local.ses_event_topic_input != "" ? local.ses_event_topic_input : "${local.stack_name}-ses-events"

  dmarc_value = local.ses_dmarc_rua_input != "" ? "v=DMARC1; p=${var.ses_dmarc_policy}; rua=mailto:${local.ses_dmarc_rua_input}" : "v=DMARC1; p=${var.ses_dmarc_policy}"
}
