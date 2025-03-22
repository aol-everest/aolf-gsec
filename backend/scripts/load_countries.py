#!/usr/bin/env python3
"""
Script to load countries from the JSON file to the database.
Usage: python load_countries.py
"""

import json
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env.dev file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.dev')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"Loaded environment variables from {env_path}")
else:
    print(f"Warning: Environment file {env_path} not found")

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.country import Country
from sqlalchemy.exc import SQLAlchemyError

def load_countries():
    """Load countries from the JSON file to the database."""
    # Path to the countries.json file
    json_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                            'static_data', 'countries.json')
    
    # Read the JSON file
    with open(json_file, 'r') as f:
        countries_data = json.load(f)
    
    # Create a database session
    db = SessionLocal()
    
    try:
        # First, check if countries table already has data
        existing_count = db.query(Country).count()
        if existing_count > 0:
            print(f"Countries table already has {existing_count} records.")
            user_input = input("Do you want to reload all countries? (y/n): ")
            if user_input.lower() != 'y':
                print("Aborting operation.")
                return
            
            # Delete all existing records
            db.query(Country).delete()
            print("Deleted existing country records.")
        
        # Insert countries from the JSON file
        countries = []
        for country_data in countries_data:
            # Extract only the fields we need
            country = Country(
                iso2_code=country_data['iso2_code'],
                name=country_data['name'],
                iso3_code=country_data['iso3_code'],
                region=country_data['region'],
                sub_region=country_data['sub_region'],
                intermediate_region=country_data['intermediate_region'],
                country_groups=country_data['country_groups'] if country_data['country_groups'] else [],
                alt_names=country_data['alt_names'] if country_data['alt_names'] else [],
                is_enabled=True if country_data['iso2_code'] in ['US', 'CA'] else False  # All countries are enabled by default
            )
            countries.append(country)
        
        # Add all countries to the session
        db.add_all(countries)
        
        # Commit the changes
        db.commit()
        print(f"Successfully loaded {len(countries)} countries.")
    
    except SQLAlchemyError as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    load_countries() 