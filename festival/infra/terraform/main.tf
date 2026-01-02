# ============================================================================
# Festival Platform - Main Terraform Configuration
# ============================================================================
# Multi-cloud infrastructure for the Festival Management Platform
# Supports AWS (primary) with optional GCP components
# ============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Backend configuration - override per environment
  backend "s3" {
    # Configure via backend config file or CLI args
    # bucket         = "festival-terraform-state"
    # key            = "terraform.tfstate"
    # region         = "eu-west-1"
    # encrypt        = true
    # dynamodb_table = "terraform-locks"
  }
}

# ============================================================================
# Provider Configuration
# ============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.common_tags
  }
}

# Optional GCP provider for multi-cloud setup
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# ============================================================================
# Local Variables
# ============================================================================

locals {
  # Naming convention
  name_prefix = "${var.project_name}-${var.environment}"

  # Common tags for all resources
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Team        = "platform"
    CostCenter  = var.cost_center
  }

  # Availability zones
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # Database settings per environment
  db_settings = {
    dev = {
      instance_class    = "db.t3.micro"
      allocated_storage = 20
      multi_az          = false
      backup_retention  = 7
    }
    staging = {
      instance_class    = "db.t3.small"
      allocated_storage = 50
      multi_az          = false
      backup_retention  = 14
    }
    prod = {
      instance_class    = "db.r6g.large"
      allocated_storage = 100
      multi_az          = true
      backup_retention  = 30
    }
  }

  # Redis settings per environment
  redis_settings = {
    dev = {
      node_type       = "cache.t3.micro"
      num_cache_nodes = 1
    }
    staging = {
      node_type       = "cache.t3.small"
      num_cache_nodes = 2
    }
    prod = {
      node_type       = "cache.r6g.large"
      num_cache_nodes = 3
    }
  }

  # ECS settings per environment
  ecs_settings = {
    dev = {
      api_cpu      = 256
      api_memory   = 512
      api_count    = 1
      web_cpu      = 256
      web_memory   = 512
      web_count    = 1
    }
    staging = {
      api_cpu      = 512
      api_memory   = 1024
      api_count    = 2
      web_cpu      = 512
      web_memory   = 1024
      web_count    = 2
    }
    prod = {
      api_cpu      = 1024
      api_memory   = 2048
      api_count    = 4
      web_cpu      = 1024
      web_memory   = 2048
      web_count    = 4
    }
  }
}

# ============================================================================
# Data Sources
# ============================================================================

data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ============================================================================
# VPC Module
# ============================================================================

module "vpc" {
  source = "./modules/vpc"

  name_prefix         = local.name_prefix
  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = local.azs

  enable_nat_gateway  = var.enable_nat_gateway
  single_nat_gateway  = var.environment != "prod"
  enable_vpn_gateway  = var.enable_vpn_gateway

  enable_flow_logs    = var.enable_vpc_flow_logs
  flow_logs_retention = var.flow_logs_retention_days

  tags = local.common_tags
}

# ============================================================================
# RDS PostgreSQL Module
# ============================================================================

module "rds" {
  source = "./modules/rds"

  name_prefix           = local.name_prefix
  environment           = var.environment

  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  allowed_security_groups = [module.ecs.ecs_security_group_id]

  instance_class        = local.db_settings[var.environment].instance_class
  allocated_storage     = local.db_settings[var.environment].allocated_storage
  max_allocated_storage = local.db_settings[var.environment].allocated_storage * 4

  database_name         = var.database_name
  master_username       = var.database_username

  multi_az              = local.db_settings[var.environment].multi_az
  backup_retention_period = local.db_settings[var.environment].backup_retention

  deletion_protection   = var.environment == "prod"
  skip_final_snapshot   = var.environment != "prod"

  enable_performance_insights = var.environment != "dev"

  tags = local.common_tags
}

# ============================================================================
# ElastiCache Redis Module
# ============================================================================

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix         = local.name_prefix
  environment         = var.environment

  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  allowed_security_groups = [module.ecs.ecs_security_group_id]

  node_type           = local.redis_settings[var.environment].node_type
  num_cache_nodes     = local.redis_settings[var.environment].num_cache_nodes

  engine_version      = var.redis_version
  parameter_family    = "redis7"

  automatic_failover_enabled = var.environment == "prod"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = var.environment == "prod" ? 7 : 1

  tags = local.common_tags
}

# ============================================================================
# ECS Cluster Module
# ============================================================================

module "ecs" {
  source = "./modules/ecs"

  name_prefix   = local.name_prefix
  environment   = var.environment

  vpc_id        = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids

