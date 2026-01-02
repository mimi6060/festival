# ============================================================================
# Festival Platform - AWS Secrets Manager Infrastructure
# ============================================================================
# This module manages all secrets for the Festival Management Platform
# with automatic rotation and zero-downtime updates.
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "festival-terraform-state"
    key            = "secrets/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "festival-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Festival-Platform"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Component   = "Secrets"
    }
  }
}

# ============================================================================
# Variables
# ============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "database_host" {
  description = "Database host"
  type        = string
  sensitive   = true
}

variable "database_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "festival"
}

variable "redis_host" {
  description = "Redis host"
  type        = string
  sensitive   = true
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "stripe_api_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
}

variable "notification_emails" {
  description = "Email addresses for rotation notifications"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# ============================================================================
# Locals
# ============================================================================

locals {
  name_prefix = "festival-${var.environment}"

  # Rotation schedules based on environment
  rotation_schedules = {
    database = var.environment == "prod" ? 30 : 7   # days
    jwt      = var.environment == "prod" ? 90 : 30  # days
    redis    = var.environment == "prod" ? 60 : 14  # days
    api_keys = var.environment == "prod" ? 180 : 60 # days
  }

  # Common tags for secrets
  common_tags = {
    SecurityLevel = "High"
    Compliance    = "PCI-DSS,GDPR"
    RotationType  = "Automatic"
  }
}

# ============================================================================
# KMS Key for Secrets Encryption
# ============================================================================

resource "aws_kms_key" "secrets" {
  description             = "KMS key for Festival Platform secrets encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Secrets Manager"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "Allow Lambda Functions"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.rotation_lambda.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-secrets-kms"
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${local.name_prefix}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# ============================================================================
# Data Sources
# ============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["${local.name_prefix}-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  filter {
    name   = "tag:Type"
    values = ["private"]
  }
}

# ============================================================================
# Outputs
# ============================================================================

output "secrets_kms_key_id" {
  description = "KMS key ID for secrets encryption"
  value       = aws_kms_key.secrets.key_id
}

output "secrets_kms_key_arn" {
  description = "KMS key ARN for secrets encryption"
  value       = aws_kms_key.secrets.arn
}

output "database_secret_arn" {
  description = "Database secret ARN"
  value       = aws_secretsmanager_secret.database.arn
}

output "jwt_secret_arn" {
  description = "JWT secret ARN"
  value       = aws_secretsmanager_secret.jwt.arn
}

output "redis_secret_arn" {
  description = "Redis secret ARN"
  value       = aws_secretsmanager_secret.redis.arn
}

output "stripe_secret_arn" {
  description = "Stripe secret ARN"
  value       = aws_secretsmanager_secret.stripe.arn
}

output "api_keys_secret_arn" {
  description = "API keys secret ARN"
  value       = aws_secretsmanager_secret.api_keys.arn
}

output "rotation_lambda_arn" {
  description = "Rotation Lambda function ARN"
  value       = aws_lambda_function.rotation.arn
}
