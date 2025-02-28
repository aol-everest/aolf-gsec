# AOLF GSEC Backend Deployment Files Summary

This document provides a summary of all deployment-related files for the AOLF GSEC backend application.

## Deployment Documentation

| File | Description |
|------|-------------|
| `aws-eb-deployment-guide.md` | Detailed guide for deploying the application to AWS Elastic Beanstalk |
| `DEPLOYMENT-FILES-SUMMARY.md` | This file - summary of all deployment files |

## Deployment Scripts

| File | Description |
|------|-------------|
| `deploy-eb.sh` | Main deployment script for AWS Elastic Beanstalk. Supports both production and UAT environments with `--env=prod` or `--env=uat` parameter. Use `--help` for usage instructions. |
| `verify-eb-deployment.sh` | Script to verify successful deployment to AWS Elastic Beanstalk. Supports both production and UAT environments with `--env=prod` or `--env=uat` parameter. Use `--help` for usage instructions. |
| `application.py` | WSGI entry point for AWS Elastic Beanstalk |
| `Procfile` | Defines process types and commands for the application |

## Elastic Beanstalk Configuration

| Directory/File | Description |
|----------------|-------------|
| `.ebextensions/` | Directory containing Elastic Beanstalk configuration files |
| `.ebextensions/01_packages.config` | Configuration for installing system packages |
| `.ebextensions/02_python.config` | Python configuration settings |
| `.ebextensions/03_nginx.config` | Nginx web server configuration |
| `.ebextensions/04_db_migrate.config` | Database migration configuration |
| `.ebextensions/db-migrate.sh` | Script to run database migrations during deployment |

## CI/CD Configuration

| File | Description |
|------|-------------|
| `.github/workflows/deploy-backend.yml` | GitHub Actions workflow for automated deployment |

## How to Use These Files

### Initial Deployment

1. Ensure you have the AWS CLI and EB CLI installed and configured with appropriate credentials.
2. Review and update environment variables in the deployment scripts as needed.
3. Run the deployment script with the desired environment:
   ```
   ./deploy-eb.sh --env=prod  # For production environment
   ./deploy-eb.sh --env=uat   # For UAT environment
   ./deploy-eb.sh --help      # For usage instructions
   ```
4. Verify the deployment:
   ```
   ./verify-eb-deployment.sh --env=prod  # For production environment
   ./verify-eb-deployment.sh --env=uat   # For UAT environment
   ./verify-eb-deployment.sh --help      # For usage instructions
   ```

### Subsequent Deployments

1. Make your code changes and commit them to the repository.
2. Run the deployment script again with the desired environment:
   ```
   ./deploy-eb.sh --env=prod  # For production environment
   ./deploy-eb.sh --env=uat   # For UAT environment
   ```
3. Verify the deployment:
   ```
   ./verify-eb-deployment.sh --env=prod  # For production environment
   ./verify-eb-deployment.sh --env=uat   # For UAT environment
   ```

### Troubleshooting

If you encounter issues during deployment:

1. Check the deployment logs:
   ```
   eb logs -e aolf-gsec-backend-prod  # For production environment
   eb logs -e aolf-gsec-backend-uat   # For UAT environment
   ```
2. Verify the application status:
   ```
   eb status aolf-gsec-backend-prod  # For production environment
   eb status aolf-gsec-backend-uat   # For UAT environment
   ```
3. SSH into the instance for further investigation:
   ```
   eb ssh -e aolf-gsec-backend-prod  # For production environment
   eb ssh -e aolf-gsec-backend-uat   # For UAT environment
   ```

## Required AWS Resources

- Elastic Beanstalk environment
- RDS PostgreSQL database
- S3 bucket for static files (optional)
- IAM roles and policies for Elastic Beanstalk

## Environment Variables

The following environment variables are used in the deployment:

| Variable | Description |
|----------|-------------|
| `POSTGRES_HOST` | Database hostname |
| `POSTGRES_PORT` | Database port |
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `AWS_ACCESS_KEY_ID` | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key |
| `S3_BUCKET_NAME` | S3 bucket name for static files |

## GitHub Secrets for CI/CD

If using GitHub Actions for CI/CD, the following secrets should be set:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key |
| `POSTGRES_HOST` | Database hostname |
| `POSTGRES_PORT` | Database port |
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database username |
| `POSTGRES_PASSWORD` | Database password |
| `S3_BUCKET_NAME` | S3 bucket name for static files | 