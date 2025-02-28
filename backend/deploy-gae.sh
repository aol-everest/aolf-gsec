#!/bin/bash
# AOLF GSEC Backend Deployment Script for Google App Engine
# This script automates the deployment of the backend to Google App Engine

# Exit on error
set -e

# Default environment
DEPLOY_ENV="prod"
SKIP_SECRET_MANAGER=false
PROJECT_ID=""

# Display help
show_help() {
  echo "AOLF GSEC Backend Deployment Script for Google App Engine"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV           Specify the deployment environment (prod or uat)"
  echo "  --environment=ENV       Specify the deployment environment (prod or uat)"
  echo "  -p, --project PROJECT   Specify the Google Cloud project ID to use"
  echo "  --skip-secret-manager   Skip storing parameters in Google Secret Manager"
  echo "  -h, --help              Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 -p my-project-id     Deploy to specified project (required)"
  echo "  $0 -p my-project-id --env=uat            Deploy to UAT environment"
  echo "  $0 -p my-project-id -e uat               Deploy to UAT environment"
  echo "  $0 -p my-project-id --env=uat --skip-secret-manager  Deploy without Secret Manager"
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
    -p|--project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --project=*)
      PROJECT_ID="${1#*=}"
      shift
      ;;
    --skip-secret-manager)
      SKIP_SECRET_MANAGER=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 -p PROJECT_ID [--env=prod|uat] or $0 -p PROJECT_ID [-e prod|uat] or $0 [--help]"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ "$DEPLOY_ENV" != "prod" && "$DEPLOY_ENV" != "uat" ]]; then
  echo "Invalid environment: $DEPLOY_ENV. Must be 'prod' or 'uat'."
  echo "Usage: $0 -p PROJECT_ID [--env=prod|uat] or $0 -p PROJECT_ID [-e prod|uat]"
  exit 1
fi

# Validate project ID
if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: Project ID is required."
  echo "Usage: $0 -p PROJECT_ID [--env=prod|uat] or $0 -p PROJECT_ID [-e prod|uat]"
  exit 1
fi

