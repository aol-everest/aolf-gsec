#!/bin/bash
# AOLF GSEC Frontend Deployment Script for AWS
# This script automates the deployment of the frontend to AWS S3 and CloudFront

# Exit on error
set -e

# Set script directory and load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMMON_DIR="$SCRIPT_DIR/../common"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Source common utilities
source "$COMMON_DIR/env-utils.sh"

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

# Default environment
DEPLOY_ENV="uat"

# Configuration
S3_BUCKET_PROD="aolf-gsec-prod"
S3_BUCKET_UAT="aolf-gsec-uat"
S3_BUCKET=$S3_BUCKET_UAT  # Default to UAT
S3_PREFIX="frontend"
REGION="us-east-2"
# Replace with your actual CloudFront distribution IDs once created
CLOUDFRONT_DISTRIBUTION_ID_PROD="YOUR_PROD_DISTRIBUTION_ID"
CLOUDFRONT_DISTRIBUTION_ID_UAT="YOUR_UAT_DISTRIBUTION_ID"
CLOUDFRONT_DISTRIBUTION_ID=$CLOUDFRONT_DISTRIBUTION_ID_UAT  # Default to UAT

# Display help
show_help() {
  echo "AOLF GSEC Frontend AWS Deployment Script"
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV           Specify the deployment environment (prod or uat)"
  echo "  --environment=ENV       Specify the deployment environment (prod or uat)"
  echo "  -h, --help              Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0                      Deploy to UAT environment (default)"
  echo "  $0 --env=prod           Deploy to production environment"
  echo "  $0 -e uat               Deploy to UAT environment"
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
validate_environment "$DEPLOY_ENV" || handle_error "Invalid environment"

# Set environment-specific configurations
if [[ "$DEPLOY_ENV" == "prod" ]]; then
  S3_BUCKET=$S3_BUCKET_PROD
  CLOUDFRONT_DISTRIBUTION_ID=$CLOUDFRONT_DISTRIBUTION_ID_PROD
  log "Deploying to PRODUCTION environment"
else
  S3_BUCKET=$S3_BUCKET_UAT
  CLOUDFRONT_DISTRIBUTION_ID=$CLOUDFRONT_DISTRIBUTION_ID_UAT
  log "Deploying to UAT environment"
fi

# Create production environment file
create_prod_env() {
  log "Setting up environment for $DEPLOY_ENV..."
  
  # Prompt for production API URL
  read -p "Enter $DEPLOY_ENV API URL (e.g., https://api.example.com): " API_URL
  
  # Create/update environment file
  create_env_file "$DEPLOY_ENV" "$FRONTEND_DIR" "$API_URL"
}

# Build the React application
build_app() {
  log "Building React application for $DEPLOY_ENV environment..."
  build_with_env "$DEPLOY_ENV" "$FRONTEND_DIR"
}

# Deploy to S3
deploy_to_s3() {
  log "Deploying to S3 bucket: $S3_BUCKET/$S3_PREFIX"
  
  # Check if the bucket exists, if not create it
  if ! aws s3 ls "s3://$S3_BUCKET" 2>&1 > /dev/null; then
    log "Bucket does not exist. Creating bucket: $S3_BUCKET"
    aws s3 mb "s3://$S3_BUCKET" --region $REGION
  fi
  
  # Upload files to S3
  log "Uploading files to S3..."
  cd "$FRONTEND_DIR"
  aws s3 sync build/ "s3://$S3_BUCKET/$S3_PREFIX/" --delete --region $REGION
  
  log "Setting up website configuration..."
  aws s3 website "s3://$S3_BUCKET/$S3_PREFIX/" --index-document index.html --error-document index.html
  
  # Set bucket policy for public access
  log "Setting bucket policy for public access..."
  POLICY='{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::'$S3_BUCKET'/'$S3_PREFIX'/*"
      }
    ]
  }'
  
  # Write policy to a temporary file to avoid shell escaping issues
  echo "$POLICY" > /tmp/bucket-policy.json
  aws s3api put-bucket-policy --bucket $S3_BUCKET --policy file:///tmp/bucket-policy.json
  
  log "S3 deployment completed successfully."
}

# Invalidate CloudFront cache
invalidate_cloudfront() {
  if [[ "$CLOUDFRONT_DISTRIBUTION_ID" != "YOUR_PROD_DISTRIBUTION_ID" && "$CLOUDFRONT_DISTRIBUTION_ID" != "YOUR_UAT_DISTRIBUTION_ID" ]]; then
    log "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --region $REGION
    log "CloudFront cache invalidation initiated."
  else
    log "CloudFront distribution ID not set for $DEPLOY_ENV environment. Skipping cache invalidation."
    log "Please update the CLOUDFRONT_DISTRIBUTION_ID_PROD or CLOUDFRONT_DISTRIBUTION_ID_UAT in this script once you have created your CloudFront distribution."
  fi
}

# Main execution
main() {
  log "Starting deployment process for AOLF GSEC Frontend to $DEPLOY_ENV environment..."
  
  create_prod_env
  build_app
  deploy_to_s3
  invalidate_cloudfront
  
  log "Deployment completed successfully!"
  log "S3 website URL: http://$S3_BUCKET.s3-website-$REGION.amazonaws.com/$S3_PREFIX/"
  
  if [[ "$DEPLOY_ENV" == "prod" && "$CLOUDFRONT_DISTRIBUTION_ID" == "YOUR_PROD_DISTRIBUTION_ID" ]] || 
     [[ "$DEPLOY_ENV" == "uat" && "$CLOUDFRONT_DISTRIBUTION_ID" == "YOUR_UAT_DISTRIBUTION_ID" ]]; then
    log "Next steps:"
    log "1. Create a CloudFront distribution pointing to your S3 bucket for the $DEPLOY_ENV environment"
    log "2. Update this script with your CloudFront distribution ID for the $DEPLOY_ENV environment"
    log "3. Run this script again to invalidate the CloudFront cache"
  fi
}

# Execute main function
main 