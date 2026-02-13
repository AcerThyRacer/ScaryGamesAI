variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (dev/staging/prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.40.0.0/16"
}

variable "app_port" {
  description = "Container and target group app port"
  type        = number
  default     = 9999
}

variable "app_cpu" {
  description = "Fargate task CPU units"
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "Fargate task memory (MB)"
  type        = number
  default     = 1024
}

variable "app_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "app_image" {
  description = "Container image URI"
  type        = string
}

variable "db_name" {
  description = "RDS database name"
  type        = string
  default     = "scarygamesai"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_admin_username" {
  description = "RDS admin username"
  type        = string
}

variable "db_admin_password" {
  description = "RDS admin password"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t4g.small"
}

variable "database_url_secret_arn" {
  description = "Secrets Manager ARN for DATABASE_URL"
  type        = string
}

variable "redis_url_secret_arn" {
  description = "Secrets Manager ARN for REDIS_URL"
  type        = string
}

variable "jwt_secret_arn" {
  description = "Secrets Manager ARN for JWT_SECRET"
  type        = string
}
