# AWS Deployment Guide

This guide provides instructions for deploying the AOLF GSEC frontend application to AWS S3 and CloudFront.

## Prerequisites

Before deploying, ensure you have:

1. AWS CLI installed and configured with appropriate credentials
2. Node.js (v16+) and npm installed
3. Frontend environment files (`.env.uat`, `.env.prod`) properly configured
4. AWS S3 buckets created for each environment
5. (Optional) CloudFront distributions set up for CDN capabilities

## S3 Bucket Configuration

The deployment script expects S3 buckets named according to the pattern:

- UAT: `aolf-gsec-frontend-uat`
- Production: `aolf-gsec-frontend-prod`

Ensure these buckets exist and are configured for static website hosting with appropriate permissions.

## CloudFront Configuration

For production deployments, it's recommended to use CloudFront for CDN capabilities. The deployment script supports automatic cache invalidation when CloudFront is configured.

Refer to the [CloudFront Setup Guide](./cloudfront-setup-guide.md) for detailed instructions on setting up CloudFront with your S3 bucket.

## Deployment Instructions

### 1. Setup Environment Files

Create environment-specific files in the `frontend` directory:

**UAT Environment (.env.uat)**:
```
REACT_APP_API_URL=https://backend-uat-dot-your-gae-project-id.appspot.com
REACT_APP_ENVIRONMENT=uat
```

**Production Environment (.env.prod)**:
```
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=prod
```

### 2. Deploy to UAT

```bash
./deployment/aws/deploy.sh --env=uat
```

This command will:
- Build the frontend application using the UAT environment configuration
- Upload the build to the UAT S3 bucket
- Configure the bucket for static website hosting
- (Optional) Invalidate CloudFront cache if configured

### 3. Deploy to Production

```bash
./deployment/aws/deploy.sh --env=prod
```

This command will:
- Prompt for confirmation (production deployment)
- Build the frontend application using the production environment configuration
- Upload the build to the production S3 bucket
- Configure the bucket for static website hosting
- Invalidate CloudFront cache

## Troubleshooting

### Common Issues

1. **S3 Permission Denied**
   - Ensure your AWS CLI credentials have sufficient permissions to write to the S3 bucket

2. **Build Failure**
   - Check if all dependencies are installed
   - Ensure environment files are correctly formatted

3. **CloudFront Invalidation Error**
   - Verify the CloudFront distribution ID is correct
   - Ensure your AWS credentials have CloudFront permissions

## Advanced Configuration

### Custom S3 Bucket Names

To use custom S3 bucket names, modify the `deploy.sh` script variables:

```bash
UAT_S3_BUCKET="your-custom-uat-bucket-name"
PROD_S3_BUCKET="your-custom-prod-bucket-name"
```

### CloudFront Function for SPA Routing

For single-page applications, you'll need to configure a CloudFront function to handle client-side routing. A sample function is provided in the [cloudfront-function.js](./cloudfront-function.js) file.

## Rollback Procedure

If a deployment fails or causes issues, you can rollback to a previous version:

1. Identify the previous version in S3 Version History
2. Restore that version using AWS Console or CLI
3. Invalidate CloudFront cache to reflect the rollback 