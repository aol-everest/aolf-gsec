# Frontend --------------------------------------------------------------------------------------

# Install npm
npm install -g npm@latest

# Clean the frontend
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force

npm set audit false

# Install frontend dependencies
npm install
# npm install react-hook-form @mui/material @emotion/react @emotion/styled @react-oauth/google react-router-dom

# Start the frontend
npm start


# Backend --------------------------------------------------------------------------------------

# Clean the backend
cd ../backend
rm -rf .venv

# Install Python dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
# pip install fastapi uvicorn sqlalchemy pydantic pydantic[email] python-jose[cryptography] google-auth psycopg2-binary python-dotenv jwt
# pip install "fastapi" "uvicorn" "sqlalchemy" "pydantic" "pydantic[email]" "python-jose[cryptography]" "google-auth" "psycopg2-binary" "python-dotenv" "requests" "google-auth-oauthlib"
# pip install PyJWT
# python3 -m pip install --upgrade pip setuptools wheel && pip install "fastapi[all]" "uvicorn[standard]" sqlalchemy pydantic python-jose[cryptography] google-auth psycopg2-binary python-dotenv PyJWT requests google-auth-oauthlib
source .venv/bin/activate && pip install --no-cache-dir "fastapi" "uvicorn" "sqlalchemy" "pydantic" "python-jose[cryptography]" "google-auth" "psycopg2-binary" "python-dotenv" "PyJWT" "requests" "google-auth-oauthlib" "alembic"
# pip install -r requirements.txt

# Run the FastAPI application
uvicorn app:app --reload

python3 -m uvicorn app:app --reload --port 8001
python3.12 -m uvicorn app:app --reload --port 8001

# Run the FastAPI application with environment variables
# uvicorn app:app --reload --env-file .env

# Run the FastAPI application using the helper script
./run.sh dev    # For development
./run.sh uat    # For UAT
./run.sh prod   # For production


# PostgreSQL ------------------------------------------------------------------------------------

# Install PostgreSQL    
brew install postgresql
brew services start postgresql

# Create the database
createdb aolf_gsec

createuser -s postgres

psql postgres -c "ALTER USER postgres PASSWORD 'postgres';"

# Drop and create the database
psql postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'aolf_gsec' AND pid <> pg_backend_pid();" && psql postgres -c "DROP DATABASE aolf_gsec;" && psql postgres -c "CREATE DATABASE aolf_gsec;"

psql postgres

# Miscellaneous ---------------------------------------------------------------------------------

# Generate a JWT secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Alembic Commands -------------------------------------------------------------------------------

# Initialize Alembic (first time only)
cd backend
alembic init alembic

# Create initial migration after setting up models
alembic revision --autogenerate -m "Initial migration"

# Autogenerate migrations for syncing with models
alembic revision --autogenerate -m "Syncing with models"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Rollback all migrations
alembic downgrade base

# Create a new migration for model changes
alembic revision --autogenerate -m "Description of model changes"

# View current migration version
alembic current

# View migration history
alembic history --verbose

# Verify migrations without applying them
alembic upgrade head --sql

# Common Alembic Workflow:
# 1. Make changes to your SQLAlchemy models
# 2. Create a new migration: alembic revision --autogenerate -m "Description of changes"
# 3. Review the generated migration in alembic/versions/
# 4. Apply the migration: alembic upgrade head
# 5. To rollback if needed: alembic downgrade -1

