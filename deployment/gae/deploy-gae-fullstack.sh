#!/bin/bash
# AOLF GSEC Fullstack Deployment Script for Google App Engine
# This script automates the deployment of the frontend and backend to Google App Engine

# Security Note:
# This script handles sensitive information such as database credentials and API keys.
# Best practices:
# 1. Never hardcode secrets directly in this script
# 2. Use environment files (.env.*) for configuration
# 3. Store sensitive information in Google Secret Manager
# 4. Ensure .env files are not committed to version control

# Exit on error
set -e

# Set script directory and load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMMON_DIR="$SCRIPT_DIR/../common"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
TEMP_DIR="$PROJECT_ROOT/temp_deploy"

# Source common utility functions
source "$COMMON_DIR/env-utils.sh"
source "$COMMON_DIR/gcp-utils.sh"

# Function for colorized logging
log() {
  echo -e "\e[34m[INFO]\e[0m $1"
}

# Error handling function
handle_error() {
  echo -e "\e[31m[ERROR]\e[0m $1"
  exit 1
}

# Display usage information
usage() {
  echo "Usage: $0 -p <PROJECT_ID> [options]"
  echo ""
  echo "Options:"
  echo "  -p, --project <PROJECT_ID>    Google Cloud project ID (required)"
  echo "  --env <ENVIRONMENT>           Deployment environment (dev, uat, prod) (default: uat)"
  echo "  --version <VERSION>           Version identifier for deployment (default: timestamp)"
  echo "  --skip-secret-manager         Skip storing parameters in Google Secret Manager"
  echo "  --skip-db-creation            Skip Cloud SQL database creation (use if DB already exists)"
  echo "  --region <REGION>             GCP region for resources (default: us-central1)"
  echo "  -h, --help                    Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 -p my-gae-project --env=uat"
  echo "  $0 -p my-gae-project --env=prod --version=v1-0-0"
  echo "  $0 -p my-gae-project --skip-db-creation --region=us-west1"
  exit 1
}

# Default values
DEPLOY_ENV="uat"
VERSION=$(date +%Y%m%dt%H%M%S)
PROJECT_ID=""
SKIP_SECRET_MANAGER=false
SKIP_DB_CREATION=false
REGION="us-central1"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --project=*)
      PROJECT_ID="${1#*=}"
      shift
      ;;
    --env=*)
      DEPLOY_ENV="${1#*=}"
      shift
      ;;
    --env)
      DEPLOY_ENV="$2"
      shift 2
      ;;
    --version=*)
      VERSION="${1#*=}"
      shift
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --skip-secret-manager)
      SKIP_SECRET_MANAGER=true
      shift
      ;;
    --skip-db-creation)
      SKIP_DB_CREATION=true
      shift
      ;;
    --region=*)
      REGION="${1#*=}"
      shift
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

# Check if project ID is provided
if [[ -z "$PROJECT_ID" ]]; then
  handle_error "Project ID is required. Use -p or --project flag."
fi

# Validate environment
validate_environment "$DEPLOY_ENV"

# Main execution
log "Starting AOLF GSEC unified deployment to Google App Engine"
log "Project ID: $PROJECT_ID"
log "Environment: $DEPLOY_ENV"
log "Version: $VERSION"
log "Region: $REGION"
echo ""

# Check if hardcoded app.yaml exists
if [[ ! -f "$SCRIPT_DIR/app.yaml" ]]; then
  handle_error "Hardcoded app.yaml file not found at $SCRIPT_DIR/app.yaml. Please ensure it exists."
fi

# Initialize Google Cloud project and enable required APIs
init_gcloud_project() {
  log "Initializing Google Cloud project: $PROJECT_ID"
  
  # Enable required APIs
  enable_required_apis "$PROJECT_ID" || handle_error "Failed to enable required APIs."
  
  # Check if App Engine application exists
  if ! gcloud app describe --project="$PROJECT_ID" &> /dev/null; then
    log "App Engine application does not exist in this project. Creating..."
    log "You will need to select a region for your App Engine application."
    gcloud app create --region="$REGION" --project="$PROJECT_ID" || handle_error "Failed to create App Engine application."
  else
    log "App Engine application already exists in this project."
  fi
}

