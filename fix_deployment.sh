#!/bin/bash

# This script fixes the API URL in the frontend build
# It should be run after a failed deployment where the wrong API URL was used

# Set script directory and load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "Fixing frontend environment configuration..."

# Create a clean environment file with UAT settings
cat > "$FRONTEND_DIR/.env" << EOL
# UAT Environment Configuration
REACT_APP_API_URL=https://aolf-gsec-uat.appspot.com
REACT_APP_ENVIRONMENT=uat
REACT_APP_API_BASE_URL=https://aolf-gsec-uat.appspot.com
EOL

echo "Created UAT environment file with correct settings."

# Change to frontend directory
cd "$FRONTEND_DIR"

# Remove existing build directory
if [[ -d "build" ]]; then
  echo "Removing existing build directory..."
  rm -rf build 2>/dev/null || sudo rm -rf build
fi

# Install dependencies if needed
echo "Installing frontend dependencies..."
npm install --legacy-peer-deps

# Remove problematic Icon file from app-yaml-archive directory
echo "Removing problematic Icon file from app-yaml-archive directory..."
find "$PROJECT_ROOT/app-yaml-archive" -name "Icon" -delete

# Check for any other problematic files before deployment
echo "Checking for any other problematic files before deployment..."
if find "$PROJECT_ROOT" -name "Icon?" | grep -q "."; then
  echo "ERROR: Found other problematic files. Please remove them before proceeding."
  exit 1
fi

# Build with explicit environment variables
echo "Building frontend with explicit UAT environment variables..."
REACT_APP_API_URL=https://aolf-gsec-uat.appspot.com \
REACT_APP_ENVIRONMENT=uat \
REACT_APP_API_BASE_URL=https://aolf-gsec-uat.appspot.com \
npm run build

# Verify the build doesn't contain the production URL
echo "Verifying built JavaScript files don't contain the production URL..."
if grep -q "aolf-gsec-prod.appspot.com" build/static/js/main*.js; then
  echo "ERROR: Built JavaScript still contains production URL instead of UAT URL!"
  grep "aolf-gsec-prod.appspot.com" build/static/js/main*.js
  exit 1
fi

echo "Build successful with correct UAT API URL."
echo "Now run the deployment script with the --skip-frontend-build flag:"
echo "./deployment/gae/deploy-gae-fullstack.sh -p aolf-gsec-uat --env=uat --skip-frontend-build --skip-secret-manager"
