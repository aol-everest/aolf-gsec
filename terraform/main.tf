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

### 🚀 Elastic Beanstalk with High Availability
resource "aws_elastic_beanstalk_application" "backend_app" {
  name        = "aolf-gsec-prod-backend"
  description = "FastAPI Backend"
}

resource "aws_elastic_beanstalk_environment" "backend_env" {
  name                = "aolf-gsec-prod-backend-env"
  application         = aws_elastic_beanstalk_application.backend_app.name
  platform_arn        = "arn:aws:elasticbeanstalk:us-east-2::platform/Python 3.12 running on 64bit Amazon Linux 2023"
  tier                = "WebServer"

  # VPC Configuration
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = aws_vpc.main.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = "${aws_subnet.private_subnet_1.id},${aws_subnet.private_subnet_2.id}"
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = "${aws_subnet.public_subnet_1.id},${aws_subnet.public_subnet_2.id}"
  }

  # Load Balancer Configuration
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = "application"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = "aws-elasticbeanstalk-service-role"
  }

  # Auto Scaling Configuration
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = "1"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = "4"
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

  # Health Check Configuration
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/health"
  }

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

  # Deployment Policy
  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "Rolling"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSizeType"
    value     = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSize"
    value     = "25"
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
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

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
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]

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
  
  # Enable high availability
  availability_zones      = ["us-east-2a", "us-east-2b"]
  
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