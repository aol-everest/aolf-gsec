#!/bin/bash
# AOLF GSEC Full-Stack Deployment Script for Google App Engine
# This script automates the deployment of both frontend and backend to Google App Engine

# Exit on error
set -e

# Default environment
DEPLOY_ENV="prod"
SKIP_SECRET_MANAGER=false
PROJECT_ID=""
SKIP_DB_CREATION=false

# Display help
show_help() {
  echo "AOLF GSEC Full-Stack Deployment Script for Google App Engine"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV           Specify the deployment environment (prod or uat)"
  echo "  --environment=ENV       Specify the deployment environment (prod or uat)"
  echo "  -p, --project PROJECT   Specify the Google Cloud project ID to use"
  echo "  --skip-secret-manager   Skip storing parameters in Google Secret Manager"
  echo "  --skip-db-creation      Skip Cloud SQL database creation (use if DB already exists)"
  echo "  -h, --help              Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 -p my-project-id     Deploy to specified project (required)"
  echo "  $0 -p my-project-id --env=uat            Deploy to UAT environment"
  echo "  $0 -p my-project-id -e uat               Deploy to UAT environment"
  echo "  $0 -p my-project-id --env=uat --skip-db-creation  Deploy without creating DB"
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
    --skip-db-creation)
      SKIP_DB_CREATION=true
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
BACKEND_ENV_FILE="backend/.env.$DEPLOY_ENV"
FRONTEND_ENV_FILE="frontend/.env"
REGION="us-central1"
TEMP_DIR="temp_deploy"
SQL_INSTANCE_NAME="aolf-gsec-postgres-$DEPLOY_ENV"

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Error handling function
handle_error() {
  log "ERROR: $1"
  log "Deployment failed. Please check the error message above."
  
  # Clean up temporary directory if it exists
  if [[ -d "$TEMP_DIR" ]]; then
    log "Cleaning up temporary files..."
    rm -rf $TEMP_DIR
  fi
  
  exit 1
}

# Check if gcloud CLI is installed
check_gcloud_cli() {
  log "Checking if gcloud CLI is installed..."
  if ! command -v gcloud &> /dev/null; then
    handle_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
  else
    log "gcloud CLI is already installed."
  fi
}

# Create or ensure environment files exist
ensure_env_files() {
  log "Checking backend environment file for $DEPLOY_ENV..."
  
  if [[ "$DEPLOY_ENV" == "prod" && ! -f "backend/.env.prod" ]]; then
    log "Creating production environment file from UAT..."
    cp backend/.env.uat backend/.env.prod
    log "Production environment file created."
    log "Please review and update the backend/.env.prod file if needed."
  elif [[ "$DEPLOY_ENV" == "uat" && ! -f "backend/.env.uat" ]]; then
    log "Creating UAT environment file from dev..."
    cp backend/.env.dev backend/.env.uat
    log "UAT environment file created."
    log "Please review and update the backend/.env.uat file if needed."
  else
    log "Backend environment file $BACKEND_ENV_FILE already exists."
  fi
  
  log "Checking frontend environment file..."
  if [[ ! -f "frontend/.env" ]]; then
    log "Creating frontend environment file from example..."
    cp frontend/.env.example frontend/.env
    log "Frontend environment file created."
    log "Please review and update the frontend/.env file if needed."
  else
    log "Frontend environment file already exists."
  fi
  
  # Update frontend environment with correct API URL
  log "Updating frontend environment with correct API URL..."
  API_URL="https://$PROJECT_ID.appspot.com"
  
  # Create a temporary file with the updated environment variables
  cat > frontend/.env.tmp << EOL
REACT_APP_API_URL=$API_URL
REACT_APP_ENVIRONMENT=$DEPLOY_ENV
EOL
  
  # Append any other existing environment variables
  if [[ -f "frontend/.env" ]]; then
    grep -v "REACT_APP_API_URL\|REACT_APP_ENVIRONMENT" frontend/.env >> frontend/.env.tmp || true
  fi
  
  # Replace the environment file with the temporary file
  mv frontend/.env.tmp frontend/.env
  log "Frontend environment file updated with API URL: $API_URL"
}

