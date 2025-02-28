#!/bin/bash
# Script to update the GAE deployment process to use environment-specific files

# Exit on error
set -e

# Display header
echo "=========================================================="
echo "AOLF GSEC Frontend Environment Configuration Update Script"
echo "=========================================================="
echo ""

# Function to patch the deploy-gae-fullstack.sh script
patch_deployment_script() {
  echo "Patching deploy-gae-fullstack.sh..."
  
  # Make a backup of the original file
  cp deploy-gae-fullstack.sh deploy-gae-fullstack.sh.backup
  
  # Find and replace the frontend build and environment file handling
  sed -i '' 's/npm run build/npm run build:$DEPLOY_ENV/g' deploy-gae-fullstack.sh
  
  # Update the environment file handling logic
  sed -i '' '/# Update frontend environment with correct API URL/,/EOL/c\
  # Use environment-specific configuration\
  log "Using frontend environment file for $DEPLOY_ENV..."\
  if [[ ! -f "frontend/.env.$DEPLOY_ENV" ]]; then\
    handle_error "Frontend environment file frontend/.env.$DEPLOY_ENV does not exist. Please create it first."\
  else\
    log "Using frontend/.env.$DEPLOY_ENV for deployment."\
  fi' deploy-gae-fullstack.sh
  
  # Fix any references to .env.tmp
  sed -i '' 's/frontend\/.env\.tmp/frontend\/.env.$DEPLOY_ENV/g' deploy-gae-fullstack.sh
  
  echo "Deployment script has been patched successfully."
}

# Install env-cmd package if not already present
install_env_cmd() {
  echo "Installing env-cmd package..."
  cd frontend
  npm install --save-dev env-cmd
  cd ..
  echo "env-cmd package installed successfully."
}

# Main execution
echo "This script will update the GAE deployment process to use environment-specific files."
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Run the update steps
install_env_cmd
patch_deployment_script

echo ""
echo "Update completed successfully!"
echo "You can now deploy using: ./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=uat"
echo "This will use the frontend/.env.uat configuration."
echo ""
echo "Make sure to use the appropriate Google OAuth redirect URIs in your Google Cloud Console:"
echo "- Development: http://localhost:3000"
echo "- UAT: https://aolf-gsec-uat.appspot.com"
echo "- Production: https://aolf-gsec-prod.appspot.com" 