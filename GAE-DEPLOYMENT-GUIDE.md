# Google App Engine Deployment Guide for AOLF GSEC Backend

This guide provides instructions for deploying the AOLF GSEC Backend application to Google App Engine (GAE). This deployment option is provided as an alternative for UAT environments if AWS is not available or preferred.

## Prerequisites

Before you begin, ensure you have the following:

1. **Google Cloud SDK**: Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) which includes the `gcloud` command-line tool.
2. **Python 3.12**: Ensure you have Python 3.12 installed, as this is the version specified in the `app.yaml` file.
3. **Google Cloud Account**: You need a Google Cloud account with billing enabled.
4. **Project Owner Access**: You need to have Owner or Editor access to the Google Cloud project you'll be using.

## Deployment Files

The following files are used for Google App Engine deployment:

1. **app.yaml**: Configuration file for Google App Engine that specifies runtime, scaling, and environment variables.
2. **deploy-gae.sh**: Deployment script that automates the deployment process.
3. **verify-gae-deployment.sh**: Verification script to check if the deployment was successful.
4. **application.py**: WSGI entry point for the application (same as used for AWS Elastic Beanstalk).

## Deployment Process

### 1. Environment Setup

Before deployment, ensure you have the correct environment file (`.env.uat` or `.env.prod`) with the necessary configuration. The deployment script will check for this file and create it if it doesn't exist.

### 2. Running the Deployment Script

To deploy the application to Google App Engine, run the deployment script with the desired environment:

```bash
# Navigate to the backend directory
cd backend

# Make the script executable
chmod +x deploy-gae.sh

# Deploy to UAT environment
./deploy-gae.sh --env=uat

# Or deploy to production environment
./deploy-gae.sh --env=prod
```

The deployment script performs the following steps:

1. Checks if the Google Cloud SDK is installed
2. Ensures the environment file exists
3. Initializes the Google Cloud project
4. Sets up a Cloud SQL PostgreSQL instance
5. Stores sensitive information in Google Secret Manager (optional)
6. Updates the `app.yaml` file with environment variables
7. Deploys the application to Google App Engine

### 3. Verifying the Deployment

After deployment, you can verify that the application is running correctly by using the verification script:

```bash
# Make the script executable
chmod +x verify-gae-deployment.sh

# Verify the UAT deployment
./verify-gae-deployment.sh --env=uat

# Or verify the production deployment
./verify-gae-deployment.sh --env=prod
```

The verification script checks:

1. If the App Engine application is deployed and serving
2. If the Cloud SQL instance is running
3. If the API endpoints are accessible
4. If there are any errors in the application logs

### 4. Accessing the Application

Once deployed, the application will be accessible at:

- UAT: `https://aolf-gsec-uat.appspot.com`
- Production: `https://aolf-gsec-prod.appspot.com`

The OpenAPI documentation will be available at:

- UAT: `https://aolf-gsec-uat.appspot.com/docs`
- Production: `https://aolf-gsec-prod.appspot.com/docs`

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

## Environment Variables

The following environment variables are set in the `app.yaml` file:

- `ENVIRONMENT`: The deployment environment (uat or prod)
- `POSTGRES_HOST`: The Cloud SQL connection path
- `POSTGRES_PORT`: The PostgreSQL port (5432)
- `POSTGRES_DB`: The database name
- `POSTGRES_USER`: The database username
- `POSTGRES_PASSWORD`: The database password
- `JWT_SECRET_KEY`: Secret key for JWT token generation
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `SENDGRID_API_KEY`: SendGrid API key for email notifications
- `FROM_EMAIL`: Email address used as the sender for notifications
- `ENABLE_EMAIL`: Flag to enable/disable email notifications

## Scaling Configuration

The application is configured to scale automatically based on CPU and throughput utilization. The scaling settings can be adjusted in the `app.yaml` file:

```yaml
automatic_scaling:
  min_instances: 1
  max_instances: 5
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.65
  max_concurrent_requests: 50
```

## Troubleshooting

### Viewing Logs

To view the application logs:

```bash
gcloud app logs tail --project=aolf-gsec-uat
```

### Connecting to the Database

To connect to the Cloud SQL database:

1. Install the Cloud SQL Proxy as described in the Database Migration section.
2. Use a PostgreSQL client to connect to the local proxy:

```bash
psql -h localhost -p 5432 -U USERNAME -d DATABASE_NAME
```

### Common Issues

1. **Deployment Fails**: Check if the Google Cloud project has billing enabled and if the necessary APIs are enabled.
2. **Database Connection Issues**: Verify that the Cloud SQL instance is running and that the connection string is correct.
3. **Permission Errors**: Ensure that the App Engine service account has the necessary permissions to access Cloud SQL and Secret Manager.

## Comparison with AWS Elastic Beanstalk

Google App Engine and AWS Elastic Beanstalk are both Platform as a Service (PaaS) offerings that simplify application deployment. Here are some key differences:

1. **Scaling**: Both platforms offer automatic scaling, but GAE's scaling is more fine-grained and can scale to zero instances when there's no traffic.
2. **Database**: AWS EB can create an RDS instance as part of the environment, while GAE requires a separate Cloud SQL instance.
3. **Pricing**: GAE can be more cost-effective for applications with variable traffic due to its per-instance-hour billing.
4. **Cold Start**: GAE may have cold start issues if the application scales down to zero instances, while AWS EB maintains at least one instance running.

## Additional Resources

- [Google App Engine Documentation](https://cloud.google.com/appengine/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [FastAPI on Google App Engine](https://fastapi.tiangolo.com/deployment/google-app-engine/) 