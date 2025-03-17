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
# Clean install frontend dependencies
npm ci --legacy-peer-deps

# Start the frontend
npm start
npm run start:dev

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

# AWS Deployment ---------------------------------------------------------------------------------

# Install AWS CLI and EB CLI
pip install awscli awsebcli

# Configure AWS CLI
aws configure

# Install Session Manager Plugin
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip" -o "sessionmanager-bundle.zip" && unzip sessionmanager-bundle.zip && sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin

# Backend Deployment to AWS Elastic Beanstalk
cd backend
# Deploy to UAT environment
./deploy-eb.sh --env=uat
# Deploy to UAT environment with update mode (for existing environments)
./deploy-eb.sh --env=uat --update
# Deploy to production environment
./deploy-eb.sh --env=prod
# Deploy to production environment with update mode
./deploy-eb.sh --env=prod --update

# View Elastic Beanstalk logs
eb logs aolf-gsec-backend-uat
eb logs aolf-gsec-prod-backend-env

# SSH into Elastic Beanstalk instance
eb ssh aolf-gsec-backend-uat
eb ssh aolf-gsec-prod-backend-env

aws ssm start-session --target i-001d04a51ce791d3d

# Frontend Deployment to AWS S3 and CloudFront
cd frontend
# Deploy to UAT environment
./deploy.sh --env=uat
# Deploy to production environment
./deploy.sh --env=prod

# Verify deployments
cd backend && ./verify-eb-deployment.sh --env=uat
cd frontend && ./verify-deployment.sh --env=uat

# AWS S3 commands
aws s3 ls s3://aolf-gsec-uat/frontend/
aws s3 ls s3://aolf-gsec-prod/frontend/

# AWS CloudFront commands
# Replace YOUR_DISTRIBUTION_ID with your actual CloudFront distribution ID
# aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

./deploy-rds.sh --env=uat
./deploy-eb.sh --env=uat


./deploy-rds.sh --env=dev
./deploy-eb.sh --env=dev


aws rds create-db-instance \
  --db-instance-identifier aolf-gsec-db-uat \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --allocated-storage 20 \
  --master-username aolf_gsec_user \
  --manage-master-user-password \
  --db-subnet-group-name default \
  --no-publicly-accessible


cd /Users/amitnair/GoogleDrive/AOLF/1tech/git/aolf-gsec/backend && pip install boto3 psycopg2-binary
aws rds describe-db-instances --region us-east-2 --db-instance-identifier aolf-gsec-db-uat

./deploy-frontend.sh --env uat
echo '{"Version":"2012-10-17","Statement":[{"Sid":"AllowCloudFrontOAI","Effect":"Allow","Principal":{"AWS":"arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E27H2EYALD8PJ3"},"Action":"s3:GetObject","Resource":"arn:aws:s3:::aolf-gsec-uat/*"}]}' > /tmp/bucket-policy.json && aws s3api put-bucket-policy --bucket aolf-gsec-uat --policy file:///tmp/bucket-policy.json
aws cloudfront get-distribution-config --id E2O7PMT0VIGSF6 --output json > /tmp/cf-config.json && ETAG=$(cat /tmp/cf-config.json | grep ETag | cut -d'"' -f4) && cat /tmp/cf-config.json | grep -v "ETag" > /tmp/cf-config-no-etag.json
# python3 -c 'import json; config = json.load(open("/tmp/cf-config-no-etag.json")); config["DistributionConfig"]["Origins"]["Items"][0]["S3OriginConfig"]["OriginAccessIdentity"] = "origin-access-identity/cloudfront/E27H2EYALD8PJ3"; config["DistributionConfig"]["DefaultCacheBehavior"]["ViewerProtocolPolicy"] = "redirect-to-https"; json.dump(config, open("/tmp/cf-config-updated.json", "w"), indent=4)' && aws cloudfront update-distribution --id E2O7PMT0VIGSF6 --if-match $(echo $ETAG) --distribution-config file:///tmp/cf-config-updated.json
aws cloudfront delete-distribution --id E2O7PMT0VIGSF6 --if-match $(aws cloudfront get-distribution --id E2O7PMT0VIGSF6 --query "ETag" --output text)

# Clear CloudFront cache: Invalidate CloudFront distribution
aws cloudfront create-invalidation --distribution-id E2O7PMT0VIGSF6 --paths "/*"

# Update CloudFront distribution to use index.html as default root object
aws cloudfront update-distribution --id E2O7PMT0VIGSF6 --if-match EL0X8Q9TRJKC5 --default-root-object index.html

# Allow inbound traffic to RDS instance
aws ec2 authorize-security-group-ingress --region us-east-2 --group-id sg-0c4ad690bfd84ab1a --protocol tcp --port 5432 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id sg-0c4ad690bfd84ab1a --protocol tcp --port 5432 --cidr 172.31.38.112/32 --region us-east-2

