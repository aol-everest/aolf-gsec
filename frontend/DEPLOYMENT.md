# AOLF GSEC Frontend Deployment

This document outlines the process for deploying the AOLF GSEC Frontend application to AWS.

## Deployment URLs

The frontend application is deployed to:

- **UAT Environment**: https://d2wxu2rjtgc6ou.cloudfront.net/uat/frontend/
- **Production Environment**: [Not yet configured]

## Prerequisites

- AWS CLI installed and configured with appropriate credentials
- Node.js and npm installed
- Proper environment variables set in `.env.uat` or `.env.production` files

## Deployment Process

The deployment process is automated via the `deploy-frontend.sh` script, which handles:

1. Installing dependencies
2. Building the application for the specified environment
3. Uploading the build files to the S3 bucket
4. Invalidating the CloudFront cache to serve the latest files

### Deployment Commands

To deploy to the UAT environment:

```bash
./deploy-frontend.sh --env uat
```

To deploy to the production environment:

```bash
./deploy-frontend.sh --env prod --s3-bucket [prod-bucket-name] --cloudfront-id [prod-cloudfront-id]
```

## AWS Infrastructure Setup

The frontend is deployed using the following AWS services:

- **S3 Bucket**: `aolf-gsec-uat` - Stores the frontend files
- **CloudFront Distribution**: `E2O7PMT0VIGSF6` - Serves the frontend files securely
- **CloudFront Domain**: `d2wxu2rjtgc6ou.cloudfront.net`

## Configuration

The frontend communicates with the backend API using the environment variables defined in:

- `.env.development` - For local development
- `.env.uat` - For the UAT environment
- `.env.production` - For the production environment

The key configuration variable is `REACT_APP_API_URL` which should point to the appropriate backend API URL.

## Troubleshooting

If the deployment fails:

1. Check AWS credentials and permissions
2. Verify environment variables in the appropriate `.env` file
3. Check S3 bucket and CloudFront distribution settings
4. Review build logs for any errors or warnings 