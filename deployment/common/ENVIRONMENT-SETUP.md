# AOLF GSEC Frontend Environment Configuration

This document explains how to configure and use environment-specific settings for the AOLF GSEC frontend application.

## Environment Files

The application supports different environment configurations through separate `.env` files:

- `.env.development` - Used for local development
- `.env.uat` - Used for UAT deployment (Google App Engine)
- `.env.production` - Used for production deployment

## Environment Variables

Each environment file contains the following key variables:

- `REACT_APP_API_URL` - The base URL for the backend API
- `REACT_APP_ENVIRONMENT` - The environment name (development, uat, production)
- `REACT_APP_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `REACT_APP_GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `REACT_APP_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `REACT_APP_API_BASE_URL` - Legacy base URL (kept for backwards compatibility)

## Running with Different Environments

### Local Development

For local development, you can use:

```bash
# Using .env.development
npm run start:dev

# Or using the default .env file
npm start
```

### Building for Specific Environments

To build the application for different environments:

```bash
# Development build
npm run build:dev

# UAT build
npm run build:uat

# Production build
npm run build:prod

# Using default .env file
npm run build
```

## Deployment

### Google App Engine Deployment

When deploying to Google App Engine, the `deploy-gae-fullstack.sh` script has been updated to use the appropriate environment file:

```bash
# Deploy to UAT environment
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=uat

# Deploy to production environment
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=prod
```

### AWS Deployment

For AWS deployment, you need to specify the environment during the build process:

```bash
# Build for UAT
npm run build:uat

# Then deploy using the deploy.sh script
./deploy.sh --env=uat
```

## Google OAuth Configuration

For Google OAuth to work correctly, you need to configure the authorized redirect URIs in the Google Cloud Console:

1. Go to the Google Cloud Console
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID
4. Add the following URLs to the authorized redirect URIs:
   - Development: `http://localhost:3000`
   - UAT: `https://aolf-gsec-uat.appspot.com`
   - Production: `https://aolf-gsec-prod.appspot.com`

## Troubleshooting

### Environment Variables Not Being Picked Up

- Remember that React environment variables are embedded at build time, not runtime
- Make sure you're using the correct npm script for your environment
- Check that the .env file exists for the environment you're trying to use

### OAuth Redirect URI Mismatch

If you see a "redirect_uri_mismatch" error:

1. Make sure the application is using `window.location.origin` as the redirect URI
2. Verify that the origin URL is registered in the Google Cloud Console 