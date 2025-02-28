# AWS Deployment Guide for AOLF GSEC Frontend

This document outlines the steps to deploy the AOLF GSEC frontend application to AWS using S3 and CloudFront.

## Prerequisites

- AWS CLI installed and configured with appropriate credentials
- Node.js and npm installed
- Access to the AWS Management Console
- Permissions to create/modify S3 buckets and CloudFront distributions

## Environment Setup

1. Create a production-ready `.env` file for the deployment:

```bash
# Create a production .env file
cp .env .env.production
```

2. Edit the `.env.production` file to update the API base URL and other environment variables:

```
REACT_APP_API_BASE_URL=https://api.your-production-domain.com
# Other environment variables as needed
```

## Build the Application

```bash
# Install dependencies
npm install

# Build the application
npm run build
```

This will create a `build` directory with the production-ready assets.

## AWS S3 Bucket Setup

1. Create an S3 bucket for hosting the frontend (if not already created):

```bash
aws s3 mb s3://aolf-gsec-uat/frontend --region us-east-1
```

2. Configure the S3 bucket for static website hosting:

```bash
aws s3 website s3://aolf-gsec-uat/frontend/ --index-document index.html --error-document index.html
```

3. Set bucket policy to allow public read access (required for website hosting):

```bash
aws s3api put-bucket-policy --bucket aolf-gsec-uat --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::aolf-gsec-uat/frontend/*"
    }
  ]
}'
```

## Deploy to S3

Upload the build files to the S3 bucket:

```bash
aws s3 sync build/ s3://aolf-gsec-uat/frontend/ --delete
```

The `--delete` flag removes files in the destination that don't exist in the source.

## CloudFront Setup

1. Create a CloudFront distribution for the S3 bucket:

```bash
aws cloudfront create-distribution --origin-domain-name aolf-gsec-uat.s3-website-us-east-1.amazonaws.com --default-root-object index.html
```

2. Configure CloudFront to handle React Router (SPA) routing:

Create a CloudFront function or Lambda@Edge function to redirect all requests to index.html for client-side routing.

Example CloudFront function:

```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check whether the URI is missing a file name.
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } 
    // Check whether the URI is missing a file extension.
    else if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    
    return request;
}
```

3. Enable HTTPS by using the default CloudFront certificate or a custom one.

## Invalidate CloudFront Cache After Deployment

After deploying updates to S3, invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Automated Deployment Script

Create a deployment script (`deploy.sh`) to automate the process:

```bash
#!/bin/bash
# Frontend deployment script

# Load environment variables
set -a
source .env.production
set +a

# Build the application
echo "Building the application..."
npm install
npm run build

# Deploy to S3
echo "Deploying to S3..."
aws s3 sync build/ s3://aolf-gsec-uat/frontend/ --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

echo "Deployment completed successfully!"
```

Make the script executable:

```bash
chmod +x deploy.sh
```

## Monitoring and Troubleshooting

- Check S3 bucket contents: `aws s3 ls s3://aolf-gsec-uat/frontend/`
- View CloudFront distribution status: `aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID`
- Monitor CloudFront metrics in the AWS Management Console
- Check CloudWatch logs for any errors

## Important Notes

1. Remember to update the API endpoint in the `.env.production` file to point to your production backend.
2. For security, consider using AWS Secrets Manager or Parameter Store for sensitive environment variables.
3. Set up proper CORS configuration on your backend API to allow requests from the CloudFront domain.
4. Consider implementing a CI/CD pipeline for automated deployments. 