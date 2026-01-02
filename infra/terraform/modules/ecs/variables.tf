# ============================================================================
# Festival Platform - ECS Module Variables
# ============================================================================

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

# ============================================================================
# API Service Configuration
# ============================================================================

variable "api_image" {
  description = "Docker image for API service"
  type        = string
}

variable "api_cpu" {
  description = "CPU units for API task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Memory in MB for API task"
  type        = number
  default     = 512
}

variable "api_count" {
  description = "Desired count for API service"
  type        = number
  default     = 1
}

variable "api_url" {
  description = "URL of the API service for frontend configuration"
  type        = string
  default     = ""
}

# ============================================================================
# Web Service Configuration
# ============================================================================

variable "web_image" {
  description = "Docker image for Web service"
  type        = string
}

variable "web_cpu" {
  description = "CPU units for Web task"
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Memory in MB for Web task"
  type        = number
  default     = 512
}

variable "web_count" {
  description = "Desired count for Web service"
  type        = number
  default     = 1
}

# ============================================================================
# Admin Service Configuration
# ============================================================================

variable "admin_image" {
  description = "Docker image for Admin service"
  type        = string
  default     = ""
}

variable "admin_cpu" {
  description = "CPU units for Admin task"
  type        = number
  default     = 256
}

variable "admin_memory" {
  description = "Memory in MB for Admin task"
  type        = number
  default     = 512
}

variable "admin_count" {
  description = "Desired count for Admin service"
  type        = number
  default     = 1
}

# ============================================================================
# Environment Variables
# ============================================================================

variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Redis connection URL"
  type        = string
  sensitive   = true
}

variable "secrets_arn" {
  description = "ARN of the Secrets Manager secret"
  type        = string
}

# ============================================================================
# Auto Scaling
# ============================================================================

variable "enable_autoscaling" {
  description = "Enable auto scaling for ECS services"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 10
}

# ============================================================================
# Load Balancer
# ============================================================================

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "alb_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = ""
}

# ============================================================================
# Logging
# ============================================================================

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_container_insights" {
  description = "Enable Container Insights for the ECS cluster"
  type        = bool
  default     = true
}

# ============================================================================
# Tags
# ============================================================================

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
