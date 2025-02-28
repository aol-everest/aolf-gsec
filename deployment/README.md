# AOLF GSEC Deployment

This directory contains deployment scripts and configurations for the AOLF GSEC application.

## Directory Structure

- `/aws`: AWS deployment scripts and guides
- `/gae`: Google App Engine deployment scripts and guides
- `/eb`: Elastic Beanstalk deployment scripts and guides
- `/common`: Shared utility scripts used by all deployment processes
- `verification-scripts.md`: Documentation for deployment verification scripts

## Overview

The AOLF GSEC application can be deployed to three environments:

1. **Google App Engine (GAE)**: A fully managed platform that supports both the frontend and backend components of the application.
2. **AWS S3/CloudFront**: A deployment option using S3 for static hosting of the frontend, with CloudFront for CDN capabilities.
3. **AWS Elastic Beanstalk**: A managed service for deploying and scaling the backend application.

## Environment Configuration

The application supports multiple environments:

- **Development**: Local development environment
- **UAT**: User Acceptance Testing environment
- **Production**: Production environment

Environment-specific configurations are stored in `.env.[environment]` files in the frontend directory. These files contain settings like API URLs specific to each environment.

## Deployment Process

### Google App Engine (GAE)

The GAE deployment process:

1. Builds the frontend application using the appropriate environment configuration
2. Deploys the backend API to a GAE service
3. Deploys the frontend to a GAE service
4. Sets up URL routing and environment variables

For detailed instructions, see [GAE Deployment Guide](./gae/README.md).

### AWS Frontend (S3/CloudFront)

The AWS frontend deployment process:

1. Builds the frontend application using the appropriate environment configuration
2. Uploads the built files to an S3 bucket
3. Configures the bucket for static website hosting
4. Creates or updates a CloudFront distribution for CDN capabilities
5. Invalidates CloudFront cache to propagate changes

For detailed instructions, see [AWS Deployment Guide](./aws/README.md).

### AWS Backend (Elastic Beanstalk)

The Elastic Beanstalk deployment process:

1. Prepares the backend application with the appropriate environment configuration
2. Creates or updates an Elastic Beanstalk environment
3. Deploys the application to the environment
4. Sets up database connections and environment variables

For detailed instructions, see [Elastic Beanstalk Deployment Guide](./eb/aws-eb-deployment-guide.md).

## Verification Scripts

After deploying your application, you can verify that the deployment was successful using our verification scripts:

- **AWS Frontend**: Use `./deployment/aws/verification/verify-deployment.sh` to verify S3 and CloudFront setup
- **Elastic Beanstalk**: Use `./deployment/eb/verification/verify-eb-deployment.sh` to verify the backend on EB
- **Google App Engine**: Use `./deployment/gae/verification/verify-gae-deployment.sh` to verify GAE deployment

For detailed information about the verification scripts, see [Verification Scripts](./verification-scripts.md).

## Common Utilities

The `common` directory contains shared scripts and utilities used by all deployment processes:

- `env-utils.sh`: Functions for environment validation, creating environment files, and building the application with the proper environment

## Prerequisites

- Node.js (v16+) and npm
- Python 3.9+
- AWS CLI (for AWS deployments)
- Google Cloud SDK (for GAE deployments)
- EB CLI (for Elastic Beanstalk deployments)

## Getting Started

1. Choose your deployment target (GAE, AWS S3/CloudFront, or Elastic Beanstalk)
2. Review the corresponding deployment guide
3. Configure your environment files
4. Run the appropriate deployment script
5. Verify your deployment using the verification scripts

## Deployment Checklist

Before deploying to production, ensure:

- All environment variables are correctly set
- Google OAuth configuration has the correct redirect URIs
- Backend API endpoints are properly configured
- Database migrations are applied
- All required services are enabled in your cloud platform
- Run verification scripts to confirm deployment success 