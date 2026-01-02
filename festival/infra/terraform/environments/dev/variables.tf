# ============================================================================
# Festival Platform - Development Environment Variables
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
  default     = "festival/api:dev"
}

variable "web_image" {
  description = "Docker image for Web service"
  type        = string
  default     = "festival/web:dev"
}

variable "admin_image" {
  description = "Docker image for Admin service"
  type        = string
  default     = "festival/admin:dev"
}

variable "domain_name" {
  description = "Domain name (optional for dev)"
  type        = string
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key (use test key for dev)"
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

variable "alert_email" {
  description = "Email for alerts"
  type        = string
  default     = ""
}
