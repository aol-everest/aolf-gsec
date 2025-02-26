#!/bin/bash
# Database migration script for Elastic Beanstalk deployment

# Activate the virtual environment
source /var/app/venv/*/bin/activate

# Navigate to the application directory
cd /var/app/current

# Set the Python path
export PYTHONPATH=/var/app/current:$PYTHONPATH

# Run database migrations
alembic upgrade head

# Exit with the status of the last command
exit $? 