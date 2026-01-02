# =============================================================================
# Festival Management Platform - AWS Infrastructure
# =============================================================================
# Terraform configuration for auto-scaling infrastructure supporting 10k-500k users
# Multi-AZ deployment with spot instances, reserved capacity, and burst scaling
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "festival-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "festival-terraform-locks"
  }
}

# =============================================================================
# Providers
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "festival-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "platform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# =============================================================================
# Local Values
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  # Scaling tiers based on user count
  scaling_tiers = {
    small = {
      min_users        = 10000
      max_users        = 50000
      eks_min_nodes    = 3
      eks_max_nodes    = 10
      rds_instance     = "db.r6g.large"
      redis_node_type  = "cache.r6g.large"
      redis_num_nodes  = 2
    }
    medium = {
      min_users        = 50000
      max_users        = 150000
      eks_min_nodes    = 5
      eks_max_nodes    = 25
      rds_instance     = "db.r6g.xlarge"
      redis_node_type  = "cache.r6g.xlarge"
      redis_num_nodes  = 3
    }
    large = {
      min_users        = 150000
      max_users        = 300000
      eks_min_nodes    = 10
      eks_max_nodes    = 50
      rds_instance     = "db.r6g.2xlarge"
      redis_node_type  = "cache.r6g.2xlarge"
      redis_num_nodes  = 4
    }
    xlarge = {
      min_users        = 300000
      max_users        = 500000
      eks_min_nodes    = 20
      eks_max_nodes    = 100
      rds_instance     = "db.r6g.4xlarge"
      redis_node_type  = "cache.r6g.4xlarge"
      redis_num_nodes  = 6
    }
  }

  current_tier = local.scaling_tiers[var.scaling_tier]

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    CostCenter  = "festival-platform"
    Terraform   = "true"
  }
}

# =============================================================================
# VPC Module
# =============================================================================

module "vpc" {
  source = "./modules/vpc"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = local.azs
  enable_nat_gateway  = true
  single_nat_gateway  = var.environment == "dev" ? true : false
  enable_vpn_gateway  = false

  tags = local.common_tags
}

# =============================================================================
# IAM Module
# =============================================================================

module "iam" {
  source = "./modules/iam"

  name_prefix    = local.name_prefix
  eks_cluster_id = module.eks.cluster_id

  tags = local.common_tags
}

# =============================================================================
# EKS Cluster Module
# =============================================================================

module "eks" {
  source = "./modules/eks"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  cluster_version    = var.eks_cluster_version

