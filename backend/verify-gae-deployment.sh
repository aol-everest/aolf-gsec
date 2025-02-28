#!/bin/bash
# AOLF GSEC Backend Verification Script for Google App Engine
# This script verifies the deployment of the backend to Google App Engine

# Exit on error
set -e

# Default environment
DEPLOY_ENV="prod"

# Display help
show_help() {
  echo "AOLF GSEC Backend Verification Script for Google App Engine"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV           Specify the deployment environment (prod or uat)"
  echo "  --environment=ENV       Specify the deployment environment (prod or uat)"
  echo "  -h, --help              Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0                      Verify production environment (default)"
  echo "  $0 --env=uat            Verify UAT environment"
  echo "  $0 -e uat               Verify UAT environment"
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
PROJECT_ID="aolf-gsec-$DEPLOY_ENV"
APP_URL="https://$PROJECT_ID.appspot.com"

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

# Check if curl is installed
check_curl() {
  log "Checking if curl is installed..."
  if ! command -v curl &> /dev/null; then
    log "curl is not installed. Please install it."
    exit 1
  else
    log "curl is already installed."
  fi
}

# Check if jq is installed
check_jq() {
  log "Checking if jq is installed..."
  if ! command -v jq &> /dev/null; then
    log "jq is not installed. Please install it."
    exit 1
  else
    log "jq is already installed."
  fi
}

# Verify App Engine deployment
verify_app_engine() {
  log "Verifying App Engine deployment..."
  
  # Check if the application is deployed
  if ! gcloud app describe --project=$PROJECT_ID &> /dev/null; then
    log "ERROR: App Engine application is not deployed."
    exit 1
  else
    log "App Engine application is deployed."
  fi
  
  # Get the default service status
  SERVICE_STATUS=$(gcloud app services describe default --project=$PROJECT_ID --format="value(status)")
  if [[ "$SERVICE_STATUS" != "SERVING" ]]; then
    log "ERROR: App Engine service is not serving. Status: $SERVICE_STATUS"
    exit 1
  else
    log "App Engine service is serving."
  fi
}

# Verify Cloud SQL connection
verify_cloud_sql() {
  log "Verifying Cloud SQL connection..."
  
  # Check if Cloud SQL instance exists
  SQL_INSTANCE_NAME="aolf-gsec-postgres-$DEPLOY_ENV"
  
  if ! gcloud sql instances describe $SQL_INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
    log "ERROR: Cloud SQL instance $SQL_INSTANCE_NAME does not exist."
    exit 1
  else
    log "Cloud SQL instance $SQL_INSTANCE_NAME exists."
    
    # Check if the instance is running
    SQL_STATE=$(gcloud sql instances describe $SQL_INSTANCE_NAME --project=$PROJECT_ID --format="value(state)")
    if [[ "$SQL_STATE" != "RUNNABLE" ]]; then
      log "ERROR: Cloud SQL instance is not running. State: $SQL_STATE"
      exit 1
    else
      log "Cloud SQL instance is running."
    fi
  fi
}

# Verify API endpoints
verify_api_endpoints() {
  log "Verifying API endpoints..."
  
  # Check if the API is accessible
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL)
  if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "404" ]]; then
    log "ERROR: API is not accessible. HTTP status: $HTTP_STATUS"
    exit 1
  else
    log "API is accessible."
  fi
  
  # Check if the OpenAPI documentation is accessible
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL/docs)
  if [[ "$HTTP_STATUS" != "200" ]]; then
    log "ERROR: OpenAPI documentation is not accessible. HTTP status: $HTTP_STATUS"
    exit 1
  else
    log "OpenAPI documentation is accessible."
  fi
  
  # Check if the API is working by calling a simple endpoint
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL/appointments/status-options)
  if [[ "$HTTP_STATUS" != "200" ]]; then
    log "ERROR: API endpoint is not working. HTTP status: $HTTP_STATUS"
    exit 1
  else
    log "API endpoint is working."
  fi
}

# Check application logs for errors
check_logs() {
  log "Checking application logs for errors..."
  
  # Get the latest logs
  LOGS=$(gcloud app logs read --project=$PROJECT_ID --limit=50 --format="value(message)")
  
  # Check for error messages
  if echo "$LOGS" | grep -i "error\|exception\|fail" &> /dev/null; then
    log "WARNING: Found potential errors in the logs:"
    echo "$LOGS" | grep -i "error\|exception\|fail"
  else
    log "No obvious errors found in the logs."
  fi
}

# Main execution
main() {
  log "Starting verification process for AOLF GSEC Backend on Google App Engine ($DEPLOY_ENV environment)..."
  
  check_gcloud_cli
  check_curl
  check_jq
  verify_app_engine
  verify_cloud_sql
  verify_api_endpoints
  check_logs
  
  log "Verification completed successfully!"
  log "Your application is accessible at: $APP_URL"
  log "OpenAPI documentation is available at: $APP_URL/docs"
}

# Execute main function
main 