# Ensure environment files exist
ensure_env_files() {
  log "Checking environment files..."
  
  # Backend environment file
  if [[ ! -f "$BACKEND_DIR/.env.$DEPLOY_ENV" ]]; then
    log "Creating backend environment file for $DEPLOY_ENV..."
    if [[ "$DEPLOY_ENV" == "prod" && -f "$BACKEND_DIR/.env.uat" ]]; then
      cp "$BACKEND_DIR/.env.uat" "$BACKEND_DIR/.env.prod"
    elif [[ "$DEPLOY_ENV" == "uat" && -f "$BACKEND_DIR/.env.dev" ]]; then
      cp "$BACKEND_DIR/.env.dev" "$BACKEND_DIR/.env.uat"
    elif [[ -f "$BACKEND_DIR/.env.example" ]]; then
      cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env.$DEPLOY_ENV"
    else
      log "WARNING: No template found for backend environment file. Creating empty file."
      touch "$BACKEND_DIR/.env.$DEPLOY_ENV"
    fi
    log "Please review and update the backend environment file if needed."
  fi
  
  # Frontend environment file - ensure environment-specific file exists
  if [[ ! -f "$FRONTEND_DIR/.env.$DEPLOY_ENV" ]]; then
    log "Creating frontend environment file for $DEPLOY_ENV..."
    if [[ -f "$FRONTEND_DIR/.env.example" ]]; then
      cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env.$DEPLOY_ENV"
    else
      log "WARNING: No template found for frontend environment file. Creating empty file."
      touch "$FRONTEND_DIR/.env.$DEPLOY_ENV"
    fi
    log "Please review and update the frontend environment file if needed."
  fi
  
  # Update frontend environment with environment-specific API URL
  local API_URL=""
  if [[ "$DEPLOY_ENV" == "prod" ]]; then
    API_URL="https://aolf-gsec-prod.appspot.com"
  elif [[ "$DEPLOY_ENV" == "uat" ]]; then
    API_URL="https://aolf-gsec-uat.appspot.com"
  elif [[ "$DEPLOY_ENV" == "dev" || "$DEPLOY_ENV" == "development" ]]; then
    API_URL="https://aolf-gsec-dev.appspot.com"
  else
    API_URL="https://$PROJECT_ID.appspot.com"
  fi
  
  log "Updating frontend environment with API URL: $API_URL for environment: $DEPLOY_ENV"
  
  # Update the environment-specific file
  create_env_file "$DEPLOY_ENV" "$FRONTEND_DIR" "$API_URL"
  
  # Copy environment-specific file to main .env to ensure it's used during build
  cp "$FRONTEND_DIR/.env.$DEPLOY_ENV" "$FRONTEND_DIR/.env"
  log "Copied $DEPLOY_ENV environment configuration to main .env file for build process"
  
  # Add security warning
  log "SECURITY WARNING: Ensure that your .env files do not contain hardcoded secrets."
  log "Consider using Secret Manager or other secure methods to manage sensitive information."
}

