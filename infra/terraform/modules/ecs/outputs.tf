# ============================================================================
# Festival Platform - ECS Module Outputs
# ============================================================================

# Cluster outputs
output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

# Service outputs
output "api_service_name" {
  description = "API ECS service name"
  value       = aws_ecs_service.api.name
}

output "api_service_id" {
  description = "API ECS service ID"
  value       = aws_ecs_service.api.id
}

output "web_service_name" {
  description = "Web ECS service name"
  value       = aws_ecs_service.web.name
}

output "web_service_id" {
  description = "Web ECS service ID"
  value       = aws_ecs_service.web.id
}

output "admin_service_name" {
  description = "Admin ECS service name"
  value       = aws_ecs_service.admin.name
}

output "admin_service_id" {
  description = "Admin ECS service ID"
  value       = aws_ecs_service.admin.id
}

# Task definition outputs
output "api_task_definition_arn" {
  description = "API task definition ARN"
  value       = aws_ecs_task_definition.api.arn
}

output "web_task_definition_arn" {
  description = "Web task definition ARN"
  value       = aws_ecs_task_definition.web.arn
}

output "admin_task_definition_arn" {
  description = "Admin task definition ARN"
  value       = aws_ecs_task_definition.admin.arn
}

# Load Balancer outputs
output "alb_id" {
  description = "Application Load Balancer ID"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer zone ID"
  value       = aws_lb.main.zone_id
}

# Target Group outputs
output "api_target_group_arn" {
  description = "API target group ARN"
  value       = aws_lb_target_group.api.arn
}

output "web_target_group_arn" {
  description = "Web target group ARN"
  value       = aws_lb_target_group.web.arn
}

output "admin_target_group_arn" {
  description = "Admin target group ARN"
  value       = aws_lb_target_group.admin.arn
}

# Security Group outputs
output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ECS tasks security group ID"
  value       = aws_security_group.ecs_tasks.id
}

# IAM outputs
output "task_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

# CloudWatch Log Group outputs
output "api_log_group_name" {
  description = "API CloudWatch log group name"
  value       = aws_cloudwatch_log_group.api.name
}

output "web_log_group_name" {
  description = "Web CloudWatch log group name"
  value       = aws_cloudwatch_log_group.web.name
}

output "admin_log_group_name" {
  description = "Admin CloudWatch log group name"
  value       = aws_cloudwatch_log_group.admin.name
}

# URLs
output "api_url" {
  description = "API URL"
  value       = "https://${aws_lb.main.dns_name}/api"
}

output "web_url" {
  description = "Web application URL"
  value       = "https://${aws_lb.main.dns_name}"
}
