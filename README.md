# AOLF GSEC Application

This repository contains the AOLF GSEC application, which consists of a frontend React application and a backend FastAPI application.

## Project Structure

- `frontend/`: React frontend application
- `backend/`: FastAPI backend application

## Deployment

The application can be deployed to both production and UAT (User Acceptance Testing) environments.

### Backend Deployment

The backend is deployed to AWS Elastic Beanstalk. For detailed information, see:

- [Backend Deployment Files Summary](backend/DEPLOYMENT-FILES-SUMMARY.md)

To deploy the backend:

```bash
cd backend
./deploy-eb.sh --env=prod  # For production environment
./deploy-eb.sh --env=uat   # For UAT environment
./deploy-eb.sh --help      # For usage instructions
```

To verify the backend deployment:

```bash
cd backend
./verify-eb-deployment.sh --env=prod  # For production environment
./verify-eb-deployment.sh --env=uat   # For UAT environment
./verify-eb-deployment.sh --help      # For usage instructions
```

### Frontend Deployment

The frontend is deployed to AWS S3 and CloudFront. For detailed information, see:

- [Frontend Deployment Files Summary](frontend/DEPLOYMENT-FILES-SUMMARY.md)

To deploy the frontend:

```bash
cd frontend
./deploy.sh --env=prod  # For production environment
./deploy.sh --env=uat   # For UAT environment (default)
./deploy.sh --help      # For usage instructions
```

## Required AWS Resources

### Backend
- Elastic Beanstalk environment
- RDS PostgreSQL database
- IAM roles and policies for Elastic Beanstalk

### Frontend
- S3 bucket for hosting static files
- CloudFront distribution for CDN (optional but recommended)
- IAM user with appropriate permissions for S3 and CloudFront

## Environment Variables

### Backend
See [Backend Deployment Files Summary](backend/DEPLOYMENT-FILES-SUMMARY.md) for a list of required environment variables.

### Frontend
See [Frontend Deployment Files Summary](frontend/DEPLOYMENT-FILES-SUMMARY.md) for a list of required environment variables.

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## CI/CD

The application uses GitHub Actions for CI/CD. The workflows are defined in:

- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-frontend.yml` (if available)

## License

[Specify your license here] 