# Initialize Google Cloud project
init_gcloud_project() {
  log "Using existing Google Cloud project: $PROJECT_ID"
  
  # Check if project exists
  if gcloud projects describe $PROJECT_ID &> /dev/null; then
    log "Project $PROJECT_ID exists."
    
    # Set the current project
    gcloud config set project $PROJECT_ID || handle_error "Failed to set project. Check your permissions."
    
    # Enable required APIs
    log "Enabling required APIs..."
    gcloud services enable appengine.googleapis.com || log "WARNING: Failed to enable appengine.googleapis.com. It may already be enabled or you may not have sufficient permissions."
    gcloud services enable secretmanager.googleapis.com || log "WARNING: Failed to enable secretmanager.googleapis.com. It may already be enabled or you may not have sufficient permissions."
    gcloud services enable cloudbuild.googleapis.com || log "WARNING: Failed to enable cloudbuild.googleapis.com. It may already be enabled or you may not have sufficient permissions."
    gcloud services enable cloudresourcemanager.googleapis.com || log "WARNING: Failed to enable cloudresourcemanager.googleapis.com. It may already be enabled or you may not have sufficient permissions."
    gcloud services enable sqladmin.googleapis.com || log "WARNING: Failed to enable sqladmin.googleapis.com. It may already be enabled or you may not have sufficient permissions."
  else
    handle_error "Project $PROJECT_ID does not exist. Please create the project first or specify an existing project ID."
  fi
  
  # Check if App Engine application exists
  if ! gcloud app describe &> /dev/null; then
    log "App Engine application does not exist in this project. Creating..."
    log "You will need to select a region for your App Engine application."
    gcloud app create --region=$REGION || handle_error "Failed to create App Engine application."
  else
    log "App Engine application already exists in this project."
  fi
}

# Create Cloud SQL instance if it doesn't exist
setup_cloud_sql() {
  if [ "$SKIP_DB_CREATION" = true ]; then
    log "Skipping Cloud SQL setup as requested..."
    
    # Try to get connection information even if skipping creation
    if gcloud sql instances describe $SQL_INSTANCE_NAME &> /dev/null; then
      SQL_CONNECTION_NAME=$(gcloud sql instances describe $SQL_INSTANCE_NAME --format='value(connectionName)')
      log "Using existing Cloud SQL connection: $SQL_CONNECTION_NAME"
    else
      handle_error "Cloud SQL instance $SQL_INSTANCE_NAME does not exist but --skip-db-creation was specified. Please create the database first or remove the --skip-db-creation flag."
    fi
    
    return 0
  fi

  log "Setting up Cloud SQL..."
  
  # Check if Cloud SQL instance exists
  if gcloud sql instances describe $SQL_INSTANCE_NAME &> /dev/null; then
    log "Cloud SQL instance $SQL_INSTANCE_NAME already exists."
    SQL_CONNECTION_NAME=$(gcloud sql instances describe $SQL_INSTANCE_NAME --format='value(connectionName)')
    log "Cloud SQL connection name: $SQL_CONNECTION_NAME"
    
    # Load environment variables from environment file
    source $BACKEND_ENV_FILE
    
    # Check if database exists
    if ! gcloud sql databases describe ${POSTGRES_DB:-gsec} --instance=$SQL_INSTANCE_NAME &> /dev/null; then
      log "Database ${POSTGRES_DB:-gsec} does not exist. Creating..."
      gcloud sql databases create ${POSTGRES_DB:-gsec} --instance=$SQL_INSTANCE_NAME || log "WARNING: Failed to create database. It may already exist or you may not have sufficient permissions."
    else
      log "Database ${POSTGRES_DB:-gsec} already exists."
    fi
    
    # Check if user exists (this will always fail with a warning as there's no direct way to check)
    log "Ensuring database user exists..."
    gcloud sql users create ${POSTGRES_USER:-gsec_user} \
      --instance=$SQL_INSTANCE_NAME \
      --password="${POSTGRES_PASSWORD:-$(openssl rand -base64 12)}" &> /dev/null || log "WARNING: User creation failed. The user may already exist or you may not have sufficient permissions."
  else
    log "Creating new Cloud SQL instance..."
    gcloud sql instances create $SQL_INSTANCE_NAME \
      --database-version=POSTGRES_14 \
      --tier=db-f1-micro \
      --region=$REGION \
      --storage-size=10GB \
      --storage-type=SSD \
      --backup-start-time=04:00 \
      --availability-type=zonal || handle_error "Failed to create Cloud SQL instance."
    
    # Load environment variables from environment file
    source $BACKEND_ENV_FILE
    
    # Create database
    log "Creating database..."
    gcloud sql databases create ${POSTGRES_DB:-gsec} --instance=$SQL_INSTANCE_NAME || handle_error "Failed to create database."
    
    # Create user
    log "Creating database user..."
    gcloud sql users create ${POSTGRES_USER:-gsec_user} \
      --instance=$SQL_INSTANCE_NAME \
      --password="${POSTGRES_PASSWORD:-$(openssl rand -base64 12)}" || handle_error "Failed to create database user."
    
    # Get connection information
    SQL_CONNECTION_NAME=$(gcloud sql instances describe $SQL_INSTANCE_NAME --format='value(connectionName)')
    log "Cloud SQL connection name: $SQL_CONNECTION_NAME"
  fi
}

