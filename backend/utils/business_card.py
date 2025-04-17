import base64
import os
import json
from typing import Optional, Dict, Any
from pydantic import BaseModel
from openai import OpenAI
import logging

from schemas import BusinessCardExtraction
from models import PrimaryDomain

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
    # Check if business card extraction is enabled
    enable_extraction = os.environ.get("ENABLE_BUSINESS_CARD_EXTRACTION", "true").lower() == "true"
    
    if not enable_extraction:
        logger.info("Business card extraction is disabled")
        return BusinessCardExtraction(
            first_name="",
            last_name="",
            title=None,
            company=None,
            phone=None,
            email=None,
            website=None,
            street_address=None
        )
    
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
                    "content": f"""You are a business card information extractor. Extract the following fields from the business card image:
                    - honorific_title: The person's salutation or honorific title (e.g. Mr., Mrs., Dr., etc.)
                    - first_name: The person's first name
                    - last_name: The person's last name
                    - title: The person's job title or position
                    - company: The company or organization name
                    - primary_domain: The primary domain of the person's business or organization (choose from {", ".join([domain.value for domain in PrimaryDomain])})
                    - primary_domain_other: If the primary domain is "Other", then this field should be the specific domain of the person's business or organization
                    - phone: The primary phone number
                    - other_phone: Any secondary phone number
                    - fax: Fax number if available
                    - email: Email address
                    - website: Website or LinkedIn URL
                    - street_address: Street address
                    - city: City
                    - state: State
                    - country_code: Country Code (2 letter ISO code in uppercase)
                    - social_media: Dictionary of social media platforms to their handles
                    - bio: Biography of the person
                    - additional_info: Dictionary of any other information on the card
                    
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

        social_media = data.get("social_media")
        if social_media:
            if isinstance(social_media, dict):
                data["social_media"] = social_media
            else:
                data["social_media"] = {"other": social_media}
        else:
            data["social_media"] = {}

        additional_info = data.get("additional_info")
        if additional_info:
            if isinstance(additional_info, dict):
                data["additional_info"] = additional_info
            else:
                data["additional_info"] = {"other": additional_info}
        else:
            data["additional_info"] = {}

        # Create and return the BusinessCardExtraction object
        return BusinessCardExtraction(
            honorific_title=data.get("honorific_title"),
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            title=data.get("title"),
            company=data.get("company"),
            primary_domain=data.get("primary_domain"),
            primary_domain_other=data.get("primary_domain_other"),
            phone=data.get("phone"),
            other_phone=data.get("other_phone"),
            fax=data.get("fax"),
            email=data.get("email"),
            website=data.get("website"),
            street_address=data.get("street_address"),
            city=data.get("city"),
            state=data.get("state"),
            country_code=data.get("country_code"),
            social_media=data.get("social_media"),
            bio=data.get("bio"),
            additional_info=data.get("additional_info"),
        )
    
    except Exception as e:
        logger.error(f"Error extracting business card information: {str(e)}")
        raise BusinessCardExtractionError(f"Failed to extract business card information: {str(e)}") 