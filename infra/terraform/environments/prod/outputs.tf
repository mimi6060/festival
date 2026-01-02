# ============================================================================
# Festival Platform - Production Environment Outputs
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.festival.vpc_id
}

output "api_url" {
  description = "API URL"
  value       = module.festival.api_url
}

output "web_url" {
  description = "Web application URL"
  value       = module.festival.web_url
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.festival.rds_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.festival.redis_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.festival.ecs_cluster_name
}

output "eks_cluster_name" {
  description = "EKS cluster name (if enabled)"
  value       = module.festival.eks_cluster_name
}

output "cdn_domain" {
  description = "CloudFront CDN domain"
  value       = module.festival.cdn_domain_name
}

output "waf_acl_arn" {
  description = "WAF ACL ARN"
  value       = module.festival.waf_acl_arn
}

output "backups_bucket" {
  description = "S3 bucket for backups"
  value       = aws_s3_bucket.backups.id
}

output "backup_vault_arn" {
  description = "AWS Backup vault ARN"
  value       = aws_backup_vault.main.arn
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.production.dashboard_name}"
}

output "critical_alerts_topic" {
  description = "SNS topic for critical alerts"
  value       = aws_sns_topic.critical.arn
}

output "warning_alerts_topic" {
  description = "SNS topic for warning alerts"
  value       = aws_sns_topic.warning.arn
}

output "environment" {
  description = "Current environment"
  value       = local.environment
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}
