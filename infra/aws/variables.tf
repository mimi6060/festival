# =============================================================================
# Festival Management Platform - Terraform Variables
# =============================================================================
# Configuration variables for AWS infrastructure
# Supports scaling from 10,000 to 500,000 concurrent users
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Name of the project, used for resource naming"
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

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-west-1"
}

# -----------------------------------------------------------------------------
# Scaling Tier Configuration
# -----------------------------------------------------------------------------

variable "scaling_tier" {
  description = "Scaling tier based on expected user count"
  type        = string
  default     = "small"
  validation {
    condition     = contains(["small", "medium", "large", "xlarge"], var.scaling_tier)
    error_message = "Scaling tier must be one of: small (10k-50k), medium (50k-150k), large (150k-300k), xlarge (300k-500k)."
  }
}

# Scaling tier reference:
# small:  10,000 - 50,000 users   | 3-10 nodes  | db.r6g.large    | ~$2,500/month
# medium: 50,000 - 150,000 users  | 5-25 nodes  | db.r6g.xlarge   | ~$6,000/month
# large:  150,000 - 300,000 users | 10-50 nodes | db.r6g.2xlarge  | ~$15,000/month
# xlarge: 300,000 - 500,000 users | 20-100 nodes| db.r6g.4xlarge  | ~$35,000/month

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# -----------------------------------------------------------------------------
# EKS Configuration
# -----------------------------------------------------------------------------

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS node groups"
  type        = list(string)
  default     = ["m6i.xlarge", "m5.xlarge"]
}

# -----------------------------------------------------------------------------
# Database Configuration
# -----------------------------------------------------------------------------

variable "db_username" {
  description = "Master username for RDS PostgreSQL"
  type        = string
  default     = "festival_admin"
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class (overrides tier default)"
  type        = string
  default     = null
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling in GB"
  type        = number
  default     = 1000
}

# -----------------------------------------------------------------------------
# Redis Configuration
# -----------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type (overrides tier default)"
  type        = string
  default     = null
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes (overrides tier default)"
  type        = number
  default     = null
}

# -----------------------------------------------------------------------------
# SSL/TLS Configuration
# -----------------------------------------------------------------------------

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for ALB HTTPS"
  type        = string
}

variable "cloudfront_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront (must be in us-east-1)"
  type        = string
}

variable "domain_aliases" {
  description = "List of domain aliases for CloudFront"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------

variable "cors_allowed_origins" {
  description = "Allowed origins for CORS on S3 uploads"
  type        = list(string)
  default     = ["*"]
}

# -----------------------------------------------------------------------------
# Monitoring & Alerts
# -----------------------------------------------------------------------------

variable "alert_emails" {
  description = "Email addresses for CloudWatch alarm notifications"
  type        = list(string)
  default     = []
}

variable "monthly_budget_limit" {
  description = "Monthly AWS budget limit in USD"
  type        = string
  default     = "5000"
}

# -----------------------------------------------------------------------------
# Auto-Scaling Thresholds
# -----------------------------------------------------------------------------

variable "autoscaling_config" {
  description = "Auto-scaling configuration thresholds"
  type = object({
    # CPU-based scaling
    cpu_scale_up_threshold   = number
    cpu_scale_down_threshold = number

    # Memory-based scaling
    memory_scale_up_threshold   = number
    memory_scale_down_threshold = number

    # Request-based scaling
    requests_per_second_threshold = number

    # Queue-based scaling (SQS)
    queue_messages_threshold = number

    # Cooldown periods
    scale_up_cooldown   = number
    scale_down_cooldown = number
  })
  default = {
    cpu_scale_up_threshold        = 70
    cpu_scale_down_threshold      = 30
    memory_scale_up_threshold     = 80
    memory_scale_down_threshold   = 40
    requests_per_second_threshold = 1000
    queue_messages_threshold      = 100
    scale_up_cooldown             = 60
    scale_down_cooldown           = 300
  }
}

# -----------------------------------------------------------------------------
# HPA Configuration
# -----------------------------------------------------------------------------

variable "hpa_config" {
  description = "Horizontal Pod Autoscaler configuration"
  type = map(object({
    min_replicas         = number
    max_replicas         = number
    target_cpu_percent   = number
    target_memory_percent = number
  }))
  default = {
    api = {
      min_replicas          = 3
      max_replicas          = 50
      target_cpu_percent    = 70
      target_memory_percent = 80
    }
    web = {
      min_replicas          = 2
      max_replicas          = 20
      target_cpu_percent    = 70
      target_memory_percent = 80
    }
    admin = {
      min_replicas          = 1
      max_replicas          = 5
      target_cpu_percent    = 70
      target_memory_percent = 80
    }
    worker = {
      min_replicas          = 2
      max_replicas          = 30
      target_cpu_percent    = 60
      target_memory_percent = 70
    }
  }
}

# -----------------------------------------------------------------------------
# Spot Instance Configuration
# -----------------------------------------------------------------------------

variable "spot_config" {
  description = "Spot instance configuration for cost optimization"
  type = object({
    enabled                    = bool
    max_spot_percentage        = number
    spot_instance_pools        = number
    on_demand_base_capacity    = number
    on_demand_percentage_above_base = number
  })
  default = {
    enabled                         = true
    max_spot_percentage             = 70
    spot_instance_pools             = 4
    on_demand_base_capacity         = 2
    on_demand_percentage_above_base = 30
  }
}

# -----------------------------------------------------------------------------
# Reserved Capacity Configuration
# -----------------------------------------------------------------------------

variable "reserved_capacity" {
  description = "Reserved capacity for base load"
  type = object({
    enabled             = bool
    commitment_type     = string # "ON_DEMAND" | "SAVINGS_PLAN" | "RESERVED"
    commitment_term     = string # "1yr" | "3yr"
    payment_option      = string # "ALL_UPFRONT" | "PARTIAL_UPFRONT" | "NO_UPFRONT"
  })
  default = {
    enabled         = true
    commitment_type = "SAVINGS_PLAN"
    commitment_term = "1yr"
    payment_option  = "PARTIAL_UPFRONT"
  }
}

# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------

variable "enable_waf" {
  description = "Enable AWS WAF for DDoS protection"
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "enable_read_replicas" {
  description = "Enable read replicas for RDS"
  type        = bool
  default     = false
}

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights for EKS"
  type        = bool
  default     = true
}
