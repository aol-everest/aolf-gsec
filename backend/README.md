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

The application uses environment-specific configuration files:

- `.env.dev` - Development environment configuration
- `.env.uat` - UAT environment configuration
- `.env.prod` - Production environment configuration

Environment variables are loaded from the appropriate file based on the `ENVIRONMENT` setting. The loading is centralized in the `config/environment.py` module, which is imported by other components that need access to environment variables.

### Running the Application

To run the application in a specific environment, use the `run.sh` script:

```bash
./run.sh <environment> [port]
```

For example:
```bash
./run.sh dev      # Run in development environment on default port (8001)
./run.sh uat 8002 # Run in UAT environment on port 8002
./run.sh prod     # Run in production environment on default port (8001)
```

The script will:
1. Check if the specified environment file exists
2. Activate the virtual environment
3. Check if the specified port is in use and try an alternative if needed
4. Start the application with the appropriate environment settings

## AWS S3 Configuration

The application uses AWS S3 for storing appointment attachments. The following environment variables need to be set in the appropriate `.env.[environment]` file:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-2
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

### File Storage Strategy

Attachments are stored in S3 with the following characteristics:

1. **Unique Filenames**: Each uploaded file is assigned a unique filename using a combination of UUID and timestamp to prevent collisions, even if multiple files with the same name are uploaded.

2. **Original Filename Preservation**: The original filename is preserved in both the database and as metadata in S3, ensuring that when users download the file, they receive it with the original filename.

3. **Path Structure**: Files are stored with the path format: `{environment}/attachments/{entity_type}/{entity_id}/{unique_filename}`

   Where:
   - `environment`: The deployment environment (dev, uat, prod)
   - `entity_type`: The type of entity (appointments, dignitaries)
   - `entity_id`: The ID of the entity (appointment_id, dignitary_id)
   - `unique_filename`: A generated unique filename that includes a UUID and timestamp

   For example:
   - `uat/attachments/appointments/123/abc123def456_1612345678.pdf`
   - `prod/attachments/dignitaries/456/def789abc012_1612345679.jpg`

This approach ensures that:
- Files never overwrite each other, even if they have the same original name
- Users always download files with their original, human-readable filenames
- The system maintains a clear organizational structure in S3

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