#!/bin/bash
# AOLF GSEC Backend Deployment Script for AWS Elastic Beanstalk
# This script automates the deployment of the backend to AWS Elastic Beanstalk

# Exit on error
set -e

# Default environment
DEPLOY_ENV="prod"
SKIP_PARAMETER_STORE=false

# Display help
show_help() {
  echo "AOLF GSEC Backend Deployment Script"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV           Specify the deployment environment (prod or uat)"
  echo "  --environment=ENV       Specify the deployment environment (prod or uat)"
  echo "  --skip-parameter-store  Skip storing parameters in AWS Parameter Store"
  echo "  -h, --help              Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0                      Deploy to production environment (default)"
  echo "  $0 --env=uat            Deploy to UAT environment"
  echo "  $0 -e uat               Deploy to UAT environment"
  echo "  $0 --env=uat --skip-parameter-store  Deploy to UAT environment without using Parameter Store"
  echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)
      DEPLOY_ENV="${1#*=}"
      shift
      ;;
    --environment=*)
      DEPLOY_ENV="${1#*=}"
      shift
      ;;
    -e|--env)
      DEPLOY_ENV="$2"
      shift 2
      ;;
    --skip-parameter-store)
      SKIP_PARAMETER_STORE=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--env=prod|uat] or $0 [-e prod|uat] or $0 [--help]"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ "$DEPLOY_ENV" != "prod" && "$DEPLOY_ENV" != "uat" ]]; then
  echo "Invalid environment: $DEPLOY_ENV. Must be 'prod' or 'uat'."
  echo "Usage: $0 [--env=prod|uat] or $0 [-e prod|uat]"
  exit 1
fi

# Configuration
APP_NAME="aolf-gsec-backend"
ENV_NAME="aolf-gsec-backend-$DEPLOY_ENV"
REGION="us-east-1"
ENV_FILE=".env.$DEPLOY_ENV"

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

# Create or ensure environment file exists
ensure_env_file() {
  log "Checking environment file for $DEPLOY_ENV..."
  
  if [[ "$DEPLOY_ENV" == "prod" && ! -f ".env.prod" ]]; then
    log "Creating production environment file from UAT..."
    cp .env.uat .env.prod
    log "Production environment file created."
    log "Please review and update the .env.prod file if needed."
  elif [[ "$DEPLOY_ENV" == "uat" && ! -f ".env.uat" ]]; then
    log "Creating UAT environment file from dev..."
    cp .env.dev .env.uat
    log "UAT environment file created."
    log "Please review and update the .env.uat file if needed."
  else
    log "Environment file $ENV_FILE already exists."
  fi
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
  if [ "$SKIP_PARAMETER_STORE" = true ]; then
    log "Skipping AWS Parameter Store step as requested..."
    return 0
  fi

  log "Storing sensitive information in AWS Parameter Store for $DEPLOY_ENV environment..."
  
  # Load environment variables from environment file
  source $ENV_FILE
  
  # Parameter name suffix for environment
  PARAM_SUFFIX=$(echo $DEPLOY_ENV | tr '[:lower:]' '[:upper:]')
  
  # Store parameters
  aws ssm put-parameter --name "RDS_USERNAME_$PARAM_SUFFIX" --value "$POSTGRES_USER" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name "RDS_PASSWORD_$PARAM_SUFFIX" --value "$POSTGRES_PASSWORD" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name "JWT_SECRET_KEY_$PARAM_SUFFIX" --value "$JWT_SECRET_KEY" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name "GOOGLE_CLIENT_ID_$PARAM_SUFFIX" --value "$GOOGLE_CLIENT_ID" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name "SENDGRID_API_KEY_$PARAM_SUFFIX" --value "$SENDGRID_API_KEY" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name "ACCESS_KEY_ID_$PARAM_SUFFIX" --value "$AWS_ACCESS_KEY_ID" --type SecureString --overwrite --region $REGION
  aws ssm put-parameter --name "SECRET_ACCESS_KEY_$PARAM_SUFFIX" --value "$AWS_SECRET_ACCESS_KEY" --type SecureString --overwrite --region $REGION
  
  log "Parameters stored in AWS Parameter Store."
}