# Configuration
SERVICE_NAME="default"
ENV_FILE=".env.$DEPLOY_ENV"
REGION="us-central1"

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if gcloud CLI is installed
check_gcloud_cli() {
  log "Checking if gcloud CLI is installed..."
  if ! command -v gcloud &> /dev/null; then
    log "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
  else
    log "gcloud CLI is already installed."
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

# Initialize Google Cloud project
init_gcloud_project() {
  log "Using existing Google Cloud project: $PROJECT_ID"
  
  # Check if project exists
  if gcloud projects describe $PROJECT_ID &> /dev/null; then
    log "Project $PROJECT_ID exists."
    
    # Set the current project
    gcloud config set project $PROJECT_ID
    
    # Enable required APIs
    log "Enabling required APIs..."
    gcloud services enable appengine.googleapis.com
    gcloud services enable secretmanager.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable cloudresourcemanager.googleapis.com
    gcloud services enable sqladmin.googleapis.com
  else
    log "ERROR: Project $PROJECT_ID does not exist."
    log "Please create the project first or specify an existing project ID."
    exit 1
  fi
}

# Create Cloud SQL instance if it doesn't exist
setup_cloud_sql() {
  log "Setting up Cloud SQL..."
  
  # Check if Cloud SQL instance exists
  SQL_INSTANCE_NAME="aolf-gsec-postgres-$DEPLOY_ENV"
  
  if gcloud sql instances describe $SQL_INSTANCE_NAME &> /dev/null; then
    log "Cloud SQL instance $SQL_INSTANCE_NAME already exists."
  else
    log "Creating new Cloud SQL instance..."
    gcloud sql instances create $SQL_INSTANCE_NAME \
      --database-version=POSTGRES_14 \
      --tier=db-f1-micro \
      --region=$REGION \
      --storage-size=10GB \
      --storage-type=SSD \
      --backup-start-time=04:00 \
      --availability-type=zonal
    
    # Load environment variables from environment file
    source $ENV_FILE
    
    # Create database
    gcloud sql databases create ${POSTGRES_DB:-gsec} --instance=$SQL_INSTANCE_NAME
    
    # Create user
    gcloud sql users create ${POSTGRES_USER:-gsec_user} \
      --instance=$SQL_INSTANCE_NAME \
      --password="${POSTGRES_PASSWORD:-$(openssl rand -base64 12)}"
  fi
  
  # Get connection information
  SQL_CONNECTION_NAME=$(gcloud sql instances describe $SQL_INSTANCE_NAME --format='value(connectionName)')
  log "Cloud SQL connection name: $SQL_CONNECTION_NAME"
}

# Store sensitive information in Google Secret Manager
store_secrets() {
  if [ "$SKIP_SECRET_MANAGER" = true ]; then
    log "Skipping Google Secret Manager step as requested..."
    return 0
  fi

  log "Storing sensitive information in Google Secret Manager for $DEPLOY_ENV environment..."
  
  # Load environment variables from environment file
  source $ENV_FILE
  
  # Create secrets
  create_or_update_secret "POSTGRES_USER" "$POSTGRES_USER"
  create_or_update_secret "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
  create_or_update_secret "POSTGRES_DB" "$POSTGRES_DB"
  create_or_update_secret "JWT_SECRET_KEY" "$JWT_SECRET_KEY"
  create_or_update_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
  create_or_update_secret "SENDGRID_API_KEY" "$SENDGRID_API_KEY"
  create_or_update_secret "FROM_EMAIL" "$FROM_EMAIL"
  
  log "Secrets stored in Google Secret Manager."
}

# Helper function to create or update a secret
create_or_update_secret() {
  SECRET_NAME=$1
  SECRET_VALUE=$2
  
  # Check if secret exists
  if gcloud secrets describe $SECRET_NAME &> /dev/null; then
    # Update existing secret
    echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=-
  else
    # Create new secret
    echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --replication-policy="automatic" --data-file=-
  fi
  
  # Grant access to App Engine service account
  SERVICE_ACCOUNT="$PROJECT_ID@appspot.gserviceaccount.com"
  gcloud secrets add-iam-policy-binding $SECRET_NAME \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
}

# Update app.yaml with environment variables
update_app_yaml() {
  log "Updating app.yaml with environment variables..."
  
  # Load environment variables from environment file
  source $ENV_FILE
  
  # Create temporary app.yaml with environment variables
  cat > app.yaml.tmp << EOL
runtime: python312

entrypoint: gunicorn application:application -w 4 -k uvicorn.workers.UvicornWorker

instance_class: F2

env_variables:
  ENVIRONMENT: "$DEPLOY_ENV"
EOL

  # Add database connection
  SQL_INSTANCE_NAME="aolf-gsec-postgres-$DEPLOY_ENV"
  SQL_CONNECTION_NAME=$(gcloud sql instances describe $SQL_INSTANCE_NAME --format='value(connectionName)')
  
  if [ "$SKIP_SECRET_MANAGER" = true ]; then
    # Add environment variables directly
    cat >> app.yaml.tmp << EOL
  POSTGRES_HOST: "/cloudsql/$SQL_CONNECTION_NAME"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "$POSTGRES_DB"
  POSTGRES_USER: "$POSTGRES_USER"
  POSTGRES_PASSWORD: "$POSTGRES_PASSWORD"
  JWT_SECRET_KEY: "$JWT_SECRET_KEY"
  GOOGLE_CLIENT_ID: "$GOOGLE_CLIENT_ID"
  SENDGRID_API_KEY: "$SENDGRID_API_KEY"
  FROM_EMAIL: "$FROM_EMAIL"
  ENABLE_EMAIL: "true"
EOL
  else
    # Add secret references
    cat >> app.yaml.tmp << EOL
  POSTGRES_HOST: "/cloudsql/$SQL_CONNECTION_NAME"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "$POSTGRES_DB"
  POSTGRES_USER: "$POSTGRES_USER"
  POSTGRES_PASSWORD: "$POSTGRES_PASSWORD"
  JWT_SECRET_KEY: "$JWT_SECRET_KEY"
  GOOGLE_CLIENT_ID: "$GOOGLE_CLIENT_ID"
  SENDGRID_API_KEY: "$SENDGRID_API_KEY"
  FROM_EMAIL: "$FROM_EMAIL"
  ENABLE_EMAIL: "true"
EOL
  fi
  
  # Add Cloud SQL connection
  cat >> app.yaml.tmp << EOL

beta_settings:
  cloud_sql_instances: $SQL_CONNECTION_NAME

handlers:
- url: /.*
  script: auto
  secure: always

automatic_scaling:
  min_instances: 1
  max_instances: 5
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.65
  max_concurrent_requests: 50
EOL

  # Replace app.yaml with the temporary file
  mv app.yaml.tmp app.yaml
  log "app.yaml updated successfully."
}

# Deploy to Google App Engine
deploy_to_gae() {
  log "Deploying to Google App Engine..."
  
  # Deploy the application
  gcloud app deploy app.yaml --quiet
  
  log "Deployment completed successfully!"
}

# Main execution
main() {
  log "Starting deployment process for AOLF GSEC Backend to Google App Engine ($DEPLOY_ENV environment)..."
  
  check_gcloud_cli
  ensure_env_file
  init_gcloud_project
  setup_cloud_sql
  store_secrets
  update_app_yaml
  deploy_to_gae
  
  log "Deployment completed successfully!"
  log "You can access your application at: https://$PROJECT_ID.appspot.com"
  log "To view the application logs, run: gcloud app logs tail"
}

# Execute main function
main 