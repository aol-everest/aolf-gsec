from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
import time
from config import environment  # Import the centralized environment module
from sqlalchemy.sql import text
from contextlib import contextmanager
from typing import Optional
from sqlalchemy import event

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database configuration from environment variables or use defaults
POSTGRES_USER = os.getenv("POSTGRES_USER", "aolf_gsec_app_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "aolf_gsec")
POSTGRES_SCHEMA = os.getenv("POSTGRES_SCHEMA", "public")  # Get schema from env, default to public

# Check for Aurora read/write endpoints
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_READ_HOST = os.getenv("POSTGRES_READ_HOST")
POSTGRES_WRITE_HOST = os.getenv("POSTGRES_WRITE_HOST")

# Determine if we're using Aurora RDS with separate read/write endpoints
use_aurora_endpoints = bool(POSTGRES_READ_HOST and POSTGRES_WRITE_HOST)

if use_aurora_endpoints:
    logger.info(f"Using Aurora endpoints - Read: {POSTGRES_READ_HOST}, Write: {POSTGRES_WRITE_HOST}")
else:
    logger.info(f"Using single database host: {POSTGRES_HOST}")

# Log the schema configuration
logger.info(f"Using database schema: {POSTGRES_SCHEMA}")

# Connection parameters with increased timeout for cross-region/cross-VPC connections
CONNECT_TIMEOUT = 120  # Increased to 2 minutes for cross-VPC connections
MAX_RETRIES = 20  # Doubled number of retries
RETRY_INTERVAL = 15  # Increased interval between retries

# Command timeout for operations
COMMAND_TIMEOUT = 120  # Increased timeout for database operations

# Function to check/create schema - centralized implementation
def ensure_schema_exists(conn, schema_name, user_name):
    """
    Ensure the specified schema exists and user has proper permissions.
    
    Args:
        conn: A SQLAlchemy connection
        schema_name: The name of the schema to create
        user_name: The database user who needs access
        
    Returns:
        bool: Whether the schema exists or was created successfully
    """
    try:
        # Check if schema exists
        result = conn.execute(text(f"SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = '{schema_name}')"))
        schema_exists = result.scalar()
        
        if not schema_exists:
            # Create schema and set permissions
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
            conn.execute(text(f"GRANT ALL ON SCHEMA {schema_name} TO {user_name}"))
            conn.execute(text("COMMIT"))
            logger.info(f"Created schema {schema_name} and granted permissions to {user_name}")
        else:
            logger.info(f"Schema {schema_name} already exists")
        return True
    except Exception as e:
        logger.error(f"Error ensuring schema {schema_name} exists: {str(e)}")
        logger.warning("This might indicate a permissions issue. Ensure the database user has CREATE privileges on the database.")
        return False

# Build database URLs
def get_database_url(host: str, database: str = POSTGRES_DB) -> str:
    return f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{host}:{POSTGRES_PORT}/{database}"

# Default DB URL using the single host
DEFAULT_DB_URL = get_database_url(POSTGRES_HOST)

# Write and read URLs (may be the same if not using Aurora)
WRITE_DB_URL = get_database_url(POSTGRES_WRITE_HOST or POSTGRES_HOST)
READ_DB_URL = get_database_url(POSTGRES_READ_HOST or POSTGRES_HOST)

def get_db_engine(db_url: str, for_writes: bool = False):
    """
    Create a database engine with the specified URL and connection parameters.
    
    Args:
        db_url: The database URL to connect to
        for_writes: Whether this engine will be used for write operations
        
    Returns:
        SQLAlchemy engine
    """
    try:
        # Create engine with schema configuration
        engine = create_engine(
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
        
        # Set up the schema if needed - only for write engines
        if for_writes and POSTGRES_SCHEMA != "public":
            with engine.connect() as conn:
                ensure_schema_exists(conn, POSTGRES_SCHEMA, POSTGRES_USER)
                
        return engine
    except Exception as e:
        # If there's an error, check if it's because the database doesn't exist
        if for_writes and "database" in str(e).lower() and "not exist" in str(e).lower():
            # Connect to the 'postgres' database instead
            postgres_url = get_database_url(host=POSTGRES_WRITE_HOST or POSTGRES_HOST, database="postgres")
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
                conn.execute(text("COMMIT"))  # Required to run CREATE DATABASE
                conn.execute(text(f"CREATE DATABASE {POSTGRES_DB}"))
            
            # Now connect to the newly created database
            engine = create_engine(
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
            
            # Set up the schema if needed - reusing our function
            if POSTGRES_SCHEMA != "public":
                with engine.connect() as conn:
                    ensure_schema_exists(conn, POSTGRES_SCHEMA, POSTGRES_USER)
            
            return engine
        else:
            # Re-raise the exception if it's not about the database not existing
            raise

# Create engines for read and write operations
for retry in range(MAX_RETRIES):
    try:
        logger.info(f"Attempting to connect to write database (attempt {retry + 1}/{MAX_RETRIES})...")
        write_engine = get_db_engine(WRITE_DB_URL, for_writes=True)
        
        # Test the write connection
        with write_engine.connect() as connection:
            logger.info("Successfully connected to the write database")
        
        # If we're using Aurora with separate endpoints, create read engine
        if use_aurora_endpoints:
            logger.info(f"Attempting to connect to read database (attempt {retry + 1}/{MAX_RETRIES})...")
            read_engine = get_db_engine(READ_DB_URL)
            
            # Test the read connection
            with read_engine.connect() as connection:
                logger.info("Successfully connected to the read database")
        else:
            # If single endpoint, use the same engine for reads
            read_engine = write_engine
            logger.info("Using the same database for reads and writes")
        
        break
    except Exception as e:
        logger.error(f"Error connecting to database(s) (attempt {retry + 1}/{MAX_RETRIES}): {str(e)}")
        if retry < MAX_RETRIES - 1:
            logger.info(f"Retrying in {RETRY_INTERVAL} seconds...")
            time.sleep(RETRY_INTERVAL)
        else:
            logger.error("Maximum retry attempts reached. Could not connect to the database(s).")
            raise

# Create session classes for read and write operations with schema configuration
def session_factory(engine):
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Set search_path for all sessions to use the configured schema
    @event.listens_for(session, "after_begin")
    def set_schema(session, transaction, connection):
        if POSTGRES_SCHEMA != "public":
            session.execute(text(f"SET search_path TO {POSTGRES_SCHEMA}, public"))
    
    return session

WriteSessionLocal = session_factory(write_engine)
ReadSessionLocal = session_factory(read_engine)

# For backward compatibility
SessionLocal = WriteSessionLocal

# Define Base for declarative models
Base = declarative_base()

# Set schema for all models
if POSTGRES_SCHEMA != "public":
    # Set schema for all table definitions using metadata instead of table args
    # This allows us to reference the schema in foreign keys properly
    schema_translator = lambda schema, table, metadata: f"{schema}.{table}"
    
    # Use a callback for schema qualification
    def table_args_factory():
        return {
            'schema': POSTGRES_SCHEMA
        }
    
    # Provide schema info to all models
    Base.__table_args__ = table_args_factory()
    
    # Log the schema configuration
    logger.info(f"Set Base.__table_args__ schema to {POSTGRES_SCHEMA}")
    
    # NOTE: We don't need to re-check/create schema here since the write_engine
    # has already been initialized above and would have created the schema.
    # This also avoids race conditions if multiple application instances start simultaneously.
    
    # Verify the schema exists (log-only, don't create again)
    try:
        with write_engine.connect() as conn:
            # Check if schema exists without creating
            result = conn.execute(text(f"SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = '{POSTGRES_SCHEMA}')"))
            schema_exists = result.scalar()
            logger.info(f"Schema '{POSTGRES_SCHEMA}' exists check (post-model configuration): {schema_exists}")
    except Exception as e:
        logger.error(f"Error verifying schema existence: {str(e)}")
        logger.warning("Will attempt to proceed anyway")

# Context managers for database sessions
@contextmanager
def get_db():
    """Get a write DB session."""
    db = WriteSessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_read_db():
    """Get a read-only DB session."""
    db = ReadSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_for_operation(for_read_only: bool = False):
    """Return the appropriate context manager based on the operation type."""
    return get_read_db() if for_read_only else get_db() 