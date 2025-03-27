#!/usr/bin/env python3
"""
Script to add timezone information to countries.json based on time_zone.csv.
Usage: python add_timezones_to_countries.py
"""

import json
import csv
import os
import sys
from collections import defaultdict

def add_timezones_to_countries():
    """
    Read time_zone.csv and add timezone information to countries.json.
    
    The script:
    1. Reads the time_zone.csv file to extract country-timezone mappings
    2. Reads the existing countries.json file
    3. Adds timezone information to each country
    4. Writes the updated data back to countries.json
    """
    # Define file paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    timezone_csv = os.path.join(base_dir, 'static_data', 'TimeZoneDB.csv', 'time_zone.csv')
    countries_json = os.path.join(base_dir, 'static_data', 'countries.json')
    
    try:
        # Read time_zone.csv to create country code -> timezones mapping
        country_timezones = defaultdict(set)
        
        print(f"Reading timezone data from {timezone_csv}")
        with open(timezone_csv, 'r') as csv_file:
            csv_reader = csv.reader(csv_file)
            for row in csv_reader:
                if len(row) >= 2:
                    timezone_name = row[0]  # e.g. "Africa/Abidjan"
                    country_code = row[1]   # e.g. "CI"
                    country_timezones[country_code].add(timezone_name)
        
        # Read countries.json
        print(f"Reading country data from {countries_json}")
        with open(countries_json, 'r') as json_file:
            countries_data = json.load(json_file)
        
        # Add timezone information to each country
        countries_updated = 0
        for country in countries_data:
            country_code = country.get('iso2_code')
            if country_code in country_timezones:
                timezones = sorted(list(country_timezones[country_code]))
                # Add timezones as a new field
                country['timezones'] = timezones
                
                # Also add a default_timezone field (typically the first alphabetically)
                country['default_timezone'] = timezones[0] if timezones else None
                countries_updated += 1
            else:
                # Set empty fields for countries without timezone data
                country['timezones'] = []
                country['default_timezone'] = None
        
        # Write updated data back to countries.json
        print(f"Writing updated data back to {countries_json}")
        with open(countries_json, 'w') as json_file:
            json.dump(countries_data, json_file, indent=4)
        
        print(f"Successfully updated {countries_updated} countries with timezone information.")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    add_timezones_to_countries() 