# Create VPC peering connection
aws ec2 create-vpc-peering-connection --vpc-id vpc-052a35c19c8274e28 --peer-vpc-id vpc-0438e0009173b2686 --region us-east-2
aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id pcx-04425cbc53f4b60f8 --region us-east-2
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-052a35c19c8274e28" --region us-east-2
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-0438e0009173b2686" --region us-east-2
aws ec2 create-route --route-table-id rtb-0e0df9073e46acdcc --destination-cidr-block 172.30.0.0/16 --vpc-peering-connection-id pcx-04425cbc53f4b60f8 --region us-east-2
aws ec2 create-route --route-table-id rtb-023c1f960fd2f13d7 --destination-cidr-block 172.31.0.0/16 --vpc-peering-connection-id pcx-04425cbc53f4b60f8 --region us-east-2
eb deploy --region us-east-2

# Although we've set up the VPC peering and the security groups correctly, we need to configure the RDS PostgreSQL instance to accept connections. For AWS RDS, this is done through DB parameter groups.
aws rds describe-db-instances --db-instance-identifier aolf-gsec-db-uat --region us-east-2
aws rds create-db-parameter-group --db-parameter-group-name aolf-gsec-postgres16 --db-parameter-group-family postgres16 --description "Custom parameter group for AOLF GSEC PostgreSQL" --region us-east-2
aws rds modify-db-parameter-group --db-parameter-group-name aolf-gsec-postgres16 --parameters "ParameterName=pgaudit.log,ParameterValue=none,ApplyMethod=immediate" "ParameterName=shared_preload_libraries,ParameterValue=pgaudit,ApplyMethod=pending-reboot"
aws rds modify-db-parameter-group --db-parameter-group-name aolf-gsec-postgres16 --parameters "ParameterName=pg_hba.conf,ParameterValue='host all all 0.0.0.0/0 md5',ApplyMethod=immediate"
aws ec2 describe-security-groups --group-ids sg-0c4ad690bfd84ab1a --region us-east-2
aws elasticbeanstalk describe-environment-resources --environment-name aolf-gsec-backend-uat --region us-east-2
aws ec2 describe-instances --filters "Name=tag:elasticbeanstalk:environment-name,Values=aolf-gsec-backend-uat" --region us-east-2
aws ec2 describe-vpcs --vpc-ids vpc-052a35c19c8274e28 --region us-east-2
aws ec2 authorize-security-group-ingress --group-id sg-0c4ad690bfd84ab1a --protocol tcp --port 5432 --cidr 172.31.0.0/16 --region us-east-2

# Create a new environment
cd /Users/amitnair/GoogleDrive/AOLF/1tech/git/aolf-gsec/backend && eb create aolf-gsec-backend-uat --platform "Python 3.12" --region us-east-2 | cat

# GAE deployment
./deployment/gae/deploy-gae-fullstack.sh -p aolf-gsec-uat --env=uat --skip-dependency-check --skip-frontend-build


# -- Elastic Beanstalk Deployment (ChatGPT) ----------------------------------------------------------------

eb init --platform python-3.12 --region us-east-2
eb create aolf-gsec-backend-uat


zip -r deployment/aolf-gsec-backend-uat.zip . \
    -x "*venv*" \
    -x "*.git*" \
    -x "*__pycache__*"

zip -r deployment/aolf-gsec-backend.zip . \
    -x "*ebextensions*" \
    -x "*deployment*" \
    -x ".elasticbeanstalk*" \
    -x "*venv*" \
    -x "*.git*" \
    -x "*__pycache__*" \
    -x ".ebignore"

openssl rand -base64 6


# -- Create a new database user for the application ----------------------------------------------------------------

# 1. SSH into your Elastic Beanstalk environment
eb ssh aolf-gsec-backend-uat

# Once connected to the EB instance, run these commands:

# 2. Install required tools if not present
sudo yum install -y jq postgresql15
sudo yum install postgresql16 

# 3. Retrieve the master password from Secrets Manager
# MASTER_PASSWORD=$(aws secretsmanager get-secret-value --secret-id 'arn:aws:secretsmanager:us-east-2:851725315788:secret:rds!db-f1759782-588f-413c-8d45-55675a2138bf-ZDATni' --query SecretString --output text | jq -r '.password')


MASTER_PASSWORD=""

# 4. Connect to PostgreSQL and create the application user
APP_USER_NAME="aolf_gsec_app_user"
APP_USER_PASSWORD=""

# Connect to postgres database and create user
PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_admin \
  -d postgres \
  -c "CREATE USER $APP_USER_NAME WITH PASSWORD '$APP_USER_PASSWORD';"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_admin \
  -d postgres \
  -c "GRANT CONNECT ON DATABASE aolf_gsec TO $APP_USER_NAME;" \
  -c "GRANT USAGE ON SCHEMA public TO $APP_USER_NAME;" \
  -c "GRANT CREATE ON SCHEMA public TO $APP_USER_NAME;" \
  -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $APP_USER_NAME;" \
  -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $APP_USER_NAME;"

