# Deployment Verification Scripts

This document explains the verification scripts available in the deployment structure to help you validate that your deployments are working correctly.

## Structure

The verification scripts are organized by deployment target:

```
/deployment/
├── aws/
│   └── verification/
│       └── verify-deployment.sh     # Verify AWS S3/CloudFront deployment
├── eb/
│   └── verification/
│       └── verify-eb-deployment.sh  # Verify Elastic Beanstalk deployment
└── gae/
    └── verification/
        └── verify-gae-deployment.sh # Verify Google App Engine deployment
```

## AWS Deployment Verification

The `verify-deployment.sh` script checks the following:

- S3 bucket exists and has the proper website configuration
- Index.html is present in the S3 bucket
- CloudFront distribution exists and is properly configured
- Website accessibility through both S3 and CloudFront

### Usage

```bash
# Verify AWS deployment
./deployment/aws/verification/verify-deployment.sh
```

You may need to update the configuration variables in the script:
- `S3_BUCKET`: The S3 bucket name (default: "aolf-gsec-uat")
- `S3_PREFIX`: The prefix within the bucket (default: "frontend")
- `REGION`: AWS region (default: "us-east-2")
- `CLOUDFRONT_DISTRIBUTION_ID`: Your CloudFront distribution ID

## Elastic Beanstalk Verification

The `verify-eb-deployment.sh` script checks the following:

- Elastic Beanstalk environment exists and is in a "Ready" state
- Environment health is "Green"
- RDS database is attached to the environment and available
- Application is accessible and responding properly

### Usage

```bash
# Verify Elastic Beanstalk deployment (default: prod environment)
./deployment/eb/verification/verify-eb-deployment.sh

# Verify specific environment
./deployment/eb/verification/verify-eb-deployment.sh --env=uat
```

## Google App Engine Verification

The `verify-gae-deployment.sh` script checks the following:

- GAE application is deployed and serving traffic
- Cloud SQL instance exists and is running
- API endpoints are accessible and responding properly
- Application logs are checked for errors

### Usage

```bash
# Verify GAE deployment (default: prod environment)
./deployment/gae/verification/verify-gae-deployment.sh

# Verify specific environment
./deployment/gae/verification/verify-gae-deployment.sh --env=uat
```

## Troubleshooting

If verification fails:

1. Check the specific error messages from the verification script
2. Review logs for the specific deployment platform
3. Ensure all required services are running
4. Verify that your configuration values in the scripts match your actual deployment setup 