#!/bin/bash
# Script to build and deploy the AOLF GSEC Frontend to AWS

# Exit on error
set -e

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Default environment
DEPLOY_ENV="prod"
S3_BUCKET="aolf-gsec-prod-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E1ICM14TKMJ7I6"  # Will be set during deployment if needed

# Display help
show_help() {
  echo "AOLF GSEC Frontend Deployment Script"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV              Specify the deployment environment (uat or prod)"
  echo "  --s3-bucket BUCKET         Specify the S3 bucket name"
  echo "  --cloudfront-id ID         Specify the CloudFront distribution ID"
  echo "  -h, --help                 Display this help message"
  echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)
      DEPLOY_ENV="${1#*=}"
      shift
      ;;
    -e|--env)
      DEPLOY_ENV="$2"
      shift 2
      ;;
    --s3-bucket=*)
      S3_BUCKET="${1#*=}"
      shift
      ;;
    --s3-bucket)
      S3_BUCKET="$2"
      shift 2
      ;;
    --cloudfront-id=*)
      CLOUDFRONT_DISTRIBUTION_ID="${1#*=}"
      shift
      ;;
    --cloudfront-id)
      CLOUDFRONT_DISTRIBUTION_ID="$2"
      shift 2
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

# Validate environment
if [[ "$DEPLOY_ENV" != "prod" && "$DEPLOY_ENV" != "uat" ]]; then
  log "Invalid environment: $DEPLOY_ENV. Must be 'prod' or 'uat'."
  exit 1
fi

# Main execution
main() {
  log "Starting frontend deployment process for AOLF GSEC ($DEPLOY_ENV environment)..."
  
  # Check if required tools are installed
  if ! command -v npm &> /dev/null; then
    log "npm is not installed. Please install Node.js and npm."
    exit 1
  fi
  
  if ! command -v aws &> /dev/null; then
    log "AWS CLI is not installed. Please install it."
    exit 1
  fi
  
  # Install dependencies
  log "Installing dependencies..."
  npm ci --legacy-peer-deps
  
  # Build the application
  log "Building the application for $DEPLOY_ENV environment..."
  npm run build:$DEPLOY_ENV
  
  # Deploy to S3 - directly to the root of the frontend code bucket
  log "Deploying to S3 bucket: $S3_BUCKET..."
  aws s3 sync build/ s3://$S3_BUCKET/ --delete
  
  # Invalidate CloudFront cache if a distribution ID is provided
  if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    log "Invalidating CloudFront cache for distribution: $CLOUDFRONT_DISTRIBUTION_ID..."
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
  fi
  
  # Verify deployment
  log "Verifying deployment..."
  if aws s3 ls s3://$S3_BUCKET/index.html &> /dev/null; then
    log "index.html found in S3 bucket."
  else
    log "Warning: index.html not found in S3 bucket."
  fi
  
  log "Deployment completed successfully."
  log "Frontend should be accessible at http://$S3_BUCKET.s3-website-us-east-2.amazonaws.com/"
  
  if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    CF_DOMAIN=$(aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --query "Distribution.DomainName" --output text)
    log "Or via CloudFront at https://$CF_DOMAIN/"
  fi
  
  log "Note: For the production domain (meetgurudev.aolf.app), ensure CloudFront is configured with the certificate ID: fd300d8e-b4f9-4de8-9e5f-23c6c639ccde"
}

# Execute the main function
main 
