# Variable declarations for sensitive values
variable "sendgrid_api_key" {
  description = "SendGrid API Key for email notifications"
  type        = string
  sensitive   = true
}

variable "aws_access_key_id" {
  description = "AWS Access Key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "jwt_secret_key" {
  description = "JWT Secret Key for authentication"
  type        = string
  sensitive   = true
}

provider "aws" {
  region = "us-east-2"
}

### 🚀 VPC Setup
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "aolf-gsec-prod-vpc"
  }
}

### 📌 Public Subnets (For Load Balancer)
resource "aws_subnet" "public_subnet_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone = "us-east-2a"
  tags = {
    Name = "aolf-gsec-prod-public-subnet-1"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  map_public_ip_on_launch = true
  availability_zone = "us-east-2b"
  tags = {
    Name = "aolf-gsec-prod-public-subnet-2"
  }
}

# Adding a third public subnet for better EB compatibility
resource "aws_subnet" "public_subnet_3" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.5.0/24"
  map_public_ip_on_launch = true
  availability_zone = "us-east-2c"
  tags = {
    Name = "aolf-gsec-prod-public-subnet-3"
  }
}

### 📌 Private Subnets (For EBS Backend & RDS)
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  map_public_ip_on_launch = false
  availability_zone = "us-east-2a"
  tags = {
    Name = "aolf-gsec-prod-private-subnet-1"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  map_public_ip_on_launch = false
  availability_zone = "us-east-2b"
  tags = {
    Name = "aolf-gsec-prod-private-subnet-2"
  }
}

# Adding a third private subnet for better EB compatibility
resource "aws_subnet" "private_subnet_3" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.6.0/24"
  map_public_ip_on_launch = false
  availability_zone = "us-east-2c"
  tags = {
    Name = "aolf-gsec-prod-private-subnet-3"
  }
}

### 📌 Internet Gateway (For Public Access)
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "aolf-gsec-prod-igw"
  }
}

### 📌 Route Table for Public Subnets
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "aolf-gsec-prod-public-route-table"
  }
}

resource "aws_route" "public_route" {
  route_table_id         = aws_route_table.public_rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.gw.id
}

resource "aws_route_table_association" "public_assoc_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_assoc_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_assoc_3" {
  subnet_id      = aws_subnet.public_subnet_3.id
  route_table_id = aws_route_table.public_rt.id
}

### 📌 NAT Gateway for Private Subnet Internet Access
resource "aws_eip" "nat_eip" {
  domain = "vpc"
  tags = {
    Name = "aolf-gsec-prod-nat-eip"
  }
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet_1.id
  tags = {
    Name = "aolf-gsec-prod-nat-gateway"
  }
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "aolf-gsec-prod-private-route-table"
  }
}

resource "aws_route" "private_nat_route" {
  route_table_id         = aws_route_table.private_rt.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat.id
}

resource "aws_route_table_association" "private_assoc_1" {
  subnet_id      = aws_subnet.private_subnet_1.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_assoc_2" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_assoc_3" {
  subnet_id      = aws_subnet.private_subnet_3.id
  route_table_id = aws_route_table.private_rt.id
}

### 🚀 Security Groups
### 📌 Security Group for Load Balancer (Allows HTTPS Access Only)
resource "aws_security_group" "lb_sg" {
  name        = "aolf-gsec-prod-lb-sg"
  description = "Security group for load balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "aolf-gsec-prod-lb-sg"
  }
}

### 📌 Security Group for Backend (Only Allows Load Balancer)
resource "aws_security_group" "backend_sg" {
  name        = "aolf-gsec-prod-backend-sg"
  description = "Security group for Elastic Beanstalk backend"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.lb_sg.id]
    description     = "Allow traffic from load balancer"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "aolf-gsec-prod-backend-sg"
  }
}

### 📌 Security Group for RDS (Only Allows Backend)
resource "aws_security_group" "rds_sg" {
  name        = "aolf-gsec-prod-rds-sg"
  description = "Security group for Aurora PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend_sg.id]
    description     = "Allow PostgreSQL traffic from backend"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "aolf-gsec-prod-rds-sg"
  }
}

# S3 bucket to store application bundles
resource "aws_s3_bucket" "app_bucket" {
  bucket = "aolf-gsec-prod-app-bucket"  # choose a unique bucket name
}

# Compute hash of the ZIP file to detect changes and trigger replacement
resource "terraform_data" "app_package_hash" {
  input = filebase64sha256("../backend/deployment/aolf-gsec-backend.zip")
}

