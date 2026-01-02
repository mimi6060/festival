# ============================================================================
# Festival Platform - Terraform Variables
# ============================================================================

# ============================================================================
# Project Settings
# ============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "festival"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# ============================================================================
# AWS Settings
# ============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "AZ count must be between 2 and 3."
  }
}

# ============================================================================
# GCP Settings (Optional)
# ============================================================================

variable "gcp_project_id" {
  description = "GCP project ID (optional)"
  type        = string
  default     = ""
}

variable "gcp_region" {
  description = "GCP region (optional)"
  type        = string
  default     = "europe-west1"
}

# ============================================================================
# Networking
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN gateway"
  type        = bool
  default     = false
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC flow logs"
  type        = bool
  default     = true
}

variable "flow_logs_retention_days" {
  description = "Retention period for VPC flow logs"
  type        = number
  default     = 30
}

# ============================================================================
# Database
# ============================================================================

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "festival"
}

variable "database_username" {
  description = "Master username for database"
  type        = string
  default     = "festival_admin"
  sensitive   = true
}

variable "database_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

# ============================================================================
# Redis
# ============================================================================

variable "redis_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

# ============================================================================
# Container Settings
# ============================================================================

variable "api_image" {
  description = "Docker image for API service"
  type        = string
  default     = "festival/api:latest"
}

variable "web_image" {
  description = "Docker image for Web service"
  type        = string
  default     = "festival/web:latest"
}

variable "admin_image" {
  description = "Docker image for Admin service"
  type        = string
  default     = "festival/admin:latest"
}

# ============================================================================
# EKS Settings
# ============================================================================

variable "use_eks" {
  description = "Use EKS instead of ECS"
  type        = bool
  default     = false
}

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.28"
}

# ============================================================================
# CDN Settings
# ============================================================================

variable "enable_cdn" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

# ============================================================================
# WAF Settings
# ============================================================================

variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

# ============================================================================
# DNS Settings
# ============================================================================

variable "domain_name" {
  description = "Main domain name (e.g., festival.example.com)"
  type        = string
  default     = ""
}

# ============================================================================
# Secrets
# ============================================================================

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type        = string
  sensitive   = true
  default     = ""
}

# ============================================================================
# Monitoring
# ============================================================================

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = ""
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}
