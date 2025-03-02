#!/usr/bin/env python3
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import boto3
import json
import sys
import os
import logging
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def get_secret_by_arn(secret_arn, region_name):
    """Retrieve a secret from AWS Secrets Manager using ARN"""
    logger.info(f"Retrieving secret by ARN from region: {region_name}")
    
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    
    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_arn)
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            return json.loads(secret)
        else:
            logger.error("Secret is not in string format")
            return None
    except Exception as e:
        logger.error(f"Error retrieving secret: {str(e)}")
        return None

def create_database(host, port, admin_user, admin_password, db_name):
    """Create database if it doesn't exist"""
    logger.info(f"Connecting to postgres database on {host}:{port} to check/create {db_name}")
    
    try:
        # Connect to postgres database
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=admin_user,
            password=admin_password,
            database='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}';")
        exists = cursor.fetchone()
        
        if not exists:
            logger.info(f"Creating database {db_name}...")
            cursor.execute(f'CREATE DATABASE "{db_name}";')
            logger.info(f"Database {db_name} created successfully")
        else:
            logger.info(f"Database {db_name} already exists")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Create RDS database for AOLF GSEC application')
    parser.add_argument('--host', default='aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com', help='RDS hostname')
    parser.add_argument('--port', default=5432, type=int, help='RDS port')
    parser.add_argument('--db-name', default='aolf_gsec', help='Database name to create')
    parser.add_argument('--user', default='aolf_gsec_user', help='Admin username')
    parser.add_argument('--password', help='Admin password (leave empty to use AWS Secrets Manager)')
    parser.add_argument('--secret-arn', default='arn:aws:secretsmanager:us-east-2:851725315788:secret:rds!db-f1759782-588f-413c-8d45-55675a2138bf-ZDATni', help='Secret ARN in AWS Secrets Manager')
    parser.add_argument('--region', default='us-east-2', help='AWS region')
    
    args = parser.parse_args()
    
    # Get password from command line or secrets manager
    password = args.password
    if not password:
        logger.info("No password provided, retrieving from AWS Secrets Manager")
        secret = get_secret_by_arn(args.secret_arn, args.region)
        if secret and 'password' in secret:
            password = secret['password']
        else:
            logger.error("Failed to retrieve password from Secrets Manager")
            sys.exit(1)
    
    # Create database
    success = create_database(args.host, args.port, args.user, password, args.db_name)
    if success:
        logger.info("Database setup completed successfully")
    else:
        logger.error("Database setup failed")
        sys.exit(1)

if __name__ == "__main__":
    main() 