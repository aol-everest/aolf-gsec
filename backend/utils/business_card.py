import base64
import os
import json
from typing import Optional, Dict, Any
from pydantic import BaseModel
from openai import OpenAI
import logging

from schemas import BusinessCardExtraction

logger = logging.getLogger(__name__)

class BusinessCardExtractionError(Exception):
    """Exception raised for errors in the business card extraction process."""
    pass

def extract_business_card_info(image_path: str) -> BusinessCardExtraction:
    """
    Extract information from a business card image using OpenAI's GPT-4o-mini model.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        BusinessCardExtraction object with extracted information
        
    Raises:
        BusinessCardExtractionError: If extraction fails
    """
    try:
        # Get OpenAI API key from environment variable
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise BusinessCardExtractionError("OpenAI API key not found in environment variables")
        
        client = OpenAI(api_key=api_key)
        
        # Encode the image to base64
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")
        
        # Call OpenAI API to extract information
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """You are a business card information extractor. Extract the following fields from the business card image:
                    - first_name: The person's first name
                    - last_name: The person's last name
                    - title: The person's job title or position
                    - company: The company or organization name
                    - phone: The primary phone number
                    - other_phone: Any secondary phone number
                    - fax: Fax number if available
                    - email: Email address
                    - website: Website or LinkedIn URL
                    - address: Physical address
                    - social_media: List of social media handles
                    - extra_fields: Any other information on the card
                    
                    Format your response as a valid JSON object with these fields. Use null for missing fields."""
                }, 
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"},
        )
        
        # Parse the response
        content = response.choices[0].message.content
        if not content:
            raise BusinessCardExtractionError("Empty response from OpenAI API")
            
        data = json.loads(content)
        
        # Create and return the BusinessCardExtraction object
        return BusinessCardExtraction(
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            title=data.get("title"),
            company=data.get("company"),
            phone=data.get("phone"),
            other_phone=data.get("other_phone"),
            fax=data.get("fax"),
            email=data.get("email"),
            website=data.get("website"),
            address=data.get("address"),
            social_media=data.get("social_media"),
            extra_fields=data.get("extra_fields")
        )
    
    except Exception as e:
        logger.error(f"Error extracting business card information: {str(e)}")
        raise BusinessCardExtractionError(f"Failed to extract business card information: {str(e)}") 