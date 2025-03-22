from fastapi import FastAPI, Depends, HTTPException, status, Security, Request, File, UploadFile, Form
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
from sqlalchemy import or_, text
import logging
import uuid
from logging.handlers import RotatingFileHandler
import os.path
import contextvars

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
            if current_user.role != required_role and current_user.role != models.UserRole.SECRETARIAT:
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

@app.get("/admin/dignitaries/all", response_model=List[schemas.DignitaryAdminWithAppointments])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_dignitaries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all dignitaries"""
    dignitaries = db.query(models.Dignitary).all()
    return dignitaries


@app.get("/admin/appointments/all", response_model=List[schemas.AppointmentAdmin])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None
):
    """Get all appointments with optional status filter"""
    query = db.query(models.Appointment).order_by(models.Appointment.id.asc())
    
    if status:
        query = query.filter(models.Appointment.status == status)

    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    )

    appointments = query.all()
    logger.debug(f"Appointments: {appointments}")
    return appointments

@app.get("/admin/appointments/upcoming", response_model=List[schemas.AppointmentAdmin])
@requires_role(models.UserRole.SECRETARIAT)
async def get_upcoming_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None
):
    """Get all upcoming appointments (future appointment_date, not NULL)"""
    query = db.query(models.Appointment).filter(
        or_(
            models.Appointment.appointment_date == None,
            models.Appointment.appointment_date >= date.today()-timedelta(days=1),
        ),
        models.Appointment.status not in [
            models.AppointmentStatus.CANCELLED, 
            models.AppointmentStatus.REJECTED, 
            models.AppointmentStatus.COMPLETED,
        ],
    ).order_by(models.Appointment.appointment_date.asc())
    
    if status:
        query = query.filter(models.Appointment.status == status)
    
    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    )
    
    appointments = query.all()
    logger.debug(f"Upcoming appointments: {appointments}")
    return appointments


@app.get("/usher/appointments", response_model=List[schemas.AppointmentUsherView])
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT])
async def get_usher_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    date: Optional[str] = None,
):
    """
    Get appointments for USHER role. By default, returns appointments for today and the next two days.
    If date parameter is provided, returns appointments for that specific date.
    """
    # If specific date is provided, use that
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            start_date = target_date
            end_date = target_date
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        # Default: today and next two days
        today = datetime.now().date()
        start_date = today
        end_date = today + timedelta(days=2)
    
    # Get appointments within date range
    appointments = db.query(models.Appointment).filter(
        models.Appointment.appointment_date >= start_date,
        models.Appointment.appointment_date <= end_date
    ).options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    ).order_by(
        models.Appointment.appointment_date,
        models.Appointment.appointment_time
    ).all()
    
    return appointments

@app.get("/admin/appointments/{appointment_id}", response_model=schemas.AppointmentAdmin)
@requires_role(models.UserRole.SECRETARIAT) 
async def get_appointment(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get an appointment"""
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id)
        .options(
            joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
            joinedload(models.Appointment.requester)
        )
        .first()
    )
    logger.debug(f"Appointment: {appointment}")
    return appointment 



