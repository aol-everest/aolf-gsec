#!/usr/bin/env python3
"""
Helper script to convert subdivision CSV to SQL statements.
Usage: python load_subdivisions_csv_to_sql.py subdivisions.csv
"""

import csv
import sys
import re
from datetime import datetime

def trim_value(value):
    """Thoroughly trim a value by removing quotes, whitespace, and normalizing spaces."""
    if not value:
        return ""
    
    # Convert to string and strip outer quotes and whitespace
    cleaned = str(value).strip('"').strip("'").strip()
    
    # Replace multiple consecutive whitespace with single space
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Final trim
    return cleaned.strip()

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
        
        raw_count = 0
        for row_num, row in enumerate(csv_reader, 1):
            # Skip empty rows
            if not row or len(row) < 4:
                continue
            
            try:
                # Thoroughly trim all values
                country_code = trim_value(row[0])
                subdivision_code = trim_value(row[1])
                name = trim_value(row[2])
                subdivision_type = trim_value(row[3]) if len(row) > 3 else ""
                
                # Validate required data after trimming
                if not all([country_code, subdivision_code, name]):
                    print("Warning: Row {} missing required data after trimming, skipping: {}".format(row_num, row), file=sys.stderr)
                    continue
                
                subdivisions_data.append({
                    'country_code': country_code,
                    'subdivision_code': subdivision_code,
                    'name': name,
                    'subdivision_type': subdivision_type
                })
                raw_count += 1
                
            except Exception as e:
                print("Warning: Error processing row {}: {}".format(row_num, e), file=sys.stderr)
                continue
        
        if not subdivisions_data:
            print("Error: No valid subdivision data found in CSV file", file=sys.stderr)
            sys.exit(1)
        
        # Remove duplicates based on country_code + subdivision_code key (keep first occurrence)
        print("-- Raw records parsed: {}".format(raw_count), file=sys.stderr)
        
        # Use a set to track unique keys (country_code + subdivision_code)
        seen_keys = set()
        unique_subdivisions = []
        duplicate_key_count = 0
        exact_duplicate_count = 0
        
        for subdivision in subdivisions_data:
            # Create key for uniqueness check (country_code + subdivision_code)
            key = (subdivision['country_code'], subdivision['subdivision_code'])
            
            if key not in seen_keys:
                seen_keys.add(key)
                unique_subdivisions.append(subdivision)
            else:
                # Find the existing record with this key to compare
                existing_record = None
                for existing in unique_subdivisions:
                    if (existing['country_code'], existing['subdivision_code']) == key:
                        existing_record = existing
                        break
                
                # Check if it's an exact duplicate or just same key with different data
                if (existing_record and 
                    existing_record['name'] == subdivision['name'] and 
                    existing_record['subdivision_type'] == subdivision['subdivision_type']):
                    exact_duplicate_count += 1
                    print("-- Exact duplicate skipped: {}-{} '{}' [{}]".format(
                        subdivision['country_code'], 
                        subdivision['subdivision_code'],
                        subdivision['name'],
                        subdivision['subdivision_type']
                    ), file=sys.stderr)
                else:
                    duplicate_key_count += 1
                    print("-- Duplicate key (keeping first): {}-{} - Skipping: '{}' [{}] (Kept: '{}' [{}])".format(
                        subdivision['country_code'], 
                        subdivision['subdivision_code'],
                        subdivision['name'],
                        subdivision['subdivision_type'],
                        existing_record['name'] if existing_record else 'N/A',
                        existing_record['subdivision_type'] if existing_record else 'N/A'
                    ), file=sys.stderr)
        
        subdivisions_data = unique_subdivisions
        total_duplicates = exact_duplicate_count + duplicate_key_count
        
        if total_duplicates > 0:
            print("-- Removed {} duplicate records total:".format(total_duplicates), file=sys.stderr)
            print("--   {} exact duplicates (all fields match)".format(exact_duplicate_count), file=sys.stderr)
            print("--   {} key duplicates (same country+subdivision code, different data)".format(duplicate_key_count), file=sys.stderr)
        
        print("-- Unique records after key-based deduplication: {}".format(len(subdivisions_data)), file=sys.stderr)
        
        # Validate for other issues (but skip partial duplicate check since we handle it above)
        validate_subdivision_data(subdivisions_data, skip_partial_duplicate_check=True)
        
        # Generate SQL
        print("-- Generated SQL statements for geo_subdivisions")
        print("-- Generated on: {}".format(datetime.now().isoformat()))
        print("-- Source file: {}".format(csv_file))
        print("-- Raw records: {}".format(raw_count))
        print("-- Total duplicates removed: {} (exact: {}, key: {})".format(total_duplicates, exact_duplicate_count, duplicate_key_count))
        print("-- Final unique records: {}".format(len(subdivisions_data)))
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
        print("-- Summary: {} unique subdivisions to be inserted".format(len(subdivisions_data)))
        
        # Count by subdivision type
        type_counts = {}
        for subdivision in subdivisions_data:
            sub_type = subdivision['subdivision_type']
            type_counts[sub_type] = type_counts.get(sub_type, 0) + 1
        
        print("-- Subdivision types:")
        for sub_type, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
            print("--   '{}': {}".format(sub_type, count))
        
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

def validate_subdivision_data(subdivisions, skip_partial_duplicate_check=False):
    """Validate subdivision data for common issues."""
    issues = []
    
    # Check for partial duplicates (same country_code + subdivision_code but different name/type)
    if not skip_partial_duplicate_check:
        seen_codes = {}
        for subdivision in subdivisions:
            key = (subdivision['country_code'], subdivision['subdivision_code'])
            if key in seen_codes:
                existing = seen_codes[key]
                if existing['name'] != subdivision['name'] or existing['subdivision_type'] != subdivision['subdivision_type']:
                    issues.append("Partial duplicate with different data: {}-{}: '{}' vs '{}'".format(
                        subdivision['country_code'], 
                        subdivision['subdivision_code'],
                        existing['name'] + '|' + existing['subdivision_type'],
                        subdivision['name'] + '|' + subdivision['subdivision_type']
                    ))
            else:
                seen_codes[key] = {
                    'name': subdivision['name'],
                    'subdivision_type': subdivision['subdivision_type']
                }
    
    # Check for unusual patterns
    for subdivision in subdivisions:
        # Check for very long subdivision codes (might indicate data issues)
        if len(subdivision['subdivision_code']) > 10:
            issues.append("Long subdivision code: {}-{}".format(subdivision['country_code'], subdivision['subdivision_code']))
        
        # Check for empty subdivision types (might be OK, but worth noting)
        if not subdivision['subdivision_type']:
            issues.append("Empty subdivision type: {}-{}".format(subdivision['country_code'], subdivision['subdivision_code']))
        
        # Check for very short names (might indicate data issues)
        if len(subdivision['name']) < 2:
            issues.append("Very short subdivision name: {}-{} '{}'".format(
                subdivision['country_code'], 
                subdivision['subdivision_code'],
                subdivision['name']
            ))
    
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