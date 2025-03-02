import os
from dotenv import load_dotenv

def load_environment():
    """
    Load environment variables based on ENVIRONMENT setting.
    This function should be called once at the start of the application.
    """
    env = os.getenv("ENVIRONMENT", "dev")
    env_file = f".env.{env}"

    # First check if we're in an Elastic Beanstalk environment
    # If we are, we don't need to load from .env file as EB sets the environment variables
    if os.getenv("POSTGRES_HOST") and "elasticbeanstalk" in os.getenv("POSTGRES_HOST", ""):
        print("Running in Elastic Beanstalk environment, using environment variables")
        print(f"Environment: {env}")
        print(f"Database Host: {os.getenv('POSTGRES_HOST')}")
        print(f"Database: {os.getenv('POSTGRES_DB')}")
        print(f"AWS Region: {os.getenv('AWS_REGION')}")
        return True
    
    # If we're not in EB or the environment variables aren't set, try to load from .env file
    if os.path.exists(env_file):
        print(f"Loading environment from {env_file}")
        load_dotenv(env_file, override=False)  # Don't override existing env vars
        
        # Print some debug information about key environment variables
        # (without revealing sensitive information)
        print(f"Environment: {env}")
        print(f"Database: {os.getenv('POSTGRES_DB')}")
        print(f"AWS Region: {os.getenv('AWS_REGION')}")
        print(f"S3 Bucket: {os.getenv('S3_BUCKET_NAME')}")
        
        return True
    else:
        print(f"Warning: Environment file {env_file} not found, using default environment variables")
        return False

# Load environment variables when this module is imported
load_environment() 