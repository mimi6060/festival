# ============================================================================
# Festival Platform - ElastiCache Module Variables
# ============================================================================

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ElastiCache subnet group"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to access Redis"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access Redis"
  type        = list(string)
  default     = []
}

# ============================================================================
# Redis Configuration
# ============================================================================

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "parameter_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"
}

variable "port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes (1 for single, 2+ for cluster with replicas)"
  type        = number
  default     = 1
}

# ============================================================================
# High Availability
# ============================================================================

variable "automatic_failover_enabled" {
  description = "Enable automatic failover (requires num_cache_nodes > 1)"
  type        = bool
  default     = false
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ (requires num_cache_nodes > 1)"
  type        = bool
  default     = false
}

# ============================================================================
# Security
# ============================================================================

variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable encryption in transit (TLS)"
  type        = bool
  default     = true
}

# ============================================================================
# Memory Management
# ============================================================================

variable "maxmemory_policy" {
  description = "Eviction policy when memory is full"
  type        = string
  default     = "volatile-lru"

  validation {
    condition = contains([
      "volatile-lru", "allkeys-lru", "volatile-lfu", "allkeys-lfu",
      "volatile-random", "allkeys-random", "volatile-ttl", "noeviction"
    ], var.maxmemory_policy)
    error_message = "Invalid maxmemory-policy value."
  }
}

variable "enable_aof" {
  description = "Enable Append Only File (AOF) persistence"
  type        = bool
  default     = false
}

variable "connection_timeout" {
  description = "Connection timeout in seconds (0 to disable)"
  type        = string
  default     = "0"
}

variable "slowlog_threshold" {
  description = "Slow log threshold in microseconds"
  type        = string
  default     = "10000"
}

variable "notify_keyspace_events" {
  description = "Keyspace notification events to enable"
  type        = string
  default     = ""
}

# ============================================================================
# Maintenance
# ============================================================================

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

# ============================================================================
# Snapshots
# ============================================================================

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots (0 to disable)"
  type        = number
  default     = 1
}

variable "snapshot_window" {
  description = "Preferred snapshot window"
  type        = string
  default     = "03:00-04:00"
}

# ============================================================================
# Logging
# ============================================================================

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch log delivery"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# ============================================================================
# Alerting
# ============================================================================

variable "notification_topic_arn" {
  description = "SNS topic ARN for ElastiCache notifications"
  type        = string
  default     = null
}

variable "alarm_actions" {
  description = "List of ARNs for alarm actions"
  type        = list(string)
  default     = []
}

# ============================================================================
# Tags
# ============================================================================

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
