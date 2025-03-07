#!/usr/bin/env python
"""
Test script for SendGrid integration.
This script verifies the SendGrid API connection and sends a test email.
"""

import os
import sys
import argparse
from dotenv import load_dotenv
from email_notifications import test_sendgrid_connection, _send_email_sync

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Test SendGrid integration')
    parser.add_argument('--test-email', type=str, help='Email address to send a test email to')
    parser.add_argument('--env-file', type=str, default='.env', 
                        help='Path to .env file containing SENDGRID_API_KEY and FROM_EMAIL')
    args = parser.parse_args()
    
    # Load environment variables
    if os.path.exists(args.env_file):
        print(f"Loading environment from {args.env_file}")
        load_dotenv(args.env_file)
    else:
        print(f"Warning: Environment file {args.env_file} not found")
    
    # Test SendGrid connection
    print("Testing SendGrid API connection...")
    success, message = test_sendgrid_connection()
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")
        if not args.test_email:
            print("Exiting. Use --test-email to try sending an email anyway.")
            return 1
    
    # Send test email if requested
    if args.test_email:
        print(f"Sending test email to {args.test_email}...")
        try:
            _send_email_sync(
                to_email=args.test_email,
                subject="AOLF GSEC - SendGrid Test Email",
                content="""
                <h1>SendGrid Test Successful</h1>
                <p>This is a test email from the AOLF GSEC application to verify SendGrid integration.</p>
                <p>If you're receiving this, the email configuration is working correctly.</p>
                """
            )
            print("✅ Test email sent successfully!")
        except Exception as e:
            print(f"❌ Failed to send test email: {str(e)}")
            return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 