#!/bin/bash
# AOLF GSEC RDS Deployment Script
# This script manages the standalone RDS instance for the AOLF GSEC application
# and applies database migrations using Alembic

# Exit on error
set -e

# Set script directory and load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Default environment
DEPLOY_ENV="prod"
REGION="us-east-2"
SKIP_PARAMETER_STORE=false
SKIP_MIGRATION=false
FORCE_UPDATE=false

# Display help
show_help() {
  echo "AOLF GSEC RDS Deployment Script"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV           Specify the deployment environment (prod or uat)"
  echo "  --environment=ENV       Specify the deployment environment (prod or uat)"
  echo "  --skip-parameter-store  Skip storing parameters in AWS Parameter Store"
  echo "  --skip-migration        Skip running database migrations"
  echo "  --update                Force update mode (skip RDS instance creation)"
  echo "  -h, --help              Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0                      Deploy RDS for production environment (default)"
  echo "  $0 --env=uat            Deploy RDS for UAT environment"
  echo "  $0 -e uat               Deploy RDS for UAT environment"
  echo "  $0 --env=uat --update   Update existing UAT RDS instance"
  echo "  $0 --env=uat --skip-migration  Deploy RDS without running migrations"
  echo ""
}

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Error handling
handle_error() {
  log "ERROR: $1"
  log "Deployment failed. Please check the error message above."
  exit 1
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
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --update)
      FORCE_UPDATE=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Check if AWS CLI is installed
check_aws_cli() {
  log "Checking if AWS CLI is installed..."
  if ! command -v aws &> /dev/null; then
    handle_error "AWS CLI is not installed. Please install it first: https://aws.amazon.com/cli/"
  fi
  log "AWS CLI is installed."
}

# Create or ensure environment file exists
ensure_env_file() {
  log "Checking environment file for $DEPLOY_ENV environment..."
  
  # Set environment file path
  ENV_FILE="$BACKEND_DIR/.env.$DEPLOY_ENV"
  
  # Check if environment file exists
  if [ ! -f "$ENV_FILE" ]; then
    handle_error "Environment file $ENV_FILE does not exist. Please create it first."
  fi
  
  log "Using environment file: $ENV_FILE"
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
  
  log "Database parameters stored in AWS Parameter Store."
}

