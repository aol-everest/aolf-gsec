from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
import time
from config import environment  # Import the centralized environment module
from sqlalchemy.sql import text

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment variable or use default
POSTGRES_USER = os.getenv("POSTGRES_USER", "aolf_gsec_app_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "aolf_gsec")

# Log database connection info (without password)
logger.info(f"Database connection: postgresql://{POSTGRES_USER}:***@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")

# Connection parameters with increased timeout for cross-region/cross-VPC connections
CONNECT_TIMEOUT = 120  # Increased to 2 minutes for cross-VPC connections
MAX_RETRIES = 20  # Doubled number of retries
RETRY_INTERVAL = 15  # Increased interval between retries

# Command timeout for operations
COMMAND_TIMEOUT = 120  # Increased timeout for database operations

SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

def get_database_url(database=POSTGRES_DB):
    return f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{database}"

def get_db_engine():
    # Get database connection string
    db_url = get_database_url()
    
    try:
        # Try to connect to the specified database with increased timeout
        return create_engine(
            db_url,
            connect_args={
                "connect_timeout": CONNECT_TIMEOUT,
                "options": f"-c statement_timeout={COMMAND_TIMEOUT*1000}"
            },
            pool_recycle=1800,  # Reduced from 3600 to recycle connections more frequently
            pool_pre_ping=True,
            pool_size=5,  # Set explicit pool size
            max_overflow=10  # Allow up to 10 connections beyond pool_size
        )
    except Exception as e:
        # If there's an error, check if it's because the database doesn't exist
        if "database" in str(e).lower() and "not exist" in str(e).lower():
            # Connect to the 'postgres' database instead
            postgres_url = get_database_url(database="postgres")
            postgres_engine = create_engine(
                postgres_url,
                connect_args={
                    "connect_timeout": CONNECT_TIMEOUT,
                    "options": f"-c statement_timeout={COMMAND_TIMEOUT*1000}"
                },
                pool_recycle=1800
            )
            
            # Create the database
            with postgres_engine.connect() as conn:
                conn.execute("commit")  # Required to run CREATE DATABASE
                conn.execute(text(f"CREATE DATABASE {os.getenv('POSTGRES_DB', 'aolf_gsec')}"))
            
            # Now connect to the newly created database
            return create_engine(
                db_url,
                connect_args={
                    "connect_timeout": CONNECT_TIMEOUT,
                    "options": f"-c statement_timeout={COMMAND_TIMEOUT*1000}"
                },
                pool_recycle=1800,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10
            )
        else:
            # Re-raise the exception if it's not about the database not existing
            raise

for retry in range(MAX_RETRIES):
    try:
        logger.info(f"Attempting to connect to database (attempt {retry + 1}/{MAX_RETRIES})...")
        engine = get_db_engine()
        # Test the connection
        with engine.connect() as connection:
            logger.info("Successfully connected to the database")
        break
    except Exception as e:
        logger.error(f"Error connecting to database (attempt {retry + 1}/{MAX_RETRIES}): {str(e)}")
        if retry < MAX_RETRIES - 1:
            logger.info(f"Retrying in {RETRY_INTERVAL} seconds...")
            time.sleep(RETRY_INTERVAL)
        else:
            logger.error("Maximum retry attempts reached. Could not connect to the database.")
            raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base() 