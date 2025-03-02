# Google App Engine Full-Stack Deployment Guide for AOLF GSEC

This guide provides instructions for deploying both the frontend and backend of the AOLF GSEC application to a single Google App Engine (GAE) instance. This deployment option is provided as an alternative for UAT environments if AWS is not available or preferred.

## Overview

This deployment approach combines both the frontend and backend into a single deployment:

1. The backend FastAPI application serves the API endpoints
2. The frontend React application is served as static files from the same instance
3. URL routing is configured to direct API requests to the backend and all other requests to the frontend

## Prerequisites

Before you begin, ensure you have the following:

1. **Google Cloud SDK**: Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) which includes the `gcloud` command-line tool.
2. **Python 3.12**: Ensure you have Python 3.12 installed, as this is the version specified in the `app.yaml` file.
3. **Node.js and npm**: Required to build the frontend application.
4. **Google Cloud Account**: You need a Google Cloud account with billing enabled.
5. **Project Owner Access**: You need to have Owner or Editor access to the Google Cloud project you'll be using.

## Deployment Process

### 1. Environment Setup

Before deployment, ensure you have the correct environment files:

- Backend: `.env.uat` or `.env.prod` in the `backend` directory
- Frontend: `.env` in the `frontend` directory

The deployment script will check for these files and create them if they don't exist.

### 2. Running the Deployment Script

To deploy the full-stack application to Google App Engine, run the deployment script with the desired environment:

```bash
# Make the script executable
chmod +x deploy-gae-fullstack.sh

# Deploy to UAT environment
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=uat

# Or deploy to production environment
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=prod
```

Replace `YOUR_PROJECT_ID` with your Google Cloud project ID.

### 3. Additional Options

The deployment script supports several options to handle different scenarios:

```bash
# Skip Secret Manager (if you don't want to use Google Secret Manager)
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=uat --skip-secret-manager

# Skip database creation (if the database already exists)
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=uat --skip-db-creation

# Get help and see all available options
./deploy-gae-fullstack.sh --help
```

### 4. What the Deployment Script Does

The deployment script performs the following steps:

1. Checks if the Google Cloud SDK is installed
2. Ensures the environment files exist and updates the frontend environment with the correct API URL
3. Initializes the Google Cloud project and enables required APIs
4. Creates an App Engine application if it doesn't exist
5. Sets up a Cloud SQL PostgreSQL instance (or uses an existing one)
6. Stores sensitive information in Google Secret Manager (optional)
7. Builds the frontend application
8. Prepares a deployment directory with both backend and frontend files
9. Updates the `app.yaml` file with environment variables and static file handling
10. Updates CORS settings in the backend code to allow the App Engine domain
11. Deploys the application to Google App Engine
12. Cleans up temporary files

### 5. Handling Existing Resources

The script is designed to handle cases where resources already exist:

- **Existing Project**: If the project already exists, the script will use it instead of trying to create a new one.
- **Existing App Engine Application**: If an App Engine application already exists in the project, the script will use it.
- **Existing Cloud SQL Instance**: If a Cloud SQL instance with the name `aolf-gsec-postgres-{env}` already exists, the script will use it.
- **Existing Database**: If the database already exists, the script will use it.
- **Existing Secrets**: If secrets already exist in Secret Manager, the script will update them.

You can also use the `--skip-db-creation` flag if you want to skip the database setup entirely and use an existing database.

### 6. Accessing the Application

Once deployed, the application will be accessible at:

```
https://YOUR_PROJECT_ID.appspot.com
```

The API endpoints will be available at:

```
https://YOUR_PROJECT_ID.appspot.com/api/...
```

The OpenAPI documentation will be available at:

```
https://YOUR_PROJECT_ID.appspot.com/docs
```

## URL Routing

The deployment uses the following URL routing configuration:

1. API-specific paths (`/docs`, `/openapi.json`, `/api/*`) are routed to the backend FastAPI application
2. Static file requests (files with extensions like `.js`, `.css`, `.png`, etc.) are served from the static directory
3. All other requests are routed to the frontend's `index.html` to support React Router

This configuration is defined in the `app.yaml` file:

```yaml
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

# Static file handlers
- url: /static
  static_dir: static
  secure: always

- url: /(.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot))$
  static_files: static/\1
  upload: static/.*\.(json|ico|js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$
  secure: always

# All other routes go to index.html for React Router
- url: /.*
  static_files: static/index.html
  upload: static/index.html
  secure: always
```

## Database Migration

