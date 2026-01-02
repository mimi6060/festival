# =============================================================================
# Festival Management Platform - Terraform Outputs
# =============================================================================
# Output values for AWS infrastructure resources
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "nat_gateway_ips" {
  description = "List of NAT Gateway public IPs"
  value       = module.vpc.nat_gateway_ips
}

# -----------------------------------------------------------------------------
# EKS Outputs
# -----------------------------------------------------------------------------

output "eks_cluster_id" {
  description = "The name/id of the EKS cluster"
  value       = module.eks.cluster_id
}

output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster API server"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data for the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_cluster_oidc_issuer_url" {
  description = "The URL of the OIDC Provider for IRSA"
  value       = module.eks.cluster_oidc_issuer_url
}

output "eks_node_groups" {
  description = "Map of EKS node groups created"
  value       = module.eks.node_groups
}

output "eks_kubeconfig_command" {
  description = "Command to update kubeconfig for kubectl access"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}

# -----------------------------------------------------------------------------
# RDS Outputs
# -----------------------------------------------------------------------------

output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = module.rds.db_endpoint
}

output "rds_instance_id" {
  description = "The RDS instance ID"
  value       = module.rds.db_instance_id
}

output "rds_port" {
  description = "The port the RDS instance is listening on"
  value       = module.rds.db_port
}

output "rds_database_name" {
  description = "The name of the default database"
  value       = module.rds.db_name
}

output "rds_read_replica_endpoints" {
  description = "List of read replica endpoints"
  value       = module.rds.read_replica_endpoints
}

# -----------------------------------------------------------------------------
# ElastiCache Outputs
# -----------------------------------------------------------------------------

output "redis_endpoint" {
  description = "The primary endpoint for Redis"
  value       = module.elasticache.primary_endpoint
}

output "redis_reader_endpoint" {
  description = "The reader endpoint for Redis (cluster mode)"
  value       = module.elasticache.reader_endpoint
}

output "redis_port" {
  description = "The port Redis is listening on"
  value       = module.elasticache.port
}

# -----------------------------------------------------------------------------
# ALB Outputs
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "The zone ID of the Application Load Balancer"
  value       = module.alb.zone_id
}

output "alb_arn" {
  description = "The ARN of the Application Load Balancer"
  value       = module.alb.arn
}

output "alb_target_group_arn" {
  description = "The ARN of the default target group"
  value       = module.alb.target_group_arn
}

# -----------------------------------------------------------------------------
# CloudFront Outputs
# -----------------------------------------------------------------------------

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = module.cloudfront.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID"
  value       = module.cloudfront.hosted_zone_id
}

# -----------------------------------------------------------------------------
# S3 Outputs
# -----------------------------------------------------------------------------

output "s3_assets_bucket" {
  description = "The name of the assets S3 bucket"
  value       = module.s3.assets_bucket_id
}

output "s3_uploads_bucket" {
  description = "The name of the uploads S3 bucket"
  value       = module.s3.uploads_bucket_id
}

output "s3_backups_bucket" {
  description = "The name of the backups S3 bucket"
  value       = module.s3.backups_bucket_id
}

output "s3_logs_bucket" {
  description = "The name of the logs S3 bucket"
  value       = module.s3.logs_bucket_id
}

# -----------------------------------------------------------------------------
# SQS Outputs
# -----------------------------------------------------------------------------

output "sqs_payment_queue_url" {
  description = "The URL of the payment SQS queue"
  value       = aws_sqs_queue.payment_queue.url
}

output "sqs_payment_queue_arn" {
  description = "The ARN of the payment SQS queue"
  value       = aws_sqs_queue.payment_queue.arn
}

output "sqs_notification_queue_url" {
  description = "The URL of the notification SQS queue"
  value       = aws_sqs_queue.notification_queue.url
}

output "sqs_notification_queue_arn" {
  description = "The ARN of the notification SQS queue"
  value       = aws_sqs_queue.notification_queue.arn
}

output "sqs_analytics_queue_url" {
  description = "The URL of the analytics SQS queue"
  value       = aws_sqs_queue.analytics_queue.url
}

# -----------------------------------------------------------------------------
# Secrets Manager Outputs
# -----------------------------------------------------------------------------

output "secrets_db_credentials_arn" {
  description = "The ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secrets_redis_credentials_arn" {
  description = "The ARN of the Redis credentials secret"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "eks_node_role_arn" {
  description = "The ARN of the EKS node IAM role"
  value       = module.iam.eks_node_role_arn
}

output "eks_cluster_role_arn" {
  description = "The ARN of the EKS cluster IAM role"
  value       = module.iam.eks_cluster_role_arn
}

output "cluster_autoscaler_role_arn" {
  description = "The ARN of the Cluster Autoscaler IAM role"
  value       = module.iam.cluster_autoscaler_role_arn
}

# -----------------------------------------------------------------------------
# Monitoring Outputs
# -----------------------------------------------------------------------------

output "sns_alerts_topic_arn" {
  description = "The ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL to the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${local.name_prefix}"
}

# -----------------------------------------------------------------------------
# Scaling Information
# -----------------------------------------------------------------------------

output "scaling_tier_info" {
  description = "Current scaling tier configuration"
  value = {
    tier           = var.scaling_tier
    min_users      = local.current_tier.min_users
    max_users      = local.current_tier.max_users
    eks_min_nodes  = local.current_tier.eks_min_nodes
    eks_max_nodes  = local.current_tier.eks_max_nodes
    rds_instance   = local.current_tier.rds_instance
    redis_nodes    = local.current_tier.redis_num_nodes
  }
}

# -----------------------------------------------------------------------------
# Connection Strings (for application configuration)
# -----------------------------------------------------------------------------

output "database_url" {
  description = "PostgreSQL connection URL (without password)"
  value       = "postgresql://${var.db_username}:PASSWORD@${module.rds.db_endpoint}:5432/festival"
  sensitive   = false
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${module.elasticache.primary_endpoint}:6379"
}

# -----------------------------------------------------------------------------
# Cost Estimation
# -----------------------------------------------------------------------------

output "estimated_monthly_cost" {
  description = "Estimated monthly cost based on scaling tier"
  value = {
    small  = "$2,500 - $4,000"
    medium = "$6,000 - $10,000"
    large  = "$15,000 - $25,000"
    xlarge = "$35,000 - $50,000"
  }[var.scaling_tier]
}