@app.patch("/admin/appointments/update/{appointment_id}", response_model=schemas.AppointmentAdmin)
@requires_role(models.UserRole.SECRETARIAT)
async def update_appointment(
    appointment_id: int,
    appointment_update: schemas.AppointmentAdminUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update an appointment"""
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
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
    
    # Send email notifications about the update
    try:
        notify_appointment_update(db, appointment, old_data, update_data)
    except Exception as e:
        logger.error(f"Error sending email notifications: {str(e)}")
    
    return appointment


@app.get("/admin/users/all", response_model=List[schemas.UserAdminView])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all users with creator and updater information via joins"""
    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)
    
    # Query users with joins to get creator and updater information in one go
    users = (
        db.query(models.User, CreatorUser, UpdaterUser)
        .outerjoin(CreatorUser, models.User.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.User.updated_by == UpdaterUser.id)
        .all()
    )
    
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
@requires_role(models.UserRole.SECRETARIAT)
async def create_user(
    user: schemas.UserAdminCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new user"""
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
@requires_role(models.UserRole.SECRETARIAT)
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

@app.get("/dignitaries/relationship-type-options", response_model=List[str])
async def get_relationship_type_options():
    """Get all possible relationship type options"""
    return [rel_type.value for rel_type in models.RelationshipType]

@app.get("/dignitaries/honorific-title-options", response_model=List[str])
async def get_honorific_title_options():
    """Get all possible honorific title options"""
    return [title.value for title in models.HonorificTitle]

@app.get("/dignitaries/primary-domain-options", response_model=List[str])
async def get_primary_domain_options():
    """Get all possible primary domain options"""
    return [domain.value for domain in models.PrimaryDomain]

@app.get("/appointments/time-of-day-options", response_model=List[str])
async def get_appointment_time_of_day_options():
    """Get all possible appointment time of day options"""
    return [time.value for time in models.AppointmentTimeOfDay]

@app.get("/admin/user-role-options", response_model=List[str])
async def get_user_role_options():
    """Get all possible user roles"""
    return [role.value for role in models.UserRole]

@app.post("/admin/locations/new", response_model=schemas.LocationAdmin)
@requires_role(models.UserRole.SECRETARIAT)
async def create_location(
    location: schemas.LocationAdminCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new location"""
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
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_locations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all locations with creator and updater information"""
    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)
    
    # Query locations with joins to get creator and updater information in one go
    locations = (
        db.query(models.Location, CreatorUser, UpdaterUser)
        .outerjoin(CreatorUser, models.Location.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.Location.updated_by == UpdaterUser.id)
        .all()
    )
    
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
@requires_role(models.UserRole.SECRETARIAT)
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
    
    if creator:
        setattr(location, "created_by_user", creator)
    if updater:
        setattr(location, "updated_by_user", updater)
    
    return location

@app.patch("/admin/locations/update/{location_id}", response_model=schemas.LocationAdmin)
@requires_role(models.UserRole.SECRETARIAT)
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
    
    if current_user.role != models.UserRole.SECRETARIAT and appointment.requester_id != current_user.id:
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
    
    if current_user.role != models.UserRole.SECRETARIAT and appointment.requester_id != current_user.id:
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
    
    if current_user.role != models.UserRole.SECRETARIAT and appointment.requester_id != current_user.id:
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
    
    if current_user.role != models.UserRole.SECRETARIAT and appointment.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view attachments for this appointment")

    # Base query
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.appointment_id == appointment_id
    )
    
    # Add uploaded_by filter only for non-SECRETARIAT users
    if current_user.role != models.UserRole.SECRETARIAT:
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
    if current_user.role != models.UserRole.SECRETARIAT:
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)
        
    attachment = query.first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == attachment.appointment_id
    ).first()
    
    if current_user.role != models.UserRole.SECRETARIAT and appointment.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this attachment")

    file_data = get_file(attachment.file_path)
    
    # Use the original filename from the database for the Content-Disposition header
    return StreamingResponse(
        io.BytesIO(file_data['file_data']),
        media_type=file_data['content_type'],
        headers={"Content-Disposition": f"attachment; filename={attachment.file_name}"}
    )

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
    if current_user.role != models.UserRole.SECRETARIAT:
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
    
    if current_user.role != models.UserRole.SECRETARIAT and appointment.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this attachment")

    file_data = get_file(attachment.thumbnail_path)
    
    # Return the thumbnail without Content-Disposition header to display inline
    return StreamingResponse(
        io.BytesIO(file_data['file_data']),
        media_type=file_data['content_type']
    )

@app.post("/admin/locations/{location_id}/attachment", response_model=schemas.LocationAdmin)
@requires_role(models.UserRole.SECRETARIAT)
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

@app.delete("/admin/locations/{location_id}/attachment", response_model=schemas.LocationAdmin)
@requires_role(models.UserRole.SECRETARIAT)
async def remove_location_attachment(
    location_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Remove an attachment from a location"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Clear attachment fields
    location.attachment_path = None
    location.attachment_name = None
    location.attachment_file_type = None
    location.attachment_thumbnail_path = None
    location.updated_by = current_user.id
    
    db.commit()
    db.refresh(location)
    return location

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
    
    if current_user.role != models.UserRole.SECRETARIAT and appointment.requester_id != current_user.id:
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

@app.post("/admin/business-card/upload", response_model=schemas.BusinessCardExtractionResponse)
@requires_role(models.UserRole.SECRETARIAT)
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
@requires_role(models.UserRole.SECRETARIAT)
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

# Access Control Endpoints

@app.get("/admin/users/access/all", response_model=List[schemas.UserAccess])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_user_access(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all user access records"""
    user_access = db.query(models.UserAccess).all()
    return user_access

@app.get("/admin/users/{user_id}/access/all", response_model=List[schemas.UserAccess])
@requires_role(models.UserRole.SECRETARIAT)
async def get_user_access_by_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get access records for a specific user"""
    user_access = db.query(models.UserAccess).filter(models.UserAccess.user_id == user_id).all()
    return user_access

@app.post("/admin/users/{user_id}/access/new", response_model=schemas.UserAccess)
@requires_role(models.UserRole.SECRETARIAT)
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
@requires_role(models.UserRole.SECRETARIAT)
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
    
    # Check if user is USHER and enforce restrictions
    user = db.query(models.User).filter(models.User.id == access.user_id).first()
    if user and user.role == models.UserRole.USHER:
        # For USHER role, force values for access_level and entity_type if they're being updated
        update_data = user_access_update.dict(exclude_unset=True)
        if 'access_level' in update_data:
            update_data['access_level'] = models.AccessLevel.READ
        if 'entity_type' in update_data:
            update_data['entity_type'] = models.EntityType.APPOINTMENT
    else:
        update_data = user_access_update.dict(exclude_unset=True)
        
    for key, value in update_data.items():
        setattr(access, key, value)
    
    access.updated_by = current_user.id
    access.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(access)
    return access

@app.delete("/admin/users/{user_id}/access/{access_id}", status_code=204)
@requires_role(models.UserRole.SECRETARIAT)
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
@requires_role(models.UserRole.SECRETARIAT)
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

# Endpoints for new Enums

@app.get("/admin/access-level-options", response_model=List[str])
async def get_access_levels():
    """Get all possible access level options"""
    return [level.value for level in models.AccessLevel]

@app.get("/admin/entity-type-options", response_model=List[str])
async def get_entity_types():
    """Get all possible entity type options"""
    return [entity_type.value for entity_type in models.EntityType]

# Country endpoints
@app.get("/countries", response_model=List[schemas.CountryResponse])
async def get_enabled_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled countries for dropdowns and selectors"""
    countries = db.query(models.Country).filter(models.Country.is_enabled == True).order_by(models.Country.name).all()
    return countries

@app.get("/admin/countries/all", response_model=List[schemas.Country])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all countries, including disabled ones (admin only)"""
    countries = db.query(models.Country).order_by(models.Country.name).all()
    return countries

@app.get("/admin/countries/{iso2_code}", response_model=schemas.Country)
@requires_role(models.UserRole.SECRETARIAT)
async def get_country(
    iso2_code: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific country by ISO2 code (admin only)"""
    country = db.query(models.Country).filter(models.Country.iso2_code == iso2_code).first()
    if not country:
        raise HTTPException(status_code=404, detail=f"Country with code {iso2_code} not found")
    return country

@app.patch("/admin/countries/{iso2_code}", response_model=schemas.Country)
@requires_role(models.UserRole.SECRETARIAT)
async def update_country(
    iso2_code: str,
    country_update: schemas.CountryUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a country (admin only)"""
    country = db.query(models.Country).filter(models.Country.iso2_code == iso2_code).first()
    if not country:
        raise HTTPException(status_code=404, detail=f"Country with code {iso2_code} not found")
    
    # Update country attributes
    update_data = country_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(country, key, value)
    
    # Create audit log
    audit_log = models.AuditLog(
        entity_id=iso2_code,
        entity_type="country",
        action="update",
        details=json.dumps(update_data),
        user_id=current_user.id
    )
    db.add(audit_log)
    
    # Commit changes
    db.commit()
    db.refresh(country)
    return country

@app.post("/admin/countries/bulk-enable", response_model=dict)
@requires_role(models.UserRole.SECRETARIAT)
async def bulk_update_countries(
    iso2_codes: List[str],
    enable: bool,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Enable or disable multiple countries at once (admin only)"""
    updated = db.query(models.Country).filter(models.Country.iso2_code.in_(iso2_codes)).update(
        {models.Country.is_enabled: enable}, 
        synchronize_session=False
    )
    
    # Create audit log
    audit_log = models.AuditLog(
        entity_id=",".join(iso2_codes),
        entity_type="country",
        action=f"bulk_{'enable' if enable else 'disable'}",
        details=json.dumps({"iso2_codes": iso2_codes, "enable": enable}),
        user_id=current_user.id
    )
    db.add(audit_log)
    
    db.commit()
    
    return {"message": f"Updated {updated} countries", "updated_count": updated}
