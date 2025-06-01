from fastapi import FastAPI, Depends, HTTPException, Security, Request, File, UploadFile, Form, Response, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Callable
from datetime import datetime, timedelta, date
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from jwt.exceptions import InvalidTokenError
from functools import wraps
import json
from config import environment  # Import the centralized environment module
from database import WriteSessionLocal, ReadSessionLocal, write_engine, read_engine
import models
import schemas
from utils.email_notifications import notify_appointment_creation, notify_appointment_update
from utils.s3 import upload_file, get_file, BUCKET_NAME
import io
import tempfile
from utils.business_card import extract_business_card_info, BusinessCardExtractionError
import inspect
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.orm import aliased
from sqlalchemy import or_, text, and_, false, func, asc, desc
import logging
import uuid
from logging.handlers import RotatingFileHandler
import os.path
import contextvars
from utils.calendar_sync import check_and_sync_appointment, check_and_sync_updated_appointment
import base64

# Import our new dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import (
    oauth2_scheme, 
    create_access_token, 
    requires_role, 
    requires_any_role, 
    get_current_user, 
    get_current_user_for_write,
    SECRET_KEY,
    ALGORITHM,
    GOOGLE_CLIENT_ID
)
from middleware.logging import create_logging_middleware, RequestIdFilter, request_id_var
from dependencies.access_control import (
    admin_check_access_to_country,
    admin_check_access_to_location,
    admin_get_country_list_for_access_level,
    admin_get_appointment,
    admin_check_appointment_for_access_level,
    admin_get_dignitary,
    admin_check_dignitary_for_access_level
)

# Import routers
from routers.admin import appointments as admin_appointments
from routers.admin import dignitaries as admin_dignitaries
from routers.admin import stats as admin_stats
from routers.admin import users as admin_users
from routers.admin import locations as admin_locations
from routers.admin import calendar_events as admin_calendar_events
from routers.user import appointments as user_appointments
from routers.user import dignitaries as user_dignitaries
from routers.user import profile as user_profile
from routers.user import locations as user_locations
from routers.user import attachments as user_attachments
from routers import auth, usher, enums, metadata


# Configure logging
logger = logging.getLogger(__name__)
# For AWS Elastic Beanstalk, configure logging to work well with EB's log collection
# Default level is INFO, but can be overridden with environment variables
log_level = os.getenv("LOG_LEVEL", "INFO").upper()

# Add request ID filter
logger.addFilter(RequestIdFilter())

# Create formatter with request ID
log_format = '%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s'
formatter = logging.Formatter(log_format)

# Create handlers
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
log_handlers = [stream_handler]  # Always log to stdout/stderr for EBS to collect

# In production-like environments, also log to a file with rotation
log_file_path = os.getenv("LOG_FILE_PATH", "/var/app/current/logs/app.log")
log_file_enabled = os.getenv("LOG_FILE_ENABLED", "false").lower() == "true"

if log_file_enabled:
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
        
        # Create rotating file handler
        file_handler = RotatingFileHandler(
            log_file_path,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        log_handlers.append(file_handler)
        # Use print instead of logger.info to avoid circular initialization
        print(f"File logging enabled: {log_file_path}")
    except Exception as e:
        print(f"Failed to setup file logging: {str(e)}")

# Configure basic logging for all loggers
logging.basicConfig(
    level=getattr(logging, log_level),
    handlers=log_handlers
)

# Now that logging is fully configured, use the logger
logger.info(f"Application starting with log level: {log_level}")
if log_file_enabled:
    logger.info(f"Log files will be saved to: {log_file_path}")



# MOVED: Database table creation to the startup event
# models.Base.metadata.create_all(bind=write_engine)

app = FastAPI(
    title="AOLF GSEC API",
    description="API for AOLF GSEC Application",
    version="1.0.0",
    openapi_tags=[
        {
            "name": "auth",
            "description": "Authentication operations"
        },
        {
            "name": "appointments",
            "description": "Appointment management operations"
        },
        {
            "name": "dignitaries",
            "description": "Dignitary management operations"
        },
        {
            "name": "users",
            "description": "User management operations"
        }
    ]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://aolf-gsec-uat.appspot.com",
        "https://d2wxu2rjtgc6ou.cloudfront.net",
        "https://aolfgsecuat.aolf.app",
        "https://d1ol7e67owy62w.cloudfront.net",
        "https://meetgurudev.aolf.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add request logging middleware
app.middleware("http")(create_logging_middleware())

# Include routers
app.include_router(admin_appointments.router, prefix="/admin/appointments", tags=["admin"])
app.include_router(admin_dignitaries.router, prefix="/admin/dignitaries", tags=["admin"])
app.include_router(admin_stats.router, prefix="/admin/stats", tags=["admin"])
app.include_router(admin_users.router, prefix="/admin/users", tags=["admin"])
app.include_router(admin_locations.router, prefix="/admin/locations", tags=["admin"])
app.include_router(admin_calendar_events.router, prefix="/admin/calendar-events", tags=["admin"])
app.include_router(user_appointments.router, tags=["user"])
app.include_router(user_dignitaries.router, tags=["user"])
app.include_router(user_profile.router, tags=["user"])
app.include_router(user_locations.router, tags=["user"])
app.include_router(user_attachments.router, tags=["user"])
app.include_router(auth.router, tags=["auth"])
app.include_router(usher.router, prefix="/usher", tags=["usher"])
app.include_router(enums.router, tags=["enums"])
app.include_router(metadata.router, tags=["metadata"])

# ------------------------------------------------------------------------------------------------------------------------------------------------------
# Generic endpoints
# ------------------------------------------------------------------------------------------------------------------------------------------------------

# Configure app-wide exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Get request ID for correlation
    request_id = request_id_var.get()
    
    # Log the exception with traceback for server errors
    logger.error(
        f"Unhandled exception for request {request.method} {request.url.path}: {str(exc)}",
        exc_info=True
    )
    
    # Customize response based on exception type
    if isinstance(exc, HTTPException):
        # For HTTP exceptions, return as is (these are expected)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    
    # For other exceptions, return a generic 500 error
    error_id = uuid.uuid4()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "error_id": str(error_id),
            "request_id": request_id
        }
    )

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint for AWS Elastic Beanstalk.
    Returns a 200 OK status if the application is running correctly.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": app.version,
    }

# Add startup and shutdown event handlers
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup complete")
    # Log important configuration information
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'dev')}")
    
    # Create database tables on startup
    try:
        logger.info("Creating database tables if they don't exist")
        models.Base.metadata.create_all(bind=write_engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
    
    # Check database connection on startup using a raw connection
    # instead of a session to avoid concurrent operations
    try:
        with write_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed on startup: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")
