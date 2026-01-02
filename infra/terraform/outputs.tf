# ============================================================================
# Festival Platform - Terraform Outputs
# ============================================================================

# ============================================================================
# VPC Outputs
# ============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "availability_zones" {
  description = "Availability zones used"
  value       = local.azs
}

# ============================================================================
# Database Outputs
# ============================================================================

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "Name of the database"
  value       = module.rds.database_name
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = module.rds.instance_id
}

# ============================================================================
# Redis Outputs
# ============================================================================

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
}

output "redis_port" {
  description = "Redis port"
  value       = module.elasticache.port
}

output "redis_configuration_endpoint" {
  description = "Redis configuration endpoint (for cluster mode)"
  value       = module.elasticache.configuration_endpoint
}

# ============================================================================
# ECS Outputs
# ============================================================================

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.ecs.cluster_arn
}

output "api_service_name" {
  description = "Name of the API ECS service"
  value       = module.ecs.api_service_name
}

output "web_service_name" {
  description = "Name of the Web ECS service"
  value       = module.ecs.web_service_name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.ecs.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.ecs.alb_zone_id
}

# ============================================================================
# EKS Outputs (if enabled)
# ============================================================================

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = var.use_eks ? module.eks[0].cluster_name : null
}

output "eks_cluster_endpoint" {
  description = "Endpoint of the EKS cluster"
  value       = var.use_eks ? module.eks[0].cluster_endpoint : null
}

output "eks_cluster_certificate_authority" {
  description = "Certificate authority data for EKS cluster"
  value       = var.use_eks ? module.eks[0].cluster_certificate_authority_data : null
  sensitive   = true
}

# ============================================================================
# S3 Outputs
# ============================================================================

output "assets_bucket_name" {
  description = "Name of the assets S3 bucket"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "ARN of the assets S3 bucket"
  value       = aws_s3_bucket.assets.arn
}

output "uploads_bucket_name" {
  description = "Name of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.id
}

# ============================================================================
# CDN Outputs
# ============================================================================

output "cdn_domain_name" {
  description = "CloudFront distribution domain name"
  value       = var.enable_cdn ? aws_cloudfront_distribution.cdn[0].domain_name : null
}

output "cdn_distribution_id" {
  description = "CloudFront distribution ID"
  value       = var.enable_cdn ? aws_cloudfront_distribution.cdn[0].id : null
}

# ============================================================================
# DNS Outputs
# ============================================================================

output "api_url" {
  description = "URL for the API"
  value       = var.domain_name != "" ? "https://api.${var.environment != "prod" ? "${var.environment}." : ""}${var.domain_name}" : "https://${module.ecs.alb_dns_name}"
}

output "web_url" {
  description = "URL for the web application"
  value       = var.domain_name != "" ? "https://${var.environment != "prod" ? "${var.environment}." : ""}${var.domain_name}" : "https://${module.ecs.alb_dns_name}"
}

# ============================================================================
# Secrets Outputs
# ============================================================================

output "secrets_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

# ============================================================================
# Monitoring Outputs
# ============================================================================

output "sns_alerts_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

# ============================================================================
# WAF Outputs
# ============================================================================

output "waf_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = var.enable_waf ? aws_wafv2_web_acl.main[0].arn : null
}

# ============================================================================
# Connection Strings (Sensitive)
# ============================================================================

output "database_connection_string" {
  description = "Database connection string"
  value       = module.rds.connection_string
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = module.elasticache.connection_string
  sensitive   = true
}

# ============================================================================
# Environment Info
# ============================================================================

output "environment" {
  description = "Current environment"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}
