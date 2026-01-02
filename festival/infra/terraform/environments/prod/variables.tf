# ============================================================================
# Festival Platform - Production Environment Variables
# ============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  default     = "festival_admin"
  sensitive   = true
}

variable "api_image" {
  description = "Docker image for API service"
  type        = string
}

variable "web_image" {
  description = "Docker image for Web service"
  type        = string
}

variable "admin_image" {
  description = "Docker image for Admin service"
  type        = string
}

variable "domain_name" {
  description = "Production domain name"
  type        = string
}

variable "stripe_secret_key" {
  description = "Stripe live secret key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type        = string
  sensitive   = true
}

variable "alert_email" {
  description = "Email for alerts"
  type        = string
}

variable "pagerduty_endpoint" {
  description = "PagerDuty integration endpoint for critical alerts"
  type        = string
  default     = ""
}

variable "enable_vpn" {
  description = "Enable VPN gateway for secure access"
  type        = bool
  default     = false
}

variable "use_eks" {
  description = "Use EKS instead of ECS"
  type        = bool
  default     = false
}

variable "eks_cluster_version" {
  description = "EKS cluster version (if using EKS)"
  type        = string
  default     = "1.28"
}

variable "monthly_budget_limit" {
  description = "Monthly AWS budget limit in USD"
  type        = string
  default     = "5000"
}