# Build the frontend application
build_frontend() {
  log "Building frontend application for $DEPLOY_ENV environment..."
  cd "$FRONTEND_DIR"
  
  # Clean up existing build directory (handle sudo if needed)
  if [[ -d "build" ]]; then
    log "Removing existing build directory..."
    rm -rf build 2>/dev/null || sudo rm -rf build || log "WARNING: Could not remove build directory. Continuing anyway."
  fi
  
  # Clean environment files and create a fresh one
  log "Creating fresh environment file for $DEPLOY_ENV..."
  # Remove any existing .env file to avoid confusion
  rm -f .env 2>/dev/null || sudo rm -f .env
  
  # Create a clean environment file with environment-specific settings
  if [[ "$DEPLOY_ENV" == "uat" ]]; then
    cat > .env << EOL
# UAT Environment Configuration
REACT_APP_API_URL=https://aolf-gsec-uat.appspot.com
REACT_APP_ENVIRONMENT=uat
REACT_APP_API_BASE_URL=https://aolf-gsec-uat.appspot.com
EOL
    log "Created UAT environment file with basic settings."
  elif [[ "$DEPLOY_ENV" == "prod" ]]; then
    cat > .env << EOL
# Production Environment Configuration
REACT_APP_API_URL=https://aolf-gsec-prod.appspot.com
REACT_APP_ENVIRONMENT=production
REACT_APP_API_BASE_URL=https://aolf-gsec-prod.appspot.com
EOL
    log "Created Production environment file with basic settings."
  else
    # For other environments, use the existing template approach
    cp ".env.$DEPLOY_ENV" ".env" || handle_error "Failed to copy environment file."
    log "Copied $DEPLOY_ENV environment settings to .env."
  fi
  
  # Load additional environment variables from backend .env file if they exist
  if [[ -f "$BACKEND_DIR/.env.$DEPLOY_ENV" ]]; then
    log "Loading additional environment variables from backend .env.$DEPLOY_ENV file..."
    # Source the backend environment file to get variables
    source "$BACKEND_DIR/.env.$DEPLOY_ENV"
    
    # Append necessary variables to frontend .env file
    if [[ -n "$GOOGLE_CLIENT_ID" ]]; then
      echo "REACT_APP_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> .env
    fi
    
    # Add any other variables that need to be transferred from backend to frontend
    # but don't hardcode sensitive values
  fi
  
  # Debug output to verify environment settings
  log "Environment file (.env) contents:"
  cat .env
  
  # Install dependencies
  log "Installing frontend dependencies..."
  npm install --legacy-peer-deps || handle_error "Failed to install frontend dependencies."
  
  # Use direct environment variables during build for extra clarity
  log "Starting build process with $DEPLOY_ENV environment..."
  if [[ "$DEPLOY_ENV" == "uat" ]]; then
    log "Using explicit environment variables for UAT build"
    REACT_APP_API_URL=https://aolf-gsec-uat.appspot.com \
    REACT_APP_ENVIRONMENT=uat \
    REACT_APP_API_BASE_URL=https://aolf-gsec-uat.appspot.com \
    npm run build || handle_error "Build failed with explicit environment variables."
  else
    # Use the environment-specific build script for other environments
    NODE_ENV=$DEPLOY_ENV npm run build:$DEPLOY_ENV || handle_error "Build failed with environment-specific script."
  fi
  
  if [[ ! -d "build" ]]; then
    handle_error "Frontend build failed. Check the logs for errors."
  fi
  
  # Verify the build contains the correct API URL
  log "Verifying built JavaScript files contain the correct API URL..."
  if [[ "$DEPLOY_ENV" == "uat" ]]; then
    if grep -q "aolf-gsec-prod.appspot.com" build/static/js/main*.js; then
      log "ERROR: Built JavaScript contains production URL instead of UAT URL!"
      grep "aolf-gsec-prod.appspot.com" build/static/js/main*.js
      handle_error "Build contains incorrect API URL. Check environment configuration."
    elif grep -q "aolf-gsec-uat.appspot.com" build/static/js/main*.js; then
      log "SUCCESS: Built JavaScript contains the correct UAT URL."
    else
      log "WARNING: Could not find any API URL in built JavaScript."
    fi
  fi
  
  # Verify static file structure
  verify_static_structure "$FRONTEND_DIR" || log "WARNING: Static file structure verification failed. Continuing anyway."
  
  log "Frontend build completed successfully."
  cd "$PROJECT_ROOT"
}

# Setup database
setup_database() {
  log "Setting up database..."
  
  # Setup Cloud SQL
  SQL_CONNECTION_NAME=$(setup_cloud_sql "$PROJECT_ID" "$DEPLOY_ENV" "$SKIP_DB_CREATION" "$REGION" | tail -n 1)
  
  if [[ -z "$SQL_CONNECTION_NAME" ]]; then
    handle_error "Failed to setup Cloud SQL or get connection name."
  fi
  
  log "Database setup completed. Connection name: $SQL_CONNECTION_NAME"
  
  # Store secrets in Google Secret Manager
  if [ "$SKIP_SECRET_MANAGER" = false ]; then
    store_secrets "$PROJECT_ID" "$DEPLOY_ENV" "$SKIP_SECRET_MANAGER" "$PROJECT_ROOT" || log "WARNING: Failed to store secrets in Google Secret Manager."
  fi
  
  return 0
}

# Verify static file structure
verify_static_structure() {
  log "Verifying static file structure before deployment..."
  local frontend_dir="$1"
  
  # Check if the build directory exists
  if [[ ! -d "$frontend_dir/build" ]]; then
    handle_error "Build directory does not exist in the frontend directory."
  fi
  
  # Check if the CSS directory exists
  if [[ ! -d "$frontend_dir/build/static/css" ]]; then
    log "WARNING: CSS directory not found in the expected location."
  else
    CSS_FILES=$(find "$frontend_dir/build/static/css" -name "*.css" | wc -l)
    log "Found $CSS_FILES CSS files in the expected location."
  fi
  
  # Check if the JS directory exists
  if [[ ! -d "$frontend_dir/build/static/js" ]]; then
    log "WARNING: JS directory not found in the expected location."
  else
    JS_FILES=$(find "$frontend_dir/build/static/js" -name "*.js" | wc -l)
    log "Found $JS_FILES JS files in the expected location."
  fi
  
  log "Static file structure verification completed."
  return 0
}

