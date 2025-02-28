#!/bin/bash
# Database migration script for Elastic Beanstalk deployment
# This script runs migrations on the external RDS instance

# Exit on error
set -e

# Log function for better visibility
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Activate the virtual environment
source /var/app/venv/*/bin/activate
if [ $? -ne 0 ]; then
  log "Failed to activate virtual environment"
  exit 1
fi

# Navigate to the application directory
cd /var/app/current
if [ $? -ne 0 ]; then
  log "Failed to navigate to application directory"
  exit 1
fi

# Set the Python path
export PYTHONPATH=/var/app/current:$PYTHONPATH

# Print environment variables for debugging (without sensitive values)
log "Running database migrations with the following configuration:"
log "POSTGRES_HOST: $POSTGRES_HOST"
log "POSTGRES_PORT: $POSTGRES_PORT"
log "POSTGRES_DB: $POSTGRES_DB"
log "POSTGRES_USER: $POSTGRES_USER"
log "Database password is set: $(if [ -n "$POSTGRES_PASSWORD" ]; then echo "Yes"; else echo "No"; fi)"

# Set DATABASE_URL for Alembic
export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"

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