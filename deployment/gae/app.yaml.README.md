# Hardcoded app.yaml for AOLF GSEC Fullstack Deployment

This file contains the hardcoded app.yaml configuration used by the `deploy-gae-fullstack.sh` script for deploying the AOLF GSEC application to Google App Engine.

## Environment Variables

The app.yaml file contains placeholders for environment variables that will be replaced during deployment:

- `${DEPLOY_ENV}`: The deployment environment (dev, uat, prod)
- `${SQL_CONNECTION_NAME}`: The Cloud SQL connection name
- `${POSTGRES_DB}`: The PostgreSQL database name
- `${POSTGRES_USER}`: The PostgreSQL username
- `${POSTGRES_PASSWORD}`: The PostgreSQL password
- `${JWT_SECRET_KEY}`: The JWT secret key
- `${GOOGLE_CLIENT_ID}`: The Google Client ID
- `${SENDGRID_API_KEY}`: The SendGrid API key
- `${FROM_EMAIL}`: The sender email address

## Handlers

The app.yaml file includes handlers for:

1. API endpoints
2. Static files (CSS, JS, media)
3. All other routes (redirected to index.html for React Router)

## Scaling Configuration

The app.yaml includes automatic scaling configuration with:
- Minimum instances: 1
- Maximum instances: 5
- Target CPU utilization: 0.65
- Target throughput utilization: 0.65
- Maximum concurrent requests: 50

## Modifying the Configuration

If you need to modify the app.yaml configuration:

1. Edit the `app.yaml` file directly
2. Ensure any new environment variables are added to the replacement logic in the `create_unified_app_yaml` function in `deploy-gae-fullstack.sh`

## Deployment

The deployment script will:
1. Copy this app.yaml file to the temporary deployment directory
2. Replace all placeholders with actual values from the environment
3. Deploy the application to Google App Engine

An archive of each deployed app.yaml is stored in the `app-yaml-archive` directory with the version identifier. 