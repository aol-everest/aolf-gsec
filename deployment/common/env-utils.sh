#!/bin/bash
# Common environment utilities for deployment scripts

# Function to create environment-specific build
build_with_env() {
  local deploy_env=$1
  local root_dir=$2
  
  echo "Building application for $deploy_env environment..."
  
  cd $root_dir || exit 1
  
  # Install dependencies
  echo "Installing dependencies..."
  npm install --legacy-peer-deps
  
  # Check if environment-specific file exists
  if [[ -f ".env.$deploy_env" ]]; then
    echo "Using environment-specific file: .env.$deploy_env"
    npm run build:$deploy_env
  else
    echo "Environment-specific file .env.$deploy_env not found. Using default .env file."
    npm run build
  fi
  
  if [[ ! -d "build" ]]; then
    echo "Build failed. No 'build' directory was created."
    exit 1
  fi
  
  echo "Build completed successfully."
}

# Function to validate environment name
validate_environment() {
  local deploy_env=$1
  
  if [[ "$deploy_env" != "prod" && "$deploy_env" != "uat" && "$deploy_env" != "dev" && "$deploy_env" != "development" ]]; then
    echo "Invalid environment: $deploy_env. Must be 'dev', 'development', 'uat', or 'prod'."
    return 1
  fi
  
  return 0
}

# Function to create or update environment file
create_env_file() {
  local deploy_env=$1
  local app_dir=$2
  local api_url=$3
  
  echo "Creating/updating $deploy_env environment file..."
  
  # Create the environment file if it doesn't exist
  if [[ ! -f "$app_dir/.env.$deploy_env" ]]; then
    cp "$app_dir/.env.example" "$app_dir/.env.$deploy_env"
  fi
  
  # Update the API URL
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$api_url|g" "$app_dir/.env.$deploy_env"
    sed -i '' "s|REACT_APP_API_BASE_URL=.*|REACT_APP_API_BASE_URL=$api_url|g" "$app_dir/.env.$deploy_env"
  else
    # Linux/other
    sed -i "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$api_url|g" "$app_dir/.env.$deploy_env"
    sed -i "s|REACT_APP_API_BASE_URL=.*|REACT_APP_API_BASE_URL=$api_url|g" "$app_dir/.env.$deploy_env"
  fi
  
  echo "Environment file $app_dir/.env.$deploy_env updated."
} 