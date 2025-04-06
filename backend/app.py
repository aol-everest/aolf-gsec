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

# Create a context variable to store request IDs
request_id_var = contextvars.ContextVar('request_id', default='')

# Custom log formatter that includes request ID when available
class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get() or ''
        return True

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

# Get environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:  
    raise ValueError("JWT_SECRET_KEY is not set")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise ValueError("GOOGLE_CLIENT_ID is not set")

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

# OAuth2 scheme for JWT
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    
    # Generate a request ID for tracking
    request_id = str(uuid.uuid4())
    # Store in context variable for logging
    token = request_id_var.set(request_id)
    
    # Log the request
    logger.debug(f"Request started: {request.method} {request.url.path}")
    
    # Process the request
    try:
        response = await call_next(request)
        process_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Log the response
        logger.debug(
            f"Request completed: {request.method} {request.url.path} "
            f"- Status: {response.status_code} - Time: {process_time:.2f}ms"
        )
        
        # Add custom header with processing time
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        response.headers["X-Request-ID"] = request_id
        
        return response
    except Exception as e:
        logger.error(f"Request failed: {request.method} {request.url.path} - Error: {str(e)}")
        raise
    finally:
        # Reset the context variable
        request_id_var.reset(token)

# Dependency to get database session for write operations
def get_db():
    db = WriteSessionLocal()
    try:
        logger.debug("Write database session created")
        yield db
    finally:
        logger.debug("Write database session closed")
        db.close()

# Dependency to get database session for read-only operations
def get_read_db():
    db = ReadSessionLocal()
    try:
        logger.debug("Read database session created")
        yield db
    finally:
        logger.debug("Read database session closed")
        db.close()

# For compatibility with existing code
SessionLocal = WriteSessionLocal
engine = write_engine

# Generate JWT token
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Access token created for user: {data.get('sub', 'unknown')}")
    
    return encoded_jwt

# Role-based access control decorator
def requires_role(required_role: models.UserRole):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get the current user from the kwargs
            current_user = kwargs.get("current_user")
            if not current_user:
                # Try to get it from args - usually it would be the second argument after 'request'
                for arg in args:
                    if isinstance(arg, models.User):
                        current_user = arg
                        break
            
            if not current_user:
                logger.warning("User not found in request for role-protected endpoint")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check if the user has the required role
            if current_user.role != required_role and current_user.role != models.UserRole.ADMIN:
                logger.warning(f"User {current_user.email} with role {current_user.role} attempted to access {func.__name__} requiring role {required_role}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Not authorized. Required role: {required_role}",
                )
            
            logger.debug(f"User {current_user.email} with role {current_user.role} authorized for {func.__name__}")
            return await func(*args, **kwargs)
        # Preserve the original function signature for dependency injection
        wrapper.__signature__ = inspect.signature(func)
        return wrapper
    return decorator

def requires_any_role(required_roles: List[models.UserRole]):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get the current user from the kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            
            if current_user.role not in required_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough privileges"
                )
            
            return await func(*args, **kwargs)
        # Preserve the original function signature for dependency injection
        wrapper.__signature__ = inspect.signature(func)
        return wrapper
    return decorator

# Dependency to get current user from token
async def get_current_user(
    db: Session = Depends(get_read_db),
    token: str = Security(oauth2_scheme),
) -> models.User:
    """
    Get the current authenticated user using the read-only database session.
    
    Use this function when:
    - You only need to read user data without modifying it
    - The User object won't be associated with other database entities in write operations
    - You're performing read-only operations (GET endpoints)
    
    For write operations where the user object might be linked to other entities,
    use get_current_user_for_write instead to avoid SQLAlchemy session conflicts.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_expired_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token has expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        logger.debug("Attempting to decode JWT token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token payload missing 'sub' claim")
            raise credentials_exception
            
        # Check token expiration
        exp = payload.get("exp")
        if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
            logger.warning(f"Token expired for user {email}")
            raise token_expired_exception
            
        logger.debug(f"Token decoded successfully for user {email}")
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired signature")
        raise token_expired_exception
    except InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {str(e)}")
        raise credentials_exception
        
    # Look up the user in the database
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            logger.warning(f"No user found with email {email}")
            raise credentials_exception
            
        logger.debug(f"User {email} authenticated successfully")
        return user
    except Exception as e:
        logger.error(f"Database error during user authentication: {str(e)}")
        raise credentials_exception

async def get_current_user_for_write(
    db: Session = Depends(get_db),
    token: str = Security(oauth2_scheme),
) -> models.User:
    """
    Get the current authenticated user using the write database session.
    
    Use this function when:
    - You need to perform write operations where the User object will be associated
      with other database entities (e.g., as a foreign key relationship)
    - You're using the user in POST, PUT, PATCH, or DELETE operations
    - You need to assign the user to another object's relationship
    
    This prevents SQLAlchemy "Object already attached to session" errors that occur
    when an object from one session is used in operations with another session.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_expired_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token has expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        logger.debug("Attempting to decode JWT token for write operation")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token payload missing 'sub' claim")
            raise credentials_exception
            
        # Check token expiration
        exp = payload.get("exp")
        if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
            logger.warning(f"Token expired for user {email}")
            raise token_expired_exception
            
        logger.debug(f"Token decoded successfully for user {email}")
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired signature")
        raise token_expired_exception
    except InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {str(e)}")
        raise credentials_exception
        
    # Look up the user in the database
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            logger.warning(f"No user found with email {email}")
            raise credentials_exception
            
        logger.debug(f"User {email} authenticated successfully")
        return user
    except Exception as e:
        logger.error(f"Database error during user authentication: {str(e)}")
        raise credentials_exception

