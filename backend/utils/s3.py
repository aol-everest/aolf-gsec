import boto3
import os
import uuid
import io
from datetime import datetime
from botocore.exceptions import ClientError
from fastapi import HTTPException
from PIL import Image

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

# Define image content types
IMAGE_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp'
]

# Define thumbnail size
THUMBNAIL_SIZE = (200, 200)  # Width, Height

def generate_unique_filename(original_filename: str) -> str:
    """
    Generate a unique filename while preserving the original extension
    
    Parameters:
    - original_filename: The original filename
    
    Returns:
    - A unique filename with the original extension
    """
    # Extract the file extension
    file_extension = os.path.splitext(original_filename)[1].lower()
    
    # Generate a unique identifier using UUID and timestamp
    unique_id = f"{uuid.uuid4().hex}_{int(datetime.now().timestamp())}"
    
    # Return the unique filename with the original extension
    return f"{unique_id}{file_extension}"

def is_image_file(content_type: str) -> bool:
    """
    Check if the file is an image based on its content type
    
    Parameters:
    - content_type: The MIME type of the file
    
    Returns:
    - True if the file is an image, False otherwise
    """
    return content_type in IMAGE_CONTENT_TYPES

def generate_thumbnail(image_data: bytes, content_type: str) -> bytes:
    """
    Generate a thumbnail for an image
    
    Parameters:
    - image_data: The binary content of the image
    - content_type: The MIME type of the image
    
    Returns:
    - The binary content of the thumbnail
    """
    try:
        # Open the image using PIL
        img = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed (for PNG with transparency)
        if img.mode != 'RGB' and content_type != 'image/png':
            img = img.convert('RGB')
        
        # Resize the image to create a thumbnail
        img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
        
        # Save the thumbnail to a bytes buffer
        thumb_buffer = io.BytesIO()
        
        # Determine the format based on content type
        if content_type == 'image/png':
            img.save(thumb_buffer, format='PNG')
        elif content_type == 'image/gif':
            img.save(thumb_buffer, format='GIF')
        elif content_type == 'image/webp':
            img.save(thumb_buffer, format='WEBP')
        else:
            # Default to JPEG for other formats
            img.save(thumb_buffer, format='JPEG', quality=85)
        
        thumb_buffer.seek(0)
        return thumb_buffer.getvalue()
    except Exception as e:
        # If thumbnail generation fails, return None
        print(f"Error generating thumbnail: {str(e)}")
        return None

def upload_file(file_data: bytes, file_name: str, content_type: str, entity_type: str = "appointments") -> dict:
    """
    Upload a file to S3 and return its path and unique filename
    
    Parameters:
    - file_data: The binary content of the file
    - file_name: The name of the file (should include entity ID as prefix)
    - content_type: The MIME type of the file
    - entity_type: The type of entity (appointments, dignitaries, etc.)
    
    Returns:
    - Dictionary containing S3 path, unique filename, and thumbnail path if applicable
    """
    try:
        # Generate a unique filename while preserving the original extension
        base_path = os.path.dirname(file_name)
        original_filename = os.path.basename(file_name)
        unique_filename = generate_unique_filename(original_filename)
        
        # Format: environment/attachments/entity_type/entity_id/unique_filename
        # Example: uat/attachments/appointments/123/abc123def456_1612345678.pdf
        s3_path = f"{ENV}/attachments/{entity_type}/{base_path}/{unique_filename}"
        
        # Upload the original file
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_path,
            Body=file_data,
            ContentType=content_type,
            Metadata={
                'original_filename': original_filename
            }
        )
        
        result = {
            's3_path': s3_path,
            'unique_filename': unique_filename,
            'is_image': is_image_file(content_type)
        }
        
        # If the file is an image, generate and upload a thumbnail
        if is_image_file(content_type):
            thumbnail_data = generate_thumbnail(file_data, content_type)
            if thumbnail_data:
                # Create a thumbnail path
                thumbnail_filename = f"thumb_{unique_filename}"
                thumbnail_path = f"{ENV}/attachments/{entity_type}/{base_path}/thumbnails/{thumbnail_filename}"
                
                # Upload the thumbnail
                s3_client.put_object(
                    Bucket=BUCKET_NAME,
                    Key=thumbnail_path,
                    Body=thumbnail_data,
                    ContentType=content_type,
                    Metadata={
                        'original_filename': f"thumb_{original_filename}"
                    }
                )
                
                result['thumbnail_path'] = thumbnail_path
        
        return result
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
            'content_type': response.get('ContentType', 'application/octet-stream'),
            'original_filename': response.get('Metadata', {}).get('original_filename')
        }
    except ClientError as e:
        raise HTTPException(status_code=404, detail="File not found") 