The deployment script sets up a Cloud SQL PostgreSQL instance, but it doesn't automatically run database migrations. To run migrations:

1. Connect to the Cloud SQL instance using the Cloud SQL Proxy:

```bash
# Install the Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.6.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Start the proxy
./cloud-sql-proxy --port 5432 PROJECT_ID:REGION:INSTANCE_NAME
```

2. Run the migrations using Alembic:

```bash
# Set the database URL environment variable
export DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME

# Run the migrations
cd backend
alembic upgrade head
```

## Error Handling

The script includes improved error handling to:

1. Provide clear error messages when something goes wrong
2. Clean up temporary files if the deployment fails
3. Continue with warnings for non-critical issues
4. Handle platform-specific differences (macOS vs Linux)

If you encounter an error, the script will display an error message and exit. Check the error message for details on what went wrong and how to fix it.

## Troubleshooting

### Viewing Logs

To view the application logs:

```bash
gcloud app logs tail --project=YOUR_PROJECT_ID
```

### Common Issues

1. **Permission Issues**: Make sure you have the necessary permissions on the Google Cloud project. You need at least Editor role.
2. **API Not Enabled**: If you see errors about APIs not being enabled, you can enable them manually in the Google Cloud Console.
3. **CORS Issues**: If you encounter CORS issues, check that the CORS settings in the backend code include the App Engine domain.
4. **API Routing Issues**: If API requests are not being routed correctly, check the URL patterns in the `app.yaml` file.
5. **Frontend Routing Issues**: If the frontend routing is not working correctly, ensure that all non-API routes are being directed to `index.html`.
6. **Database Connection Issues**: Verify that the Cloud SQL instance is running and that the connection string is correct.
7. **NPM Dependency Conflicts**: The deployment script uses `--legacy-peer-deps` flag to handle dependency conflicts. If you encounter additional npm errors, you may need to update the frontend dependencies manually or add more npm flags to the script.
8. **Python Dependency Conflicts**: If you encounter Python dependency conflicts during deployment, you may need to update the `backend/requirements.txt` file to resolve them. The script now includes a dependency check step that will warn you about potential conflicts before deployment.

### Handling Frontend Dependency Issues

If you encounter npm dependency conflicts during deployment:

1. The script automatically uses the `--legacy-peer-deps` flag to bypass peer dependency checks
2. If this doesn't resolve the issue, you can manually update the dependencies in `frontend/package.json`
3. For specific MUI version conflicts, ensure compatible versions between `@mui/material` and `@mui/x-data-grid`

### Handling Python Dependency Issues

If you encounter Python dependency conflicts during deployment:

1. The error message will typically indicate which packages have conflicting dependencies
2. Update the `backend/requirements.txt` file to resolve the conflicts:
   - Use version ranges instead of pinned versions (e.g., `typing-extensions>=4.11.0` instead of `typing-extensions==4.9.0`)
   - Remove duplicate package entries
   - Ensure compatible versions between packages that depend on each other
3. Test the updated requirements locally before deployment:
   ```bash
   python -m venv test_venv
   source test_venv/bin/activate  # On Windows: test_venv\Scripts\activate
   pip install -r backend/requirements.txt
   deactivate
   rm -rf test_venv
   ```

### Redeploying After Changes

If you need to make changes and redeploy:

1. Make your changes to the frontend or backend code
2. Run the deployment script again with the same parameters

The script will rebuild the frontend, update the deployment files, and redeploy the application.

## Advantages of This Approach

1. **Simplified Deployment**: Only one deployment to manage instead of separate frontend and backend deployments.
2. **Cost Efficiency**: Using a single instance for both frontend and backend can be more cost-effective.
3. **Simplified URL Structure**: No need for separate domains or complex CORS configurations.
4. **Easier Development-to-Production Workflow**: The same URL structure can be used in development and production.
5. **Graceful Handling of Existing Resources**: The script can work with existing projects, databases, and other resources.

## Limitations

1. **Scaling Limitations**: Frontend and backend scale together, which may not be optimal for all workloads.
2. **Deployment Complexity**: The deployment process is more complex than deploying frontend and backend separately.
3. **Single Point of Failure**: If the App Engine instance goes down, both frontend and backend are affected.

## Additional Resources

- [Google App Engine Documentation](https://cloud.google.com/appengine/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [FastAPI on Google App Engine](https://fastapi.tiangolo.com/deployment/google-app-engine/)
- [Serving Static Files on App Engine](https://cloud.google.com/appengine/docs/standard/python3/serving-static-files) 