  # Node group configuration with mixed instances (on-demand + spot)
  node_groups = {
    # Base load - Reserved/On-Demand instances
    base = {
      name           = "base-nodes"
      instance_types = ["m6i.xlarge", "m5.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = local.current_tier.eks_min_nodes
      max_size       = local.current_tier.eks_max_nodes
      desired_size   = local.current_tier.eks_min_nodes
      labels = {
        workload = "base"
        tier     = "reserved"
      }
      taints = []
    }

    # Burst capacity - Spot instances for cost savings
    spot = {
      name           = "spot-nodes"
      instance_types = ["m6i.xlarge", "m5.xlarge", "m5a.xlarge", "m5n.xlarge"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = local.current_tier.eks_max_nodes * 2
      desired_size   = 0
      labels = {
        workload = "burst"
        tier     = "spot"
      }
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }

    # High-priority workloads - Payments, Cashless
    critical = {
      name           = "critical-nodes"
      instance_types = ["m6i.2xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 10
      desired_size   = 2
      labels = {
        workload = "critical"
        tier     = "premium"
      }
      taints = [{
        key    = "critical"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  # Cluster autoscaler configuration
  enable_cluster_autoscaler = true

  # AWS Load Balancer Controller
  enable_aws_lb_controller = true

  # EKS Add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = local.common_tags
}

# =============================================================================
# RDS PostgreSQL Module
# =============================================================================

module "rds" {
  source = "./modules/rds"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  # Database configuration
  engine_version     = "15.4"
  instance_class     = local.current_tier.rds_instance
  allocated_storage  = 100
  max_allocated_storage = 1000

  # High availability
  multi_az                = var.environment != "dev"
  deletion_protection     = var.environment == "prod"
  backup_retention_period = var.environment == "prod" ? 30 : 7

  # Read replicas for scaling reads
  read_replica_count = var.environment == "prod" ? 2 : 0

  # Performance Insights
  performance_insights_enabled = true

  # Security
  allowed_security_groups = [module.eks.cluster_security_group_id]

  database_name = "festival"
  username      = var.db_username

  tags = local.common_tags
}

# =============================================================================
# ElastiCache Redis Module
# =============================================================================

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  # Redis configuration
  node_type           = local.current_tier.redis_node_type
  num_cache_nodes     = local.current_tier.redis_num_nodes
  engine_version      = "7.0"
  parameter_group_family = "redis7"

  # Cluster mode for horizontal scaling
  cluster_mode_enabled = var.environment == "prod"

  # Automatic failover
  automatic_failover_enabled = var.environment != "dev"

  # Security
  allowed_security_groups = [module.eks.cluster_security_group_id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = local.common_tags
}

# =============================================================================
# Application Load Balancer Module
# =============================================================================

module "alb" {
  source = "./modules/alb"

  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids

  # SSL/TLS
  certificate_arn = var.acm_certificate_arn

  # WAF integration
  enable_waf = true

  # Access logs
  enable_access_logs = true
  access_logs_bucket = module.s3.logs_bucket_id

  # Health check
  health_check_path = "/api/health"

  tags = local.common_tags
}

# =============================================================================
# CloudFront CDN Module
# =============================================================================

module "cloudfront" {
  source = "./modules/cloudfront"

  name_prefix = local.name_prefix

  # Origins
  alb_domain_name     = module.alb.dns_name
  s3_assets_bucket    = module.s3.assets_bucket_domain_name
  s3_assets_bucket_id = module.s3.assets_bucket_id

  # SSL
  acm_certificate_arn = var.cloudfront_certificate_arn
  domain_aliases      = var.domain_aliases

  # Caching
  default_ttl = 86400    # 1 day
  max_ttl     = 31536000 # 1 year

  # Price class
  price_class = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"

  # WAF
  web_acl_id = module.alb.waf_web_acl_arn

  tags = local.common_tags
}

# =============================================================================
# S3 Storage Module
# =============================================================================

module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix

  # Buckets to create
  create_assets_bucket  = true
  create_uploads_bucket = true
  create_backups_bucket = true
  create_logs_bucket    = true

  # Lifecycle policies
  enable_lifecycle_rules = true

  # Versioning
  enable_versioning = var.environment == "prod"

  # Encryption
  enable_encryption = true

  # CORS for uploads
  cors_allowed_origins = var.cors_allowed_origins

  tags = local.common_tags
}

# =============================================================================
# SQS Queues for Event-Driven Architecture
# =============================================================================

resource "aws_sqs_queue" "payment_queue" {
  name                       = "${local.name_prefix}-payment-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 300

  # Dead letter queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payment_dlq.arn
    maxReceiveCount     = 3
  })

  tags = local.common_tags
}

resource "aws_sqs_queue" "payment_dlq" {
  name                      = "${local.name_prefix}-payment-dlq"
  message_retention_seconds = 1209600

  tags = local.common_tags
}

resource "aws_sqs_queue" "notification_queue" {
  name                       = "${local.name_prefix}-notification-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 86400 # 1 day
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 60

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 3
  })

  tags = local.common_tags
}

resource "aws_sqs_queue" "notification_dlq" {
  name                      = "${local.name_prefix}-notification-dlq"
  message_retention_seconds = 1209600

  tags = local.common_tags
}

resource "aws_sqs_queue" "analytics_queue" {
  name                       = "${local.name_prefix}-analytics-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 604800 # 7 days
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 120

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Alarms for Auto-Scaling Triggers
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${local.name_prefix}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "This metric monitors EKS cluster CPU utilization"

  dimensions = {
    ClusterName = module.eks.cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "${local.name_prefix}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors EKS cluster memory utilization"

  dimensions = {
    ClusterName = module.eks.cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${local.name_prefix}-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 500
  alarm_description   = "High number of database connections"

  dimensions = {
    DBInstanceIdentifier = module.rds.db_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "sqs_queue_depth" {
  alarm_name          = "${local.name_prefix}-payment-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "High number of messages in payment queue"

  dimensions = {
    QueueName = aws_sqs_queue.payment_queue.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = local.common_tags
}

# =============================================================================
# SNS Topic for Alerts
# =============================================================================

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = length(var.alert_emails)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_emails[count.index]
}

# =============================================================================
# AWS Budget Alerts
# =============================================================================

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name_prefix}-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }
}

# =============================================================================
# Secrets Manager for sensitive data
# =============================================================================

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}/db-credentials"
  description = "Database credentials for Festival Platform"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = module.rds.db_password
    host     = module.rds.db_endpoint
    port     = 5432
    database = "festival"
  })
}

resource "aws_secretsmanager_secret" "redis_credentials" {
  name        = "${local.name_prefix}/redis-credentials"
  description = "Redis credentials for Festival Platform"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host = module.elasticache.primary_endpoint
    port = 6379
  })
}
