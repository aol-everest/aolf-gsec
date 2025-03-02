#!/bin/bash
# Script to test the health check endpoint

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default environment
ENV="uat"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env=*)
      ENV="${1#*=}"
      shift
      ;;
    -e|--env)
      ENV="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--env=<environment>] [-e|--env <environment>]"
      exit 1
      ;;
  esac
done

# Get the URL based on the environment
if [ "$ENV" == "prod" ]; then
  URL="https://api.aolf-gsec.org/health"
elif [ "$ENV" == "uat" ]; then
  URL="https://aolf-gsec-backend-uat.eba-s2w28g5k.us-east-2.elasticbeanstalk.com/health"
else
  echo "Unknown environment: $ENV"
  echo "Supported environments: prod, uat"
  exit 1
fi

echo "Testing health check endpoint for $ENV environment: $URL"

# Make the request and save the response
response=$(curl -s -o response.json -w "%{http_code}" $URL)

if [ "$response" == "200" ]; then
  echo -e "${GREEN}Health check successful (HTTP 200)${NC}"
  echo "Response:"
  cat response.json | jq . 2>/dev/null || cat response.json
else
  echo -e "${RED}Health check failed (HTTP $response)${NC}"
  echo "Response:"
  cat response.json 2>/dev/null || echo "No response body"
fi

# Clean up
rm -f response.json 