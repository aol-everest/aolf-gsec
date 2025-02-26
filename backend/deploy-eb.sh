#!/bin/bash
# AOLF GSEC Backend Deployment Script for AWS Elastic Beanstalk
# This script automates the deployment of the backend to AWS Elastic Beanstalk

# Exit on error
set -e

# Configuration
APP_NAME="aolf-gsec-backend"
ENV_NAME="aolf-gsec-backend-prod"
REGION="us-east-1"

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if EB CLI is installed
check_eb_cli() {
  log "Checking if EB CLI is installed..."
  if ! command -v eb &> /dev/null; then
    log "EB CLI is not installed. Installing..."
    pip install awsebcli
  else
    log "EB CLI is already installed."
  fi
}

# Create production environment file
create_prod_env() {
  log "Creating production environment file..."
  cp .env.uat .env.prod
  
  log "Production environment file created."
  log "Please review and update the .env.prod file if needed."
}

# Initialize Elastic Beanstalk application
init_eb_app() {
  log "Initializing Elastic Beanstalk application..."
  
  # Check if .elasticbeanstalk directory exists
  if [ -d ".elasticbeanstalk" ]; then
    log "Elastic Beanstalk application already initialized."
  else
    log "Creating new Elastic Beanstalk application..."
    eb init -p python-3.12 $APP_NAME --region $REGION
  fi
}

# Store sensitive information in AWS Parameter Store
store_parameters() {
  log "Storing sensitive information in AWS Parameter Store..."
  
  # Load environment variables from .env.prod
  source .env.prod
  
  # Store parameters
  aws ssm put-parameter --name RDS_USERNAME --value "$POSTGRES_USER" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name RDS_PASSWORD --value "$POSTGRES_PASSWORD" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name JWT_SECRET_KEY --value "$JWT_SECRET_KEY" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name GOOGLE_CLIENT_ID --value "$GOOGLE_CLIENT_ID" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name SENDGRID_API_KEY --value "$SENDGRID_API_KEY" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name AWS_ACCESS_KEY_ID --value "$AWS_ACCESS_KEY_ID" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name AWS_SECRET_ACCESS_KEY --value "$AWS_SECRET_ACCESS_KEY" --type SecureString --overwrite --region $REGION
  
  log "Parameters stored in AWS Parameter Store."
}

# Create or update Elastic Beanstalk environment
create_or_update_env() {
  log "Checking if Elastic Beanstalk environment exists..."
  
  # Check if environment exists
  if eb status $ENV_NAME 2>&1 | grep -q "Environment $ENV_NAME"; then
    log "Environment $ENV_NAME already exists. Updating..."
    eb deploy $ENV_NAME
  else
    log "Creating new Elastic Beanstalk environment..."
    eb create $ENV_NAME \
      --database \
      --database.engine postgres \
      --database.instance db.t3.micro \
      --database.size 5 \
      --database.username "{{resolve:ssm:RDS_USERNAME:1}}" \
      --database.password "{{resolve:ssm:RDS_PASSWORD:1}}"
    
    # Configure environment variables
    log "Configuring environment variables..."
    eb setenv ENVIRONMENT=prod \
      POSTGRES_HOST='${RDS_HOSTNAME}' \
      POSTGRES_PORT='${RDS_PORT}' \
      POSTGRES_DB='${RDS_DB_NAME}' \
      POSTGRES_USER='${RDS_USERNAME}' \
      POSTGRES_PASSWORD='${RDS_PASSWORD}' \
      JWT_SECRET_KEY="{{resolve:ssm:JWT_SECRET_KEY:1}}" \
      GOOGLE_CLIENT_ID="{{resolve:ssm:GOOGLE_CLIENT_ID:1}}" \
      SENDGRID_API_KEY="{{resolve:ssm:SENDGRID_API_KEY:1}}" \
      FROM_EMAIL="$FROM_EMAIL" \
      ENABLE_EMAIL=true \
      AWS_ACCESS_KEY_ID="{{resolve:ssm:AWS_ACCESS_KEY_ID:1}}" \
      AWS_SECRET_ACCESS_KEY="{{resolve:ssm:AWS_SECRET_ACCESS_KEY:1}}" \
      AWS_REGION=$REGION \
      S3_BUCKET_NAME=$S3_BUCKET_NAME
  fi
}

# Main execution
main() {
  log "Starting deployment process for AOLF GSEC Backend to AWS Elastic Beanstalk..."
  
  check_eb_cli
  create_prod_env
  init_eb_app
  store_parameters
  create_or_update_env
  
  log "Deployment completed successfully!"
  log "You can access your application at: http://$ENV_NAME.$REGION.elasticbeanstalk.com"
  log "To view the application logs, run: eb logs"
  log "To SSH into the EC2 instance, run: eb ssh"
}

# Execute main function
main 