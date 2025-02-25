#!/bin/bash

# Default to dev environment if not specified
ENV=${1:-dev}
PORT=${2:-8001}

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

# Check if the port is in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "Port $PORT is already in use. Trying port $((PORT+1))..."
    PORT=$((PORT+1))
    
    # Check if the new port is also in use
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
        echo "Port $PORT is also in use. Please specify a different port."
        exit 1
    fi
fi

echo "Starting application in $ENV environment on port $PORT..."
ENVIRONMENT=$ENV python3.12 -m uvicorn app:app --reload --port $PORT
