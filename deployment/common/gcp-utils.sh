#!/bin/bash
# Common GCP utilities for deployment scripts

# Function to enable required GCP APIs
enable_required_apis() {
  local project_id=$1
  
  echo "Enabling required Google Cloud APIs for project $project_id..."
  
  # Set the current project
  gcloud config set project $project_id || return 1
  
  # List of required APIs
  local apis=(
    "appengine.googleapis.com"
    "secretmanager.googleapis.com"
    "cloudbuild.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "sqladmin.googleapis.com"
  )
  
  # Enable each API
  for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api || echo "WARNING: Failed to enable $api. It may already be enabled or you may not have sufficient permissions."
  done
  
  echo "Required APIs enabled successfully."
}

# Function to setup Cloud SQL instance
setup_cloud_sql() {
  local project_id=$1
  local deploy_env=$2
  local skip_db_creation=$3
  local region=${4:-"us-central1"}
  
  local sql_instance_name="aolf-gsec-postgres-$deploy_env"
  local sql_connection_name=""
  
  echo "Setting up Cloud SQL for $deploy_env environment..."
  
  if [ "$skip_db_creation" = true ]; then
    echo "Skipping Cloud SQL setup as requested..."
    
    # Try to get connection information even if skipping creation
    if gcloud sql instances describe $sql_instance_name --project=$project_id &> /dev/null; then
      sql_connection_name=$(gcloud sql instances describe $sql_instance_name --project=$project_id --format='value(connectionName)')
      echo "Using existing Cloud SQL connection: $sql_connection_name"
    else
      echo "ERROR: Cloud SQL instance $sql_instance_name does not exist but --skip-db-creation was specified."
      echo "Please create the database first or remove the --skip-db-creation flag."
      return 1
    fi
  else
    # Check if Cloud SQL instance exists
    if gcloud sql instances describe $sql_instance_name --project=$project_id &> /dev/null; then
      echo "Cloud SQL instance $sql_instance_name already exists."
      sql_connection_name=$(gcloud sql instances describe $sql_instance_name --project=$project_id --format='value(connectionName)')
      echo "Cloud SQL connection name: $sql_connection_name"
      
      # Load environment variables from environment file
      if [ -f "backend/.env.$deploy_env" ]; then
        source backend/.env.$deploy_env
      fi
      
      # Check if database exists
      if ! gcloud sql databases describe ${POSTGRES_DB:-gsec} --instance=$sql_instance_name --project=$project_id &> /dev/null; then
        echo "Database ${POSTGRES_DB:-gsec} does not exist. Creating..."
        gcloud sql databases create ${POSTGRES_DB:-gsec} --instance=$sql_instance_name --project=$project_id || echo "WARNING: Failed to create database. It may already exist or you may not have sufficient permissions."
      else
        echo "Database ${POSTGRES_DB:-gsec} already exists."
      fi
      
      # Check if user exists (this will always fail with a warning as there's no direct way to check)
      echo "Ensuring database user exists..."
      gcloud sql users create ${POSTGRES_USER:-gsec_user} \
        --instance=$sql_instance_name \
        --password="${POSTGRES_PASSWORD:-$(openssl rand -base64 12)}" \
        --project=$project_id &> /dev/null || echo "WARNING: User creation failed. The user may already exist or you may not have sufficient permissions."
    else
      echo "Creating new Cloud SQL instance..."
      gcloud sql instances create $sql_instance_name \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$region \
        --storage-size=10GB \
        --storage-type=SSD \
        --backup-start-time=04:00 \
        --availability-type=zonal \
        --project=$project_id || return 1
      
      # Load environment variables from environment file
      if [ -f "backend/.env.$deploy_env" ]; then
        source backend/.env.$deploy_env
      fi
      
      # Create database
      echo "Creating database..."
      gcloud sql databases create ${POSTGRES_DB:-gsec} --instance=$sql_instance_name --project=$project_id || return 1
      
      # Create user
      echo "Creating database user..."
      gcloud sql users create ${POSTGRES_USER:-gsec_user} \
        --instance=$sql_instance_name \
        --password="${POSTGRES_PASSWORD:-$(openssl rand -base64 12)}" \
        --project=$project_id || return 1
      
      # Get connection information
      sql_connection_name=$(gcloud sql instances describe $sql_instance_name --project=$project_id --format='value(connectionName)')
      echo "Cloud SQL connection name: $sql_connection_name"
    fi
  fi
  
  # Return the connection name (just the connection string, not the log messages)
  echo "$sql_connection_name"
}

