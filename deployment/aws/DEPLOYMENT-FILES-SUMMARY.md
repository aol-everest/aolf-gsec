# AOLF GSEC Frontend Deployment Files Summary

This document provides a summary of all deployment-related files for the AOLF GSEC frontend application.

## Deployment Documentation

| File | Description |
|------|-------------|
| `DEPLOYMENT-FILES-SUMMARY.md` | This file - summary of all deployment files |

## Deployment Scripts

| File | Description |
|------|-------------|
| `deploy.sh` | Main deployment script for AWS S3 and CloudFront. Supports both production and UAT environments with `--env=prod` or `--env=uat` parameter. Use `--help` for usage instructions. |

## AWS Configuration

| File/Setting | Description |
|--------------|-------------|
| S3 Bucket | Stores the static website files |
| CloudFront Distribution | CDN for distributing the website globally |

## Environment Configuration

| File | Description |
|------|-------------|
| `.env` | Development environment variables |
| `.env.production` | Production environment variables (created during deployment) |

## How to Use These Files

### Initial Deployment

1. Ensure you have the AWS CLI installed and configured with appropriate credentials.
2. Review and update environment variables in the `.env` file as needed.
3. Run the deployment script with the desired environment:
   ```
   ./deploy.sh --env=prod  # For production environment
   ./deploy.sh --env=uat   # For UAT environment (default)
   ./deploy.sh --help      # For usage instructions
   ```
4. When prompted, enter the API URL for the environment you're deploying to.
5. The script will:
   - Create a production environment file
   - Build the application
   - Deploy to S3
   - Set up website configuration
   - Invalidate CloudFront cache (if configured)

### Subsequent Deployments

1. Make your code changes and commit them to the repository.
2. Run the deployment script again with the desired environment:
   ```
   ./deploy.sh --env=prod  # For production environment
   ./deploy.sh --env=uat   # For UAT environment (default)
   ```

### Troubleshooting

If you encounter issues during deployment:

1. Check the AWS S3 console to ensure files were uploaded correctly.
2. Verify CloudFront distribution settings and cache invalidation status.
3. Check browser console for any JavaScript errors.
4. Verify that the API URL is correctly set in the `.env.production` file.

## Required AWS Resources

- S3 bucket for hosting static files
- CloudFront distribution for CDN (optional but recommended)
- IAM user with appropriate permissions for S3 and CloudFront

## Environment Variables

The following environment variables are used in the deployment:

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_BASE_URL` | Base URL for the backend API |

## AWS CLI Configuration

Ensure your AWS CLI is configured with the following:

```
aws configure
```

You will need to provide:
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (e.g., us-east-1)
- Default output format (e.g., json) 