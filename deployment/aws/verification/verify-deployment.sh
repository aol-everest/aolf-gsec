#!/bin/bash
# Deployment verification script for AOLF GSEC Frontend

# Exit on error
set -e

# Configuration
S3_BUCKET="aolf-gsec-uat"
S3_PREFIX="frontend"
REGION="us-east-2"
# Replace with your actual CloudFront distribution ID once created
CLOUDFRONT_DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check S3 bucket
check_s3() {
  log "Checking S3 bucket: $S3_BUCKET/$S3_PREFIX"
  
  # Check if the bucket exists
  if aws s3 ls "s3://$S3_BUCKET" 2>&1 > /dev/null; then
    log "✅ S3 bucket exists: $S3_BUCKET"
    
    # Check if index.html exists in the bucket
    if aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/index.html" 2>&1 > /dev/null; then
      log "✅ index.html exists in S3 bucket"
    else
      log "❌ index.html not found in S3 bucket"
      return 1
    fi
    
    # Check website configuration
    if aws s3api get-bucket-website --bucket "$S3_BUCKET" 2>&1 > /dev/null; then
      log "✅ S3 website configuration exists"
    else
      log "❌ S3 website configuration not found"
      return 1
    fi
  else
    log "❌ S3 bucket not found: $S3_BUCKET"
    return 1
  fi
  
  return 0
}

# Check CloudFront distribution
check_cloudfront() {
  if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "YOUR_DISTRIBUTION_ID" ]; then
    log "Checking CloudFront distribution: $CLOUDFRONT_DISTRIBUTION_ID"
    
    # Check if the distribution exists
    if aws cloudfront get-distribution --id "$CLOUDFRONT_DISTRIBUTION_ID" 2>&1 > /dev/null; then
      log "✅ CloudFront distribution exists"
      
      # Get distribution status
      STATUS=$(aws cloudfront get-distribution --id "$CLOUDFRONT_DISTRIBUTION_ID" --query "Distribution.Status" --output text)
      log "CloudFront distribution status: $STATUS"
      
      if [ "$STATUS" == "Deployed" ]; then
        log "✅ CloudFront distribution is deployed"
      else
        log "⚠️ CloudFront distribution is not fully deployed yet (status: $STATUS)"
      fi
    else
      log "❌ CloudFront distribution not found"
      return 1
    fi
  else
    log "⚠️ CloudFront distribution ID not set. Skipping CloudFront checks."
    log "Please update the CLOUDFRONT_DISTRIBUTION_ID in this script once you have created your CloudFront distribution."
  fi
  
  return 0
}

# Check website accessibility
check_website() {
  # Check S3 website
  S3_URL="http://$S3_BUCKET.s3-website-$REGION.amazonaws.com/$S3_PREFIX/"
  log "Checking S3 website URL: $S3_URL"
  
  if curl -s -f -o /dev/null "$S3_URL"; then
    log "✅ S3 website is accessible"
  else
    log "❌ S3 website is not accessible"
  fi
  
  # Check CloudFront if configured
  if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "YOUR_DISTRIBUTION_ID" ]; then
    # Get CloudFront domain
    CF_DOMAIN=$(aws cloudfront get-distribution --id "$CLOUDFRONT_DISTRIBUTION_ID" --query "Distribution.DomainName" --output text)
    CF_URL="https://$CF_DOMAIN"
    
    log "Checking CloudFront URL: $CF_URL"
    if curl -s -f -o /dev/null "$CF_URL"; then
      log "✅ CloudFront distribution is accessible"
    else
      log "❌ CloudFront distribution is not accessible"
    fi
  fi
}

# Main execution
main() {
  log "Starting deployment verification for AOLF GSEC Frontend..."
  
  # Run checks
  check_s3
  S3_RESULT=$?
  
  check_cloudfront
  CF_RESULT=$?
  
  if [ $S3_RESULT -eq 0 ]; then
    check_website
  fi
  
  # Summary
  log "Verification summary:"
  if [ $S3_RESULT -eq 0 ]; then
    log "✅ S3 deployment: PASSED"
  else
    log "❌ S3 deployment: FAILED"
  fi
  
  if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "YOUR_DISTRIBUTION_ID" ]; then
    if [ $CF_RESULT -eq 0 ]; then
      log "✅ CloudFront setup: PASSED"
    else
      log "❌ CloudFront setup: FAILED"
    fi
  else
    log "⚠️ CloudFront setup: SKIPPED (ID not configured)"
  fi
  
  log "Verification completed!"
}

# Execute main function
main 