# Function to store secrets in Google Secret Manager
store_secrets() {
  local project_id=$1
  local deploy_env=$2
  local skip_secret_manager=$3
  local project_root=${4:-$(pwd)}
  
  if [ "$skip_secret_manager" = true ]; then
    echo "Skipping Google Secret Manager step as requested..."
    return 0
  fi

  echo "Storing sensitive information in Google Secret Manager for $deploy_env environment..."
  
  # Load environment variables from environment file
  local env_file="$project_root/backend/.env.$deploy_env"
  if [ -f "$env_file" ]; then
    source "$env_file"
    echo "Loaded environment variables from $env_file"
  else
    echo "ERROR: Environment file $env_file not found."
    return 1
  fi
  
  # Create secrets
  create_or_update_secret "$project_id" "POSTGRES_USER" "$POSTGRES_USER"
  create_or_update_secret "$project_id" "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
  create_or_update_secret "$project_id" "POSTGRES_DB" "$POSTGRES_DB"
  create_or_update_secret "$project_id" "JWT_SECRET_KEY" "$JWT_SECRET_KEY"
  create_or_update_secret "$project_id" "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
  create_or_update_secret "$project_id" "SENDGRID_API_KEY" "$SENDGRID_API_KEY"
  create_or_update_secret "$project_id" "FROM_EMAIL" "$FROM_EMAIL"
  
  echo "Secrets stored in Google Secret Manager."
}

# Helper function to create or update a secret
create_or_update_secret() {
  local project_id=$1
  local secret_name=$2
  local secret_value=$3
  
  if [ -z "$secret_value" ]; then
    echo "WARNING: Empty value for secret $secret_name. Skipping."
    return 0
  fi
  
  # Check if secret exists
  if gcloud secrets describe $secret_name --project=$project_id &> /dev/null; then
    # Update existing secret
    echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=- --project=$project_id || echo "WARNING: Failed to update secret $secret_name. Check your permissions."
  else
    # Create new secret
    echo -n "$secret_value" | gcloud secrets create $secret_name --replication-policy="automatic" --data-file=- --project=$project_id || echo "WARNING: Failed to create secret $secret_name. Check your permissions."
  fi
  
  # Grant access to App Engine service account
  local service_account="$project_id@appspot.gserviceaccount.com"
  gcloud secrets add-iam-policy-binding $secret_name \
    --member="serviceAccount:$service_account" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$project_id || echo "WARNING: Failed to grant access to secret $secret_name. Check your permissions."
}

