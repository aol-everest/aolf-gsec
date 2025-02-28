# CloudFront Setup Guide for AOLF GSEC Frontend

This guide provides detailed steps for setting up a CloudFront distribution to serve the AOLF GSEC frontend from an S3 bucket.

## Prerequisites

- AWS account with appropriate permissions
- S3 bucket already set up with the frontend files
- AWS CLI installed and configured (optional, for command-line operations)

## Step 1: Create a CloudFront Distribution via AWS Console

1. Log in to the AWS Management Console
2. Navigate to CloudFront service
3. Click "Create Distribution"
4. Configure the distribution:

   **Origin Settings:**
   - Origin Domain: Select your S3 bucket (`aolf-gsec-uat.s3-website-us-east-1.amazonaws.com/frontend`)
   - Origin Path: Leave empty or set to `/frontend` if needed
   - Origin ID: Auto-generated or provide a custom name
   - Origin Access: Select "Public"
   
   **Default Cache Behavior Settings:**
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD
   - Cache Policy: Select "CachingOptimized" or create a custom policy
   - Origin Request Policy: Select "CORS-S3Origin"
   - Response Headers Policy: Select "SimpleCORS"
   - Compress Objects Automatically: Yes
   
   **Distribution Settings:**
   - Default Root Object: `index.html`
   - Price Class: Choose based on your geographic needs (Use Only U.S., Canada and Europe for cost savings)
   - WAF: Disable (or enable if you need additional security)
   - Alternate Domain Names (CNAMEs): Add your custom domain if you have one
   - SSL Certificate: Use the default CloudFront certificate or upload a custom one for your domain
   - Supported HTTP Versions: HTTP/2
   - Default TTL: 86400 seconds (1 day)

5. Click "Create Distribution"

## Step 2: Create and Configure CloudFront Function for SPA Routing

1. Navigate to CloudFront > Functions
2. Click "Create function"
3. Enter a name (e.g., "AOLF-GSEC-SPA-Router")
4. Copy the code from `cloudfront-function.js` into the editor
5. Click "Save changes"
6. Click "Publish"
7. Associate the function with your distribution:
   - Go to your CloudFront distribution
   - Click the "Behaviors" tab
   - Select the default behavior and click "Edit"
   - Under "Function associations", select "Viewer request" and choose your function
   - Click "Save changes"

## Step 3: Configure Custom Domain (Optional)

1. Register a domain in Route 53 or use an existing domain
2. Create a SSL/TLS certificate in AWS Certificate Manager (ACM)
   - Request a certificate for your domain (e.g., `app.yourdomain.com`)
   - Validate the certificate (DNS validation recommended)
3. Update your CloudFront distribution:
   - Go to your distribution settings
   - Click "Edit" in the "General" tab
   - Add your domain name in "Alternate Domain Names (CNAMEs)"
   - Select your ACM certificate
   - Click "Save changes"
4. Create a DNS record in Route 53:
   - Create an A record
   - Name: Your subdomain (e.g., `app`)
   - Type: A
   - Alias: Yes
   - Target: Your CloudFront distribution
   - Click "Create records"

## Step 4: Test the Distribution

1. Wait for the distribution to deploy (Status: Deployed)
2. Test the CloudFront URL: `https://[distribution-id].cloudfront.net`
3. Test different routes to ensure the SPA routing works correctly
4. If using a custom domain, test that as well

## Step 5: Invalidate Cache After Deployments

After deploying updates to your S3 bucket, invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

Or through the AWS Console:
1. Go to your CloudFront distribution
2. Click the "Invalidations" tab
3. Click "Create Invalidation"
4. Enter `/*` to invalidate all paths
5. Click "Create Invalidation"

## Troubleshooting

### Common Issues:

1. **Access Denied Errors:**
   - Check S3 bucket policy
   - Ensure CloudFront has proper permissions to access the S3 bucket

2. **Routing Issues:**
   - Verify the CloudFront function is correctly associated with the distribution
   - Check that the default root object is set to `index.html`

3. **CORS Issues:**
   - Ensure proper CORS headers are set in your API
   - Check that the CloudFront distribution has the correct origin request policy

4. **SSL/TLS Certificate Issues:**
   - Ensure the certificate is validated and in the `us-east-1` region
   - Verify the certificate covers all domain names used in the distribution

## Monitoring

Monitor your CloudFront distribution using:
- CloudFront console for real-time metrics
- CloudWatch for detailed monitoring and alerts
- CloudTrail for API activity and changes

## Cost Optimization

- Choose an appropriate price class based on your user geography
- Set appropriate TTLs to reduce origin requests
- Monitor usage and adjust settings as needed 