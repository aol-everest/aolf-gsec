# AWS Deployment Guide for AOLF GSEC Application

This guide provides comprehensive instructions for deploying the AOLF GSEC application to AWS, including both frontend and backend components.

## Architecture Overview

The AOLF GSEC application is deployed using the following AWS services:

### Frontend
- **Amazon S3**: Hosts the static files in the `aolf-gsec-uat` bucket under the `frontend/` prefix
- **Amazon CloudFront**: Provides CDN capabilities, HTTPS, and handles SPA routing

### Backend
- **AWS Elastic Beanstalk**: Hosts the FastAPI backend application
- **Amazon RDS**: Provides a managed PostgreSQL database
- **AWS Parameter Store**: Securely stores sensitive configuration values
- **Amazon S3**: Stores user-uploaded files

## Prerequisites

- AWS CLI installed and configured with appropriate credentials
- EB CLI (Elastic Beanstalk Command Line Interface) installed
- Node.js and npm installed (for frontend)
- Python 3.12+ installed (for backend)
- Access to the AWS Management Console
- Permissions to create/modify S3 buckets, CloudFront distributions, Elastic Beanstalk environments, and RDS instances

## Frontend Deployment

### Step 1: Prepare the Environment

1. Create a production environment file:

```bash
cd frontend
cp .env .env.production
```

2. Update the API base URL in `.env.production` to point to your Elastic Beanstalk backend:

```
REACT_APP_API_BASE_URL=https://your-eb-environment.elasticbeanstalk.com
```

### Step 2: Deploy to S3 and CloudFront

1. Run the deployment script:

```bash
./deploy.sh
```

2. Follow the prompts to complete the deployment.

3. After the S3 deployment is complete, set up CloudFront following the instructions in `frontend/cloudfront-setup-guide.md`.

4. Verify the deployment:

```bash
./verify-deployment.sh
```

For detailed instructions, refer to:
- `frontend/aws-deployment-guide.md`
- `frontend/cloudfront-setup-guide.md`

## Backend Deployment

### Step 1: Prepare the Environment

1. Create a production environment file:

```bash
cd backend
cp .env.uat .env.prod
```

2. Update the database connection and other environment variables in `.env.prod` as needed.

### Step 2: Deploy to Elastic Beanstalk

1. Run the deployment script:

```bash
./deploy-eb.sh
```

2. The script will:
   - Check if EB CLI is installed
   - Create a production environment file
   - Initialize the Elastic Beanstalk application
   - Store sensitive information in AWS Parameter Store
   - Create or update the Elastic Beanstalk environment with RDS

For detailed instructions, refer to `backend/aws-eb-deployment-guide.md`.

## Connecting Frontend and Backend

After deploying both components, you need to connect them:

1. Update the frontend API base URL to point to your Elastic Beanstalk environment:

```bash
cd frontend
```

2. Edit `.env.production`:

```
REACT_APP_API_BASE_URL=https://your-eb-environment.elasticbeanstalk.com
```

3. Redeploy the frontend:

```bash
./deploy.sh
```

4. Configure CORS in the backend to allow requests from your CloudFront domain:

```bash
cd backend
```

5. Update the CORS settings in `app.py` if needed and redeploy:

```bash
./deploy-eb.sh
```

## CI/CD Setup

Both frontend and backend components include GitHub Actions workflows for automated deployment:

- Frontend: `.github/workflows/deploy-frontend.yml`
- Backend: `.github/workflows/deploy-backend.yml`

To set up CI/CD:

1. Add the following secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `CLOUDFRONT_DISTRIBUTION_ID`
   - `RDS_USERNAME`
   - `RDS_PASSWORD`
   - `JWT_SECRET_KEY`
   - `GOOGLE_CLIENT_ID`
   - `SENDGRID_API_KEY`
   - `FROM_EMAIL`
   - `REACT_APP_API_BASE_URL`
   - `REACT_APP_GOOGLE_CLIENT_ID`
   - `REACT_APP_GOOGLE_MAPS_API_KEY`

2. Push changes to the main branch to trigger automatic deployment.

## Monitoring and Troubleshooting

### Frontend
- Check S3 bucket contents: `aws s3 ls s3://aolf-gsec-uat/frontend/`
- View CloudFront distribution status: `aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID`
- Monitor CloudFront metrics in the AWS Management Console

### Backend
- View application logs: `cd backend && eb logs`
- SSH into the EC2 instance: `cd backend && eb ssh`
- Monitor the application in the AWS Management Console:
  - Elastic Beanstalk dashboard
  - CloudWatch logs
  - RDS dashboard

## Security Considerations

1. Use environment variables for sensitive information
2. Store secrets in AWS Parameter Store or Secrets Manager
3. Configure proper IAM permissions
4. Enable HTTPS for both frontend and backend
5. Set up proper CORS configuration
6. Implement proper authentication and authorization

## Backup and Disaster Recovery

1. Configure S3 versioning for the frontend bucket
2. Configure RDS backups for the database
3. Set up regular snapshots
4. Consider multi-AZ deployment for production RDS

## Cost Optimization

1. Choose appropriate instance types
2. Configure auto-scaling
3. Monitor costs using AWS Cost Explorer
4. Set up AWS Budgets for cost alerts

## Maintenance and Updates

### Frontend
1. Make changes to the codebase
2. Run the deployment script: `./deploy.sh`
3. Invalidate the CloudFront cache

### Backend
1. Make changes to the codebase
2. Run the deployment script: `./deploy-eb.sh`
3. Monitor the deployment in the Elastic Beanstalk console

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [React Deployment Best Practices](https://create-react-app.dev/docs/deployment/) 