@app.post("/verify-google-token", response_model=schemas.Token)
async def verify_google_token(
    token: schemas.GoogleToken,
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Received token for verification: {token.token[:20]}...{token.token[-10:] if len(token.token) > 30 else ''}")
        logger.debug(f"Using Google Client ID: {GOOGLE_CLIENT_ID[:10]}...")
        
        # Verify the token with Google
        logger.debug("Sending token to Google for verification")
        idinfo = id_token.verify_oauth2_token(
            token.token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Log token verification success and basic info
        logger.debug(f"Token verified successfully with Google for email: {idinfo.get('email')}")
        
        if 'email' not in idinfo:
            logger.warning("Verified token missing email claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing email"
            )
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == idinfo['email']).first()
        logger.debug(f"Found user: {user}")
        
        if not user:
            logger.info(f"Creating new user with email: {idinfo['email']}")
            # Create new user
            user = models.User(
                google_id=idinfo['sub'],
                email=idinfo['email'],
                first_name=idinfo.get('given_name', ''),
                last_name=idinfo.get('family_name', ''),
                picture=idinfo.get('picture', ''),
                last_login_at=datetime.utcnow(),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"New user created: ID={user.id}, Email={user.email}, Role={user.role}")
        else:
            logger.debug(f"Existing user found: ID={user.id}, Email={user.email}, Role={user.role}")
            # Update user first name, last name, and picture if they exist
            user.first_name = idinfo.get('given_name', user.first_name)
            user.last_name = idinfo.get('family_name', user.last_name)
            user.picture = idinfo.get('picture', user.picture)
            user.last_login_at = datetime.utcnow()
            # Update google_id if it's not set (for pre-defined users)
            if not user.google_id:
                user.google_id = idinfo.get('sub')
                logger.info(f"Updated google_id for existing user: {user.email}")
            db.commit()
            db.refresh(user)
        
        # Generate JWT token
        access_token = create_access_token(data={"sub": user.email})
        logger.debug(f"Generated access token: {access_token[:50]}...")
        
        logger.info(f"User logged in successfully: {user.email}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "user": user,
            "role": user.role,
        }
        
    except Exception as e:
        logger.error(f"Error verifying Google token: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

@app.post("/appointments/new", response_model=schemas.Appointment)
async def create_appointment(
    appointment: schemas.AppointmentCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    start_time = datetime.utcnow()
    logger.info(f"Creating new appointment for user {current_user.email} (ID: {current_user.id})")
    logger.debug(f"Appointment data: {appointment.dict()}")
    
    try:
        # Log timing for database operations
        db_start_time = datetime.utcnow()
        
        # Create appointment
        db_appointment = models.Appointment(
            requester_id=current_user.id,
            created_by=current_user.id,
            status=models.AppointmentStatus.PENDING,
            purpose=appointment.purpose,
            preferred_date=appointment.preferred_date,
            preferred_time_of_day=appointment.preferred_time_of_day,
            requester_notes_to_secretariat=appointment.requester_notes_to_secretariat,
            location_id=appointment.location_id,
        )
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        
        # Calculate DB operation time
        db_time = (datetime.utcnow() - db_start_time).total_seconds() * 1000
        logger.debug(f"Database operation for creating appointment took {db_time:.2f}ms")

        # Associate dignitaries with the appointment
        dignitary_start_time = datetime.utcnow()
        dignitary_count = 0
        
        for dignitary_id in appointment.dignitary_ids:
            appointment_dignitary = models.AppointmentDignitary(
                appointment_id=db_appointment.id,
                dignitary_id=dignitary_id
            )
            db.add(appointment_dignitary)
            dignitary_count += 1
            
        db.commit()
        
        # Calculate dignitary association time
        dignitary_time = (datetime.utcnow() - dignitary_start_time).total_seconds() * 1000
        logger.debug(f"Associated {dignitary_count} dignitaries with appointment in {dignitary_time:.2f}ms")

        # Send email notifications
        notification_start_time = datetime.utcnow()
        try:
            notify_appointment_creation(db, db_appointment)
            notification_time = (datetime.utcnow() - notification_start_time).total_seconds() * 1000
            logger.debug(f"Email notifications sent in {notification_time:.2f}ms")
        except Exception as e:
            logger.error(f"Error sending email notifications: {str(e)}", exc_info=True)

        # Sync appointment to Google Calendar if it meets criteria
        try:
            await check_and_sync_appointment(db_appointment, db)
            logger.debug(f"Appointment conditionally processed for Google Calendar sync")
        except Exception as e:
            logger.error(f"Error processing appointment for Google Calendar sync: {str(e)}", exc_info=True)

        # Calculate total operation time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Appointment created successfully (ID: {db_appointment.id}) in {total_time:.2f}ms")
        
        return db_appointment
    except Exception as e:
        logger.error(f"Error creating appointment: {str(e)}", exc_info=True)
        # Log the full exception traceback in debug mode
        logger.debug(f"Exception details:", exc_info=True)
        raise


@app.post("/dignitaries/new", response_model=schemas.Dignitary)
async def new_dignitary(
    dignitary: schemas.DignitaryCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    # Extract poc_relationship_type and create dignitary without it
    poc_relationship_type = dignitary.poc_relationship_type
    dignitary_data = dignitary.dict(exclude={'poc_relationship_type'})
    
    # Create new dignitary
    new_dignitary = models.Dignitary(
        **dignitary_data,
        created_by=current_user.id
    )
    db.add(new_dignitary)
    db.commit()
    db.refresh(new_dignitary)

    # Create dignitary point of contact with the relationship type
    poc = models.DignitaryPointOfContact(
        dignitary_id=new_dignitary.id,
        poc_id=current_user.id,
        relationship_type=poc_relationship_type,
        created_by=current_user.id
    ) 
    db.add(poc)
    db.commit()
    db.refresh(poc)

    return new_dignitary


@app.patch("/dignitaries/update/{dignitary_id}", response_model=schemas.Dignitary)
async def update_dignitary(
    dignitary_id: int,
    dignitary: schemas.DignitaryUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    # Log the incoming request data
    logger.info(f"Updating dignitary {dignitary_id} with data: {dignitary.dict()}")
    
    # Check if dignitary exists
    existing_dignitary = db.query(models.Dignitary).filter(models.Dignitary.id == dignitary_id).first()
    if not existing_dignitary:
        logger.error(f"Dignitary with ID {dignitary_id} not found")
        raise HTTPException(status_code=404, detail="Dignitary not found")
    
    # Extract poc_relationship_type and create dignitary without it
    poc_relationship_type = dignitary.poc_relationship_type
    try:
        dignitary_data = dignitary.dict(exclude={'poc_relationship_type'}, exclude_unset=True)
        logger.debug(f"Processed dignitary data for update: {dignitary_data}")
    except Exception as e:
        logger.error(f"Error processing dignitary data: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Error processing dignitary data: {str(e)}")

    # Update dignitary  
    try:
        for key, value in dignitary_data.items():
            setattr(existing_dignitary, key, value)
        db.commit()
        db.refresh(existing_dignitary)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating dignitary: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Error updating dignitary: {str(e)}")

    # Update POC relationship
    try:
        poc = db.query(models.DignitaryPointOfContact).filter(
            models.DignitaryPointOfContact.dignitary_id == dignitary_id, 
            models.DignitaryPointOfContact.poc_id == current_user.id
        ).first()
        if poc and poc_relationship_type and poc_relationship_type != poc.relationship_type:
            logger.info(f"Updating POC relationship type from {poc.relationship_type} to {poc_relationship_type}")
            poc.relationship_type = poc_relationship_type
            db.commit()
            db.refresh(poc)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating POC relationship: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Error updating POC relationship: {str(e)}")

    logger.info(f"Successfully updated dignitary {dignitary_id}")
    return existing_dignitary


@app.get("/dignitaries/assigned", response_model=List[schemas.DignitaryWithRelationship])
async def get_assigned_dignitaries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all dignitaries assigned to the current user as POC with their relationship type"""
    # Query dignitaries and their relationship types in one go
    results = (
        db.query(
            models.Dignitary, 
            models.DignitaryPointOfContact.relationship_type
        )
        .join(models.DignitaryPointOfContact)
        .filter(models.DignitaryPointOfContact.poc_id == current_user.id)
        .all()
    )
    
    # Transform the results to include the relationship type
    dignitaries_with_relationship = []
    for dignitary, relationship_type in results:
        # Add the relationship_type attribute to the dignitary object
        # This will be picked up by Pydantic's ORM mode
        setattr(dignitary, 'relationship_type', relationship_type.value)
        dignitaries_with_relationship.append(dignitary)
    
    return dignitaries_with_relationship


@app.patch("/users/me/update", response_model=schemas.User)
async def update_user(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    logger.info(f"Received user update: {user_update.dict()}")
    """Update current user's information"""
    # Fetch the user in the current write session
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Apply updates to the user fetched in the current session
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

@app.get("/users/me", response_model=schemas.User)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get current user's information"""
    return current_user

@app.get("/appointments/my", response_model=List[schemas.Appointment])
async def get_my_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all appointments requested by the current user"""
    query = db.query(models.Appointment).filter(
        models.Appointment.requester_id == current_user.id
    ).order_by(models.Appointment.id.asc())
    
    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    )

    appointments = query.all()

    logger.debug(f"Appointments: {appointments}")
    return appointments 

@app.get("/appointments/my/{dignitary_id}", response_model=List[schemas.Appointment])
async def get_my_appointments_for_dignitary(
    dignitary_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all appointments for a specific dignitary"""
    appointments = (
        db.query(models.Appointment)
        .join(models.AppointmentDignitary)
        .filter(
            models.AppointmentDignitary.dignitary_id == dignitary_id,
            models.Appointment.requester_id == current_user.id
        )
        .options(
            joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary)
        )
        .all()
    )
    logger.debug(f"Appointments: {appointments}")
    return appointments


@app.get("/locations/all", response_model=List[schemas.Location])
async def get_locations_for_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all locations - accessible by all users"""
    locations = db.query(models.Location).all()
    return locations

@app.get("/locations/{location_id}", response_model=schemas.Location)
async def get_location_for_user(
    location_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific location - accessible by all users"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@app.post("/appointments/{appointment_id}/attachments", response_model=schemas.AppointmentAttachment)
async def upload_appointment_attachment(
    appointment_id: int,
    file: UploadFile = File(...),
    attachment_type: str = Form(models.AttachmentType.GENERAL),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload an attachment for an appointment"""
    # Check if appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to upload attachments for this appointment")

    # Upload file to S3
    file_content = await file.read()
    upload_result = upload_file(
        file_data=file_content,
        file_name=f"{appointment_id}/{file.filename}",
        content_type=file.content_type,
        entity_type="appointments"
    )

    # Create attachment record
    attachment = models.AppointmentAttachment(
        appointment_id=appointment_id,
        file_name=file.filename,
        file_path=upload_result['s3_path'],
        file_type=file.content_type,
        is_image=upload_result.get('is_image', False),
        thumbnail_path=upload_result.get('thumbnail_path'),
        uploaded_by=current_user.id,
        attachment_type=attachment_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment

@app.post("/appointments/{appointment_id}/attachments/business-card", response_model=schemas.AppointmentBusinessCardExtractionResponse)
async def upload_business_card_attachment(
    appointment_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload a business card attachment and extract information from it"""
    # Check if appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to upload attachments for this appointment")

    # Upload file to S3
    file_content = await file.read()
    upload_result = upload_file(
        file_data=file_content,
        file_name=f"{appointment_id}/{file.filename}",
        content_type=file.content_type,
        entity_type="appointments"
    )

    # Create attachment record
    attachment = models.AppointmentAttachment(
        appointment_id=appointment_id,
        file_name=file.filename,
        file_path=upload_result['s3_path'],
        file_type=file.content_type,
        is_image=upload_result.get('is_image', False),
        thumbnail_path=upload_result.get('thumbnail_path'),
        uploaded_by=current_user.id,
        attachment_type=models.AttachmentType.BUSINESS_CARD
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    # Check if business card extraction is enabled
    enable_extraction = os.environ.get("ENABLE_BUSINESS_CARD_EXTRACTION", "true").lower() == "true"
    
    if not enable_extraction:
        # If extraction is disabled, return a response with empty extraction data
        return schemas.AppointmentBusinessCardExtractionResponse(
            extraction=schemas.BusinessCardExtraction(
                first_name="",
                last_name="",
                title=None,
                company=None,
                phone=None,
                email=None,
                website=None,
                address=None
            ),
            attachment_id=attachment.id,
            appointment_id=appointment_id
        )

    # Extract business card information
    try:
        # Save the file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file_path = temp_file.name
            # Reset file position
            await file.seek(0)
            # Write content to temp file
            temp_file.write(await file.read())
        
        # Extract information from the business card
        extraction_result = extract_business_card_info(temp_file_path)
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        # Return the extraction result
        return schemas.AppointmentBusinessCardExtractionResponse(
            extraction=extraction_result,
            attachment_id=attachment.id,
            appointment_id=appointment_id
        )
    except BusinessCardExtractionError as e:
        # If extraction fails, still keep the attachment but return an error
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        # For any other error, return a 500 error
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.post("/appointments/{appointment_id}/business-card/create-dignitary", response_model=schemas.Dignitary)
async def create_dignitary_from_business_card(
    appointment_id: int,
    extraction: schemas.BusinessCardExtraction,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a dignitary record from business card extraction"""
    # Check if appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to create dignitaries for this appointment")

    # Get the attachment if provided
    attachment = None
    if extraction.attachment_id:
        attachment = db.query(models.AppointmentAttachment).filter(
            models.AppointmentAttachment.id == extraction.attachment_id,
            models.AppointmentAttachment.appointment_id == appointment_id
        ).first()
        
        if not attachment:
            logger.warning(f"Attachment with ID {extraction.attachment_id} not found for appointment {appointment_id}")

    # Create dignitary record
    try:
        # Try to determine honorific title
        honorific_title = None
        for _honorific_title in models.HonorificTitle:
            if extraction.honorific_title and _honorific_title.value.lower() in extraction.honorific_title.lower():
                honorific_title = _honorific_title
                break
        
        # Default to Mr. if no title found
        if not honorific_title:
            honorific_title = models.HonorificTitle.NA
        
        # Determine primary domain
        primary_domain = None
        primary_domain_other = None
        if extraction.primary_domain:
            for _primary_domain in models.PrimaryDomain:
                if _primary_domain.value.lower() in extraction.primary_domain.lower():
                    primary_domain = _primary_domain
                    break
            if not primary_domain:
                primary_domain = models.PrimaryDomain.OTHER
                primary_domain_other = extraction.primary_domain + (f" ({extraction.primary_domain_other})" if extraction.primary_domain_other else "")
        elif extraction.primary_domain_other:
            primary_domain = models.PrimaryDomain.OTHER
            primary_domain_other = extraction.primary_domain_other or ''

      
        # Debug logging
        logger.info(f"Creating dignitary with source={models.DignitarySource.BUSINESS_CARD}")
        logger.info(f"Appointment dignitary country: {appointment.dignitary.country if appointment.dignitary else 'None'}")
        
        # Create dignitary
        dignitary = models.Dignitary(
            honorific_title=honorific_title,
            first_name=extraction.first_name or '',
            last_name=extraction.last_name or '',
            email=extraction.email,
            phone=extraction.phone,
            other_phone=extraction.other_phone,
            fax=extraction.fax,
            title_in_organization=extraction.title,
            organization=extraction.company,
            street_address=extraction.street_address,
            primary_domain=primary_domain,
            primary_domain_other=primary_domain_other,
            bio_summary=(
                f"Bio extracted from business card: {extraction.bio or 'N/A'}"
            ),
            linked_in_or_website=extraction.website,
            country=extraction.country if extraction.country else None,
            state=extraction.state if extraction.state else None,
            city=extraction.city if extraction.city else None,
            has_dignitary_met_gurudev=True,  # Mark as met Gurudev
            gurudev_meeting_date=(appointment.appointment_date if appointment.appointment_date else appointment.preferred_date),  # Use appointment date
            gurudev_meeting_location=appointment.location.name if appointment.location else None,
            gurudev_meeting_notes=f"Met during appointment #{appointment_id}",
            source=models.DignitarySource.BUSINESS_CARD,
            source_appointment_id=appointment_id,
            social_media=extraction.social_media,
            additional_info=extraction.additional_info,
            created_by=current_user.id,
            # Add business card attachment details
            business_card_file_name=attachment.file_name if attachment else None,
            business_card_file_path=attachment.file_path if attachment else None,
            business_card_file_type=attachment.file_type if attachment else None,
            business_card_is_image=attachment.is_image if attachment else None,
            business_card_thumbnail_path=attachment.thumbnail_path if attachment else None,
        )
        db.add(dignitary)
        db.commit()
        db.refresh(dignitary)
        
        return dignitary
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error creating dignitary: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create dignitary: {str(e)}")

@app.get("/appointments/{appointment_id}/attachments", response_model=List[schemas.AppointmentAttachment])
async def get_appointment_attachments(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all attachments for an appointment"""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to view attachments for this appointment")

    # Base query
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.appointment_id == appointment_id
    )
    
    # Add uploaded_by filter only for non-SECRETARIAT users
    if not current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)
    
    attachments = query.all()
    return attachments

@app.get("/appointments/attachments/{attachment_id}")
async def get_attachment_file(
    attachment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific attachment file"""
    # Base query
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.id == attachment_id
    )
    
    # Add uploaded_by filter only for non-SECRETARIAT users
    if current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)
        
    attachment = query.first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == attachment.appointment_id
    ).first()
    
    if appointment.requester_id != current_user.id:
        # Do admin check only if 1st level check fails
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=attachment.appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to access this attachment")

    file_data = get_file(attachment.file_path)
    
    # Use the original filename from the database for the Content-Disposition header
    return StreamingResponse(
        io.BytesIO(file_data['file_data']),
        media_type=file_data['content_type'],
        headers={"Content-Disposition": f"attachment; filename={attachment.file_name}"}
    )


@app.get("/appointments/{appointment_id}/attachments/thumbnails", response_model=List[schemas.AdminAppointmentAttachmentThumbnail])
async def get_appointment_attachment_thumbnails(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all thumbnails for an appointment's attachments in a single request."""
    # First verify the appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check user access (add check similar to get_attachment_thumbnail)
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to view attachments for this appointment")

    # Get all image attachments for this appointment
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.appointment_id == appointment_id,
        models.AppointmentAttachment.is_image == True,
        models.AppointmentAttachment.thumbnail_path != None  # Ensure thumbnail exists
    )

    # Add uploaded_by filter only for non-SECRETARIAT users
    if current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)

    # Execute the query
    attachments = query.all()

    # Prepare the response
    thumbnails = []
    for attachment in attachments:
        try:
            # Get the thumbnail data from S3
            file_data = get_file(attachment.thumbnail_path)
            thumbnail_bytes = file_data['file_data']
            
            # Encode it as base64
            encoded_thumbnail = base64.b64encode(thumbnail_bytes).decode('utf-8')
                
            thumbnails.append({
                "id": attachment.id,
                "thumbnail": encoded_thumbnail
            })
        except Exception as e:
            logger.error(f"Error getting thumbnail for attachment {attachment.id} (path: {attachment.thumbnail_path}): {str(e)}")
            continue

    return thumbnails


@app.get("/appointments/attachments/{attachment_id}/thumbnail")
async def get_attachment_thumbnail(
    attachment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a thumbnail for an image attachment"""
    # Base query
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.id == attachment_id
    )
    
    # Add uploaded_by filter only for non-SECRETARIAT users
    if current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)
        
    attachment = query.first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not attachment.is_image:
        raise HTTPException(status_code=400, detail="Attachment is not an image")
        
    if not attachment.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not available")

    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == attachment.appointment_id
    ).first()
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=attachment.appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to access this attachment")

    file_data = get_file(attachment.thumbnail_path)
    
    # Return the thumbnail without Content-Disposition header to display inline
    return StreamingResponse(
        io.BytesIO(file_data['file_data']),
        media_type=file_data['content_type']
    )


@app.post("/appointments/{appointment_id}/dignitaries", response_model=List[schemas.AppointmentDignitary])
async def add_dignitaries_to_appointment(
    appointment_id: int,
    dignitary_ids: List[int],
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Add dignitaries to an existing appointment"""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    for dignitary_id in dignitary_ids:
        # Check if the association already exists
        existing = (
            db.query(models.AppointmentDignitary)
            .filter(
                models.AppointmentDignitary.appointment_id == appointment_id,
                models.AppointmentDignitary.dignitary_id == dignitary_id
            )
            .first()
        )
        
        if not existing:
            appointment_dignitary = models.AppointmentDignitary(
                appointment_id=appointment_id,
                dignitary_id=dignitary_id
            )
            db.add(appointment_dignitary)

    db.commit()

    # Retrieve the updated list of dignitaries for the appointment
    updated_dignitaries = db.query(models.AppointmentDignitary).filter(models.AppointmentDignitary.appointment_id == appointment_id).all()
    
    return updated_dignitaries

# ------------------------------------------------------------------------------------------------------------------------------------------------------
# Admin endpoint helper functions
# ------------------------------------------------------------------------------------------------------------------------------------------------------

def admin_check_access_to_country(current_user: models.User, db: Session, country_code: str, required_access_level: models.AccessLevel=models.AccessLevel.ADMIN):
    """Check if the current user has access to a specific country"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this country")

    # ADMIN role has full access to create users
    if current_user.role != models.UserRole.ADMIN:
        # Get the allowed access levels for the required access level
        allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

        # For SECRETARIAT, check if they have ADMIN access level
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # For user management, admin access level is required
            models.UserAccess.access_level.in_(allowed_access_levels),
            # Check country permission
            models.UserAccess.country_code == country_code,
            models.UserAccess.location_id == None
        ).first()
        
        if not user_access:
            # If no valid access record with ADMIN level for this country exists, return 403 Forbidden
            raise HTTPException(
                status_code=403, 
                detail=f"You don't have administrator access for country: {country_code}"
            )

    return True


def admin_check_access_to_location(current_user: models.User, db: Session, country_code: str, location_id: int, required_access_level: models.AccessLevel=models.AccessLevel.ADMIN):
    """Check if the current user has access to a specific location"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this location")

    # ADMIN role has full access to create users
    if current_user.role != models.UserRole.ADMIN:
        # Get the allowed access levels for the required access level
        allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

        # For SECRETARIAT, check if they have ADMIN access level
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # For user management, admin access level is required
            models.UserAccess.access_level.in_(allowed_access_levels),
            # Check country permission
            or_(
                models.UserAccess.location_id == location_id,
                and_(
                    models.UserAccess.location_id == None,
                    models.UserAccess.country_code == country_code,
                )
            )
        ).first()
        
        if not user_access:
            # If no valid access record with ADMIN level for this country exists, return 403 Forbidden
            raise HTTPException(
                status_code=403, 
                detail=f"You don't have access to this location"
            )

    return True


def admin_get_country_list_for_access_level(current_user: models.User, db: Session, required_access_level: models.AccessLevel):
    """Get the list of countries for a specific access level"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    # Get the list of access levels that are >= the required access level
    allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

    # Get the list of countries for a specific access level
    user_access = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == current_user.id,
        models.UserAccess.is_active == True,
        models.UserAccess.access_level.in_(allowed_access_levels)
    ).all()

    countries = set(access.country_code for access in user_access)
    return countries


def admin_get_appointment(current_user: models.User, db: Session, appointment_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    """Reusable function to get a specific appointment with access control restrictions"""
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id)
        .options(
            joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
            joinedload(models.Appointment.requester),
            joinedload(models.Appointment.location)
        )
        .first()
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # ADMIN role has full access to all appointments
    if current_user.role != models.UserRole.ADMIN:
        # Get the allowed access levels for the required access level
        allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

        # For SECRETARIAT, enforce access control restrictions
        # Get all active access records for the current user
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # Only consider records that grant access to appointments
            or_(
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT,
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY
            ),
            models.UserAccess.access_level.in_(allowed_access_levels)
        ).all()
        
        if not user_access:
            # If no valid access records exist, return 403 Forbidden
            raise HTTPException(status_code=403, detail="You don't have access to this appointment")
    
        # Check if user has access to this appointment's country/location
        has_access = False
        for access in user_access:
            # Check if user has access to this appointment's country
            if access.country_code == appointment.location.country_code:
                # If location_id is specified in access record, it must match
                if access.location_id is None or access.location_id == appointment.location_id:
                    has_access = True
                    break
        
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    return appointment


def admin_check_appointment_for_access_level(current_user: models.User, db: Session, appointment_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    """Check if the current user has access to a specific appointment"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    appointment = admin_get_appointment(
        current_user=current_user,
        db=db,
        appointment_id=appointment_id,
        required_access_level=required_access_level
    )
    return appointment is not None


def admin_get_dignitary(current_user: models.User, db: Session, dignitary_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    """Reusable function to get a specific dignitary with access control restrictions"""
    # Fail fast if user is not an admin type
    if not current_user.role.is_admin_role_type():
        logger.warning(f"Non-admin user {current_user.email} attempting to access admin dignitary endpoint for ID {dignitary_id}")
        raise HTTPException(status_code=403, detail="You don't have access to view dignitary details")

    # Get the requested dignitary
    dignitary = db.query(models.Dignitary).filter(models.Dignitary.id == dignitary_id).first()
    
    if not dignitary:
        logger.warning(f"Dignitary ID {dignitary_id} not found.")
        raise HTTPException(status_code=404, detail="Dignitary not found")
    
    # ADMIN role has full access
    if current_user.role == models.UserRole.ADMIN:
        logger.debug(f"Admin user {current_user.email} accessing dignitary {dignitary_id}")
        return dignitary
    
    # --- SECRETARIAT Access Control --- 
    logger.debug(f"Checking access for user {current_user.email} to dignitary {dignitary_id} (country: {dignitary.country_code}) requiring level {required_access_level}")
    # Get the allowed access levels based on the required level
    allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()
    logger.debug(f"Allowed access levels: {allowed_access_levels}")
    
    # Get all active access records for the current user related to dignitaries
    user_access_records = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == current_user.id,
        models.UserAccess.is_active == True,
        # Check entity type allows dignitary access
        models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY,
        models.UserAccess.access_level.in_(allowed_access_levels)
    ).all()
    
    if not user_access_records:
        logger.warning(f"Access denied for {current_user.email} to dignitary {dignitary_id}: No matching active access records found.")
        raise HTTPException(status_code=403, detail=f"Access denied. Required level: {required_access_level}")
    
    logger.debug(f"Found {len(user_access_records)} relevant access records for user {current_user.email}")

    has_country_access = False
    has_appointment_access = False

    # Check 1: Direct country access
    has_country_access = any(
        access.country_code == dignitary.country_code and access.location_id is None
        for access in user_access_records
    )
    logger.debug(f"Direct country access check for {dignitary.country_code}: {has_country_access}")
    
    if not has_country_access:
        # Check 2: Access via recent appointments
        # Calculate date threshold for recent appointments (e.g., last 90 days)
        recent_appointment_threshold = datetime.now().date() - timedelta(days=90)
        
        # Create location filters based on user's access permissions (including country-level)
        location_filters = []
        for access in user_access_records:
            if access.location_id is not None:
                # Specific location access
                location_filters.append(models.Appointment.location_id == access.location_id)
            else:
                # Country-level access (applies to all locations in that country)
                # Ensure we only add country filters if the user has APPOINTMENT access for it
                if access.entity_type in [models.EntityType.APPOINTMENT, models.EntityType.APPOINTMENT_AND_DIGNITARY]:
                    location_filters.append(models.Location.country_code == access.country_code)
        
        has_appointment_access = False
        if location_filters: # Only query if there are potential locations the user can access
            appointment_check_query = db.query(models.AppointmentDignitary.dignitary_id)\
                .join(models.Appointment, models.AppointmentDignitary.appointment_id == models.Appointment.id)\
                .join(models.Location, models.Appointment.location_id == models.Location.id)\
                .filter(
                    models.AppointmentDignitary.dignitary_id == dignitary_id,
                    # Check if appointment is recent
                    or_(
                        models.Appointment.preferred_date >= recent_appointment_threshold,
                        models.Appointment.appointment_date >= recent_appointment_threshold
                    ),
                    # Check if user has access to the appointment's location
                    or_(*location_filters)
                ).limit(1) # We only need to know if at least one exists
            
            has_appointment_access = appointment_check_query.first() is not None
            logger.debug(f"Appointment access check: {has_appointment_access} (based on {len(location_filters)} location filters)")
        else:
            logger.debug("Skipping appointment access check as no relevant location filters were found.")

    # Grant access if either condition is met
    if has_country_access or has_appointment_access:
        logger.info(f"Access granted for user {current_user.email} to dignitary {dignitary_id}. Country access: {has_country_access}, Appt access: {has_appointment_access}")
        return dignitary
    
    # If neither access condition is met
    logger.warning(f"Access denied for user {current_user.email} to dignitary {dignitary_id}. Country access: {has_country_access}, Appt access: {has_appointment_access}")
    raise HTTPException(status_code=403, detail="Access denied to this dignitary based on your permissions")


def admin_check_dignitary_for_access_level(current_user: models.User, db: Session, dignitary_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    """Check if the current user has the required access level to a specific dignitary.
    Returns True if access is allowed, False otherwise.
    Logs reasons for denial but doesn't raise HTTPException itself.
    """
    try:
        # Attempt to get the dignitary using the access-controlled function
        admin_get_dignitary(
            current_user=current_user, 
            db=db, 
            dignitary_id=dignitary_id, 
            required_access_level=required_access_level
        )
        # If no HTTPException was raised, access is granted
        return True
    except HTTPException as e:
        # Log the reason for denial (403 or 404)
        logger.info(f"Access check failed for user {current_user.email} on dignitary {dignitary_id} (required: {required_access_level}): {e.status_code} - {e.detail}")
        return False
    except Exception as e:
        # Log unexpected errors during the check
        logger.error(f"Unexpected error during access check for user {current_user.email} on dignitary {dignitary_id}: {str(e)}", exc_info=True)
        return False


# ------------------------------------------------------------------------------------------------------------------------------------------------------
# Admin endpoints
# ------------------------------------------------------------------------------------------------------------------------------------------------------

@app.post("/admin/appointments/new", response_model=schemas.AdminAppointment)
async def create_appointment(
    appointment: schemas.AdminAppointmentCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    start_time = datetime.utcnow()
    logger.info(f"Creating new appointment for user {current_user.email} (ID: {current_user.id})")
    logger.debug(f"Appointment data: {appointment.dict()}")
    
    try:
        # Log timing for database operations
        db_start_time = datetime.utcnow()
        
        # Create appointment
        db_appointment = models.Appointment(
            created_by=current_user.id,
            status=appointment.status,
            sub_status=appointment.sub_status,
            appointment_type=appointment.appointment_type,
            purpose=appointment.purpose,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time,
            location_id=appointment.location_id,
            secretariat_meeting_notes=appointment.secretariat_meeting_notes,
            secretariat_follow_up_actions=appointment.secretariat_follow_up_actions,
            secretariat_notes_to_requester=appointment.secretariat_notes_to_requester,
        )
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        
        # Calculate DB operation time
        db_time = (datetime.utcnow() - db_start_time).total_seconds() * 1000
        logger.debug(f"Database operation for creating appointment took {db_time:.2f}ms")

        # Associate dignitaries with the appointment
        dignitary_start_time = datetime.utcnow()
        dignitary_count = 0
        
        for dignitary_id in appointment.dignitary_ids:
            appointment_dignitary = models.AppointmentDignitary(
                appointment_id=db_appointment.id,
                dignitary_id=dignitary_id
            )
            db.add(appointment_dignitary)
            dignitary_count += 1
            
        db.commit()
        
        # Calculate dignitary association time
        dignitary_time = (datetime.utcnow() - dignitary_start_time).total_seconds() * 1000
        logger.debug(f"Associated {dignitary_count} dignitaries with appointment in {dignitary_time:.2f}ms")

        # Send email notifications
        notification_start_time = datetime.utcnow()
        try:
            notify_appointment_creation(db, db_appointment)
            notification_time = (datetime.utcnow() - notification_start_time).total_seconds() * 1000
            logger.debug(f"Email notifications sent in {notification_time:.2f}ms")
        except Exception as e:
            logger.error(f"Error sending email notifications: {str(e)}", exc_info=True)

        # Sync appointment to Google Calendar if it meets criteria
        try:
            await check_and_sync_appointment(db_appointment, db)
            logger.debug(f"Admin appointment conditionally processed for Google Calendar sync")
        except Exception as e:
            logger.error(f"Error processing admin appointment for Google Calendar sync: {str(e)}", exc_info=True)

        # Calculate total operation time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Appointment created successfully (ID: {db_appointment.id}) in {total_time:.2f}ms")
        
        return db_appointment
    except Exception as e:
        logger.error(f"Error creating appointment: {str(e)}", exc_info=True)
        # Log the full exception traceback in debug mode
        logger.debug(f"Exception details:", exc_info=True)
        raise


@app.patch("/admin/appointments/update/{appointment_id}", response_model=schemas.AdminAppointment)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_appointment(
    appointment_id: int,
    appointment_update: schemas.AdminAppointmentUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update an appointment with access control restrictions"""
    appointment = admin_get_appointment(
        current_user=current_user,
        db=db,
        appointment_id=appointment_id,
        required_access_level=models.AccessLevel.READ_WRITE
    )
    
    # Save old data for notifications
    old_data = {}
    for key, value in appointment_update.dict(exclude_unset=True).items():
        old_data[key] = getattr(appointment, key)
    
    if appointment.status != models.AppointmentStatus.APPROVED and appointment_update.status == models.AppointmentStatus.APPROVED:
        logger.info("Appointment is approved")
        appointment.approved_datetime = datetime.utcnow()
        appointment.approved_by = current_user.id

    # Update appointment with new data
    update_data = appointment_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(appointment, key, value)
    appointment.last_updated_by = current_user.id
    
    db.commit()
    db.refresh(appointment)

    if appointment_update.dignitary_ids:
        for dignitary_id in appointment_update.dignitary_ids:
            appointment_dignitary = models.AppointmentDignitary(
                appointment_id=appointment.id,
                dignitary_id=dignitary_id
            )
            db.add(appointment_dignitary)
            
        db.commit()

    # Send email notifications about the update
    try:
        notify_appointment_update(db, appointment, old_data, update_data)
    except Exception as e:
        logger.error(f"Error sending email notifications: {str(e)}")
    
    # Handle calendar sync based on appointment status changes
    try:
        await check_and_sync_updated_appointment(appointment, old_data, update_data, db)
        logger.debug(f"Appointment status changes processed for calendar sync")
    except Exception as e:
        logger.error(f"Error handling appointment calendar sync based on status changes: {str(e)}")
    
    return appointment


@app.post("/admin/dignitaries/new", response_model=schemas.AdminDignitary)
async def new_dignitary(
    dignitary: schemas.AdminDignitaryCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    # Create new dignitary
    new_dignitary = models.Dignitary(
        **dignitary.dict(),
        created_by=current_user.id
    )
    db.add(new_dignitary)
    db.commit()
    db.refresh(new_dignitary)

    return new_dignitary


@app.get("/admin/dignitaries/all", response_model=List[schemas.AdminDignitary])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_dignitaries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    logger.debug(f"Getting all dignitaries for user {current_user.email}")
    """Get all dignitaries with access control restrictions based on user permissions"""
    # ADMIN role has full access to all dignitaries
    if current_user.role == models.UserRole.ADMIN:
        dignitaries = db.query(models.Dignitary).all()
        return dignitaries
    
    # For SECRETARIAT and other roles, apply access control restrictions
    # Get all active access records for the current user
    user_access = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == current_user.id,
        models.UserAccess.is_active == True,
        # Only consider records that grant access to dignitaries
        models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY,
    ).all()
    
    if not user_access:
        # If no valid access records exist, return empty list
        return []
    
    # Create country filters based on user's access permissions
    country_filters = []
    # Start with a "false" condition that ensures no records are returned if no access is configured
    country_filters.append(false())
    
    # Create location filters based on user's access permissions
    location_filters = []
    
    for access in user_access:
        # If location-specific access exists, add to location filters
        if access.location_id is not None:
            location_filters.append(
                and_(
                    models.Appointment.location_id == access.location_id,
                )
            )
        else:
            # Add country filters for querying dignitaries
            country_filters.append(
                models.Dignitary.country_code == access.country_code
            )

            # Country-level access for appointments
            location_filters.append(
                models.Location.country_code == access.country_code
            )
    
    # Calculate date threshold for recent appointments (30 days ago)
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    
    # Find dignitaries associated with recent appointments the user has access to
    appointment_dignitary_query = db.query(
        models.AppointmentDignitary.dignitary_id
    ).join(
        models.Appointment, 
        models.AppointmentDignitary.appointment_id == models.Appointment.id,
    ).join(
        models.Location,
        models.Appointment.location_id == models.Location.id
    ).filter(
        or_(*location_filters),
        or_(
            models.Appointment.preferred_date >= thirty_days_ago,
            models.Appointment.appointment_date >= thirty_days_ago
        )
    ).distinct()
    
    # Get dignitary IDs from the subquery
    dignitary_ids_from_appointments = [row[0] for row in appointment_dignitary_query.all()]
    logger.debug(f"Dignitary IDs from appointments: {dignitary_ids_from_appointments}")
    
    if not dignitary_ids_from_appointments or len(dignitary_ids_from_appointments) == 0:
        # If there are no appointment-related dignitaries, get and combine all dignitaries from countries the user has access to
        dignitaries = db.query(models.Dignitary).filter(or_(*country_filters)).all()
    else:
        # If there are appointment-related dignitaries, get and combine them
        dignitaries = db.query(models.Dignitary).filter(
            or_(
                # Combine with appointment-related dignitaries
                models.Dignitary.id.in_(dignitary_ids_from_appointments),
                # Apply country filters to get dignitaries from countries the user has access to
                or_(*country_filters)
            )
        ).all()
    
    return dignitaries


@app.get("/admin/dignitaries/{id}", response_model=schemas.AdminDignitaryWithAppointments)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_dignitary(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a dignitary by ID with access control restrictions based on user permissions"""
    # Use the helper function to get the dignitary with READ access check
    dignitary = admin_get_dignitary(
        current_user=current_user,
        db=db,
        dignitary_id=id,
        required_access_level=models.AccessLevel.READ
    )
    return dignitary



@app.patch("/admin/dignitaries/update/{dignitary_id}", response_model=schemas.AdminDignitary)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_admin_dignitary(
    dignitary_id: int,
    dignitary_update: schemas.AdminDignitaryUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update dignitary information (Admin/Secretariat only)"""
    logger.info(f"User {current_user.email} attempting to update dignitary ID {dignitary_id}")
    
    # Use the helper function to get the dignitary and check for WRITE access
    dignitary = admin_get_dignitary(
        current_user=current_user,
        db=db,
        dignitary_id=dignitary_id,
        required_access_level=models.AccessLevel.READ_WRITE 
    )
    
    # NOTE: Not checking access to the new country as it's not a security risk
    # If trying to change country, check access to the new country as well
    # if current_user.role != models.UserRole.ADMIN and dignitary_update.country_code and dignitary_update.country_code != dignitary.country_code:
    #     admin_check_access_to_country(
    #         current_user=current_user,
    #         db=db,
    #         country_code=dignitary_update.country_code, 
    #         required_access_level=models.AccessLevel.READ_WRITE
    #     )
    
    # Update dignitary attributes
    update_data = dignitary_update.dict(exclude_unset=True)
    logger.debug(f"Applying update data for dignitary {dignitary_id}: {update_data}")
    
    # Handle special fields like social_media and additional_info
    if 'social_media' in update_data and isinstance(update_data['social_media'], str):
        try:
            # If it's a string, try to convert it to a dictionary
            if update_data['social_media'].startswith('{') and update_data['social_media'].endswith('}'):
                # Simple string parsing - assuming valid JSON-like format
                entries = update_data['social_media'][1:-1].split(',')
                social_media_dict = {}
                for entry in entries:
                    if ':' in entry:
                        k, v = entry.split(':', 1)
                        # Strip quotes and whitespace
                        k = k.strip().strip('"').strip("'")
                        v = v.strip().strip('"').strip("'")
                        social_media_dict[k] = v
                update_data['social_media'] = social_media_dict
        except Exception as e:
            logger.warning(f"Failed to parse social_media string: {e}", exc_info=True)
            # Keep original string if parsing fails
    
    if 'additional_info' in update_data and isinstance(update_data['additional_info'], str):
        try:
            # If it's a string, try to convert it to a dictionary
            if update_data['additional_info'].startswith('{') and update_data['additional_info'].endswith('}'):
                # Simple string parsing - assuming valid JSON-like format
                entries = update_data['additional_info'][1:-1].split(',')
                additional_info_dict = {}
                for entry in entries:
                    if ':' in entry:
                        k, v = entry.split(':', 1)
                        # Strip quotes and whitespace
                        k = k.strip().strip('"').strip("'")
                        v = v.strip().strip('"').strip("'")
                        additional_info_dict[k] = v
                update_data['additional_info'] = additional_info_dict
        except Exception as e:
            logger.warning(f"Failed to parse additional_info string: {e}", exc_info=True)
            # Keep original string if parsing fails
    
    try:
        for key, value in update_data.items():
            if key in ("id", "created_by", "created_at", "updated_at"):
                logger.debug(f"Skipping protected field: {key}")
                continue
                
            if hasattr(dignitary, key):
                setattr(dignitary, key, value)
            else:
                logger.warning(f"Field {key} not found in Dignitary model, skipping")
        
        # Set the last updated user
        dignitary.updated_by = current_user.id
        dignitary.updated_at = datetime.now()
        
        db.commit()
        db.refresh(dignitary)
        logger.info(f"Dignitary {dignitary_id} updated successfully by user {current_user.email}")
        return dignitary
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating dignitary {dignitary_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update dignitary: {str(e)}")


@app.get("/admin/appointments/stats/summary", response_model=List[schemas.AppointmentStatsByDateAndTimeSlot])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_appointment_time_slots(
    start_date: date,
    end_date: date,
    location_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """
    Get aggregated information about appointment time slots for a date range.
    Returns the count of appointments per date and per time slot, including
    the total number of people (dignitaries) for each time slot.
    """
    # Calculate date range
    date_range = end_date - start_date
    if date_range.days > 90:  # Limit to 90 days to prevent excessive queries
        raise HTTPException(
            status_code=400, 
            detail="Date range cannot exceed 90 days"
        )
    
    # Build query for appointments in the date range
    query = db.query(models.Appointment).filter(
        models.Appointment.appointment_date.between(start_date, end_date),
        or_(
            and_(
                models.Appointment.status == models.AppointmentStatus.APPROVED,
                models.Appointment.sub_status == models.AppointmentSubStatus.SCHEDULED
            ),
            models.Appointment.status == models.AppointmentStatus.COMPLETED,
        ),
    )
    
    # Add location filter if provided
    if location_id:
        query = query.filter(models.Appointment.location_id == location_id)
    
    # Get all appointments in the date range
    appointments = query.all()
    
    # Group appointments by date
    date_to_appointments = {}
    current_date = start_date
    while current_date <= end_date:
        date_to_appointments[current_date] = []
        current_date += timedelta(days=1)
    
    for appointment in appointments:
        if appointment.appointment_date in date_to_appointments:
            date_to_appointments[appointment.appointment_date].append(appointment)
    
    # Build the response
    result = []
    for date_obj, appointments_list in date_to_appointments.items():
        # Group appointments by time slot
        time_slots = {}
        for appointment in appointments_list:
            time_key = appointment.appointment_time
            if time_key not in time_slots:
                time_slots[time_key] = {
                    "appointment_count": 0,
                    "people_count": 0
                }
            
            time_slots[time_key]["appointment_count"] += 1
            # Count dignitaries for this appointment
            dignitary_count = db.query(models.AppointmentDignitary).filter(
                models.AppointmentDignitary.appointment_id == appointment.id
            ).count()
            time_slots[time_key]["people_count"] += dignitary_count
        
        result.append({
            "date": date_obj,
            "total_appointments": len(appointments_list),
            "time_slots": time_slots
        })
    
    return result



@app.get("/admin/appointments/stats/detailed", response_model=schemas.AppointmentTimeSlotDetailsMap)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_appointment_time_slots_combined(
    start_date: date,
    end_date: date,
    location_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """
    Get comprehensive information about appointment time slots in a single call.
    Returns a combined structure with both appointment counts and IDs for each time slot.
    """
    # Calculate date range
    date_range = end_date - start_date
    if date_range.days > 90:  # Limit to 90 days to prevent excessive queries
        raise HTTPException(
            status_code=400, 
            detail="Date range cannot exceed 90 days"
        )
    
    # Build query for appointments in the date range
    query = db.query(models.Appointment).filter(
        models.Appointment.appointment_date.between(start_date, end_date),
        or_(
            and_(
                models.Appointment.status == models.AppointmentStatus.APPROVED,
                models.Appointment.sub_status == models.AppointmentSubStatus.SCHEDULED
            ),
            models.Appointment.status == models.AppointmentStatus.COMPLETED,
        ),
    )
    
    # Add location filter if provided
    if location_id:
        query = query.filter(models.Appointment.location_id == location_id)
    
    # Get all appointments in the date range
    appointments = query.all()
    
    # Initialize the result structure
    result = {}
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.isoformat()
        result[date_str] = {
            "appointment_count": 0,
            "time_slots": {}
        }
        current_date += timedelta(days=1)
    
    # Process each appointment
    for appointment in appointments:
        date_str = appointment.appointment_date.isoformat()
        if date_str in result:
            time_key = appointment.appointment_time
            
            # Increment the total appointment count for this date
            result[date_str]["appointment_count"] += 1
            
            # Initialize the time slot if not already present
            if time_key not in result[date_str]["time_slots"]:
                result[date_str]["time_slots"][time_key] = {}
            
            # Count dignitaries for this appointment
            dignitary_count = db.query(models.AppointmentDignitary).filter(
                models.AppointmentDignitary.appointment_id == appointment.id
            ).count()
            
            # Add the appointment ID with its people count
            result[date_str]["time_slots"][time_key][str(appointment.id)] = dignitary_count
    
    logger.info(f"Result: {result}")

    return {
        "dates": result
    }




@app.get("/admin/appointments/all", response_model=List[schemas.AdminAppointment])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get all appointments with optional status filter, restricted by user's access permissions"""
    query = db.query(models.Appointment).order_by(models.Appointment.id.asc())

    # Apply status filter if provided
    if status:
        query = query.filter(models.Appointment.status.in_(status.split(',')))
    # Apply start and end date filters if provided
    if start_date:
        query = query.filter(or_(models.Appointment.preferred_date >= start_date, models.Appointment.appointment_date >= start_date))
    if end_date:
        query = query.filter(or_(models.Appointment.preferred_date <= end_date, models.Appointment.appointment_date <= end_date))

    # ADMIN role has full access to all appointments
    if current_user.role != models.UserRole.ADMIN:
        # For non-ADMIN users, apply access control restrictions
        # Get all active access records for the current user
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # Only consider records that grant access to appointments
            or_(
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT,
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY
            )
        ).all()
        
        if not user_access:
            # If no valid access records exist, return empty list
            return []
        
        # Create access filters based on country and location
        access_filters = []
        # Start with a "false" condition that ensures no records are returned if no access is configured
        access_filters.append(false())
        for access in user_access:
            # If a specific location is specified in the access record
            if access.location_id:
                access_filters.append(
                    and_(
                        models.Appointment.location_id == access.location_id,
                        models.Location.country_code == access.country_code
                    )
                )
            else:
                # Access to all locations in the country
                access_filters.append(
                    models.Location.country_code == access.country_code
                )
        
        # Join to locations table and apply the country and location filters
        query = query.join(models.Location)
        query = query.filter(or_(*access_filters))

    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    )

    appointments = query.all()
    logger.debug(f"Appointments: {appointments}")
    return appointments

@app.get("/admin/appointments/upcoming", response_model=List[schemas.AdminAppointment])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_upcoming_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None
):
    """Get all upcoming appointments (future appointment_date, not NULL) with access control restrictions"""
    # Start with the filter for upcoming appointments
    upcoming_filter = and_(
        or_(
            models.Appointment.appointment_date == None,
            models.Appointment.appointment_date >= date.today()-timedelta(days=1),
        ),
        models.Appointment.status.notin_([
            models.AppointmentStatus.CANCELLED, 
            models.AppointmentStatus.REJECTED, 
            models.AppointmentStatus.COMPLETED,
        ])
    )
    
    # Base query with upcoming filter
    query = db.query(models.Appointment).filter(upcoming_filter)
    
    # Apply status filter if provided
    if status:
        query = query.filter(models.Appointment.status == status)

    # ADMIN role has full access to all appointments
    if current_user.role != models.UserRole.ADMIN:
        # For non-ADMIN users, apply access control restrictions
        # Get all active access records for the current user
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # Only consider records that grant access to appointments
            or_(
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT,
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY
            )
        ).all()
        
        if not user_access:
            # If no valid access records exist, return empty list
            return []
        
        # Create access filters based on country and location
        access_filters = []
        # Start with a "false" condition that ensures no records are returned if no access is configured
        access_filters.append(false())
        for access in user_access:
            # If a specific location is specified in the access record
            if access.location_id:
                access_filters.append(
                    and_(
                        models.Appointment.location_id == access.location_id,
                        models.Location.country_code == access.country_code
                    )
                )
            else:
                # Access to all locations in the country
                access_filters.append(
                    models.Location.country_code == access.country_code
                )
        
        # Join to locations table and apply the country and location filters
        query = query.join(models.Location)
        query = query.filter(or_(*access_filters))

    # Add sorting
    query = query.order_by(models.Appointment.appointment_date.asc())

    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    )
    
    appointments = query.all()
    logger.debug(f"Upcoming appointments with access control: {len(appointments)}")
    return appointments


