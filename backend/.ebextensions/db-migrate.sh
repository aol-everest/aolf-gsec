#!/bin/bash
# Database migration script for Elastic Beanstalk deployment
# This script runs migrations on the external RDS instance

# Exit on error
set -e

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting database migration script"

# Print environment variables for debugging
log "Environment variables check:"
log "POSTGRES_HOST: ${POSTGRES_HOST:-Not set}"
log "POSTGRES_PORT: ${POSTGRES_PORT:-Not set}"
log "POSTGRES_DB: ${POSTGRES_DB:-Not set}"
log "POSTGRES_USER: ${POSTGRES_USER:-Not set}"

# Determine the application directory (could be staging or current during deployment)
if [ -d "/var/app/current" ]; then
  APP_DIR="/var/app/current"
  log "Using current application directory"
elif [ -d "/var/app/staging" ]; then
  APP_DIR="/var/app/staging"
  log "Using staging application directory"
else
  log "Error: Neither /var/app/current nor /var/app/staging directories exist!"
  ls -la /var/app/
  exit 1
fi

# Navigate to the application directory first
cd $APP_DIR
if [ $? -ne 0 ]; then
  log "Failed to navigate to application directory: $APP_DIR"
  exit 1
fi

# Activate the virtual environment
# Look for the virtual environment in all possible locations
if [ -d "$APP_DIR/.venv" ]; then
  log "Using application-specific virtual environment"
  source $APP_DIR/.venv/bin/activate
elif [ -d "/var/app/venv/staging-LQM1lest" ]; then
  log "Using platform staging virtual environment"
  source /var/app/venv/staging-LQM1lest/bin/activate
elif [ -d "/var/app/venv" ]; then
  log "Using legacy venv path"
  source /var/app/venv/*/bin/activate
else
  log "No virtual environment found!"
  log "Listing directories for debugging:"
  ls -la /var/app/
  ls -la $APP_DIR || echo "No application directory"
  ls -la /var/app/venv/ || echo "No venv directory"
  exit 1
fi

if [ $? -ne 0 ]; then
  log "Failed to activate virtual environment"
  exit 1
fi

# Install AWS CLI dependencies if not already installed
log "Installing required packages"
pip install awscli boto3 psycopg2-binary --upgrade

# Verify AWS CLI is working
log "Verifying AWS CLI installation"
aws --version
if [ $? -ne 0 ]; then
  log "AWS CLI is not installed or not functioning properly"
  exit 1
fi

# Retrieve the password from AWS Secrets Manager
log "Retrieving database password from AWS Secrets Manager..."
SECRET_NAME="aolf-gsec-db-uat-credentials"
REGION="us-east-2"

# Print IAM identity for debugging
log "Current IAM identity:"
aws sts get-caller-identity || log "Unable to get caller identity"

# Get the secret value
log "Attempting to retrieve secret from Secrets Manager"
SECRET=$(aws secretsmanager get-secret-value --secret-id $SECRET_NAME --region $REGION --query SecretString --output text)
if [ $? -ne 0 ]; then
  log "Failed to retrieve secret from AWS Secrets Manager"
  exit 1
fi

# Extract the password from the JSON response
log "Parsing the secret JSON response"
POSTGRES_PASSWORD=$(echo $SECRET | python -c "import sys, json; print(json.load(sys.stdin).get('password', ''))")

if [ -z "$POSTGRES_PASSWORD" ]; then
  log "Error: Failed to retrieve database password from Secrets Manager"
  # Print the secret format (without the actual value) for debugging
  echo $SECRET | python -c "import sys, json; print('Secret keys:', list(json.load(sys.stdin).keys()))" || log "Failed to parse JSON"
  exit 1
fi

log "Successfully retrieved database password from Secrets Manager"

# Ensure we have all required database connection parameters
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_PORT" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
  log "Error: Missing required database connection parameters"
  exit 1
fi

# Set the Python path
export PYTHONPATH=$APP_DIR:$PYTHONPATH

# Print environment variables for debugging (without sensitive values)
log "Running database migrations with the following configuration:"
log "POSTGRES_HOST: $POSTGRES_HOST"
log "POSTGRES_PORT: $POSTGRES_PORT"
log "POSTGRES_DB: $POSTGRES_DB"
log "POSTGRES_USER: $POSTGRES_USER"
log "Database password retrieved from Secrets Manager: $(if [ -n "$POSTGRES_PASSWORD" ]; then echo "Yes"; else echo "No"; fi)"
log "Application directory: $APP_DIR"

# Create the database if it doesn't exist
log "Checking if database exists and creating it if needed..."

# Connect to the 'postgres' database to run CREATE DATABASE command
python -c "
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

try:
    # Connect to postgres database to create the app database if it doesn't exist
    conn = psycopg2.connect(
        host='$POSTGRES_HOST',
        port='$POSTGRES_PORT',
        user='$POSTGRES_USER',
        password='$POSTGRES_PASSWORD',
        database='postgres'
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute(\"SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB';\")
    exists = cursor.fetchone()
    
    if not exists:
        print('Creating database $POSTGRES_DB...')
        cursor.execute('CREATE DATABASE $POSTGRES_DB;')
        print('Database $POSTGRES_DB created successfully')
    else:
        print('Database $POSTGRES_DB already exists')
    
    cursor.close()
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f'Error: {str(e)}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
  log "Failed to create database"
  exit 1
fi

# Set DATABASE_URL for Alembic
export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"

# Ensure alembic is installed
log "Installing alembic and psycopg2-binary"
pip install alembic psycopg2-binary

# Check if alembic.ini exists
if [ ! -f "alembic.ini" ]; then
  log "Error: alembic.ini file not found!"
  ls -la
  exit 1
fi

# Run database migrations
log "Running alembic migrations..."
alembic upgrade head
MIGRATION_RESULT=$?

if [ $MIGRATION_RESULT -eq 0 ]; then
  log "Database migrations completed successfully"
else
  log "Database migrations failed with exit code $MIGRATION_RESULT"
fi

# Exit with the status of the migration command
exit $MIGRATION_RESULT