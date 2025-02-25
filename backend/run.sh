#!/bin/bash

# Default to dev environment if not specified
ENV=${1:-dev}

# Check if the environment file exists
if [ ! -f ".env.$ENV" ]; then
    echo "Error: Environment file .env.$ENV does not exist."
    echo "Available environments:"
    ls -1 .env.* | grep -v ".env.example" | sed 's/\.env\.//'
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

echo "Starting application in $ENV environment..."
ENVIRONMENT=$ENV python3.12 -m uvicorn app:app --reload --port 8001
