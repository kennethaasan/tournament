output "database_url" {
  value     = local.database_url
  sensitive = true
}

output "cloudfront_domain_name" {
  value = module.cdn.cloudfront_distribution_domain_name
}

output "function_url" {
  description = "Lambda Function URL (returns 403 when accessed directly)"
  value       = module.fn.lambda_function_url
}

output "acm_validation_records" {
  description = "ACM DNS validation records keyed by domain (create these in your DNS provider)."
  value = {
    for dvo in module.acm.acm_certificate_domain_validation_options :
    dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
