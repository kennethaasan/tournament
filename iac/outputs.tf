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
