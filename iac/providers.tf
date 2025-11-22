provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.default_tags
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.default_tags
  }
}

provider "neon" {
  api_key = var.neon_api_key
}
