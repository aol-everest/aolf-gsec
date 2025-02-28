# AOLF GSEC Google App Engine Deployment

This directory contains scripts for deploying the AOLF GSEC application to Google App Engine.

## Overview

The deployment script `deploy-gae-fullstack.sh` automates the process of deploying both the frontend and backend components to Google App Engine. It handles:

- Setting up the Google Cloud environment
- Configuring Cloud SQL databases
- Managing secrets in Google Secret Manager
- Building the frontend application
- Deploying both frontend and backend services

## Prerequisites

Before running the deployment script, ensure you have:

1. Google Cloud SDK installed and configured
2. Appropriate permissions on the target Google Cloud project
3. Node.js and npm installed for frontend builds
4. Python 3.9+ installed for backend dependency checks

## Usage

```bash
./deploy-gae-fullstack.sh -p <PROJECT_ID> [options]
```

### Options

- `-p, --project <PROJECT_ID>`: Google Cloud project ID (required)
- `--env <ENVIRONMENT>`: Deployment environment (dev, uat, prod) (default: uat)
- `--version <VERSION>`: Version identifier for deployment (default: timestamp)
- `--skip-secret-manager`: Skip storing parameters in Google Secret Manager
- `--skip-db-creation`: Skip Cloud SQL database creation (use if DB already exists)
- `--region <REGION>`: GCP region for resources (default: us-central1)
- `-h, --help`: Display help message

### Examples

```bash
# Deploy to UAT environment
./deploy-gae-fullstack.sh -p my-gae-project --env=uat

# Deploy to production environment with specific version
./deploy-gae-fullstack.sh -p my-gae-project --env=prod --version=v1-0-0

# Deploy without creating a new database (if it already exists)
./deploy-gae-fullstack.sh -p my-gae-project --skip-db-creation

# Deploy to a specific region
./deploy-gae-fullstack.sh -p my-gae-project --region=us-west1
```

## Deployment Architecture

The script deploys the application with the following architecture:

- **Frontend**: Deployed as a Node.js service (default service)
- **Backend**: Deployed as a Python service (backend or backend-{env})
- **Database**: Cloud SQL PostgreSQL instance

### Service Names

- **Production Environment**:
  - Frontend: `default`
  - Backend: `backend`

- **Non-Production Environments** (dev, uat):
  - Frontend: `default`
  - Backend: `backend-{env}` (e.g., `backend-uat`)

## Environment Files

The script manages environment files for both frontend and backend:

- Backend: `.env.{environment}` (e.g., `.env.uat`, `.env.prod`)
- Frontend: `.env`

If these files don't exist, they will be created from templates or existing environment files.

## Database Setup

The script creates and configures a Cloud SQL PostgreSQL instance for the application:

- Instance name: `aolf-gsec-postgres-{env}`
- Database name: From environment file or default (`gsec`)
- User: From environment file or default (`gsec_user`)

## Secret Management

Sensitive information is stored in Google Secret Manager:

- Database credentials
- JWT secret key
- Google client ID
- SendGrid API key
- Email configuration

## Troubleshooting

If the deployment fails, check:

1. Google Cloud project permissions
2. Environment file configuration
3. Deployment logs: `gcloud app logs tail --project=<PROJECT_ID>`
4. Database connection settings
5. Frontend build errors

## Additional Resources

- [Google App Engine Documentation](https://cloud.google.com/appengine/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs) 