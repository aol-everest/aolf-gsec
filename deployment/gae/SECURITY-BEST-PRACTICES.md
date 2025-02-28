# Security Best Practices for AOLF GSEC Deployment

This document outlines security best practices for managing secrets and sensitive information in the AOLF GSEC application deployment.

## Sensitive Information

The following types of sensitive information are used in the application:

- Database credentials (username, password)
- JWT secret keys
- Google OAuth client IDs and secrets
- API keys (SendGrid, Google Maps, etc.)
- Email credentials

## Best Practices

### 1. Never Hardcode Secrets

- **DO NOT** hardcode secrets directly in scripts, source code, or configuration files that are committed to version control.
- Remove any existing hardcoded secrets from scripts and configuration files.

### 2. Use Environment Files

- Store sensitive information in environment files (`.env.*`) that are excluded from version control.
- Create separate environment files for different environments (dev, uat, prod).
- Use `.env.example` files with placeholder values to document required variables.

### 3. Use Secret Management Services

- Store sensitive information in Google Secret Manager.
- Grant access to secrets only to the necessary service accounts.
- Rotate secrets regularly.

### 4. Secure Your Environment Files

- Add `.env*` files to your `.gitignore` to prevent accidental commits.
- Restrict access to environment files on development and build machines.
- Consider encrypting environment files when not in use.

### 5. Deployment Security

- Use service accounts with minimal required permissions.
- Enable audit logging for sensitive operations.
- Regularly review access logs and permissions.

## Setting Up Secrets for Deployment

### Google Secret Manager

The deployment script can automatically store sensitive information in Google Secret Manager:

```bash
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=uat
```

To skip storing secrets in Secret Manager (not recommended for production):

```bash
./deploy-gae-fullstack.sh -p YOUR_PROJECT_ID --env=uat --skip-secret-manager
```

### Manual Secret Management

If you prefer to manage secrets manually:

1. Create secrets in Google Secret Manager:
   ```bash
   echo -n "your-secret-value" | gcloud secrets create SECRET_NAME --replication-policy="automatic" --data-file=- --project=YOUR_PROJECT_ID
   ```

2. Grant access to the App Engine service account:
   ```bash
   gcloud secrets add-iam-policy-binding SECRET_NAME --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project=YOUR_PROJECT_ID
   ```

## Checking for Hardcoded Secrets

Regularly scan your codebase for hardcoded secrets using tools like:

- `grep` or `find` commands
- Git hooks that prevent commits containing potential secrets
- Secret scanning tools

Example command to find potential hardcoded secrets:

```bash
grep -r "key\|secret\|password\|token" --include="*.{sh,py,js,tsx,jsx,yaml,yml}" .
```

## Resources

- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/) 