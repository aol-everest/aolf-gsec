#!/bin/bash
# Script to deploy backend with .ebextensions directory explicitly included

# Exit on error
set -e

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting deployment with explicit .ebextensions inclusion..."

# Create a deployment directory
DEPLOY_DIR=$(mktemp -d)
log "Created temporary deployment directory: $DEPLOY_DIR"

# Copy all application files to the deployment directory
log "Copying application files..."
cp -R * $DEPLOY_DIR/
cp -R .ebextensions $DEPLOY_DIR/
cp -R .elasticbeanstalk $DEPLOY_DIR/
cp .env.* $DEPLOY_DIR/
cp Procfile $DEPLOY_DIR/
cp .ebignore $DEPLOY_DIR/

# Navigate to the deployment directory
cd $DEPLOY_DIR

# Run the eb deploy command
log "Deploying application..."
eb deploy

# Clean up
log "Cleaning up temporary deployment directory..."
cd - > /dev/null
rm -rf $DEPLOY_DIR

log "Deployment completed." 