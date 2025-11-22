terraform {
  required_version = ">= 1.13.0"

  cloud {
    organization = "aasan_dev"

    workspaces {
      name = "competitions"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.16"
    }

    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.10"
    }
  }
}
