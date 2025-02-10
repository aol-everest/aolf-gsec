
# Frontend --------------------------------------------------------------------------------------

# Install npm
npm install -g npm@latest

# Clean the frontend
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force

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
source .venv/bin/activate && pip install --no-cache-dir "fastapi" "uvicorn" "sqlalchemy" "pydantic" "python-jose[cryptography]" "google-auth" "psycopg2-binary" "python-dotenv" "PyJWT" "requests" "google-auth-oauthlib"
# pip install -r requirements.txt

# Run the FastAPI application
uvicorn app:app --reload

python3 -m uvicorn app:app --reload --port 8001


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


# Miscellaneous ---------------------------------------------------------------------------------

# Generate a JWT secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

