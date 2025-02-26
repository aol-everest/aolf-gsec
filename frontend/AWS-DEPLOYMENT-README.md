# AWS Deployment for AOLF GSEC Frontend

This README provides an overview of the AWS deployment setup for the AOLF GSEC frontend application.

## Deployment Architecture

The frontend application is deployed using the following AWS services:

- **Amazon S3**: Hosts the static files in the `aolf-gsec-uat` bucket under the `frontend/` prefix
- **Amazon CloudFront**: Provides CDN capabilities, HTTPS, and handles SPA routing
- **AWS Certificate Manager**: Manages SSL/TLS certificates (if using custom domain)
- **Amazon Route 53**: Manages DNS (if using custom domain)

## Deployment Files

The following files are included for deployment:

1. `deploy.sh`: Automated deployment script
2. `aws-deployment-guide.md`: Comprehensive deployment guide
3. `cloudfront-function.js`: CloudFront function for SPA routing
4. `cloudfront-setup-guide.md`: Detailed guide for CloudFront setup

## Quick Start

To deploy the application:

1. Ensure you have AWS CLI installed and configured with appropriate credentials
2. Run the deployment script:

```bash
./deploy.sh
```

3. Follow the prompts to complete the deployment
4. After the S3 deployment is complete, set up CloudFront following the instructions in `cloudfront-setup-guide.md`

## Environment Configuration

The deployment script will create a `.env.production` file based on your existing `.env` file. You'll be prompted to provide the production API URL during deployment.

Key environment variables:

- `REACT_APP_API_BASE_URL`: URL of the backend API
- `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Google Maps API key

## Deployment Process

The deployment process consists of:

1. Creating and configuring a production environment
2. Building the application
3. Deploying to S3
4. Setting up CloudFront (manual step)
5. Invalidating CloudFront cache after updates

## Maintenance and Updates

To update the deployed application:

1. Make your changes to the codebase
2. Run the deployment script again
3. Invalidate the CloudFront cache

## Troubleshooting

If you encounter issues during deployment, refer to the troubleshooting section in `cloudfront-setup-guide.md`.

Common issues:
- S3 permissions
- CloudFront configuration
- Environment variables
- SPA routing

## Security Considerations

- Use environment variables for sensitive information
- Consider using AWS Secrets Manager for production credentials
- Ensure proper IAM permissions
- Enable CloudFront security features (HTTPS, WAF if needed)

## Cost Management

Monitor usage of:
- S3 storage and requests
- CloudFront data transfer and requests
- Route 53 queries (if using custom domain)

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [React Deployment Best Practices](https://create-react-app.dev/docs/deployment/) 