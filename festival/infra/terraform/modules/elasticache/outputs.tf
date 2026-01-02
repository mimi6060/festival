# ============================================================================
# Festival Platform - ElastiCache Module Outputs
# ============================================================================

output "replication_group_id" {
  description = "ElastiCache replication group ID"
  value       = aws_elasticache_replication_group.main.id
}

output "replication_group_arn" {
  description = "ElastiCache replication group ARN"
  value       = aws_elasticache_replication_group.main.arn
}

output "primary_endpoint" {
  description = "Primary endpoint address"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint address (for read replicas)"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "configuration_endpoint" {
  description = "Configuration endpoint (for cluster mode)"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = var.port
}

output "connection_string" {
  description = "Redis connection string"
  value       = var.transit_encryption_enabled ? "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${var.port}" : "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${var.port}"
  sensitive   = true
}

output "auth_token" {
  description = "Redis auth token (if TLS enabled)"
  value       = var.transit_encryption_enabled ? random_password.auth_token.result : null
  sensitive   = true
}

output "security_group_id" {
  description = "Security group ID for the Redis cluster"
  value       = aws_security_group.redis.id
}

output "subnet_group_name" {
  description = "ElastiCache subnet group name"
  value       = aws_elasticache_subnet_group.main.name
}

output "parameter_group_name" {
  description = "ElastiCache parameter group name"
  value       = aws_elasticache_parameter_group.main.name
}

output "member_clusters" {
  description = "List of member cluster IDs"
  value       = aws_elasticache_replication_group.main.member_clusters
}

# Encryption outputs
output "kms_key_id" {
  description = "KMS key ID used for encryption"
  value       = var.at_rest_encryption_enabled ? aws_kms_key.redis[0].key_id : null
}

output "kms_key_arn" {
  description = "KMS key ARN used for encryption"
  value       = var.at_rest_encryption_enabled ? aws_kms_key.redis[0].arn : null
}

# Secrets Manager outputs
output "credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing credentials"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

output "credentials_secret_name" {
  description = "Name of the Secrets Manager secret containing credentials"
  value       = aws_secretsmanager_secret.redis_credentials.name
}

# CloudWatch outputs
output "slowlog_log_group_name" {
  description = "Name of the CloudWatch log group for slow logs"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.redis[0].name : null
}

output "engine_log_group_name" {
  description = "Name of the CloudWatch log group for engine logs"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.redis_engine[0].name : null
}

# Alarm ARNs
output "cpu_alarm_arn" {
  description = "ARN of the CPU utilization alarm"
  value       = aws_cloudwatch_metric_alarm.cpu_utilization.arn
}

output "memory_alarm_arn" {
  description = "ARN of the memory usage alarm"
  value       = aws_cloudwatch_metric_alarm.memory_usage.arn
}

output "evictions_alarm_arn" {
  description = "ARN of the evictions alarm"
  value       = aws_cloudwatch_metric_alarm.evictions.arn
}

output "connections_alarm_arn" {
  description = "ARN of the connections alarm"
  value       = aws_cloudwatch_metric_alarm.current_connections.arn
}