# Insert a SECRETARIAT user record for Amit Nair
PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_admin \
  -d aolf_gsec \
  -c "INSERT INTO users (email, first_name, last_name, role, email_notification_preferences, created_at, updated_at) VALUES (
    'amit.nair@artofliving.org',
    'Amit',
    'Nair',
    'SECRETARIAT',
    '{\"appointment_created\": true, \"appointment_updated\": true, \"new_appointment_request\": true}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) ON CONFLICT (email) DO UPDATE SET 
    role = 'SECRETARIAT',
    email_notification_preferences = '{\"appointment_created\": true, \"appointment_updated\": true, \"new_appointment_request\": true}',
    updated_at = CURRENT_TIMESTAMP
    RETURNING id, email, role;"


# -- Setup UAT database ----------------------------------------------------------------------------------------------

MASTER_PASSWORD=""

# 4. Connect to PostgreSQL and create the application user
APP_USER_NAME="aolf_gsec_app_user"
APP_USER_PASSWORD=""

# Connect to postgres database and create user
PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d postgres \
  -c "CREATE USER $APP_USER_NAME WITH PASSWORD '$APP_USER_PASSWORD';"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d postgres \
  -c "CREATE DATABASE aolf_gsec;" \
  -c "GRANT ALL PRIVILEGES ON DATABASE aolf_gsec TO $APP_USER_NAME;" \
  -c "ALTER USER $APP_USER_NAME WITH CREATEDB;"

echo "Database user $APP_USER_NAME created successfully!"


PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d postgres \
  -c "CREATE DATABASE aolf_gsec;" \
  -c "GRANT ALL PRIVILEGES ON DATABASE aolf_gsec TO $APP_USER_NAME;" \
  -c "ALTER USER $APP_USER_NAME WITH CREATEDB;"

# Grant permissions on the public schema within aolf_gsec database
PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "GRANT ALL ON SCHEMA public TO $APP_USER_NAME;" \
  -c "GRANT USAGE ON SCHEMA public TO $APP_USER_NAME;" \
  -c "GRANT CREATE ON SCHEMA public TO $APP_USER_NAME;"

# -- If needed, also set the user as the schema owner
# ALTER SCHEMA public OWNER TO aolf_gsec_app_user;

# Insert a SECRETARIAT user record for Amit Nair
PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "INSERT INTO users (email, first_name, last_name, role, email_notification_preferences, created_at, updated_at) VALUES (
    'amit.nair@artofliving.org',
    'Amit',
    'Nair',
    'SECRETARIAT',
    '{\"appointment_created\": true, \"appointment_updated\": true, \"new_appointment_request\": true}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) ON CONFLICT (email) DO UPDATE SET 
    role = 'SECRETARIAT',
    email_notification_preferences = '{\"appointment_created\": true, \"appointment_updated\": true, \"new_appointment_request\": true}',
    updated_at = CURRENT_TIMESTAMP
    RETURNING id, email, role;"

# -- Adding created_by and updated_by to User model ----------------------------------------------------------------

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);" \
  -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);"

# -- Verify the changes ----------------------------------------------------------------
PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY column_name;"

# -- Updates for multiple dignitaries in an appointment ----------------------------------------------------------------

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "INSERT INTO appointment_dignitaries (appointment_id, dignitary_id, created_at) SELECT id, dignitary_id, created_at FROM appointments WHERE dignitary_id IS NOT NULL;"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "ALTER TABLE appointments ALTER COLUMN dignitary_id DROP NOT NULL;"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "CREATE INDEX ix_appointment_dignitaries_appointment_id  ON appointment_dignitaries (appointment_id);"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "CREATE INDEX ix_appointment_dignitaries_dignitary_id  ON appointment_dignitaries (dignitary_id);"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS primary_domain_other VARCHAR(255);"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "select typname from pg_type where oid IN (select enumtypid from pg_enum where enumlabel = 'BUSINESS');"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "set role aolf_gsec_app_user; ALTER TYPE primarydomain ADD VALUE 'OTHER';"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "select typname from pg_type where oid IN (select enumtypid from pg_enum where enumlabel = 'AIR_CHIEF_MARSHAL')"

PGPASSWORD="$MASTER_PASSWORD" psql -h aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com \
  -U aolf_gsec_user \
  -d aolf_gsec \
  -c "set role aolf_gsec_app_user; ALTER TYPE honorifictitle ADD VALUE 'NA';"

# -- Terraform ----------------------------------------------------------------

# Initialize Terraform
terraform init

# Upgrade Terraform
terraform init -upgrade

# Plan the changes
terraform plan

# Apply the changes
terraform apply

# Show the state of the Aurora RDS cluster
terraform state show aws_rds_cluster.aurora

# Deploy the frontend
./deploy-frontend.sh --cloudfront-id=$(terraform -chdir=../terraform output -raw cloudfront_distribution_id)

# Deploy the backend
cd backend; eb deploy

# Destroy the PROD environment
terraform destroy -target aws_elastic_beanstalk_environment.backend_env

# Import the UAT environment
terraform import aws_elastic_beanstalk_environment.uatenv e-byrifajyzp