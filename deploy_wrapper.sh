#!/bin/bash

# Set script directory and load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Remove build directory if it exists
if [ -d "$FRONTEND_DIR/build" ]; then
    echo "Removing existing build directory..."
    rm -rf "$FRONTEND_DIR/build" || {
        echo "Failed to remove build directory. Trying with sudo..."
        sudo rm -rf "$FRONTEND_DIR/build"
    }
fi

# Create temp_deploy directory if it doesn't exist
if [ ! -d "$PROJECT_ROOT/temp_deploy" ]; then
    echo "Creating temp_deploy directory..."
    mkdir -p "$PROJECT_ROOT/temp_deploy"
fi

# Run the deployment script
echo "Running deployment script..."
./deploy-gae-fullstack.sh -p aolf-gsec-uat --env=uat --skip-secret-manager