# Function to update CORS settings in backend code
update_cors_settings() {
  local backend_dir=$1
  local project_id=$2
  
  echo "Updating CORS settings in the backend code..."
  
  # Find the CORS middleware in app.py
  if [ -f "$backend_dir/app.py" ] && grep -q "CORSMiddleware" "$backend_dir/app.py"; then
    # Check if the App Engine domain is already in the allow_origins list
    if grep -q "https://$project_id.appspot.com" "$backend_dir/app.py"; then
      echo "App Engine domain is already in the CORS allow_origins list."
    else
      # Update the allow_origins list to include the App Engine domain
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|allow_origins=\[\(.*\)\]|allow_origins=[\1, \"https://$project_id.appspot.com\"]|" "$backend_dir/app.py" || echo "WARNING: Failed to update CORS settings. You may need to update them manually."
      else
        # Linux
        sed -i "s|allow_origins=\[\(.*\)\]|allow_origins=[\1, \"https://$project_id.appspot.com\"]|" "$backend_dir/app.py" || echo "WARNING: Failed to update CORS settings. You may need to update them manually."
      fi
      echo "CORS settings updated to allow the App Engine domain."
    fi
  else
    echo "WARNING: Could not find CORS middleware in app.py. Please update manually."
  fi
}

# Function to check Python dependencies for conflicts
check_python_dependencies() {
  local backend_dir=$1
  
  echo "Checking Python dependencies for conflicts..."
  
  # Create a temporary virtual environment
  local temp_venv="temp_venv"
  
  # Check if python3 is available
  if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
  elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
  else
    echo "WARNING: Python is not installed. Please install Python 3.9 or later."
    return 1
  fi
  
  # Create virtual environment
  $PYTHON_CMD -m venv $temp_venv || echo "WARNING: Failed to create virtual environment. Skipping dependency check."
  
  # Activate virtual environment
  if [[ -d "$temp_venv" ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      source $temp_venv/bin/activate || echo "WARNING: Failed to activate virtual environment. Skipping dependency check."
    else
      # Linux
      source $temp_venv/bin/activate || echo "WARNING: Failed to activate virtual environment. Skipping dependency check."
    fi
    
    # Install dependencies
    if [[ -f "$backend_dir/requirements.txt" ]]; then
      pip install -r $backend_dir/requirements.txt &> /dev/null || {
        echo "WARNING: Dependency conflicts detected in requirements.txt."
        echo "Please check the requirements.txt file and resolve any conflicts."
        echo "You can try running 'pip install -r $backend_dir/requirements.txt' locally to see the specific conflicts."
        echo "Continuing with deployment, but it may fail during the build process."
      }
    fi
    
    # Deactivate virtual environment
    deactivate || true
    
    # Remove virtual environment
    rm -rf $temp_venv || true
  fi
  
  echo "Dependency check completed."
}

# Function to create a comprehensive app.yaml for backend
create_backend_app_yaml() {
  local backend_dir=$1
  local service_name=$2
  local sql_connection_name=$3
  local deploy_env=$4
  local project_id=$5
  
  echo "Creating comprehensive app.yaml for backend service: $service_name"
  
  # Validate SQL connection name
  if [[ -z "$sql_connection_name" ]]; then
    echo "WARNING: SQL connection name is empty. Using a placeholder value."
    sql_connection_name="$project_id:$REGION:aolf-gsec-postgres-$deploy_env"
  fi
  
  # Load environment variables from environment file
  if [ -f "$backend_dir/.env.$deploy_env" ]; then
    source "$backend_dir/.env.$deploy_env"
  fi
  
  # Create app.yaml
  cat > "$backend_dir/app.yaml" << EOL
runtime: python39
service: $service_name
instance_class: F2

entrypoint: gunicorn application:application -w 4 -k uvicorn.workers.UvicornWorker

env_variables:
  ENVIRONMENT: "$deploy_env"
  POSTGRES_HOST: "/cloudsql/$sql_connection_name"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "${POSTGRES_DB:-gsec}"
  POSTGRES_USER: "${POSTGRES_USER:-gsec_user}"
  POSTGRES_PASSWORD: "${POSTGRES_PASSWORD:-password}"
  JWT_SECRET_KEY: "${JWT_SECRET_KEY:-secret}"
  GOOGLE_CLIENT_ID: "${GOOGLE_CLIENT_ID}"
  SENDGRID_API_KEY: "${SENDGRID_API_KEY}"
  FROM_EMAIL: "${FROM_EMAIL}"
  ENABLE_EMAIL: "true"

beta_settings:
  cloud_sql_instances: $sql_connection_name

handlers:
# API handlers
- url: /docs.*
  script: auto
  secure: always

- url: /openapi.json
  script: auto
  secure: always

- url: /api/.*
  script: auto
  secure: always

automatic_scaling:
  min_instances: 1
  max_instances: 5
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.65
  max_concurrent_requests: 50
EOL

  echo "Backend app.yaml created successfully."
}

# Function to create a comprehensive app.yaml for frontend
create_frontend_app_yaml() {
  local frontend_dir=$1
  local service_name=$2
  
  echo "Creating comprehensive app.yaml for frontend service: $service_name"
  
  # Create app.yaml
  cat > "$frontend_dir/app.yaml" << EOL
runtime: nodejs16
service: $service_name

handlers:
- url: /static/css/(.*\.css)
  static_files: build/static/css/\1
  upload: build/static/css/.*\.css$
  secure: always

- url: /static/js/(.*\.js)
  static_files: build/static/js/\1
  upload: build/static/js/.*\.js$
  secure: always

- url: /static/media/(.*)
  static_files: build/static/media/\1
  upload: build/static/media/.*
  secure: always

- url: /static
  static_dir: build/static
  secure: always

- url: /(.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))$
  static_files: build/\1
  upload: build/.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$
  secure: always

- url: /.*
  static_files: build/index.html
  upload: build/index.html
  secure: always

automatic_scaling:
  min_instances: 1
  max_instances: 3
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.65
EOL

  echo "Frontend app.yaml created successfully."
}

# Function to verify static file structure
verify_static_structure() {
  local frontend_dir=$1
  
  echo "Verifying static file structure before deployment..."
  
  # Check if the build directory exists
  if [[ ! -d "$frontend_dir/build" ]]; then
    echo "ERROR: Build directory does not exist in the frontend directory."
    return 1
  fi
  
  # Check if the CSS file exists
  if [[ ! -d "$frontend_dir/build/static/css" ]]; then
    echo "WARNING: CSS directory not found in the expected location."
    
    # Try to find CSS files
    CSS_FILES=$(find "$frontend_dir/build" -name "*.css" | wc -l)
    if [[ $CSS_FILES -eq 0 ]]; then
      echo "WARNING: No CSS files found in the build directory."
    else
      echo "Found $CSS_FILES CSS files in unexpected locations."
    fi
  else
    CSS_FILES=$(find "$frontend_dir/build/static/css" -name "*.css" | wc -l)
    echo "Found $CSS_FILES CSS files in the expected location."
  fi
  
  # Check if the JS directory exists
  if [[ ! -d "$frontend_dir/build/static/js" ]]; then
    echo "WARNING: JS directory not found in the expected location."
  else
    JS_FILES=$(find "$frontend_dir/build/static/js" -name "*.js" | wc -l)
    echo "Found $JS_FILES JS files in the expected location."
  fi
  
  # Print the directory structure for debugging
  echo "Directory structure of static files:"
  find "$frontend_dir/build" -type d | sort
  
  echo "Static file structure verification completed."
  return 0
} 