# Store sensitive information in Google Secret Manager
store_secrets() {
  if [ "$SKIP_SECRET_MANAGER" = true ]; then
    log "Skipping Google Secret Manager step as requested..."
    return 0
  fi

  log "Storing sensitive information in Google Secret Manager for $DEPLOY_ENV environment..."
  
  # Load environment variables from environment file
  source $BACKEND_ENV_FILE
  
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
    echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- || log "WARNING: Failed to update secret $SECRET_NAME. Check your permissions."
  else
    # Create new secret
    echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --replication-policy="automatic" --data-file=- || log "WARNING: Failed to create secret $SECRET_NAME. Check your permissions."
  fi
  
  # Grant access to App Engine service account
  SERVICE_ACCOUNT="$PROJECT_ID@appspot.gserviceaccount.com"
  gcloud secrets add-iam-policy-binding $SECRET_NAME \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" || log "WARNING: Failed to grant access to secret $SECRET_NAME. Check your permissions."
}

# Build frontend
build_frontend() {
  log "Building frontend..."
  
  # Navigate to frontend directory
  cd frontend || handle_error "Failed to navigate to frontend directory."
  
  # Install dependencies
  log "Installing frontend dependencies..."
  npm install --legacy-peer-deps || handle_error "Failed to install frontend dependencies."
  
  # Build the frontend
  log "Building frontend for production..."
  npm run build || handle_error "Failed to build frontend."
  
  # Check if build directory exists
  if [[ ! -d "build" ]]; then
    handle_error "Frontend build directory does not exist after build. Check for build errors."
  fi
  
  # Navigate back to root directory
  cd ..
  
  log "Frontend built successfully."
}

