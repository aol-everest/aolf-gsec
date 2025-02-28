#!/bin/bash
# AOLF GSEC Fullstack Deployment Script for Google App Engine
# This script automates the deployment of the frontend and backend to Google App Engine

# Exit on error
set -e

# Set script directory and load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMMON_DIR="$SCRIPT_DIR/../common"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Source common utility functions
source "$COMMON_DIR/env-utils.sh"

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
  echo "Usage: $0 -p <PROJECT_ID> [--env=<ENVIRONMENT>] [--version=<VERSION>]"
  echo ""
  echo "Options:"
  echo "  -p, --project <PROJECT_ID>    Google Cloud project ID (required)"
  echo "  --env <ENVIRONMENT>           Deployment environment (dev, uat, prod) (default: uat)"
  echo "  --version <VERSION>           Version identifier for deployment (default: timestamp)"
  echo "  -h, --help                    Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 -p my-gae-project --env=uat"
  echo "  $0 -p my-gae-project --env=prod --version=v1-0-0"
  exit 1
}

# Default values
DEPLOY_ENV="uat"
VERSION=$(date +%Y%m%dt%H%M%S)
PROJECT_ID=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --env=*)
      DEPLOY_ENV="${1#*=}"
      shift
      ;;
    --version=*)
      VERSION="${1#*=}"
      shift
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

# Set service names based on environment
if [[ "$DEPLOY_ENV" == "prod" ]]; then
  FRONTEND_SERVICE="default"
  BACKEND_SERVICE="backend"
  log "Deploying to PRODUCTION environment. Service names: Frontend=$FRONTEND_SERVICE, Backend=$BACKEND_SERVICE"
else
  FRONTEND_SERVICE="default"
  BACKEND_SERVICE="backend-$DEPLOY_ENV"
  log "Deploying to $DEPLOY_ENV environment. Service names: Frontend=$FRONTEND_SERVICE, Backend=$BACKEND_SERVICE"
fi

# Build the frontend application
build_frontend() {
  log "Building frontend application for $DEPLOY_ENV environment..."
  cd "$FRONTEND_DIR"
  
  # Use the common build function
  build_with_env "$DEPLOY_ENV"
  
  if [[ ! -d "build" ]]; then
    handle_error "Frontend build failed. Check the logs for errors."
  fi
  
  log "Frontend build completed successfully."
  cd "$PROJECT_ROOT"
}

# Deploy backend
deploy_backend() {
  log "Deploying backend to GAE service: $BACKEND_SERVICE"
  cd "$BACKEND_DIR"
  
  # Create app.yaml if not exists
  if [[ ! -f "app.yaml" ]]; then
    log "Creating app.yaml for backend..."
    cat > app.yaml << EOL
runtime: python39
service: $BACKEND_SERVICE
instance_class: F2
EOL
  else
    # Update service name in existing app.yaml
    sed -i '' "s/^service:.*/service: $BACKEND_SERVICE/" app.yaml
  fi
  
  # Deploy to GAE
  gcloud app deploy --project="$PROJECT_ID" --version="$VERSION" --quiet
  
  log "Backend deployment completed."
  cd "$PROJECT_ROOT"
}

# Deploy frontend
deploy_frontend() {
  log "Deploying frontend to GAE service: $FRONTEND_SERVICE"
  cd "$FRONTEND_DIR"
  
  # Create app.yaml for frontend if not exists
  if [[ ! -f "app.yaml" ]]; then
    log "Creating app.yaml for frontend..."
    cat > app.yaml << EOL
runtime: nodejs16
service: $FRONTEND_SERVICE
handlers:
- url: /static
  static_dir: build/static
  secure: always

- url: /(.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))
  static_files: build/\1
  upload: build/.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$
  secure: always

- url: /.*
  static_files: build/index.html
  upload: build/index.html
  secure: always
EOL
  else
    # Update service name in existing app.yaml
    sed -i '' "s/^service:.*/service: $FRONTEND_SERVICE/" app.yaml
  fi
  
  # Deploy to GAE
  gcloud app deploy --project="$PROJECT_ID" --version="$VERSION" --quiet
  
  log "Frontend deployment completed."
  cd "$PROJECT_ROOT"
}

# Main execution
log "Starting AOLF GSEC deployment to Google App Engine"
log "Project ID: $PROJECT_ID"
log "Environment: $DEPLOY_ENV"
log "Version: $VERSION"
echo ""

# Build and deploy
build_frontend
deploy_backend
deploy_frontend

log "Deployment completed successfully!"
log "Your application is deployed at:"
log "Frontend: https://$PROJECT_ID.appspot.com"
log "Backend: https://$BACKEND_SERVICE-dot-$PROJECT_ID.appspot.com" 