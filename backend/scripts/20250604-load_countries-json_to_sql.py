#!/usr/bin/env python3
"""
Helper script to convert countries JSON to SQL statements.
Usage: python json_to_sql.py countries.json
"""

import json
import sys

def json_to_sql(json_file):
    """Convert JSON countries data to SQL INSERT statements."""
    try:
        with open(json_file, 'r') as f:
            countries_data = json.load(f)
        
        print("-- Generated SQL statements for countries")
        print("INSERT INTO geo_countries (iso2_code, name, iso3_code, region, sub_region, intermediate_region, country_groups, alt_names, timezones, default_timezone, is_enabled)")
        print("VALUES")
        
        inserts = []
        for idx, country in enumerate(countries_data):
            # Format arrays properly for PostgreSQL
            country_groups = format_array(country.get('country_groups', []))
            alt_names = format_array(country.get('alt_names', []))
            timezones = format_array(country.get('timezones', []))
            
            # Check if this country should be enabled (US and CA are enabled by default)
            is_enabled = "true" if country.get('iso2_code') in ['US', 'CA'] else "false"
            
            # Build the SQL value tuple
            sql_value = f"('{country.get('iso2_code', '')}', '{escape_sql(country.get('name', ''))}', " \
                      f"'{country.get('iso3_code', '')}', '{escape_sql(country.get('region', ''))}', " \
                      f"'{escape_sql(country.get('sub_region', ''))}', {null_or_str(country.get('intermediate_region'))}, " \
                      f"{country_groups}, {alt_names}, {timezones}, {null_or_str(country.get('default_timezone'))}, {is_enabled})"
            
            # Add comma for all but the last entry
            if idx < len(countries_data) - 1:
                sql_value += ","
            
            inserts.append(sql_value)
        
        # Print values with proper indentation
        print('\n'.join(inserts) + ";")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

def format_array(arr):
    """Format a Python list as a PostgreSQL array string."""
    if not arr:
        return "ARRAY[]::VARCHAR[]"
    
    # Escape single quotes in array elements
    escaped_elements = [escape_sql(str(item)) for item in arr]
    array_str = "ARRAY[" + ", ".join(f"'{elem}'" for elem in escaped_elements) + "]::VARCHAR[]"
    return array_str

def escape_sql(text):
    """Escape single quotes for SQL."""
    if text is None:
        return ""
    return str(text).replace("'", "''")

def null_or_str(value):
    """Return 'null' if the value is None, otherwise return the escaped string value."""
    if value is None:
        return "null"
    return f"'{escape_sql(value)}'"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python json_to_sql.py <json_file>", file=sys.stderr)
        sys.exit(1)
    
    json_to_sql(sys.argv[1]) 
    