@app.get("/admin/appointments/{appointment_id}", response_model=schemas.AdminAppointment)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_appointment(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific appointment with access control restrictions"""
    appointment = admin_get_appointment(
        current_user=current_user,
        db=db,
        appointment_id=appointment_id,
        required_access_level=models.AccessLevel.READ
    )
    return appointment


@app.get("/admin/users/all", response_model=List[schemas.UserAdminView])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all users with creator and updater information via joins, with access control restrictions"""

    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)

    # Query users with joins 
    query = (
        db.query(models.User, CreatorUser, UpdaterUser)
        .outerjoin(CreatorUser, models.User.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.User.updated_by == UpdaterUser.id)
    )

    # ADMIN role has full access to all users
    if current_user.role != models.UserRole.ADMIN:
        # For SECRETARIAT, check if they have ADMIN access level
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # For user management, admin access level is required
            models.UserAccess.access_level == models.AccessLevel.ADMIN,
            models.UserAccess.location_id == None,
        ).all()
        
        if not user_access:
            # If no valid access records with ADMIN level exist, return 403 Forbidden
            raise HTTPException(
                status_code=403, 
                detail="You need administrator access level to view users"
            )
        
        # Create country filters based on access permissions
        countries = set(access.country_code for access in user_access)

        # Add country filter
        query = query.filter(models.User.country_code.in_(countries))

    # Get all users
    users = query.all()
    
    # Process results to set created_by_user and updated_by_user attributes
    result_users = []
    for user, creator, updater in users:
        if creator:
            setattr(user, "created_by_user", creator)
        if updater:
            setattr(user, "updated_by_user", updater)
        result_users.append(user)
    
    return result_users

