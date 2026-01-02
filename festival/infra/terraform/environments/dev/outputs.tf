# ============================================================================
# Festival Platform - Development Environment Outputs
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

output "test_data_bucket" {
  description = "S3 bucket for test data"
  value       = aws_s3_bucket.dev_data.id
}

output "environment" {
  description = "Current environment"
  value       = local.environment
}