  # API Service
  api_image     = var.api_image
  api_cpu       = local.ecs_settings[var.environment].api_cpu
  api_memory    = local.ecs_settings[var.environment].api_memory
  api_count     = local.ecs_settings[var.environment].api_count

  # Web Service
  web_image     = var.web_image
  web_cpu       = local.ecs_settings[var.environment].web_cpu
  web_memory    = local.ecs_settings[var.environment].web_memory
  web_count     = local.ecs_settings[var.environment].web_count

  # Environment variables
  database_url  = module.rds.connection_string
  redis_url     = module.elasticache.connection_string

  # Auto-scaling
  enable_autoscaling = var.environment != "dev"
  min_capacity       = var.environment == "prod" ? 2 : 1
  max_capacity       = var.environment == "prod" ? 20 : 4

  # Logging
  log_retention_days = var.environment == "prod" ? 90 : 30

  # Secrets
  secrets_arn = aws_secretsmanager_secret.app_secrets.arn

  tags = local.common_tags
}

# ============================================================================
# EKS Cluster Module (Alternative to ECS)
# ============================================================================

module "eks" {
  source = "./modules/eks"
  count  = var.use_eks ? 1 : 0

  name_prefix   = local.name_prefix
  environment   = var.environment

  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids

  cluster_version = var.eks_cluster_version

  # Node groups
  node_groups = {
    general = {
      instance_types = var.environment == "prod" ? ["m6i.xlarge"] : ["t3.medium"]
      min_size       = var.environment == "prod" ? 3 : 1
      max_size       = var.environment == "prod" ? 10 : 3
      desired_size   = var.environment == "prod" ? 3 : 2
      disk_size      = 50
    }
  }

  # Add-ons
  enable_cluster_autoscaler = true
  enable_metrics_server     = true
  enable_aws_load_balancer_controller = true

  tags = local.common_tags
}

# ============================================================================
# Secrets Manager
# ============================================================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.name_prefix}/app-secrets"
  description             = "Application secrets for Festival Platform"
  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL     = module.rds.connection_string
    REDIS_URL        = module.elasticache.connection_string
    JWT_SECRET       = random_password.jwt_secret.result
    STRIPE_SECRET_KEY = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET = var.stripe_webhook_secret
  })
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# ============================================================================
# S3 Buckets
# ============================================================================

resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-assets"
  })
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Uploads bucket
resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name_prefix}-uploads"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-uploads"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "cleanup-temp"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }

  rule {
    id     = "archive-old"
    status = "Enabled"

    filter {
      prefix = "archive/"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# ============================================================================
# CloudFront CDN
# ============================================================================

resource "aws_cloudfront_distribution" "cdn" {
  count = var.enable_cdn ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for ${local.name_prefix}"
  default_root_object = "index.html"
  price_class         = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.cdn[0].cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.assets.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

resource "aws_cloudfront_origin_access_identity" "cdn" {
  count   = var.enable_cdn ? 1 : 0
  comment = "OAI for ${local.name_prefix}"
}

# ============================================================================
# Route53 DNS
# ============================================================================

data "aws_route53_zone" "main" {
  count        = var.domain_name != "" ? 1 : 0
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "api" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "api.${var.environment != "prod" ? "${var.environment}." : ""}${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.ecs.alb_dns_name
    zone_id                = module.ecs.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "web" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.environment != "prod" ? "${var.environment}.${var.domain_name}" : var.domain_name
  type    = "A"

  alias {
    name                   = module.ecs.alb_dns_name
    zone_id                = module.ecs.alb_zone_id
    evaluate_target_health = true
  }
}

# ============================================================================
# CloudWatch Alarms
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.name_prefix}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts.arn] : []

  dimensions = {
    ClusterName = module.ecs.cluster_name
    ServiceName = module.ecs.api_service_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${local.name_prefix}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts.arn] : []

  dimensions = {
    ClusterName = module.ecs.cluster_name
    ServiceName = module.ecs.api_service_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "db_connections_high" {
  alarm_name          = "${local.name_prefix}-db-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "High database connections"
  alarm_actions       = var.environment == "prod" ? [aws_sns_topic.alerts.arn] : []

  dimensions = {
    DBInstanceIdentifier = module.rds.instance_id
  }

  tags = local.common_tags
}

# ============================================================================
# SNS Topics for Alerts
# ============================================================================

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============================================================================
# WAF (Web Application Firewall)
# ============================================================================

resource "aws_wafv2_web_acl" "main" {
  count = var.enable_waf ? 1 : 0

  name        = "${local.name_prefix}-waf"
  description = "WAF for Festival Platform"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting
  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "FestivalWAFMetric"
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}