# Upload the FastAPI application package (ZIP file) to S3
resource "aws_s3_object" "app_package" {
  bucket = aws_s3_bucket.app_bucket.id
  key    = "aolf-gsec-backend.zip"             # the S3 object key (file name in bucket)
  source = "../backend/deployment/aolf-gsec-backend.zip"     # path to your local ZIP package
  etag   = filemd5("../backend/deployment/aolf-gsec-backend.zip")  # Forces update when file content changes
  
  # Alternative approach using lifecycle
  lifecycle {
    replace_triggered_by = [
      # This will force replacement of the S3 object when the content hash changes
      terraform_data.app_package_hash
    ]
  }
}

### 🚀 Elastic Beanstalk with High Availability
resource "aws_elastic_beanstalk_application" "backend_app" {
  name        = "aolf-gsec-prod-backend"
  description = "FastAPI Backend"
}

# Elastic Beanstalk Application Version linking to the S3 package
resource "aws_elastic_beanstalk_application_version" "app_version" {
  name             = "v7.31 (increased usher view range and fixed usher access grant bug)"
  application      = aws_elastic_beanstalk_application.backend_app.name
  description      = "FastAPI Backend"
  bucket           = aws_s3_bucket.app_bucket.id
  key              = aws_s3_object.app_package.id
}