# Create or update Elastic Beanstalk environment
create_or_update_env() {
  log "Checking if Elastic Beanstalk environment $ENV_NAME exists..."
  
  # Load environment variables from environment file
  source $ENV_FILE
  
  # Parameter name suffix for environment
  PARAM_SUFFIX=$(echo $DEPLOY_ENV | tr '[:lower:]' '[:upper:]')
  
  # Check if environment exists
  if eb status $ENV_NAME 2>&1 | grep -q "Environment $ENV_NAME"; then
    log "Environment $ENV_NAME already exists. Updating..."
    eb deploy $ENV_NAME
  else
    log "Creating new Elastic Beanstalk environment..."
    
    # Always create environment with direct database credentials
    eb create $ENV_NAME \
      --database \
      --database.engine postgres \
      --database.instance db.t3.micro \
      --database.size 5 \
      --database.username "$POSTGRES_USER" \
      --database.password "$POSTGRES_PASSWORD"
    
    # Configure environment variables
    log "Configuring environment variables..."
    
    if [ "$SKIP_PARAMETER_STORE" = true ]; then
      # Set environment variables directly
      eb setenv ENVIRONMENT=$DEPLOY_ENV \
        "POSTGRES_HOST=\${RDS_HOSTNAME}" \
        "POSTGRES_PORT=\${RDS_PORT}" \
        "POSTGRES_DB=\${RDS_DB_NAME}" \
        "POSTGRES_USER=\${RDS_USERNAME}" \
        "POSTGRES_PASSWORD=\${RDS_PASSWORD}" \
        "JWT_SECRET_KEY=$JWT_SECRET_KEY" \
        "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
        "SENDGRID_API_KEY=$SENDGRID_API_KEY" \
        "FROM_EMAIL=$FROM_EMAIL" \
        ENABLE_EMAIL=true \
        "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" \
        "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" \
        "AWS_REGION=$REGION" \
        "S3_BUCKET_NAME=$S3_BUCKET_NAME"
    else
      # Set environment variables with parameter store references
      eb setenv ENVIRONMENT=$DEPLOY_ENV \
        "POSTGRES_HOST=\${RDS_HOSTNAME}" \
        "POSTGRES_PORT=\${RDS_PORT}" \
        "POSTGRES_DB=\${RDS_DB_NAME}" \
        "POSTGRES_USER=\${RDS_USERNAME}" \
        "POSTGRES_PASSWORD=\${RDS_PASSWORD}" \
        "JWT_SECRET_KEY={{resolve:ssm:JWT_SECRET_KEY_$PARAM_SUFFIX:1}}" \
        "GOOGLE_CLIENT_ID={{resolve:ssm:GOOGLE_CLIENT_ID_$PARAM_SUFFIX:1}}" \
        "SENDGRID_API_KEY={{resolve:ssm:SENDGRID_API_KEY_$PARAM_SUFFIX:1}}" \
        "FROM_EMAIL=$FROM_EMAIL" \
        ENABLE_EMAIL=true \
        "AWS_ACCESS_KEY_ID={{resolve:ssm:ACCESS_KEY_ID_$PARAM_SUFFIX:1}}" \
        "AWS_SECRET_ACCESS_KEY={{resolve:ssm:SECRET_ACCESS_KEY_$PARAM_SUFFIX:1}}" \
        "AWS_REGION=$REGION" \
        "S3_BUCKET_NAME=$S3_BUCKET_NAME"
    fi
  fi
}

# Main execution
main() {
  log "Starting deployment process for AOLF GSEC Backend to AWS Elastic Beanstalk ($DEPLOY_ENV environment)..."
  
  check_eb_cli
  ensure_env_file
  init_eb_app
  store_parameters
  create_or_update_env
  
  log "Deployment completed successfully!"
  log "You can access your application at: http://$ENV_NAME.$REGION.elasticbeanstalk.com"
  log "To view the application logs, run: eb logs -e $ENV_NAME"
  log "To SSH into the EC2 instance, run: eb ssh -e $ENV_NAME"
}

# Execute main function
main 