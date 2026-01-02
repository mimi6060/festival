# ============================================================================
# Festival Platform - ElastiCache Redis Module
# ============================================================================
# Creates a Redis cluster with encryption, authentication, and high
# availability for caching and session management.
# ============================================================================

# ============================================================================
# Random Password for Redis Auth
# ============================================================================

resource "random_password" "auth_token" {
  length           = 64
  special          = false
  override_special = ""
}

# ============================================================================
# Security Group
# ============================================================================

resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-sg"
  })
}

resource "aws_security_group_rule" "redis_ingress" {
  count = length(var.allowed_security_groups)

  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  source_security_group_id = var.allowed_security_groups[count.index]
  security_group_id        = aws_security_group.redis.id
  description              = "Redis access from allowed security groups"
}

resource "aws_security_group_rule" "redis_ingress_cidr" {
  count = length(var.allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = var.port
  to_port           = var.port
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks
  security_group_id = aws_security_group.redis.id
  description       = "Redis access from allowed CIDR blocks"
}

# ============================================================================
# Subnet Group
# ============================================================================

resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.name_prefix}-redis-subnet-group"
  description = "ElastiCache subnet group for ${var.name_prefix}"
  subnet_ids  = var.subnet_ids

  tags = var.tags
}

# ============================================================================
# Parameter Group
# ============================================================================

resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.name_prefix}-redis-params"
  family      = var.parameter_family
  description = "Custom parameter group for ${var.name_prefix}"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  # Persistence settings
  parameter {
    name  = "appendonly"
    value = var.enable_aof ? "yes" : "no"
  }

  # Connection settings
  parameter {
    name  = "timeout"
    value = var.connection_timeout
  }

  # Slow log settings
  parameter {
    name  = "slowlog-log-slower-than"
    value = var.slowlog_threshold
  }

  parameter {
    name  = "slowlog-max-len"
    value = "128"
  }

  # Notification settings
  parameter {
    name  = "notify-keyspace-events"
    value = var.notify_keyspace_events
  }

  tags = var.tags

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# KMS Key for Encryption
# ============================================================================

resource "aws_kms_key" "redis" {
  count = var.at_rest_encryption_enabled ? 1 : 0

  description             = "KMS key for ElastiCache encryption - ${var.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ElastiCache to use the key"
        Effect = "Allow"
        Principal = {
          Service = "elasticache.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-key"
  })
}

resource "aws_kms_alias" "redis" {
  count = var.at_rest_encryption_enabled ? 1 : 0

  name          = "alias/${var.name_prefix}-redis"
  target_key_id = aws_kms_key.redis[0].key_id
}

# ============================================================================
# ElastiCache Replication Group (Redis Cluster)
# ============================================================================

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "Redis cluster for ${var.name_prefix}"

  # Engine configuration
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = var.port

  # Cluster configuration
  num_cache_clusters         = var.num_cache_nodes
  automatic_failover_enabled = var.automatic_failover_enabled && var.num_cache_nodes > 1
  multi_az_enabled           = var.multi_az_enabled && var.num_cache_nodes > 1

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Security
  at_rest_encryption_enabled = var.at_rest_encryption_enabled
  transit_encryption_enabled = var.transit_encryption_enabled
  auth_token                 = var.transit_encryption_enabled ? random_password.auth_token.result : null
  kms_key_id                 = var.at_rest_encryption_enabled ? aws_kms_key.redis[0].arn : null

  # Maintenance
  maintenance_window       = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Snapshots
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window
  final_snapshot_identifier = var.environment == "prod" ? "${var.name_prefix}-redis-final-snapshot" : null

  # Notifications
  notification_topic_arn = var.notification_topic_arn

  # Logs
  dynamic "log_delivery_configuration" {
    for_each = var.enable_cloudwatch_logs ? [1] : []
    content {
      destination      = aws_cloudwatch_log_group.redis[0].name
      destination_type = "cloudwatch-logs"
      log_format       = "json"
      log_type         = "slow-log"
    }
  }

  dynamic "log_delivery_configuration" {
    for_each = var.enable_cloudwatch_logs ? [1] : []
    content {
      destination      = aws_cloudwatch_log_group.redis_engine[0].name
      destination_type = "cloudwatch-logs"
      log_format       = "json"
      log_type         = "engine-log"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })

  lifecycle {
    ignore_changes = [
      engine_version,
    ]
  }
}

# ============================================================================
# CloudWatch Log Groups
# ============================================================================

resource "aws_cloudwatch_log_group" "redis" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/aws/elasticache/${var.name_prefix}/slow-log"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "redis_engine" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/aws/elasticache/${var.name_prefix}/engine-log"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ============================================================================
# CloudWatch Alarms
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${var.name_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "Redis CPU utilization is too high"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.member_clusters[0]
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_usage" {
  alarm_name          = "${var.name_prefix}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Redis memory usage is too high"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.member_clusters[0]
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "evictions" {
  alarm_name          = "${var.name_prefix}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "Redis is evicting keys due to memory pressure"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.member_clusters[0]
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "current_connections" {
  alarm_name          = "${var.name_prefix}-redis-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000"
  alarm_description   = "Redis connection count is high"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.member_clusters[0]
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  count = var.num_cache_nodes > 1 ? 1 : 0

  alarm_name          = "${var.name_prefix}-redis-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "Redis replication lag is high"
  alarm_actions       = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main.member_clusters[1]
  }

  tags = var.tags
}

# ============================================================================
# Secrets Manager for Connection String
# ============================================================================

resource "aws_secretsmanager_secret" "redis_credentials" {
  name                    = "${var.name_prefix}/redis/credentials"
  description             = "Redis credentials for ${var.name_prefix}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host           = aws_elasticache_replication_group.main.primary_endpoint_address
    port           = var.port
    auth_token     = var.transit_encryption_enabled ? random_password.auth_token.result : null
    tls_enabled    = var.transit_encryption_enabled
    connection_url = var.transit_encryption_enabled ? "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${var.port}" : "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:${var.port}"
  })
}

# ============================================================================
# Data Sources
# ============================================================================

data "aws_caller_identity" "current" {}
