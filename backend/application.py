"""
WSGI entry point for AWS Elastic Beanstalk deployment
"""
from app import app as application

if __name__ == "__main__":
    application.run() 