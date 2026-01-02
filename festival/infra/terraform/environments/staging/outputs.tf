# ============================================================================
# Festival Platform - Staging Environment Outputs
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
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.festival.redis_endpoint
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.festival.ecs_cluster_name
}

output "cdn_domain" {
  description = "CloudFront CDN domain"
  value       = module.festival.cdn_domain_name
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.staging.dashboard_name}"
}

output "environment" {
  description = "Current environment"
  value       = local.environment
}
