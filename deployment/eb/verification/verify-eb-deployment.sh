#!/bin/bash
# Deployment verification script for AOLF GSEC Backend on Elastic Beanstalk

# Exit on error
set -e

# Default environment
DEPLOY_ENV="prod"

# Display help
show_help() {
  echo "AOLF GSEC Backend Deployment Verification Script"
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
APP_NAME="aolf-gsec-backend"
ENV_NAME="aolf-gsec-backend-$DEPLOY_ENV"
REGION="us-east-2"

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if EB CLI is installed
check_eb_cli() {
  log "Checking if EB CLI is installed..."
  if ! command -v eb &> /dev/null; then
    log "❌ EB CLI is not installed. Please install it with: pip install awsebcli"
    exit 1
  else
    log "✅ EB CLI is installed."
  fi
}

# Check Elastic Beanstalk environment
check_eb_env() {
  log "Checking Elastic Beanstalk environment: $ENV_NAME"
  
  # Check if environment exists
  if eb status $ENV_NAME 2>&1 | grep -q "Environment $ENV_NAME"; then
    log "✅ Elastic Beanstalk environment exists: $ENV_NAME"
    
    # Get environment status
    STATUS=$(eb status $ENV_NAME | grep "Status:" | awk '{print $2}')
    log "Environment status: $STATUS"
    
    if [ "$STATUS" == "Ready" ]; then
      log "✅ Environment is ready"
    else
      log "⚠️ Environment is not ready (status: $STATUS)"
    fi
    
    # Get environment health
    HEALTH=$(eb status $ENV_NAME | grep "Health:" | awk '{print $2}')
    log "Environment health: $HEALTH"
    
    if [ "$HEALTH" == "Green" ]; then
      log "✅ Environment is healthy"
    else
      log "⚠️ Environment health is not optimal (health: $HEALTH)"
    fi
  else
    log "❌ Elastic Beanstalk environment not found: $ENV_NAME"
    return 1
  fi
  
  return 0
}

# Check RDS database
check_rds() {
  log "Checking RDS database..."
  
  # Get RDS endpoint from Elastic Beanstalk environment
  RDS_ENDPOINT=$(eb status $ENV_NAME | grep "RDS Database:" | awk '{print $3}')
  
  if [ -n "$RDS_ENDPOINT" ]; then
    log "✅ RDS database is attached to the environment: $RDS_ENDPOINT"
    
    # Get RDS status
    RDS_STATUS=$(aws rds describe-db-instances --query "DBInstances[?Endpoint.Address=='$RDS_ENDPOINT'].DBInstanceStatus" --output text)
    log "RDS status: $RDS_STATUS"
    
    if [ "$RDS_STATUS" == "available" ]; then
      log "✅ RDS database is available"
    else
      log "⚠️ RDS database is not available (status: $RDS_STATUS)"
    fi
  else
    log "❌ RDS database not found for environment: $ENV_NAME"
    return 1
  fi
  
  return 0
}

# Check application accessibility
check_app() {
  log "Checking application accessibility..."
  
  # Get application URL
  APP_URL=$(eb status $ENV_NAME | grep "CNAME:" | awk '{print $2}')
  log "Application URL: http://$APP_URL"
  
  # Check if application is accessible
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$APP_URL/docs")
  
  if [ "$HTTP_CODE" == "200" ]; then
    log "✅ Application is accessible (HTTP code: $HTTP_CODE)"
  else
    log "⚠️ Application might not be fully accessible (HTTP code: $HTTP_CODE)"
    log "This could be due to the application still starting up or an issue with the deployment."
  fi
  
  # Check API health endpoint if it exists
  HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$APP_URL/health" || echo "failed")
  
  if [ "$HEALTH_CODE" == "200" ]; then
    log "✅ API health endpoint is accessible"
  else
    log "⚠️ API health endpoint is not accessible (HTTP code: $HEALTH_CODE)"
    log "This is expected if you haven't implemented a health endpoint."
  fi
}

# Main execution
main() {
  log "Starting deployment verification for AOLF GSEC Backend on Elastic Beanstalk ($DEPLOY_ENV environment)..."
  
  # Run checks
  check_eb_cli
  check_eb_env
  EB_RESULT=$?
  
  if [ $EB_RESULT -eq 0 ]; then
    check_rds
    RDS_RESULT=$?
    
    check_app
  fi
  
  # Summary
  log "Verification summary:"
  if [ $EB_RESULT -eq 0 ]; then
    log "✅ Elastic Beanstalk environment: PASSED"
  else
    log "❌ Elastic Beanstalk environment: FAILED"
  fi
  
  if [ -n "$RDS_RESULT" ]; then
    if [ $RDS_RESULT -eq 0 ]; then
      log "✅ RDS database: PASSED"
    else
      log "❌ RDS database: FAILED"
    fi
  else
    log "⚠️ RDS database: SKIPPED"
  fi
  
  log "Verification completed!"
  
  # Provide next steps
  log "Next steps:"
  log "1. If any checks failed, review the Elastic Beanstalk logs: eb logs -e $ENV_NAME"
  log "2. SSH into the instance for further investigation: eb ssh -e $ENV_NAME"
  log "3. Check the application configuration in the AWS Management Console"
}

# Execute main function
main 