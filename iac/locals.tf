locals {
  stack_name = "${var.app_name}-${var.environment}"
  default_tags = merge({
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }, var.tags)
}
