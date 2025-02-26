# AOLF GSEC Frontend Deployment Files Summary

This document provides a summary of all the deployment-related files created for the AOLF GSEC frontend application.

## Deployment Documentation

| File | Description |
|------|-------------|
| `AWS-DEPLOYMENT-README.md` | Overview of the AWS deployment setup |
| `aws-deployment-guide.md` | Comprehensive step-by-step deployment guide |
| `cloudfront-setup-guide.md` | Detailed guide for CloudFront setup |
| `DEPLOYMENT-FILES-SUMMARY.md` | This file - summary of all deployment files |

## Deployment Scripts

| File | Description |
|------|-------------|
| `deploy.sh` | Main deployment script for S3 and CloudFront |
| `verify-deployment.sh` | Script to verify successful deployment |
| `cloudfront-function.js` | CloudFront function for SPA routing |

## CI/CD Configuration

| File | Description |
|------|-------------|
| `.github/workflows/deploy-frontend.yml` | GitHub Actions workflow for automated deployment |

## How to Use These Files

1. **Initial Deployment**:
   - Review `AWS-DEPLOYMENT-README.md` for an overview
   - Follow `aws-deployment-guide.md` for detailed steps
   - Run `./deploy.sh` to deploy to S3
   - Follow `cloudfront-setup-guide.md` to set up CloudFront
   - Run `./verify-deployment.sh` to verify the deployment

2. **Subsequent Deployments**:
   - Run `./deploy.sh` to build and deploy updates
   - Or push to the main branch to trigger the GitHub Actions workflow

3. **Troubleshooting**:
   - Use `./verify-deployment.sh` to check deployment status
   - Refer to the troubleshooting sections in the documentation

## Required AWS Resources

- S3 bucket: `aolf-gsec-uat` with `frontend/` prefix
- CloudFront distribution pointing to the S3 bucket
- IAM user with appropriate permissions for deployment

## Environment Variables

The following environment variables are used in the deployment:

- `REACT_APP_API_BASE_URL`: Backend API URL
- `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `REACT_APP_GOOGLE_CLIENT_SECRET`: Google client secret
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Google Maps API key

For CI/CD, the following secrets need to be configured in GitHub:

- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID
- All the REACT_APP_* environment variables listed above 