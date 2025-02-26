# AWS Elastic Beanstalk Deployment Guide for AOLF GSEC Backend

This guide outlines the steps to deploy the AOLF GSEC backend application to AWS Elastic Beanstalk with a PostgreSQL database using Amazon RDS.

## Prerequisites

- AWS CLI installed and configured with appropriate credentials
- EB CLI (Elastic Beanstalk Command Line Interface) installed
- Python 3.12+ installed
- Access to the AWS Management Console
- Permissions to create/modify Elastic Beanstalk environments and RDS instances

## Environment Setup

1. Install the EB CLI if not already installed:

```bash
pip install awsebcli
```

2. Create a production-ready `.env` file for the deployment:

```bash
cp .env.uat .env.prod
```

3. Edit the `.env.prod` file to update the database connection and other environment variables as needed.

## Prepare the Application for Deployment

1. Create an Elastic Beanstalk configuration file `.ebextensions/01_packages.config`:

```yaml
packages:
  yum:
    git: []
    postgresql-devel: []
```

2. Create an Elastic Beanstalk configuration file `.ebextensions/02_python.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: application:app
  aws:elasticbeanstalk:application:environment:
    ENVIRONMENT: prod
    PYTHONPATH: "/var/app/current:$PYTHONPATH"
```

3. Create an Elastic Beanstalk configuration file `.ebextensions/03_database.config`:

```yaml
Resources:
  AWSEBRDSDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      AllocatedStorage: 5
      DBInstanceClass: db.t3.micro
      DBName: aolf_gsec
      Engine: postgres
      EngineVersion: 14.6
      MasterUsername: "{{resolve:ssm:RDS_USERNAME:1}}"
      MasterUserPassword: "{{resolve:ssm:RDS_PASSWORD:1}}"
      MultiAZ: false
      StorageType: gp2
      VPCSecurityGroups:
        - Fn::GetAtt: [AWSEBSecurityGroup, GroupId]
```

4. Create an application.py file to serve as the WSGI entry point:

```python
from app import app as application

if __name__ == "__main__":
    application.run()
```

5. Create a Procfile for Elastic Beanstalk:

```
web: gunicorn application:application -w 4 -k uvicorn.workers.UvicornWorker
```

6. Update requirements.txt to include gunicorn:

```
gunicorn==21.2.0
```

## Initialize Elastic Beanstalk Application

1. Initialize the Elastic Beanstalk application:

```bash
cd backend
eb init -p python-3.12 aolf-gsec-backend
```

2. When prompted, select the appropriate region and configure other settings.

## Store Sensitive Information in AWS Parameter Store

1. Store sensitive information in AWS Parameter Store:

```bash
aws ssm put-parameter --name RDS_USERNAME --value "postgres" --type SecureString
aws ssm put-parameter --name RDS_PASSWORD --value "your-secure-password" --type SecureString
aws ssm put-parameter --name JWT_SECRET_KEY --value "your-jwt-secret" --type SecureString
aws ssm put-parameter --name GOOGLE_CLIENT_ID --value "your-google-client-id" --type SecureString
aws ssm put-parameter --name SENDGRID_API_KEY --value "your-sendgrid-api-key" --type SecureString
aws ssm put-parameter --name AWS_ACCESS_KEY_ID --value "your-aws-access-key" --type SecureString
aws ssm put-parameter --name AWS_SECRET_ACCESS_KEY --value "your-aws-secret-key" --type SecureString
```

## Create the Elastic Beanstalk Environment

1. Create the Elastic Beanstalk environment with the RDS database:

```bash
eb create aolf-gsec-backend-prod --database --database.engine postgres --database.instance db.t3.micro --database.size 5 --database.username "{{resolve:ssm:RDS_USERNAME:1}}" --database.password "{{resolve:ssm:RDS_PASSWORD:1}}"
```

2. Configure environment variables:

```bash
eb setenv ENVIRONMENT=prod \
  JWT_SECRET_KEY="{{resolve:ssm:JWT_SECRET_KEY:1}}" \
  GOOGLE_CLIENT_ID="{{resolve:ssm:GOOGLE_CLIENT_ID:1}}" \
  SENDGRID_API_KEY="{{resolve:ssm:SENDGRID_API_KEY:1}}" \
  FROM_EMAIL="noreply@aolf-gsec.org" \
  ENABLE_EMAIL=true \
  AWS_ACCESS_KEY_ID="{{resolve:ssm:AWS_ACCESS_KEY_ID:1}}" \
  AWS_SECRET_ACCESS_KEY="{{resolve:ssm:AWS_SECRET_ACCESS_KEY:1}}" \
  AWS_REGION=us-east-1 \
  S3_BUCKET_NAME=aolf-gsec-uat
```

## Database Migration

1. Create a script to run database migrations during deployment:

```bash
#!/bin/bash
# .ebextensions/db-migrate.sh
source /var/app/venv/*/bin/activate
cd /var/app/current
export PYTHONPATH=/var/app/current:$PYTHONPATH
alembic upgrade head
```

2. Create an Elastic Beanstalk configuration file `.ebextensions/04_db_migrate.config`:

```yaml
container_commands:
  01_db_migrate:
    command: "chmod +x .ebextensions/db-migrate.sh && .ebextensions/db-migrate.sh"
    leader_only: true
```

## Deploy the Application

1. Deploy the application to Elastic Beanstalk:

```bash
eb deploy
```

2. Open the application in a browser:

```bash
eb open
```

## Monitoring and Troubleshooting

1. View application logs:

```bash
eb logs
```

2. SSH into the EC2 instance:

```bash
eb ssh
```

3. Monitor the application in the AWS Management Console:
   - Elastic Beanstalk dashboard
   - CloudWatch logs
   - RDS dashboard

## Scaling and Performance Optimization

1. Configure auto-scaling:
   - In the Elastic Beanstalk console, go to your environment
   - Click on "Configuration"
   - Under "Capacity", click "Edit"
   - Configure auto-scaling settings based on your requirements

2. Configure environment tiers:
   - Web server environment (default)
   - Worker environment (for background tasks)

## Security Considerations

1. Configure HTTPS:
   - In the Elastic Beanstalk console, go to your environment
   - Click on "Configuration"
   - Under "Load balancer", click "Edit"
   - Add a listener on port 443 with HTTPS protocol
   - Configure SSL certificate

2. Configure security groups:
   - Restrict access to the RDS instance
   - Configure appropriate inbound/outbound rules

3. Configure IAM roles:
   - Create a custom IAM role for the Elastic Beanstalk environment
   - Attach only the necessary policies

## Backup and Disaster Recovery

1. Configure RDS backups:
   - Automated backups
   - Manual snapshots

2. Configure multi-AZ deployment for RDS (for production):
   - In the RDS console, modify the DB instance
   - Enable multi-AZ deployment

## Cost Optimization

1. Choose appropriate instance types:
   - t3.micro for development/testing
   - t3.small or larger for production

2. Configure auto-scaling:
   - Scale down during off-hours
   - Scale up during peak hours

3. Monitor costs:
   - AWS Cost Explorer
   - AWS Budgets

## CI/CD Integration

1. Create a GitHub Actions workflow for automated deployment:
   - Build the application
   - Run tests
   - Deploy to Elastic Beanstalk

## Important Notes

1. Always backup the database before major changes
2. Test the deployment in a staging environment before deploying to production
3. Monitor the application logs for errors
4. Set up alerts for critical errors
5. Regularly update dependencies and apply security patches 