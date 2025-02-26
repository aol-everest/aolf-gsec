#!/bin/bash
# AOLF GSEC Frontend Deployment Script
# This script automates the deployment of the frontend to AWS S3 and CloudFront

# Exit on error
set -e

# Configuration
S3_BUCKET="aolf-gsec-uat"
S3_PREFIX="frontend"
REGION="us-east-1"
# Replace with your actual CloudFront distribution ID once created
CLOUDFRONT_DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Create production environment file
create_prod_env() {
  log "Creating production environment file..."
  cp .env .env.production
  
  # Prompt for production API URL
  read -p "Enter production API URL (e.g., https://api.example.com): " API_URL
  
  # Update the API URL in the production env file
  sed -i '' "s|REACT_APP_API_BASE_URL=.*|REACT_APP_API_BASE_URL=$API_URL|g" .env.production
  
  log "Production environment file created and updated."
}

# Build the application
build_app() {
  log "Installing dependencies..."
  npm install
  
  log "Building application for production..."
  npm run build
  
  log "Build completed successfully."
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
  aws s3 sync build/ "s3://$S3_BUCKET/$S3_PREFIX/" --delete --region $REGION
  
  log "Setting up website configuration..."
  aws s3 website "s3://$S3_BUCKET/$S3_PREFIX/" --index-document index.html --error-document index.html
  
  # Set bucket policy for public access
  log "Setting bucket policy for public access..."
  aws s3api put-bucket-policy --bucket $S3_BUCKET --policy '{
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
  
  log "S3 deployment completed successfully."
}

# Invalidate CloudFront cache
invalidate_cloudfront() {
  if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "YOUR_DISTRIBUTION_ID" ]; then
    log "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --region $REGION
    log "CloudFront cache invalidation initiated."
  else
    log "CloudFront distribution ID not set. Skipping cache invalidation."
    log "Please update the CLOUDFRONT_DISTRIBUTION_ID in this script once you have created your CloudFront distribution."
  fi
}

# Main execution
main() {
  log "Starting deployment process for AOLF GSEC Frontend..."
  
  create_prod_env
  build_app
  deploy_to_s3
  invalidate_cloudfront
  
  log "Deployment completed successfully!"
  log "S3 website URL: http://$S3_BUCKET.s3-website-$REGION.amazonaws.com/$S3_PREFIX/"
  
  if [ "$CLOUDFRONT_DISTRIBUTION_ID" == "YOUR_DISTRIBUTION_ID" ]; then
    log "Next steps:"
    log "1. Create a CloudFront distribution pointing to your S3 bucket"
    log "2. Update this script with your CloudFront distribution ID"
    log "3. Run this script again to invalidate the CloudFront cache"
  fi
}

# Execute main function
main 