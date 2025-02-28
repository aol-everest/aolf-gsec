# Google App Engine Deployment Guide

This guide provides instructions for deploying the AOLF GSEC application to Google App Engine (GAE).

## Prerequisites

Before deploying, ensure you have:

1. Google Cloud SDK installed and configured
2. Node.js (v16+) and npm installed
3. Python 3.9+ installed
4. A Google Cloud Platform project with billing enabled
5. App Engine enabled in your GCP project
6. Frontend and backend environment files properly configured
7. Google OAuth credentials configured with the appropriate redirect URIs

## Environment Configuration

The AOLF GSEC application supports multiple deployment environments:

- **Development**: Local development environment
- **UAT**: User Acceptance Testing environment
- **Production**: Production environment

### Backend Environment Files

Create environment-specific files in the `backend` directory:

**UAT Environment (.env.uat)**:
```
JWT_SECRET_KEY=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
POSTGRES_USER=gsec_user
POSTGRES_PASSWORD=your_database_password
POSTGRES_DB=gsec
POSTGRES_HOST=/cloudsql/your-project-id:us-central1:aolf-gsec-postgres-uat
POSTGRES_PORT=5432
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_sender_email
ENABLE_EMAIL=true
```

**Production Environment (.env.prod)**:
```
JWT_SECRET_KEY=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
POSTGRES_USER=gsec_user
POSTGRES_PASSWORD=your_database_password
POSTGRES_DB=gsec
POSTGRES_HOST=/cloudsql/your-project-id:us-central1:aolf-gsec-postgres-prod
POSTGRES_PORT=5432
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_sender_email
ENABLE_EMAIL=true
```

### Frontend Environment Files

Create environment-specific files in the `frontend` directory:

**UAT Environment (.env.uat)**:
```
REACT_APP_API_URL=https://backend-uat-dot-your-project-id.appspot.com
REACT_APP_ENVIRONMENT=uat
```

**Production Environment (.env.prod)**:
```
REACT_APP_API_URL=https://backend-dot-your-project-id.appspot.com
REACT_APP_ENVIRONMENT=prod
```

## Deployment Process

### 1. Update Your GAE Deployment Configuration

Before deploying, run the update script to patch your deployment scripts:

```bash
./deployment/gae/update-gae-deployment.sh
```

This script will:
- Install the env-cmd package (if not already installed)
- Update the deployment script to use environment-specific configuration

### 2. Deploy to UAT Environment

```bash
./deployment/gae/deploy-gae-fullstack.sh -p your-project-id --env=uat
```

This command will:
- Build the frontend application with UAT environment configuration
- Deploy the backend to the `backend-uat` service
- Deploy the frontend to the default service
- Configure environment variables and Cloud SQL connections

### 3. Deploy to Production Environment

```bash
./deployment/gae/deploy-gae-fullstack.sh -p your-project-id --env=prod
```

This command will:
- Build the frontend application with production environment configuration
- Deploy the backend to the `backend` service
- Deploy the frontend to the default service
- Configure environment variables and Cloud SQL connections

## Service Architecture

The deployed application will have the following architecture:

- **Frontend**: Deployed to the default service (`default`)
  - URL: `https://your-project-id.appspot.com`
  
- **Backend APIs**:
  - UAT: Deployed to `backend-uat` service
    - URL: `https://backend-uat-dot-your-project-id.appspot.com`
  - Production: Deployed to `backend` service
    - URL: `https://backend-dot-your-project-id.appspot.com`

## Google OAuth Configuration

Ensure your Google OAuth credentials are configured with the appropriate redirect URIs:

- Development: `http://localhost:3000`
- UAT: `https://your-project-id.appspot.com`
- Production: `https://your-project-id.appspot.com`

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure you have sufficient IAM permissions in the GCP project
   - Make sure the necessary APIs are enabled (App Engine, Cloud SQL, etc.)

2. **Deployment Failures**
   - Check App Engine logs: `gcloud app logs tail -s [SERVICE_NAME]`
   - Verify environment variables are correctly configured

3. **Database Connection Issues**
   - Ensure Cloud SQL instance exists and is properly configured
   - Check that the service account has access to the Cloud SQL instance

## Monitoring Your Deployment

After deployment, you can:

- View your application: `https://your-project-id.appspot.com`
- Monitor App Engine status: Google Cloud Console > App Engine > Dashboard
- View application logs: `gcloud app logs tail` or through Cloud Console

## Scaling and Resources

By default, the deployment uses F2 instance class. To adjust scaling, edit the `app.yaml` files before deployment or modify the deployment script to generate different configurations.

For production deployments, consider:
- Setting appropriate scaling parameters
- Configuring automatic instance scaling
- Setting up monitoring and alerts

## Rollback Procedure

If a deployment fails or causes issues:

1. Use the Google Cloud Console to roll back to a previous version
2. Navigate to App Engine > Versions
3. Select the previous working version
4. Click "Migrate Traffic" to route requests to that version 