# Prepare deployment directory
prepare_deployment() {
  log "Preparing deployment directory..."
  
  # Remove existing temporary directory if it exists
  if [[ -d "$TEMP_DIR" ]]; then
    log "Removing existing temporary directory..."
    rm -rf $TEMP_DIR
  fi
  
  # Create temporary directory
  mkdir -p $TEMP_DIR || handle_error "Failed to create temporary directory."
  
  # Copy backend files
  log "Copying backend files..."
  cp -r backend/* $TEMP_DIR/ || handle_error "Failed to copy backend files."
  
  # Create static directory for frontend
  mkdir -p $TEMP_DIR/static || handle_error "Failed to create static directory."
  
  # Check if frontend build directory exists
  if [[ ! -d "frontend/build" ]]; then
    handle_error "Frontend build directory does not exist. Make sure the frontend build was successful."
  fi
  
  # Copy frontend build files
  log "Copying frontend build files..."
  cp -r frontend/build/* $TEMP_DIR/static/ || handle_error "Failed to copy frontend build files."
  
  log "Deployment directory prepared."
}

# Update app.yaml with environment variables and static file handling
update_app_yaml() {
  log "Updating app.yaml with environment variables and static file handling..."
  
  # Load environment variables from environment file
  source $BACKEND_ENV_FILE
  
  # Create app.yaml in the deployment directory
  cat > $TEMP_DIR/app.yaml << EOL
runtime: python312

entrypoint: gunicorn application:application -w 4 -k uvicorn.workers.UvicornWorker

instance_class: F2

env_variables:
  ENVIRONMENT: "$DEPLOY_ENV"
EOL

  # Add database connection
  SQL_CONNECTION_NAME=$(gcloud sql instances describe $SQL_INSTANCE_NAME --format='value(connectionName)')
  
  if [ "$SKIP_SECRET_MANAGER" = true ]; then
    # Add environment variables directly
    cat >> $TEMP_DIR/app.yaml << EOL
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
    cat >> $TEMP_DIR/app.yaml << EOL
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
  
  # Add Cloud SQL connection and handlers for static files
  cat >> $TEMP_DIR/app.yaml << EOL

beta_settings:
  cloud_sql_instances: $SQL_CONNECTION_NAME

handlers:
# API handlers
- url: /docs.*
  script: auto
  secure: always

- url: /openapi.json
  script: auto
  secure: always

- url: /api/.*
  script: auto
  secure: always

# Static file handlers
- url: /static
  static_dir: static
  secure: always

- url: /(.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))$
  static_files: static/\1
  upload: static/.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$
  secure: always

# All other routes go to index.html for React Router
- url: /.*
  static_files: static/index.html
  upload: static/index.html
  secure: always

automatic_scaling:
  min_instances: 1
  max_instances: 5
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.65
  max_concurrent_requests: 50
EOL

  log "app.yaml updated successfully."
}

# Update FastAPI CORS settings to allow the App Engine domain
update_cors_settings() {
  log "Updating CORS settings in the backend code..."
  
  # Find the CORS middleware in app.py
  if grep -q "CORSMiddleware" $TEMP_DIR/app.py; then
    # Check if the App Engine domain is already in the allow_origins list
    if grep -q "https://$PROJECT_ID.appspot.com" $TEMP_DIR/app.py; then
      log "App Engine domain is already in the CORS allow_origins list."
    else
      # Update the allow_origins list to include the App Engine domain
      # This sed command is for macOS, for Linux use: sed -i
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|allow_origins=\[\(.*\)\]|allow_origins=[\1, \"https://$PROJECT_ID.appspot.com\"]|" $TEMP_DIR/app.py || log "WARNING: Failed to update CORS settings. You may need to update them manually."
      else
        # Linux
        sed -i "s|allow_origins=\[\(.*\)\]|allow_origins=[\1, \"https://$PROJECT_ID.appspot.com\"]|" $TEMP_DIR/app.py || log "WARNING: Failed to update CORS settings. You may need to update them manually."
      fi
      log "CORS settings updated to allow the App Engine domain."
    fi
  else
    log "WARNING: Could not find CORS middleware in app.py. Please update manually."
  fi
}

# Check Python dependencies for conflicts
check_python_dependencies() {
  log "Checking Python dependencies for conflicts..."
  
  # Create a temporary virtual environment
  TEMP_VENV="temp_venv"
  
  # Check if python3 is available
  if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
  elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
  else
    handle_error "Python is not installed. Please install Python 3.12 or later."
  fi
  
  # Create virtual environment
  $PYTHON_CMD -m venv $TEMP_VENV || log "WARNING: Failed to create virtual environment. Skipping dependency check."
  
  # Activate virtual environment
  if [[ -d "$TEMP_VENV" ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      source $TEMP_VENV/bin/activate || log "WARNING: Failed to activate virtual environment. Skipping dependency check."
    else
      # Linux
      source $TEMP_VENV/bin/activate || log "WARNING: Failed to activate virtual environment. Skipping dependency check."
    fi
    
    # Install dependencies
    if [[ -f "backend/requirements.txt" ]]; then
      pip install -r backend/requirements.txt &> /dev/null || {
        log "WARNING: Dependency conflicts detected in requirements.txt."
        log "Please check the requirements.txt file and resolve any conflicts."
        log "You can try running 'pip install -r backend/requirements.txt' locally to see the specific conflicts."
        log "Continuing with deployment, but it may fail during the build process."
      }
    fi
    
    # Deactivate virtual environment
    deactivate || true
    
    # Remove virtual environment
    rm -rf $TEMP_VENV || true
  fi
  
  log "Dependency check completed."
}

# Deploy to Google App Engine
deploy_to_gae() {
  log "Deploying to Google App Engine..."
  
  # Navigate to the deployment directory
  cd $TEMP_DIR || handle_error "Failed to navigate to deployment directory."
  
  # Deploy the application
  gcloud app deploy app.yaml --quiet || handle_error "Failed to deploy to Google App Engine."
  
  # Navigate back to root directory
  cd ..
  
  log "Deployment completed successfully!"
}

# Clean up temporary files
cleanup() {
  log "Cleaning up temporary files..."
  
  # Remove temporary directory
  rm -rf $TEMP_DIR || log "WARNING: Failed to clean up temporary directory."
  
  log "Cleanup completed."
}

# Main execution
main() {
  log "Starting full-stack deployment process for AOLF GSEC to Google App Engine ($DEPLOY_ENV environment)..."
  
  check_gcloud_cli
  ensure_env_files
  init_gcloud_project
  setup_cloud_sql
  store_secrets
  check_python_dependencies
  build_frontend
  prepare_deployment
  update_app_yaml
  update_cors_settings
  deploy_to_gae
  cleanup
  
  log "Full-stack deployment completed successfully!"
  log "You can access your application at: https://$PROJECT_ID.appspot.com"
  log "To view the application logs, run: gcloud app logs tail"
}

# Execute main function
main 