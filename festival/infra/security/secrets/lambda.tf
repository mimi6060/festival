# ============================================================================
# Festival Platform - Lambda Rotation Functions
# ============================================================================
# This file defines the Lambda infrastructure for automatic secret rotation
# ============================================================================

# ============================================================================
# IAM Role for Lambda Rotation
# ============================================================================

resource "aws_iam_role" "rotation_lambda" {
  name = "${local.name_prefix}-secrets-rotation-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-rotation-lambda-role"
  }
}

resource "aws_iam_role_policy" "rotation_lambda" {
  name = "${local.name_prefix}-secrets-rotation-policy"
  role = aws_iam_role.rotation_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetRandomPassword"
        ]
        Resource = [
          aws_secretsmanager_secret.database.arn,
          aws_secretsmanager_secret.jwt.arn,
          aws_secretsmanager_secret.redis.arn,
          aws_secretsmanager_secret.api_keys.arn
        ]
      },
      {
        Sid    = "KMSAccess"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.secrets.arn
      },
      {
        Sid    = "RDSAccess"
        Effect = "Allow"
        Action = [
          "rds:DescribeDBClusters",
          "rds:DescribeDBInstances",
          "rds:ModifyDBCluster",
          "rds:ModifyDBInstance"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Project" = "Festival-Platform"
          }
        }
      },
      {
        Sid    = "ElastiCacheAccess"
        Effect = "Allow"
        Action = [
          "elasticache:DescribeReplicationGroups",
          "elasticache:ModifyReplicationGroup"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Project" = "Festival-Platform"
          }
        }
      },
      {
        Sid    = "VPCAccess"
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DetachNetworkInterface"
        ]
        Resource = "*"
      },
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.rotation_notifications.arn
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ============================================================================
# Security Group for Lambda (VPC Access)
# ============================================================================

resource "aws_security_group" "rotation_lambda" {
  name        = "${local.name_prefix}-rotation-lambda-sg"
  description = "Security group for secrets rotation Lambda"
  vpc_id      = data.aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  # PostgreSQL access
  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "PostgreSQL access"
  }

  # Redis access
  egress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Redis access"
  }

  tags = {
    Name = "${local.name_prefix}-rotation-lambda-sg"
  }
}

# ============================================================================
# Lambda Function for Secret Rotation
# ============================================================================

data "archive_file" "rotation_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/rotation"
  output_path = "${path.module}/rotation.zip"
}

resource "aws_lambda_function" "rotation" {
  filename         = data.archive_file.rotation_lambda.output_path
  function_name    = "${local.name_prefix}-secrets-rotation"
  role             = aws_iam_role.rotation_lambda.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.rotation_lambda.output_base64sha256
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 256

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [aws_security_group.rotation_lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT        = var.environment
      SNS_TOPIC_ARN      = aws_sns_topic.rotation_notifications.arn
      SLACK_WEBHOOK_URL  = var.slack_webhook_url
      KMS_KEY_ID         = aws_kms_key.secrets.key_id
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name = "${local.name_prefix}-secrets-rotation"
  }
}

resource "aws_lambda_permission" "rotation" {
  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}

# ============================================================================
# CloudWatch Log Group for Lambda
# ============================================================================

resource "aws_cloudwatch_log_group" "rotation_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.rotation.function_name}"
  retention_in_days = var.environment == "prod" ? 90 : 30

  tags = {
    Name = "${local.name_prefix}-rotation-logs"
  }
}

# ============================================================================
# SNS Topic for Rotation Notifications
# ============================================================================

resource "aws_sns_topic" "rotation_notifications" {
  name         = "${local.name_prefix}-secrets-rotation-notifications"
  display_name = "Festival Platform - Secrets Rotation Notifications"

  kms_master_key_id = aws_kms_key.secrets.id

  tags = {
    Name = "${local.name_prefix}-rotation-notifications"
  }
}

resource "aws_sns_topic_policy" "rotation_notifications" {
  arn = aws_sns_topic.rotation_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaPublish"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.rotation_notifications.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = aws_lambda_function.rotation.arn
          }
        }
      },
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.rotation_notifications.arn
      }
    ]
  })
}

# Email subscriptions for notifications
resource "aws_sns_topic_subscription" "email" {
  for_each = toset(var.notification_emails)

  topic_arn = aws_sns_topic.rotation_notifications.arn
  protocol  = "email"
  endpoint  = each.value
}

# ============================================================================
# CloudWatch Alarms for Rotation Monitoring
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "rotation_errors" {
  alarm_name          = "${local.name_prefix}-secrets-rotation-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Secrets rotation Lambda function errors"

  dimensions = {
    FunctionName = aws_lambda_function.rotation.function_name
  }

  alarm_actions = [aws_sns_topic.rotation_notifications.arn]
  ok_actions    = [aws_sns_topic.rotation_notifications.arn]

  tags = {
    Name = "${local.name_prefix}-rotation-errors-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "rotation_duration" {
  alarm_name          = "${local.name_prefix}-secrets-rotation-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 60000  # 60 seconds
  alarm_description   = "Secrets rotation taking too long"

  dimensions = {
    FunctionName = aws_lambda_function.rotation.function_name
  }

  alarm_actions = [aws_sns_topic.rotation_notifications.arn]

  tags = {
    Name = "${local.name_prefix}-rotation-duration-alarm"
  }
}

# ============================================================================
# EventBridge Rules for Scheduled Checks
# ============================================================================

resource "aws_cloudwatch_event_rule" "rotation_check" {
  name                = "${local.name_prefix}-rotation-health-check"
  description         = "Daily check for secrets rotation health"
  schedule_expression = "cron(0 8 * * ? *)"  # Every day at 8 AM UTC

  tags = {
    Name = "${local.name_prefix}-rotation-check"
  }
}

resource "aws_cloudwatch_event_target" "rotation_check" {
  rule      = aws_cloudwatch_event_rule.rotation_check.name
  target_id = "rotation-health-check"
  arn       = aws_lambda_function.rotation.arn

  input = jsonencode({
    action = "health_check"
    secrets = [
      aws_secretsmanager_secret.database.arn,
      aws_secretsmanager_secret.jwt.arn,
      aws_secretsmanager_secret.redis.arn,
      aws_secretsmanager_secret.api_keys.arn
    ]
  })
}

resource "aws_lambda_permission" "rotation_check" {
  statement_id  = "AllowEventBridgeInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.rotation_check.arn
}
