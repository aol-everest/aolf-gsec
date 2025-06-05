#!/usr/bin/env python3
"""
Helper script to convert subdivision CSV to SQL statements.
Usage: python load_subdivisions_csv_to_sql.py subdivisions.csv
"""

import csv
import sys
from datetime import datetime

def csv_to_sql(csv_file):
    """Convert CSV subdivision data to SQL INSERT statements."""
    try:
        subdivisions_data = []
        
        # Try different encodings for the CSV file
        encodings_to_try = ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']
        csv_content = None
        
        for encoding in encodings_to_try:
            try:
                with open(csv_file, 'r', encoding=encoding) as f:
                    csv_content = f.read()
                print("-- Successfully read CSV file with {} encoding".format(encoding), file=sys.stderr)
                break
            except UnicodeDecodeError:
                continue
        
        if csv_content is None:
            print("Error: Could not read CSV file with any supported encoding", file=sys.stderr)
            sys.exit(1)
        
        # Parse CSV content
        import io
        csv_reader = csv.reader(io.StringIO(csv_content))
        
        for row_num, row in enumerate(csv_reader, 1):
            # Skip empty rows
            if not row or len(row) < 4:
                continue
            
            try:
                country_code = row[0].strip('"').strip()
                subdivision_code = row[1].strip('"').strip()
                name = row[2].strip('"').strip()
                subdivision_type = row[3].strip('"').strip() if len(row) > 3 else ""
                
                # Validate required data
                if not all([country_code, subdivision_code, name]):
                    print("Warning: Row {} missing required data, skipping: {}".format(row_num, row), file=sys.stderr)
                    continue
                
                subdivisions_data.append({
                    'country_code': country_code,
                    'subdivision_code': subdivision_code,
                    'name': name,
                    'subdivision_type': subdivision_type
                })
                
            except Exception as e:
                print("Warning: Error processing row {}: {}".format(row_num, e), file=sys.stderr)
                continue
        
        if not subdivisions_data:
            print("Error: No valid subdivision data found in CSV file", file=sys.stderr)
            sys.exit(1)
        
        # Generate SQL
        print("-- Generated SQL statements for geo_subdivisions")
        print("-- Generated on: {}".format(datetime.now().isoformat()))
        print("-- Source file: {}".format(csv_file))
        print("-- Total records: {}".format(len(subdivisions_data)))
        print()
        
        # Create the INSERT statement
        print("INSERT INTO geo_subdivisions (country_code, subdivision_code, name, subdivision_type, is_enabled, created_at, updated_at)")
        print("VALUES")
        
        inserts = []
        current_time = datetime.now().isoformat()
        
        for idx, subdivision in enumerate(subdivisions_data):
            # Build the SQL value tuple
            sql_value = "('{}', '{}', '{}', '{}', true, '{}', '{}')".format(
                subdivision['country_code'], 
                subdivision['subdivision_code'],
                escape_sql(subdivision['name']), 
                escape_sql(subdivision['subdivision_type']),
                current_time, 
                current_time
            )
            
            # Add comma for all but the last entry
            if idx < len(subdivisions_data) - 1:
                sql_value += ","
            
            inserts.append(sql_value)
        
        # Print values with proper indentation
        for insert in inserts:
            print("  {}".format(insert))
        
        print(";")
        
        # Print summary
        print()
        print("-- Summary: {} subdivisions to be inserted".format(len(subdivisions_data)))
        
        # Count by subdivision type
        type_counts = {}
        for subdivision in subdivisions_data:
            sub_type = subdivision['subdivision_type']
            type_counts[sub_type] = type_counts.get(sub_type, 0) + 1
        
        print("-- Subdivision types:")
        for sub_type, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
            print("--   {}: {}".format(sub_type, count))
        
        # Count by country
        country_counts = {}
        for subdivision in subdivisions_data:
            country = subdivision['country_code']
            country_counts[country] = country_counts.get(country, 0) + 1
        
        print("-- Countries represented: {}".format(len(country_counts)))
        top_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        print("-- Top 10 countries by subdivision count:")
        for country, count in top_countries:
            print("--   {}: {}".format(country, count))
        
    except FileNotFoundError:
        print("Error: CSV file not found: {}".format(csv_file), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print("Error: {}".format(e), file=sys.stderr)
        sys.exit(1)

def escape_sql(text):
    """Escape single quotes for SQL."""
    if text is None:
        return ""
    return str(text).replace("'", "''")

def validate_subdivision_data(subdivisions):
    """Validate subdivision data for common issues."""
    issues = []
    
    # Check for duplicates
    seen = set()
    for subdivision in subdivisions:
        key = (subdivision['country_code'], subdivision['subdivision_code'])
        if key in seen:
            issues.append("Duplicate subdivision: {}".format(key))
        seen.add(key)
    
    # Check for unusual patterns
    for subdivision in subdivisions:
        # Check for very long subdivision codes (might indicate data issues)
        if len(subdivision['subdivision_code']) > 10:
            issues.append("Long subdivision code: {}-{}".format(subdivision['country_code'], subdivision['subdivision_code']))
        
        # Check for empty subdivision types (might be OK, but worth noting)
        if not subdivision['subdivision_type']:
            issues.append("Empty subdivision type: {}-{}".format(subdivision['country_code'], subdivision['subdivision_code']))
    
    if issues:
        print("-- Data validation warnings:", file=sys.stderr)
        for issue in issues[:10]:  # Limit to first 10 issues
            print("--   {}".format(issue), file=sys.stderr)
        if len(issues) > 10:
            print("--   ... and {} more issues".format(len(issues) - 10), file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python load_subdivisions_csv_to_sql.py <csv_file>", file=sys.stderr)
        sys.exit(1)
    
    csv_to_sql(sys.argv[1]) 