# Create application database user password
resource "random_password" "app_db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Add application database user credentials to Secrets Manager
resource "aws_secretsmanager_secret" "app_db_credentials" {
  name        = "aolf-gsec-prod-db-app-credentials"
  description = "Aurora PostgreSQL application database user credentials"
  
  tags = {
    Name = "aolf-gsec-prod-db-app-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "app_db_credentials" {
  secret_id     = aws_secretsmanager_secret.app_db_credentials.id
  secret_string = jsonencode({
    username = "aolf_gsec_app_user"
    password = random_password.app_db_password.result
    dbname   = "aolf_gsec"
  })
}

resource "aws_elastic_beanstalk_environment" "backend_env" {
  name                = "aolf-gsec-prod-backend-env"
  application         = aws_elastic_beanstalk_application.backend_app.name
  platform_arn        = "arn:aws:elasticbeanstalk:us-east-2::platform/Python 3.12 running on 64bit Amazon Linux 2023/4.4.1"
  tier                = "WebServer"
  version_label       = aws_elastic_beanstalk_application_version.app_version.name

  # VPC Configuration
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = aws_vpc.main.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = "${aws_subnet.private_subnet_1.id},${aws_subnet.private_subnet_2.id},${aws_subnet.private_subnet_3.id}"
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = "${aws_subnet.public_subnet_1.id},${aws_subnet.public_subnet_2.id},${aws_subnet.public_subnet_3.id}"
  }

  # Connect to existing load balancer
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerIsShared"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = "application"
  }

  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "SharedLoadBalancer"
    value     = aws_lb.backend_lb.arn
  }
  
  # Add a custom listener rule to the load balancer's HTTPS listener 
  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "Rules"
    value     = "default,defaultrule"
  }

  # Configure rules to forward to process
  setting {
    namespace = "aws:elbv2:listenerrule:defaultrule"
    name      = "PathPatterns"
    value     = "/*"
  }

  setting {
    namespace = "aws:elbv2:listenerrule:defaultrule"
    name      = "Process"
    value     = "default"
  }
  
  setting {
    namespace = "aws:elbv2:listenerrule:defaultrule"
    name      = "Priority"
    value     = "1"
  }
  
  # Environment Type - Change to LoadBalanced for high availability
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "LoadBalanced"
  }

  # Service Role is still needed
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = "aws-elasticbeanstalk-service-role"
  }

  # Auto Scaling Configuration - Min: 1, Max: 3 for high availability
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = "1"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = "3"
  }
  
  # Auto Scaling triggers
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "MeasureName"
    value     = "CPUUtilization"
  }
  
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "Statistic"
    value     = "Average"
  }
  
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "Unit"
    value     = "Percent"
  }
  
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "LowerThreshold"
    value     = "20"
  }
  
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "LowerBreachScaleIncrement"
    value     = "-1"
  }
  
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "UpperThreshold"
    value     = "70"
  }
  
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "UpperBreachScaleIncrement"
    value     = "1"
  }

  # Launch Configuration
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = aws_security_group.backend_sg.id
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = "aws-elasticbeanstalk-ec2-role"
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = "t3.small"
  }

  # Add EC2 key pair configuration
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "EC2KeyName"
    value     = "aolf-gsec-prod-backend-key-pair"
  }

  # Deployment Policy
  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "AllAtOnce"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSizeType"
    value     = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSize"
    value     = "100"
  }

  # Health Check Configuration
  setting {
    namespace = "aws:elasticbeanstalk:application"
    name      = "Application Healthcheck URL"
    value     = "/health"
  }

  # Process configuration
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Port"
    value     = "8000"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Protocol"
    value     = "HTTP"
  }
  
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/health"
  }
  
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckInterval"
    value     = "15"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckTimeout"
    value     = "5"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthyThresholdCount"
    value     = "3"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "UnhealthyThresholdCount"
    value     = "5"
  }

  # Environment variables
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ENVIRONMENT"
    value     = "prod"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PORT"
    value     = "8000"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "POSTGRES_DB"
    value     = "aolf_gsec"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "POSTGRES_WRITE_HOST"
    value     = aws_rds_cluster.aurora.endpoint
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "POSTGRES_READ_HOST"
    value     = aws_rds_cluster.aurora.reader_endpoint
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "POSTGRES_PASSWORD"
    value     = random_password.app_db_password.result
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "POSTGRES_PORT"
    value     = "5432"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "POSTGRES_USER"
    value     = "aolf_gsec_app_user"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "POSTGRES_SCHEMA"
    value     = "aolf_gsec_app"
  }

  # Python configuration
  setting {
    namespace = "aws:elasticbeanstalk:container:python"
    name      = "WSGIPath"
    value     = "application:application"
  }

  # Add these new settings for better Python configuration and logging
  setting {
    namespace = "aws:elasticbeanstalk:container:python"
    name      = "NumProcesses"
    value     = "1"
  }

  setting {
    namespace = "aws:elasticbeanstalk:container:python"
    name      = "NumThreads"
    value     = "15"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "DeleteOnTerminate"
    value     = "false"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = "7"
  }

  # Environment variables
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PYTHONPATH"
    value     = "/var/app/current:$PYTHONPATH"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PYTHONUNBUFFERED"
    value     = "1"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "DEBUG"
    value     = "true"
  }

  # Update log file path to a location that exists with proper permissions
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "LOG_FILE_PATH"
    value     = "/var/app/current/logs/app.log"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ENABLE_EMAIL"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "FROM_EMAIL"
    value     = "meetgurudev@aolf.app"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SENDGRID_API_KEY"
    value     = var.sendgrid_api_key
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "S3_BUCKET_NAME"
    value     = "aolf-gsec-prod"
  }
  
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_ACCESS_KEY_ID"
    value     = var.aws_access_key_id
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_SECRET_ACCESS_KEY"
    value     = var.aws_secret_access_key
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_REGION"
    value     = "us-east-2"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "OPENAI_API_KEY"
    value     = var.openai_api_key
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "OPENAI_MODEL"
    value     = "gpt-4o-mini"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "GOOGLE_CLIENT_ID"
    value     = var.google_client_id
  }
  
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_SECRET_KEY"
    value     = var.jwt_secret_key
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "APP_BASE_URL"
    value     = "https://meetgurudev.aolf.app"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "GOOGLE_CALENDAR_ID"
    value     = "9a1fb132a7dfbfb4fcd5df0d41a997b548cff730be5c83e98eba876d667cf1cc@group.calendar.google.com"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "DEFAULT_APPOINTMENT_DURATION"
    value     = "15"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "GOOGLE_CREDENTIALS_FILE"
    value     = "./creds/google_credentials-aolf_gsec_prod.json"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ENABLE_CALENDAR_SYNC"
    value     = "true"
  }
}

### 🚀 Load Balancer (HTTPS Only)
# Use existing certificate by domain name
data "aws_acm_certificate" "existing_cert" {
  domain      = "api.meetgurudev.aolf.app"
  statuses    = ["ISSUED"]
  most_recent = true
}

resource "aws_lb" "backend_lb" {
  name               = "aolf-gsec-prod-backend-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id, aws_subnet.public_subnet_3.id]

  enable_deletion_protection = true

  tags = {
    Name = "aolf-gsec-prod-backend-lb"
  }
}

resource "aws_lb_target_group" "backend_tg" {
  name     = "aolf-gsec-prod-backend-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "aolf-gsec-prod-backend-tg"
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.backend_lb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.existing_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }
}

### 🚀 AWS Secrets Manager for Database Credentials
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Create initial secret without the host information
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "aolf-gsec-prod-db-credentials"
  description = "Aurora PostgreSQL database credentials"
  
  tags = {
    Name = "aolf-gsec-prod-db-credentials"
  }
}

