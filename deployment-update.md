# Deployment Reorganization

## Overview

The deployment scripts and configuration files have been reorganized into a more structured directory layout to improve maintainability and clarity. This document explains the changes and how to adapt to the new structure.

## New Directory Structure

```
/deployment/
├── README.md                   # Overview of deployment options
├── aws/                        # AWS deployment files
│   ├── README.md               # AWS deployment guide
│   ├── deploy.sh               # AWS deployment script
│   ├── cloudfront-function.js  # CloudFront function for SPA routing
│   └── cloudfront-setup-guide.md # CloudFront setup instructions
├── gae/                        # Google App Engine deployment files
│   ├── README.md               # GAE deployment guide
│   ├── deploy-gae-fullstack.sh # GAE fullstack deployment script
│   └── update-gae-deployment.sh # GAE environment configuration updater
└── common/                     # Shared utilities
    └── env-utils.sh            # Environment utility functions
```

## Redirector Scripts

To maintain backward compatibility, redirector scripts have been added to the original locations. These scripts will automatically forward any command to the new locations:

- `frontend/deploy.sh` → `deployment/aws/deploy.sh`
- `update-gae-deployment.sh` → `deployment/gae/update-gae-deployment.sh`
- `deploy-gae-fullstack.sh` → `deployment/gae/deploy-gae-fullstack.sh`

## Key Improvements

1. **Better Organization**: Scripts are now organized by deployment target (AWS or GAE).
2. **Common Utilities**: Shared functionality is now in the `common` directory to avoid duplication.
3. **Comprehensive Documentation**: Each deployment option has its own README with detailed instructions.
4. **Standardized Approach**: Environment handling is now consistent across deployment targets.

## How to Use the New Structure

### AWS Deployment

```bash
# Old way (still works via redirector)
./frontend/deploy.sh --env=uat

# New way
./deployment/aws/deploy.sh --env=uat
```

### Google App Engine Deployment

```bash
# Old way (still works via redirector)
./update-gae-deployment.sh
./deploy-gae-fullstack.sh -p your-project-id --env=uat

# New way
./deployment/gae/update-gae-deployment.sh
./deployment/gae/deploy-gae-fullstack.sh -p your-project-id --env=uat
```

## Documentation

For detailed information about the deployment options, refer to:

- `deployment/README.md` - General overview of deployment options
- `deployment/aws/README.md` - AWS deployment instructions
- `deployment/gae/README.md` - Google App Engine deployment instructions

## Environment Files

All environment files (`.env.development`, `.env.uat`, `.env.prod`) remain in their original locations in the `frontend` directory. The deployment scripts will access these files as needed. 