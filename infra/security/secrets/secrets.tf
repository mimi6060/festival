# ============================================================================
# Festival Platform - Secrets Definitions
# ============================================================================
# This file defines all secrets managed by AWS Secrets Manager
# ============================================================================

# ============================================================================
# Database Secret (PostgreSQL)
# ============================================================================

resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
  min_lower        = 4
  min_upper        = 4
  min_numeric      = 4
  min_special      = 2
}

resource "aws_secretsmanager_secret" "database" {
  name        = "${local.name_prefix}/database"
  description = "PostgreSQL database credentials for Festival Platform"
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name           = "${local.name_prefix}-database-secret"
    SecretType     = "DatabaseCredentials"
    RotationPeriod = "${local.rotation_schedules.database}d"
  })
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    engine             = "postgres"
    host               = var.database_host
    port               = var.database_port
    dbname             = var.database_name
    username           = "festival_app"
    password           = random_password.database.result
    dbClusterIdentifier = "${local.name_prefix}-db-cluster"
    # Connection URL for application
    connection_url     = "postgresql://festival_app:${random_password.database.result}@${var.database_host}:${var.database_port}/${var.database_name}?sslmode=require"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = local.rotation_schedules.database
    schedule_expression      = "rate(${local.rotation_schedules.database} days)"
  }

  depends_on = [aws_lambda_permission.rotation]
}

# ============================================================================
# JWT Secret
# ============================================================================

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt" {
  name        = "${local.name_prefix}/jwt"
  description = "JWT signing secrets for Festival Platform authentication"
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name           = "${local.name_prefix}-jwt-secret"
    SecretType     = "JWTSecret"
    RotationPeriod = "${local.rotation_schedules.jwt}d"
  })
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    secret                  = random_password.jwt_secret.result
    refresh_secret          = random_password.jwt_refresh_secret.result
    algorithm               = "HS256"
    access_token_expiry     = "15m"
    refresh_token_expiry    = "7d"
    # Previous secrets for graceful rotation (accept old tokens during transition)
    previous_secret         = ""
    previous_refresh_secret = ""
    rotation_timestamp      = timestamp()
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret_rotation" "jwt" {
  secret_id           = aws_secretsmanager_secret.jwt.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = local.rotation_schedules.jwt
    schedule_expression      = "rate(${local.rotation_schedules.jwt} days)"
  }

  depends_on = [aws_lambda_permission.rotation]
}

# ============================================================================
# Redis Secret
# ============================================================================

resource "random_password" "redis" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+"
}

resource "aws_secretsmanager_secret" "redis" {
  name        = "${local.name_prefix}/redis"
  description = "Redis credentials for Festival Platform caching"
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name           = "${local.name_prefix}-redis-secret"
    SecretType     = "RedisCredentials"
    RotationPeriod = "${local.rotation_schedules.redis}d"
  })
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    host           = var.redis_host
    port           = var.redis_port
    password       = random_password.redis.result
    tls_enabled    = true
    connection_url = "rediss://:${random_password.redis.result}@${var.redis_host}:${var.redis_port}"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret_rotation" "redis" {
  secret_id           = aws_secretsmanager_secret.redis.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = local.rotation_schedules.redis
    schedule_expression      = "rate(${local.rotation_schedules.redis} days)"
  }

  depends_on = [aws_lambda_permission.rotation]
}

# ============================================================================
# Stripe Secret (Manual Rotation)
# ============================================================================

resource "aws_secretsmanager_secret" "stripe" {
  name        = "${local.name_prefix}/stripe"
  description = "Stripe API credentials for Festival Platform payments"
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name           = "${local.name_prefix}-stripe-secret"
    SecretType     = "PaymentCredentials"
    RotationType   = "Manual"
    Compliance     = "PCI-DSS"
  })
}

resource "aws_secretsmanager_secret_version" "stripe" {
  secret_id = aws_secretsmanager_secret.stripe.id
  secret_string = jsonencode({
    secret_key             = var.stripe_api_key
    publishable_key        = ""  # Set manually
    webhook_secret         = ""  # Set manually
    webhook_secret_connect = ""  # Set manually for Connect
    api_version            = "2023-10-16"
    environment            = var.environment == "prod" ? "live" : "test"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# No automatic rotation for Stripe - requires manual intervention

# ============================================================================
# External API Keys
# ============================================================================

resource "random_password" "internal_api_key" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "api_keys" {
  name        = "${local.name_prefix}/api-keys"
  description = "External API keys for Festival Platform integrations"
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name           = "${local.name_prefix}-api-keys-secret"
    SecretType     = "APIKeys"
    RotationPeriod = "${local.rotation_schedules.api_keys}d"
  })
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    # Internal service API key (auto-rotated)
    internal_api_key = random_password.internal_api_key.result

    # Firebase (manual rotation)
    firebase_server_key = ""
    firebase_project_id = ""

    # SendGrid (manual rotation)
    sendgrid_api_key = ""

    # Sentry (manual rotation)
    sentry_dsn = ""

    # Mapbox (manual rotation)
    mapbox_access_token = ""

    # S3/CloudFront signing
    cloudfront_key_pair_id = ""
    cloudfront_private_key = ""

    # Encryption keys for sensitive data
    data_encryption_key = ""

    # Previous key for graceful rotation
    previous_internal_api_key = ""
    rotation_timestamp        = timestamp()
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret_rotation" "api_keys" {
  secret_id           = aws_secretsmanager_secret.api_keys.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = local.rotation_schedules.api_keys
    schedule_expression      = "rate(${local.rotation_schedules.api_keys} days)"
  }

  depends_on = [aws_lambda_permission.rotation]
}

# ============================================================================
# Application Secrets Bundle (Combined for easier access)
# ============================================================================

resource "aws_secretsmanager_secret" "app_bundle" {
  name        = "${local.name_prefix}/app-bundle"
  description = "Combined application secrets bundle for Festival Platform"
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(local.common_tags, {
    Name       = "${local.name_prefix}-app-bundle-secret"
    SecretType = "ApplicationBundle"
  })
}

resource "aws_secretsmanager_secret_version" "app_bundle" {
  secret_id = aws_secretsmanager_secret.app_bundle.id
  secret_string = jsonencode({
    # References to individual secrets (resolved at runtime)
    database_secret_arn = aws_secretsmanager_secret.database.arn
    jwt_secret_arn      = aws_secretsmanager_secret.jwt.arn
    redis_secret_arn    = aws_secretsmanager_secret.redis.arn
    stripe_secret_arn   = aws_secretsmanager_secret.stripe.arn
    api_keys_secret_arn = aws_secretsmanager_secret.api_keys.arn

    # Environment info
    environment = var.environment
    region      = var.aws_region

    # Feature flags
    enable_secret_rotation = true
    secret_cache_ttl       = 300  # seconds
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