# Initial secret version with just username and password
resource "aws_secretsmanager_secret_version" "db_credentials_initial" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "aolf_gsec_admin"
    password = random_password.db_password.result
    engine   = "aurora-postgresql"
    port     = 5432
    dbname   = "aolf_gsec"
  })
}

### 🚀 Aurora RDS PostgreSQL with High Availability
resource "aws_db_subnet_group" "aurora_subnet" {
  name       = "aolf-gsec-prod-aurora-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id, aws_subnet.private_subnet_3.id]

  tags = {
    Name = "aolf-gsec-prod-aurora-db-subnet-group"
  }
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier      = "aolf-gsec-prod-database"
  engine                  = "aurora-postgresql"
  engine_version          = "16.6"
  engine_mode             = "provisioned"
  database_name           = "aolf_gsec"
  master_username         = jsondecode(aws_secretsmanager_secret_version.db_credentials_initial.secret_string)["username"]
  master_password         = jsondecode(aws_secretsmanager_secret_version.db_credentials_initial.secret_string)["password"]
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  db_subnet_group_name    = aws_db_subnet_group.aurora_subnet.name
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  storage_encrypted       = true
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "aolf-gsec-prod-database-final-snapshot"
  
  # Enable Serverless v2 scaling configuration
  serverlessv2_scaling_configuration {
    min_capacity = 1.0
    max_capacity = 4.0
  }

  tags = {
    Name = "aolf-gsec-prod-aurora-postgresql-cluster"
  }
}

# Update the secret with the host information after the cluster is created
resource "aws_secretsmanager_secret_version" "db_credentials_updated" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "aolf_gsec_admin"
    password = random_password.db_password.result
    engine   = "aurora-postgresql"
    host     = aws_rds_cluster.aurora.endpoint
    port     = 5432
    dbname   = "aolf_gsec"
  })
  
  # Ensure this only happens after the initial secret version is created
  depends_on = [aws_secretsmanager_secret_version.db_credentials_initial]
}

resource "aws_rds_cluster_instance" "aurora_instances" {
  count                = 2
  identifier           = "aolf-gsec-prod-database-${count.index}"
  cluster_identifier   = aws_rds_cluster.aurora.id
  instance_class       = "db.serverless"
  engine               = "aurora-postgresql"
  engine_version       = "16.6"
  db_subnet_group_name = aws_db_subnet_group.aurora_subnet.name

  tags = {
    Name = "aolf-gsec-prod-aurora-postgresql-instance-${count.index}"
  }
}

# # Add RDS cluster post-creation configuration
# resource "null_resource" "setup_db_user" {
#   depends_on = [aws_rds_cluster_instance.aurora_instances]

#   provisioner "local-exec" {
#     command = <<-EOT
#       PGPASSWORD="${jsondecode(aws_secretsmanager_secret_version.db_credentials_initial.secret_string)["password"]}" psql \
#       -h ${aws_rds_cluster.aurora.endpoint} \
#       -U ${jsondecode(aws_secretsmanager_secret_version.db_credentials_initial.secret_string)["username"]} \
#       -d ${jsondecode(aws_secretsmanager_secret_version.db_credentials_initial.secret_string)["dbname"]} \
#       -c "CREATE USER ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]} WITH PASSWORD '${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["password"]}';" \
#       -c "GRANT CONNECT ON DATABASE ${jsondecode(aws_secretsmanager_secret_version.db_credentials_initial.secret_string)["dbname"]} TO ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]};" \
#       -c "CREATE SCHEMA IF NOT EXISTS aolf_gsec_app;" \
#       -c "GRANT USAGE, CREATE ON SCHEMA public TO ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]};" \
#       -c "GRANT USAGE, CREATE ON SCHEMA aolf_gsec_app TO ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]};" \
#       -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]};" \
#       -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA aolf_gsec_app TO ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]};" \
#       -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]};" \
#       -c "ALTER DEFAULT PRIVILEGES IN SCHEMA aolf_gsec_app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${jsondecode(aws_secretsmanager_secret_version.app_db_credentials.secret_string)["username"]};"
#     EOT
#   }
# }

# Add SSM Session Manager access to the EC2 instance profile
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = "aws-elasticbeanstalk-ec2-role"  # This is the default EB role
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Backend Load Balancer DNS name output for DNS configuration
output "backend_lb_dns_name" {
  value       = aws_lb.backend_lb.dns_name
  description = "The DNS name of the backend Load Balancer"
}
