import boto3
import os
from botocore.exceptions import ClientError
from fastapi import HTTPException

# Get environment variables directly
ENV = os.getenv('ENVIRONMENT', 'dev')
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

# Initialize S3 client with the environment variables
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

if not BUCKET_NAME:
    raise HTTPException(status_code=500, detail="S3_BUCKET_NAME is not set")

def upload_file(file_data: bytes, file_name: str, content_type: str, entity_type: str = "appointments") -> str:
    """
    Upload a file to S3 and return its path
    
    Parameters:
    - file_data: The binary content of the file
    - file_name: The name of the file (should include entity ID as prefix)
    - content_type: The MIME type of the file
    - entity_type: The type of entity (appointments, dignitaries, etc.)
    
    Returns:
    - S3 path where the file is stored
    """
    try:
        # Format: environment/attachments/entity_type/file_name
        # Example: uat/attachments/appointments/123/document.pdf
        s3_path = f"{ENV}/attachments/{entity_type}/{file_name}"
        
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_path,
            Body=file_data,
            ContentType=content_type
        )
        return s3_path
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

def get_file(file_path: str) -> dict:
    """Get a file from S3"""
    try:
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key=file_path
        )
        return {
            'file_data': response['Body'].read(),
            'content_type': response.get('ContentType', 'application/octet-stream')
        }
    except ClientError as e:
        raise HTTPException(status_code=404, detail="File not found") 