@app.post("/admin/users/new", response_model=schemas.UserAdminView)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_user(
    user: schemas.UserAdminCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new user with access control restrictions"""
    admin_check_access_to_country(
        current_user=current_user,
        db=db,
        country_code=user.country_code,
        required_access_level=models.AccessLevel.ADMIN
    )
    
    try:
        user_role_enum = models.UserRole(user.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {user.role}")

    if current_user.role != models.UserRole.ADMIN:
        if user_role_enum.is_higher_than_or_equal_to(current_user.role):
            raise HTTPException(status_code=403, detail=f"You do not have permission to create a user with role {user.role}")

    # Create the user
    new_user = models.User(
        **user.dict(),
        created_by=current_user.id,
        updated_by=current_user.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Set creator and updater user references (both are the current user for a new record)
    setattr(new_user, "created_by_user", current_user)
    setattr(new_user, "updated_by_user", current_user)
    
    return new_user

@app.patch("/admin/users/update/{user_id}", response_model=schemas.UserAdminView)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_user(
    user_id: int,
    user_update: schemas.UserAdminUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    admin_check_access_to_country(
        current_user=current_user,
        db=db,
        country_code=user.country_code,
        required_access_level=models.AccessLevel.ADMIN
    )    
        
    if 'role' in user_update.dict(exclude_unset=True) and current_user.role != models.UserRole.ADMIN:
        if user_update.role.is_higher_than_or_equal_to(current_user.role) or user.role.is_higher_than_or_equal_to(current_user.role):
            raise HTTPException(status_code=403, detail="You do not have permission to change this user's role")

    # If trying to change country, check if they have access to the new country as well
    if 'country_code' in user_update.dict(exclude_unset=True):
        new_country = user_update.country_code
        if new_country != user.country_code:
            admin_check_access_to_country(
                current_user=current_user,
                db=db,
                country_code=new_country,
                required_access_level=models.AccessLevel.ADMIN
            )
    
    # Update user with new data
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    user.updated_by = current_user.id
    
    db.commit()
    db.refresh(user)
    
    # Fetch creator and updater information
    if user.created_by:
        creator = db.query(models.User).filter(models.User.id == user.created_by).first()
        if creator:
            setattr(user, "created_by_user", creator)
    
    # For updater, we know it's the current user who just did the update
    setattr(user, "updated_by_user", current_user)
    
    return user

@app.post("/admin/locations/new", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_location(
    location: schemas.LocationAdminCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new location"""
    # Check if the user has access to the country
    admin_check_access_to_country(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        required_access_level=models.AccessLevel.ADMIN
    )

    new_location = models.Location(
        **location.dict(),
        created_by=current_user.id
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    
    # Set creator user reference (it's the current user for a new record)
    setattr(new_location, "created_by_user", current_user)
    
    return new_location

@app.get("/admin/locations/all", response_model=List[schemas.LocationAdmin])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_locations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all locations with creator and updater information"""

    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)
    
    query = (
        db.query(models.Location, CreatorUser, UpdaterUser)
        .outerjoin(CreatorUser, models.Location.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.Location.updated_by == UpdaterUser.id)
    )

    if current_user.role != models.UserRole.ADMIN:
        # Get the list of countries for the current user
        countries = admin_get_country_list_for_access_level(
            current_user=current_user,
            db=db,
            required_access_level=models.AccessLevel.READ
        )
        query = query.filter(models.Location.country_code.in_(countries))

    # Query locations with joins to get creator and updater information in one go
    locations = query.all()
    
    # Process results to set created_by_user and updated_by_user attributes
    result_locations = []
    for location, creator, updater in locations:
        if creator:
            setattr(location, "created_by_user", creator)
        if updater:
            setattr(location, "updated_by_user", updater)
        result_locations.append(location)
    
    return result_locations

@app.get("/admin/locations/{location_id}", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_location(
    location_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific location with creator and updater information"""
    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)

    # Query location with joins to get creator and updater information
    result = (
        db.query(models.Location, CreatorUser, UpdaterUser)
        .filter(models.Location.id == location_id)
        .outerjoin(CreatorUser, models.Location.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.Location.updated_by == UpdaterUser.id)
        .first()
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    location, creator, updater = result
    
    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.READ
    )

    if creator:
        setattr(location, "created_by_user", creator)
    if updater:
        setattr(location, "updated_by_user", updater)
    
    return location

@app.patch("/admin/locations/update/{location_id}", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_location(
    location_id: int,
    location_update: schemas.LocationAdminUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a location"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.ADMIN
    )

    update_data = location_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(location, key, value)
    location.updated_by = current_user.id
    
    db.commit()
    db.refresh(location)
    
    # Fetch creator information
    if location.created_by:
        creator = db.query(models.User).filter(models.User.id == location.created_by).first()
        if creator:
            setattr(location, "created_by_user", creator)
    
    # For updater, we know it's the current user who just did the update
    setattr(location, "updated_by_user", current_user)
    
    return location


@app.post("/admin/locations/{location_id}/attachment", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def upload_location_attachment(
    location_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload an attachment for a location"""
    # Check if location exists
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.ADMIN
    )

    try:
        # Read file content
        file_content = await file.read()
        
        # Upload to S3
        result = upload_file(
            file_data=file_content,
            file_name=f"{location_id}/{file.filename}",
            content_type=file.content_type,
            entity_type="locations"
        )
        
        # Update location with attachment info
        location.attachment_path = result['s3_path']
        location.attachment_name = file.filename
        location.attachment_file_type = file.content_type
        # Store thumbnail path if available
        if 'thumbnail_path' in result:
            location.attachment_thumbnail_path = result['thumbnail_path']
        location.updated_by = current_user.id
        
        db.commit()
        db.refresh(location)
        
        return location
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@app.delete("/admin/locations/{location_id}/attachment", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def remove_location_attachment(
    location_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Remove an attachment from a location"""
    # Retrieve location for the given ID
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.ADMIN
    )

    # Clear attachment fields
    location.attachment_path = None
    location.attachment_name = None
    location.attachment_file_type = None
    location.attachment_thumbnail_path = None
    location.updated_by = current_user.id
    
    db.commit()
    db.refresh(location)
    return location

@app.post("/admin/business-card/upload", response_model=schemas.BusinessCardExtractionResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def upload_business_card_admin(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload a business card and extract information from it (admin/secretariat only)"""
    try:
        # Generate a unique ID for this upload
        upload_uuid = str(uuid.uuid4())
        
        # Upload file to S3
        file_content = await file.read()
        upload_result = upload_file(
            file_data=file_content,
            file_name=f"business_cards/{upload_uuid}/{file.filename}",
            content_type=file.content_type,
            entity_type="dignitaries"
        )

        # Check if business card extraction is enabled
        enable_extraction = os.environ.get("ENABLE_BUSINESS_CARD_EXTRACTION", "true").lower() == "true"
        
        if not enable_extraction:
            # If extraction is disabled, return a response with empty extraction data
            return schemas.BusinessCardExtractionResponse(
                extraction=schemas.BusinessCardExtraction(
                    first_name="",
                    last_name="",
                    title=None,
                    company=None,
                    phone=None,
                    email=None,
                    website=None,
                    address=None
                ),
                attachment_uuid=upload_uuid
            )

        # Extract business card information
        try:
            # Save the file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                temp_file_path = temp_file.name
                # Reset file position
                await file.seek(0)
                # Write content to temp file
                temp_file.write(await file.read())
            
            # Extract information from the business card
            extraction_result = extract_business_card_info(temp_file_path)
            
            # Add file path information
            extraction_result.file_path = upload_result['s3_path']
            extraction_result.file_name = file.filename
            extraction_result.file_type = file.content_type
            extraction_result.is_image = upload_result.get('is_image', False)
            extraction_result.thumbnail_path = upload_result.get('thumbnail_path')
            extraction_result.attachment_uuid = upload_uuid
            
            # Clean up the temporary file
            os.unlink(temp_file_path)
            
            # Return the extraction result
            return schemas.BusinessCardExtractionResponse(
                extraction=extraction_result,
                attachment_uuid=upload_uuid
            )
        except BusinessCardExtractionError as e:
            # If extraction fails, still keep the attachment but return an error
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            # For any other error, return a 500 error
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    except Exception as e:
        logger.error(f"Error uploading business card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading business card: {str(e)}")

@app.post("/admin/business-card/create-dignitary", response_model=schemas.Dignitary)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_dignitary_from_business_card_admin(
    extraction: schemas.BusinessCardExtraction,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a dignitary record from business card extraction (admin/secretariat only)"""
    try:
        # Try to determine honorific title
        honorific_title = None
        for _honorific_title in models.HonorificTitle:
            if extraction.honorific_title and _honorific_title.value.lower() in extraction.honorific_title.lower():
                honorific_title = _honorific_title
                break
        
        # Default to NA if no title found
        if not honorific_title:
            honorific_title = models.HonorificTitle.NA
        
        # Determine primary domain
        primary_domain = None
        primary_domain_other = None
        if extraction.primary_domain:
            for _primary_domain in models.PrimaryDomain:
                if _primary_domain.value.lower() in extraction.primary_domain.lower():
                    primary_domain = _primary_domain
                    break
            if not primary_domain:
                primary_domain = models.PrimaryDomain.OTHER
                primary_domain_other = extraction.primary_domain + (f" ({extraction.primary_domain_other})" if extraction.primary_domain_other else "")
        elif extraction.primary_domain_other:
            primary_domain = models.PrimaryDomain.OTHER
            primary_domain_other = extraction.primary_domain_other or ''
        
        # Create dignitary
        dignitary = models.Dignitary(
            honorific_title=honorific_title,
            first_name=extraction.first_name or '',
            last_name=extraction.last_name or '',
            email=extraction.email,
            phone=extraction.phone,
            other_phone=extraction.other_phone,
            fax=extraction.fax,
            title_in_organization=extraction.title,
            organization=extraction.company,
            street_address=extraction.street_address,
            primary_domain=primary_domain,
            primary_domain_other=primary_domain_other,
            bio_summary=extraction.bio,
            linked_in_or_website=extraction.website,
            country=extraction.country if extraction.country else None,
            state=extraction.state if extraction.state else None,
            city=extraction.city if extraction.city else None,
            source=models.DignitarySource.BUSINESS_CARD,
            social_media=extraction.social_media,
            additional_info=extraction.additional_info,
            created_by=current_user.id,
            # Add business card attachment details
            business_card_file_name=extraction.file_name,
            business_card_file_path=extraction.file_path,
            business_card_file_type=extraction.file_type,
            business_card_is_image=extraction.is_image,
            business_card_thumbnail_path=extraction.thumbnail_path,
            has_dignitary_met_gurudev=extraction.has_dignitary_met_gurudev,
            gurudev_meeting_date=extraction.gurudev_meeting_date,
            gurudev_meeting_location=extraction.gurudev_meeting_location,
            gurudev_meeting_notes=extraction.gurudev_meeting_notes,
            secretariat_notes=extraction.secretariat_notes,
        )
        db.add(dignitary)
        db.commit()
        db.refresh(dignitary)
        
        return dignitary
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating dignitary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create dignitary: {str(e)}")


# ------------------------------------------------------------------------------------------------------------------------------------------------------
# Usher endpoints
# ------------------------------------------------------------------------------------------------------------------------------------------------------

@app.get("/usher/appointments", response_model=List[schemas.AppointmentUsherView])
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_usher_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    date: Optional[str] = None,
):
    """
    Get appointments for USHER role with access control restrictions.
    By default, returns appointments for today and the next two days.
    If date parameter is provided, returns appointments for that specific date.
    """
    # If specific date is provided, use that
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        if target_date < datetime.now().date()-timedelta(days=1) or target_date > datetime.now().date()+timedelta(days=2):
            raise HTTPException(status_code=400, detail="Date beyond allowed range")

        start_date = target_date
        end_date = target_date
    else:
        # Default: today and next two days
        today = datetime.now().date()
        start_date = today
        end_date = today + timedelta(days=2)
   
    # Start building the query with date range filter
    query = db.query(models.Appointment).filter(
        models.Appointment.appointment_date >= start_date,
        models.Appointment.appointment_date <= end_date
    )
    
    # USHER specific filters - apply to all roles using this endpoint
    # Only show confirmed appointments for the usher view
    query = query.filter(
        models.Appointment.status == models.AppointmentStatus.APPROVED,
        models.Appointment.sub_status == models.AppointmentSubStatus.SCHEDULED,
    )
    
    # ADMIN role has full access to all appointments within the date range
    if current_user.role != models.UserRole.ADMIN:
        # Non-ADMIN roles need access control checks
        # Get active access records for the SECRETARIAT user
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # Only consider records that grant access to appointments
            or_(
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT,
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY
            )
        ).all()
        
        if not user_access:
            # If no valid access records exist, return empty list
            return []
        
        # Create access filters based on country and location
        access_filters = []
        # Start with a "false" condition
        access_filters.append(false())
        
        for access in user_access:
            # If a specific location is specified in the access record
            if access.location_id:
                access_filters.append(
                    and_(
                        models.Appointment.location_id == access.location_id,
                        models.Location.country_code == access.country_code
                    )
                )
            else:
                # Access to all locations in the country
                access_filters.append(
                    models.Location.country_code == access.country_code
                )
        
        # Join to locations table and apply the country and location filters
        query = query.join(models.Location)
        query = query.filter(or_(*access_filters))
    
    # Add eager loading and ordering
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    ).order_by(
        models.Appointment.appointment_date,
        models.Appointment.appointment_time
    )
    
    appointments = query.all()
    return appointments


@app.get("/locations/{location_id}/attachment")
async def get_location_attachment(
    location_id: int,
    db: Session = Depends(get_read_db)
):
    """Get a location's attachment - accessible to all users"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if not location.attachment_path or not location.attachment_name:
        raise HTTPException(status_code=404, detail="Location has no attachment")
    
    try:
        file_data = get_file(location.attachment_path)
        
        # Determine content disposition based on file type
        content_disposition = 'attachment'
        # For PDFs and images, display inline in the browser
        if location.attachment_file_type in [
            'application/pdf', 
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/svg+xml'
        ]:
            content_disposition = 'inline'
        
        return StreamingResponse(
            io.BytesIO(file_data['file_data']),
            media_type=location.attachment_file_type,
            headers={
                'Content-Disposition': f'{content_disposition}; filename="{location.attachment_name}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve file: {str(e)}")

@app.get("/locations/{location_id}/thumbnail")
async def get_location_thumbnail(
    location_id: int,
    db: Session = Depends(get_read_db)
):
    """Get a location's attachment thumbnail - accessible to all users"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if not location.attachment_thumbnail_path:
        raise HTTPException(status_code=404, detail="Location has no thumbnail")
    
    try:
        file_data = get_file(location.attachment_thumbnail_path)
        return StreamingResponse(
            io.BytesIO(file_data['file_data']),
            media_type=location.attachment_file_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve thumbnail: {str(e)}")


@app.delete("/appointments/attachments/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Delete an attachment"""
    # Get the attachment
    attachment = db.query(models.AppointmentAttachment).filter(models.AppointmentAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Check if user has permission to delete
    appointment = db.query(models.Appointment).filter(models.Appointment.id == attachment.appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=attachment.appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
    
    # Delete the attachment
    db.delete(attachment)
    db.commit()
    
    return None

@app.get("/appointments/business-card/extraction-status")
async def get_business_card_extraction_status(
    current_user: models.User = Depends(get_current_user)
):
    """Check if business card extraction is enabled"""
    enable_extraction = os.environ.get("ENABLE_BUSINESS_CARD_EXTRACTION", "true").lower() == "true"
    return {"enabled": enable_extraction}


@app.delete("/appointments/{appointment_id}/dignitaries/{dignitary_id}", status_code=204)
async def remove_dignitary_from_appointment(
    appointment_id: int,
    dignitary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_for_write)
):
    """Remove a dignitary from an appointment"""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if the dignitary is associated with the appointment
    appointment_dignitary = (
        db.query(models.AppointmentDignitary)
        .filter(
            models.AppointmentDignitary.appointment_id == appointment_id,
            models.AppointmentDignitary.dignitary_id == dignitary_id
        )
        .first()
    )
    
    if not appointment_dignitary:
        raise HTTPException(status_code=404, detail="Dignitary not associated with this appointment")
    
    # Delete the association
    db.delete(appointment_dignitary)
    db.commit()
    
    return None

@app.get("/appointments/{appointment_id}/dignitaries", response_model=List[schemas.Dignitary])
async def get_appointment_dignitaries(
    appointment_id: int,
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all dignitaries associated with an appointment"""
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.requester_id == current_user.id,
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Get all dignitaries associated with the appointment
    dignitaries = (
        db.query(models.Dignitary)
        .join(models.AppointmentDignitary)
        .filter(models.AppointmentDignitary.appointment_id == appointment_id)
        .all()
    )
    
    return dignitaries


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


# ------------------------------------------------------------------------------------------------------------------------------------------------------
# Admin Access Control Endpoints
# ------------------------------------------------------------------------------------------------------------------------------------------------------

@app.get("/admin/users/access/all", response_model=List[schemas.UserAccess])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_user_access(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all user access records"""
    user_access = db.query(models.UserAccess).all()
    return user_access

@app.get("/admin/users/{user_id}/access/all", response_model=List[schemas.UserAccess])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_user_access_by_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get access records for a specific user"""
    user_access = db.query(models.UserAccess).filter(models.UserAccess.user_id == user_id).all()
    return user_access

@app.post("/admin/users/{user_id}/access/new", response_model=schemas.UserAccess)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_user_access(
    user_id: int,
    user_access: schemas.UserAccessCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new user access record with role-based restrictions"""
    # Use the new method that enforces role-based restrictions
    new_access = models.UserAccess.create_with_role_enforcement(
        db=db,
        user_id=user_id,
        country_code=user_access.country_code,
        location_id=user_access.location_id,
        access_level=user_access.access_level,
        entity_type=user_access.entity_type,
        expiry_date=user_access.expiry_date,
        reason=user_access.reason,
        is_active=user_access.is_active,
        created_by=current_user.id
    )
    
    db.commit()
    db.refresh(new_access)
    return new_access

@app.patch("/admin/users/{user_id}/access/update/{access_id}", response_model=schemas.UserAccess)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_user_access(
    user_id: int,
    access_id: int,
    user_access_update: schemas.UserAccessUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a user access record with role-based restrictions"""
    access = db.query(models.UserAccess).filter(models.UserAccess.id == access_id, models.UserAccess.user_id == user_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="User access record not found")
    
    # Use the new method that enforces role-based restrictions
    update_data = user_access_update.dict(exclude_unset=True)
    models.UserAccess.update_with_role_enforcement(
        db=db,
        access_record=access,
        update_data=update_data,
        updated_by=current_user.id
    )
    
    db.commit()
    db.refresh(access)
    return access

@app.delete("/admin/users/{user_id}/access/{access_id}", status_code=204)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def delete_user_access(
    user_id: int,
    access_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Delete a user access record"""
    access = db.query(models.UserAccess).filter(models.UserAccess.id == access_id, models.UserAccess.user_id == user_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="User access record not found")
    
    # Log access deletion in audit trail
    audit_log = models.AuditLog(
        user_id=current_user.id,
        entity_type="user_access",
        entity_id=access_id,
        action="delete",
        previous_state={
            "user_id": access.user_id,
            "country_code": access.country_code,
            "location_id": access.location_id,
            "access_level": str(access.access_level),
            "entity_type": str(access.entity_type),
            "expiry_date": access.expiry_date.isoformat() if access.expiry_date else None,
            "reason": access.reason,
            "is_active": access.is_active
        },
        new_state=None
    )
    db.add(audit_log)
    
    db.delete(access)
    db.commit()
    
    return None

@app.get("/admin/users/{user_id}/access/summary", response_model=schemas.UserAccessSummary)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_user_access_summary(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a summary of access for a specific user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_records = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == user_id,
        models.UserAccess.is_active == True
    ).all()
    
    countries = set()
    locations = set()
    entity_types = set()
    max_access_level = None
    
    for access in access_records:
        countries.add(access.country_code)
        if access.location_id:
            locations.add(access.location_id)
        entity_types.add(str(access.entity_type))
        
        # Determine highest access level (ADMIN > READ_WRITE > READ)
        if max_access_level is None:
            max_access_level = access.access_level
        elif access.access_level == models.AccessLevel.ADMIN:
            max_access_level = models.AccessLevel.ADMIN
        elif access.access_level == models.AccessLevel.READ_WRITE and max_access_level != models.AccessLevel.ADMIN:
            max_access_level = models.AccessLevel.READ_WRITE
    
    return {
        "user_id": user_id,
        "user_email": user.email,
        "user_name": f"{user.first_name} {user.last_name}",
        "countries": list(countries),
        "location_count": len(locations),
        "entity_types": list(entity_types),
        "max_access_level": str(max_access_level) if max_access_level else None,
        "access_count": len(access_records)
    }

@app.get("/admin/countries/enabled", response_model=List[schemas.CountryResponse])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_enabled_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled countries for dropdowns and selectors"""
    query = db.query(models.Country).filter(
        models.Country.is_enabled == True
    )

    # Get all countries
    if current_user.role != models.UserRole.ADMIN:
        countries = admin_get_country_list_for_access_level(
            db=db,
            current_user=current_user,
            required_access_level=models.AccessLevel.ADMIN
        )
        query = query.filter(
            models.Country.iso2_code.in_(countries)
        )

    # Get countries
    countries = query.order_by(models.Country.name).all()
    return countries


# ------------------------------------------------------------------------------------------------------------------------------------------------------
# Enum endpoints
# ------------------------------------------------------------------------------------------------------------------------------------------------------

@app.get("/appointments/status-options", response_model=List[str])
async def get_appointment_status_options():
    """Get all possible appointment status options"""
    return models.VALID_STATUS_OPTIONS

@app.get("/appointments/status-options-map")
async def get_appointment_status_map():
    """Get a dictionary mapping of appointment status enum names to their display values"""
    return {status.name: status.value for status in models.AppointmentStatus}

@app.get("/appointments/sub-status-options", response_model=List[str])
async def get_appointment_sub_status_options():
    """Get all possible appointment sub-status options"""
    return models.VALID_SUBSTATUS_OPTIONS

@app.get("/appointments/sub-status-options-map")
async def get_appointment_sub_status_map():
    """Get a dictionary mapping of appointment sub-status enum names to their display values"""
    return {sub_status.name: sub_status.value for sub_status in models.AppointmentSubStatus}

@app.get("/appointments/status-substatus-mapping")
async def get_status_substatus_mapping():
    """Get mapping between appointment status and valid sub-statuses"""
    return models.STATUS_SUBSTATUS_MAPPING

@app.get("/appointments/type-options", response_model=List[str])
async def get_appointment_type_options():
    """Get all possible appointment type options"""
    return [app_type.value for app_type in models.AppointmentType]

@app.get("/appointments/type-options-map")
async def get_appointment_type_map():
    """Get a dictionary mapping of appointment type enum names to their display values"""
    return {app_type.name: app_type.value for app_type in models.AppointmentType}

@app.get("/dignitaries/relationship-type-options", response_model=List[str])
async def get_relationship_type_options():
    """Get all possible relationship type options"""
    return [rel_type.value for rel_type in models.RelationshipType]

@app.get("/dignitaries/relationship-type-options-map")
async def get_relationship_type_map():
    """Get a dictionary mapping of relationship type enum names to their display values"""
    return {rel_type.name: rel_type.value for rel_type in models.RelationshipType}

@app.get("/dignitaries/honorific-title-options", response_model=List[str])
async def get_honorific_title_options():
    """Get all possible honorific title options"""
    return [title.value for title in models.HonorificTitle]

@app.get("/dignitaries/honorific-title-options-map")
async def get_honorific_title_map():
    """Get a dictionary mapping of honorific title enum names to their display values"""
    return {title.name: title.value for title in models.HonorificTitle}

@app.get("/dignitaries/primary-domain-options", response_model=List[str])
async def get_primary_domain_options():
    """Get all possible primary domain options"""
    return [domain.value for domain in models.PrimaryDomain]

@app.get("/dignitaries/primary-domain-options-map")
async def get_primary_domain_map():
    """Get a dictionary mapping of primary domain enum names to their display values"""
    return {domain.name: domain.value for domain in models.PrimaryDomain}

@app.get("/appointments/time-of-day-options", response_model=List[str])
async def get_appointment_time_of_day_options():
    """Get all possible appointment time of day options"""
    return [time.value for time in models.AppointmentTimeOfDay]

@app.get("/appointments/time-of-day-options-map")
async def get_appointment_time_of_day_map():
    """Get a dictionary mapping of appointment time of day enum names to their display values"""
    return {time.name: time.value for time in models.AppointmentTimeOfDay}

@app.get("/admin/user-role-options", response_model=List[str])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_user_role_options(
    current_user: models.User = Depends(get_current_user),
):
    """Get all possible user roles"""
    return [role.value for role in models.UserRole if role.is_less_than(current_user.role) or current_user.role == models.UserRole.ADMIN]

@app.get("/admin/user-role-options-map")
async def get_user_role_map(
    current_user: models.User = Depends(get_current_user),
):
    """Get a dictionary mapping of user role enum names to their display values"""
    return {role.name: role.value for role in models.UserRole if role.is_less_than(current_user.role) or current_user.role == models.UserRole.ADMIN}

@app.get("/admin/access-level-options", response_model=List[str])
async def get_access_levels():
    """Get all possible access level options"""
    # Exclude ADMIN access level for now
    return [level.value for level in models.AccessLevel if level != models.AccessLevel.ADMIN]

@app.get("/admin/access-level-options-map")
async def get_access_level_map():
    """Get a dictionary mapping of access level enum names to their display values"""
    # Exclude ADMIN access level for now
    return {level.name: level.value for level in models.AccessLevel if level != models.AccessLevel.ADMIN}

@app.get("/admin/entity-type-options", response_model=List[str])
async def get_entity_types():
    """Get all possible entity type options"""
    return [entity_type.value for entity_type in models.EntityType]

@app.get("/admin/entity-type-options-map")
async def get_entity_type_map():
    """Get a dictionary mapping of entity type enum names to their display values"""
    return {entity_type.name: entity_type.value for entity_type in models.EntityType}

# ------------------------------------------------------------------------------------------------------------------------------------------------------
# Other static data endpoints
# ------------------------------------------------------------------------------------------------------------------------------------------------------

@app.get("/countries/enabled", response_model=List[schemas.CountryResponse])
async def get_enabled_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled countries for dropdowns and selectors"""
    countries = db.query(models.Country).filter(models.Country.is_enabled == True).order_by(models.Country.name).all()
    return countries

@app.get("/countries/all", response_model=List[schemas.CountryResponse])
async def get_all_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all countries for dropdowns and selectors"""
    countries = db.query(models.Country).order_by(models.Country.name).all()
    return countries


# ------------------------------------------------------------------------------------------------------------------------------------------------------
# FUTURE ENDPOINTS
# ------------------------------------------------------------------------------------------------------------------------------------------------------

# @app.patch("/admin/countries/{iso2_code}", response_model=schemas.Country)
# @requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
# async def update_country(
#     iso2_code: str,
#     country_update: schemas.CountryUpdate,
#     current_user: models.User = Depends(get_current_user_for_write),
#     db: Session = Depends(get_db)
# ):
#     """Update a country (admin only)"""
#     country = db.query(models.Country).filter(models.Country.iso2_code == iso2_code).first()
#     if not country:
#         raise HTTPException(status_code=404, detail=f"Country with code {iso2_code} not found")
    
#     # Update country attributes
#     update_data = country_update.dict(exclude_unset=True)
#     for key, value in update_data.items():
#         setattr(country, key, value)
    
#     # Create audit log
#     audit_log = models.AuditLog(
#         entity_id=iso2_code,
#         entity_type="country",
#         action="update",
#         details=json.dumps(update_data),
#         user_id=current_user.id
#     )
#     db.add(audit_log)
    
#     # Commit changes
#     db.commit()
#     db.refresh(country)
#     return country

# @app.post("/admin/countries/bulk-enable", response_model=dict)
# @requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
# async def bulk_update_countries(
#     iso2_codes: List[str],
#     enable: bool,
#     current_user: models.User = Depends(get_current_user_for_write),
#     db: Session = Depends(get_db)
# ):
#     """Enable or disable multiple countries at once (admin only)"""
#     updated = db.query(models.Country).filter(models.Country.iso2_code.in_(iso2_codes)).update(
#         {models.Country.is_enabled: enable}, 
#         synchronize_session=False
#     )
    
#     # Create audit log
#     audit_log = models.AuditLog(
#         entity_id=",".join(iso2_codes),
#         entity_type="country",
#         action=f"bulk_{'enable' if enable else 'disable'}",
#         details=json.dumps({"iso2_codes": iso2_codes, "enable": enable}),
#         user_id=current_user.id
#     )
#     db.add(audit_log)
    
#     db.commit()
    
#     return {"message": f"Updated {updated} countries", "updated_count": updated}