# Prepare deployment directory
prepare_deployment() {
  log "Preparing unified deployment directory..."
  
  # Remove existing temporary directory if it exists
  if [[ -d "$TEMP_DIR" ]]; then
    log "Removing existing temporary directory..."
    rm -rf "$TEMP_DIR"
  fi
  
  # Create temporary directory
  mkdir -p "$TEMP_DIR" || handle_error "Failed to create temporary directory."
  
  # Copy backend files
  log "Copying backend files..."
  cp -r "$BACKEND_DIR"/* "$TEMP_DIR"/ || handle_error "Failed to copy backend files."
  
  # Create static directory for frontend
  mkdir -p "$TEMP_DIR/static" || handle_error "Failed to create static directory."
  
  # Copy frontend build files
  log "Copying frontend build files..."
  cp -r "$FRONTEND_DIR/build"/* "$TEMP_DIR/static"/ || handle_error "Failed to copy frontend build files."
  
  log "Deployment directory prepared."
}

# Create unified app.yaml
create_unified_app_yaml() {
  log "Using hardcoded app.yaml for fullstack deployment..."
  
  # Get backend environment variables
  source "$BACKEND_DIR/.env.$DEPLOY_ENV"
  
  # Copy the hardcoded app.yaml to the deployment directory
  cp "$SCRIPT_DIR/app.yaml" "$TEMP_DIR/app.yaml"
  
  # Replace environment variables in the app.yaml
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|\${DEPLOY_ENV}|$DEPLOY_ENV|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${SQL_CONNECTION_NAME}|$SQL_CONNECTION_NAME|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${POSTGRES_DB}|$POSTGRES_DB|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${POSTGRES_USER}|$POSTGRES_USER|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${POSTGRES_PASSWORD}|$POSTGRES_PASSWORD|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${JWT_SECRET_KEY}|$JWT_SECRET_KEY|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${GOOGLE_CLIENT_ID}|$GOOGLE_CLIENT_ID|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${SENDGRID_API_KEY}|$SENDGRID_API_KEY|g" "$TEMP_DIR/app.yaml"
    sed -i '' "s|\${FROM_EMAIL}|$FROM_EMAIL|g" "$TEMP_DIR/app.yaml"
  else
    # Linux
    sed -i "s|\${DEPLOY_ENV}|$DEPLOY_ENV|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${SQL_CONNECTION_NAME}|$SQL_CONNECTION_NAME|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${POSTGRES_DB}|$POSTGRES_DB|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${POSTGRES_USER}|$POSTGRES_USER|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${POSTGRES_PASSWORD}|$POSTGRES_PASSWORD|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${JWT_SECRET_KEY}|$JWT_SECRET_KEY|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${GOOGLE_CLIENT_ID}|$GOOGLE_CLIENT_ID|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${SENDGRID_API_KEY}|$SENDGRID_API_KEY|g" "$TEMP_DIR/app.yaml"
    sed -i "s|\${FROM_EMAIL}|$FROM_EMAIL|g" "$TEMP_DIR/app.yaml"
  fi

  log "app.yaml prepared with environment-specific values."
}

# Update FastAPI CORS settings
update_cors_settings() {
  log "Updating CORS settings in the backend code..."
  
  # Find the CORS middleware in the backend files
  if grep -q "CORSMiddleware" "$TEMP_DIR/app.py"; then
    # Define allowed origins based on environment
    local ALLOWED_ORIGINS=()
    
    # Always add the current project ID
    ALLOWED_ORIGINS+=("https://$PROJECT_ID.appspot.com")
    
    # Add environment-specific domains
    if [[ "$DEPLOY_ENV" == "prod" ]]; then
      ALLOWED_ORIGINS+=("https://aolf-gsec-prod.appspot.com")
    elif [[ "$DEPLOY_ENV" == "uat" ]]; then
      ALLOWED_ORIGINS+=("https://aolf-gsec-uat.appspot.com")
      # In UAT, also allow requests from prod for testing
      # ALLOWED_ORIGINS+=("https://aolf-gsec-prod.appspot.com")
    elif [[ "$DEPLOY_ENV" == "dev" || "$DEPLOY_ENV" == "development" ]]; then
      ALLOWED_ORIGINS+=("https://aolf-gsec-dev.appspot.com")
      # In dev, allow requests from other environments
      # ALLOWED_ORIGINS+=("https://aolf-gsec-uat.appspot.com")
      # ALLOWED_ORIGINS+=("https://aolf-gsec-prod.appspot.com")
    fi
    
    # Log the domains we're adding
    log "Adding the following domains to CORS allow_origins:"
    for origin in "${ALLOWED_ORIGINS[@]}"; do
      log "  - $origin"
    done
    
    # Check if each origin is already in the allow_origins list
    for origin in "${ALLOWED_ORIGINS[@]}"; do
      if ! grep -q "$origin" "$TEMP_DIR/app.py"; then
        # Add this origin to the CORS configuration
        if [[ "$OSTYPE" == "darwin"* ]]; then
          # macOS
          sed -i '' "s|allow_origins=\[\(.*\)\]|allow_origins=[\1, \"$origin\"]|" "$TEMP_DIR/app.py" || \
          log "WARNING: Failed to add $origin to CORS settings. You may need to update them manually."
        else
          # Linux
          sed -i "s|allow_origins=\[\(.*\)\]|allow_origins=[\1, \"$origin\"]|" "$TEMP_DIR/app.py" || \
          log "WARNING: Failed to add $origin to CORS settings. You may need to update them manually."
        fi
        log "Added $origin to CORS allow_origins."
      else
        log "$origin is already in the CORS allow_origins list."
      fi
    done
  else
    log "WARNING: Could not find CORS middleware in app.py. Please update manually."
  fi
}

# Check Python dependencies
check_python_dependencies() {
  log "Checking Python dependencies..."
  
  cd "$BACKEND_DIR"
  
  # Check if requirements.txt exists
  if [[ ! -f "requirements.txt" ]]; then
    log "WARNING: requirements.txt not found in backend directory."
    cd "$PROJECT_ROOT"
    return 1
  fi
  
  # Try to install requirements in a temporary virtual environment
  if command -v python3 &> /dev/null; then
    log "Creating temporary virtual environment to check dependencies..."
    
    # Clean up any previous temporary venv
    if [[ -d ".temp_venv" ]]; then
      rm -rf ".temp_venv"
    fi
    
    # Create and activate venv
    python3 -m venv .temp_venv
    
    if [[ -d ".temp_venv" ]]; then
      source .temp_venv/bin/activate
      pip install -r requirements.txt > /dev/null 2>&1 || {
        log "WARNING: Some dependencies might have conflicts."
        deactivate
        rm -rf .temp_venv
        cd "$PROJECT_ROOT"
        return 1
      }
      
      deactivate
      rm -rf .temp_venv
    else
      log "WARNING: Failed to create virtual environment for dependency check."
      cd "$PROJECT_ROOT"
      return 1
    fi
  else
    log "WARNING: Python 3 not found, skipping dependency check."
    cd "$PROJECT_ROOT"
    return 1
  fi
  
  cd "$PROJECT_ROOT"
  log "Python dependencies check completed."
  return 0
}

# Deploy to Google App Engine
deploy_to_gae() {
  log "Deploying to Google App Engine..."
  
  # Go to the deployment directory
  cd "$TEMP_DIR" || handle_error "Failed to navigate to deployment directory."
  
  # Deploy the application
  gcloud app deploy --project="$PROJECT_ID" --version="$VERSION" --quiet || handle_error "Failed to deploy to GAE."
  
  # Return to project root
  cd "$PROJECT_ROOT"
  
  log "Deployment to Google App Engine completed successfully."
}

# Clean up files
cleanup() {
  log "Cleaning up deployment files..."
  
  # Remove temporary deployment directory
  if [[ -d "$TEMP_DIR" ]]; then
    # Archive the modified app.yaml for reference
    mkdir -p app-yaml-archive && cp "$TEMP_DIR/app.yaml" "app-yaml-archive/app.yaml.$VERSION" && rm -rf "$TEMP_DIR" || log "WARNING: Failed to remove temporary deployment directory."
  fi
  
  # We no longer need to remove app.yaml files since we're using a hardcoded one
  
  log "Cleanup completed."
}

# Initialize and setup
init_gcloud_project
ensure_env_files
setup_database

# Build frontend and prepare for deployment
build_frontend
check_python_dependencies
prepare_deployment
create_unified_app_yaml
update_cors_settings

# Deploy the unified application
deploy_to_gae

# Cleanup
cleanup

log "Deployment completed successfully!"
log "Your application is deployed at: https://$PROJECT_ID.appspot.com"
log "To view the application logs, run: gcloud app logs tail --project=$PROJECT_ID" 
