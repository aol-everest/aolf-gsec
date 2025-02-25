# AOLF GSEC Backend

This is the backend API for the AOLF GSEC (Global Secretariat) application.

## Setup

1. Create a virtual environment:
   ```
   python -m venv .venv
   ```

2. Activate the virtual environment:
   ```
   source .venv/bin/activate  # On Unix/macOS
   .venv\Scripts\activate     # On Windows
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables in `.env` file (see `.env.example` for reference).

5. Run database migrations:
   ```
   alembic upgrade head
   ```

6. Start the server:
   ```
   uvicorn app:app --reload
   ```

## Environment Configuration

The application uses environment-specific configuration files to manage settings for different environments:

- `.env.dev` - Development environment settings
- `.env.uat` - UAT (User Acceptance Testing) environment settings
- `.env.prod` - Production environment settings

To specify which environment to use, set the `ENVIRONMENT` variable when starting the application:

```bash
# For development
ENVIRONMENT=dev uvicorn app:app --reload

# For UAT
ENVIRONMENT=uat uvicorn app:app

# For production
ENVIRONMENT=prod uvicorn app:app
```

If no `ENVIRONMENT` variable is set, the application defaults to `dev`.

## AWS S3 Configuration

The application uses AWS S3 for storing appointment attachments. The following environment variables need to be set in the appropriate `.env.[environment]` file:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=aolf-gsec-[environment]
```

AWS IAM policy files are stored in the `config/aws` directory:
- `prod_access_policy.json`: IAM policy for production environment
- `uat_access_policy.json`: IAM policy for UAT environment

## Appointment Attachments

The application supports uploading and retrieving attachments for appointments. The following endpoints are available:

- `POST /appointments/{appointment_id}/attachments`: Upload an attachment for an appointment
- `GET /appointments/{appointment_id}/attachments`: Get all attachments for an appointment
- `GET /appointments/attachments/{attachment_id}`: Get a specific attachment file

Attachments are stored in S3 with the path format: `{environment}/attachments/{entity_type}/{entity_id}/{filename}`

Where:
- `environment`: The deployment environment (dev, uat, prod)
- `entity_type`: The type of entity (appointments, dignitaries)
- `entity_id`: The ID of the entity (appointment_id, dignitary_id)
- `filename`: The original filename of the attachment

For example:
- `uat/attachments/appointments/123/document.pdf`
- `prod/attachments/dignitaries/456/profile.jpg`

## Database Migrations

To create a new migration:
```
alembic revision -m "Description of the migration"
```

To apply migrations:
```
alembic upgrade head
```

To rollback a migration:
```
alembic downgrade -1
``` 