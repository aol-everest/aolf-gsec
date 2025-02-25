import os
from dotenv import load_dotenv

def load_environment():
    """
    Load environment variables based on ENVIRONMENT setting.
    This function should be called once at the start of the application.
    """
    env = os.getenv("ENVIRONMENT", "dev")
    env_file = f".env.{env}"

    if os.path.exists(env_file):
        print(f"Loading environment from {env_file}")
        load_dotenv(env_file, override=True)
        
        # Print some debug information about key environment variables
        # (without revealing sensitive information)
        print(f"Environment: {env}")
        print(f"Database: {os.getenv('POSTGRES_DB')}")
        print(f"AWS Region: {os.getenv('AWS_REGION')}")
        print(f"S3 Bucket: {os.getenv('S3_BUCKET_NAME')}")
        
        return True
    else:
        print(f"Error: Environment file {env_file} not found")
        raise FileNotFoundError(f"Environment file {env_file} not found")

# Load environment variables when this module is imported
load_environment() 