# Create or update RDS instance
create_or_update_rds() {
  log "Checking if RDS instance exists for $DEPLOY_ENV environment..."
  
  # Load environment variables from environment file
  source $ENV_FILE
  
  # Parameter name suffix for environment
  PARAM_SUFFIX=$(echo $DEPLOY_ENV | tr '[:lower:]' '[:upper:]')
  
  # Set RDS instance identifier
  DB_IDENTIFIER="aolf-gsec-db-$DEPLOY_ENV"
  
  # Check if RDS instance exists or if update mode is forced
  if [ "$FORCE_UPDATE" = true ]; then
    log "Force update mode enabled. Skipping RDS instance creation..."
    
    # Get RDS endpoint
    RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)
    RDS_PORT=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --query 'DBInstances[0].Endpoint.Port' --output text --region $REGION)
    
    log "Using existing RDS instance. Endpoint: $RDS_ENDPOINT:$RDS_PORT"
  elif aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --region $REGION &> /dev/null; then
    log "RDS instance $DB_IDENTIFIER already exists."
    
    # Get RDS endpoint
    RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)
    RDS_PORT=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --query 'DBInstances[0].Endpoint.Port' --output text --region $REGION)
    
    log "Using existing RDS instance. Endpoint: $RDS_ENDPOINT:$RDS_PORT"
  else
    log "Creating new RDS instance $DB_IDENTIFIER..."
    
    # Get security group ID
    # You might need to create a security group first or use an existing one
    # For simplicity, we'll use the default security group for now
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION)
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text --region $REGION)
    
    # Create RDS instance
    if [ "$SKIP_PARAMETER_STORE" = true ]; then
      # Create RDS with direct credentials
      aws rds create-db-instance \
        --db-instance-identifier $DB_IDENTIFIER \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 14.6 \
        --allocated-storage 5 \
        --db-name aolf_gsec \
        --master-username "$POSTGRES_USER" \
        --master-user-password "$POSTGRES_PASSWORD" \
        --vpc-security-groups $SECURITY_GROUP_ID \
        --availability-zone ${REGION}a \
        --port 5432 \
        --backup-retention-period 7 \
        --no-multi-az \
        --storage-type gp2 \
        --no-publicly-accessible \
        --region $REGION
    else
      # Create RDS with parameter store references
      RDS_USERNAME=$(aws ssm get-parameter --name "RDS_USERNAME_$PARAM_SUFFIX" --with-decryption --query "Parameter.Value" --output text --region $REGION)
      RDS_PASSWORD=$(aws ssm get-parameter --name "RDS_PASSWORD_$PARAM_SUFFIX" --with-decryption --query "Parameter.Value" --output text --region $REGION)
      
      aws rds create-db-instance \
        --db-instance-identifier $DB_IDENTIFIER \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 14.6 \
        --allocated-storage 5 \
        --db-name aolf_gsec \
        --master-username "$RDS_USERNAME" \
        --master-user-password "$RDS_PASSWORD" \
        --vpc-security-groups $SECURITY_GROUP_ID \
        --availability-zone ${REGION}a \
        --port 5432 \
        --backup-retention-period 7 \
        --no-multi-az \
        --storage-type gp2 \
        --no-publicly-accessible \
        --region $REGION
    fi
    
    log "Waiting for RDS instance to become available. This may take several minutes..."
    aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER --region $REGION
    
    # Get RDS endpoint
    RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --query 'DBInstances[0].Endpoint.Address' --output text --region $REGION)
    RDS_PORT=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --query 'DBInstances[0].Endpoint.Port' --output text --region $REGION)
    
    log "RDS instance created successfully. Endpoint: $RDS_ENDPOINT:$RDS_PORT"
  fi
  
  # Store RDS endpoint in Parameter Store
  aws ssm put-parameter --name "RDS_HOSTNAME_$PARAM_SUFFIX" --value "$RDS_ENDPOINT" --type String --overwrite --region $REGION
  aws ssm put-parameter --name "RDS_PORT_$PARAM_SUFFIX" --value "$RDS_PORT" --type String --overwrite --region $REGION
  aws ssm put-parameter --name "RDS_DB_NAME_$PARAM_SUFFIX" --value "aolf_gsec" --type String --overwrite --region $REGION
  
  # Export environment variables for migration
  export POSTGRES_HOST=$RDS_ENDPOINT
  export POSTGRES_PORT=$RDS_PORT
  export POSTGRES_DB=aolf_gsec
  
  if [ "$SKIP_PARAMETER_STORE" = true ]; then
    export POSTGRES_USER=$POSTGRES_USER
    export POSTGRES_PASSWORD=$POSTGRES_PASSWORD
  else
    export POSTGRES_USER=$RDS_USERNAME
    export POSTGRES_PASSWORD=$RDS_PASSWORD
  fi
  
  # Set DATABASE_URL for Alembic
  export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
}

# Run database migrations
run_migrations() {
  if [ "$SKIP_MIGRATION" = true ]; then
    log "Skipping database migrations as requested..."
    return 0
  fi

  log "Running database migrations..."
  
  # Navigate to backend directory
  cd $BACKEND_DIR
  
  # Print environment variables for debugging (without sensitive values)
  log "Running database migrations with the following configuration:"
  log "POSTGRES_HOST: $POSTGRES_HOST"
  log "POSTGRES_PORT: $POSTGRES_PORT"
  log "POSTGRES_DB: $POSTGRES_DB"
  log "POSTGRES_USER: $POSTGRES_USER"
  log "Database password is set: $(if [ -n "$POSTGRES_PASSWORD" ]; then echo "Yes"; else echo "No"; fi)"
  
  # Run Alembic migrations
  log "Running alembic migrations..."
  alembic upgrade head
  MIGRATION_RESULT=$?
  
  if [ $MIGRATION_RESULT -eq 0 ]; then
    log "Database migrations completed successfully"
  else
    handle_error "Database migrations failed with exit code $MIGRATION_RESULT"
  fi
}

# Main execution
main() {
  log "Starting AOLF GSEC RDS deployment for $DEPLOY_ENV environment..."
  
  check_aws_cli
  ensure_env_file
  store_parameters
  create_or_update_rds
  run_migrations
  
  log "RDS deployment completed successfully."
  log "RDS Endpoint: $POSTGRES_HOST:$POSTGRES_PORT"
  log "Database Name: $POSTGRES_DB"
}

# Execute main function
main
