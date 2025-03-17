import os
from dotenv import load_dotenv

def load_environment():
    """
    Load environment variables based on ENVIRONMENT setting.
    This function should be called once at the start of the application.
    """
    env = os.getenv("ENVIRONMENT", "dev")
    env_file = f".env.{env}"

    # First check if we're running in a deployed environment with config already set
    # Check for either POSTGRES_HOST or POSTGRES_WRITE_HOST for Aurora setups
    if os.getenv("POSTGRES_HOST") or os.getenv("POSTGRES_WRITE_HOST"):
        print("Running in deployed environment, using environment variables")
        print(f"Environment: {env}")
        print(f"Database Host: {os.getenv('POSTGRES_HOST') or os.getenv('POSTGRES_WRITE_HOST')}")
        print(f"Database: {os.getenv('POSTGRES_DB')}")
        print(f"AWS Region: {os.getenv('AWS_REGION', 'Not set')}")
        return True
    
    # If environment variables aren't set, try to load from .env file
    if os.path.exists(env_file):
        print(f"Loading environment from {env_file}")
        load_dotenv(env_file, override=False)  # Don't override existing env vars
        
        # Print some debug information about key environment variables
        # (without revealing sensitive information)
        print(f"Environment: {env}")
        print(f"Database: {os.getenv('POSTGRES_DB')}")
        print(f"AWS Region: {os.getenv('AWS_REGION', 'Not set')}")
        print(f"S3 Bucket: {os.getenv('S3_BUCKET_NAME', 'Not set')}")
        
        return True
    else:
        print(f"Warning: Environment file {env_file} not found, using default environment variables")
        return False

# Load environment variables when this module is imported
load_environment() 