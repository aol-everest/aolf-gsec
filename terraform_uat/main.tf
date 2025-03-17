
resource "aws_elastic_beanstalk_environment" "uatenv" {
  name                = "aolf-gsec-backend-uat"
  application         = aws_elastic_beanstalk_application.backend_app.name
  platform_arn        = "arn:aws:elasticbeanstalk:us-east-2::platform/Python 3.12 running on 64bit Amazon Linux 2023/4.4.1"
  tier                = "WebServer"

  # VPC Configuration
  # (resource arguments)
}

