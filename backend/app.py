from fastapi import FastAPI, Depends, HTTPException, status, Security, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Callable
from datetime import datetime, timedelta
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from dotenv import load_dotenv
from jwt.exceptions import InvalidTokenError
from functools import wraps
import json
from database import SessionLocal, engine
import models
import schemas
from utils.email_notifications import notify_appointment_creation, notify_appointment_update

# Load environment variables
load_dotenv()

# Get environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Create database tables
models.Base.metadata.create_all(bind=engine)

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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    # Increase expiration to 7 days
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def requires_role(required_role: models.UserRole):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            if current_user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            if current_user.role != required_role:
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
    db: Session = Depends(get_db),
    token: str = Security(oauth2_scheme),
) -> models.User:
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
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            raise credentials_exception
        return user
    except jwt.ExpiredSignatureError:
        raise token_expired_exception
    except InvalidTokenError:
        raise credentials_exception

def requires_role(required_role: models.UserRole):
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
            
            if current_user.role != required_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough privileges"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

@app.post("/verify-google-token", response_model=schemas.Token)
async def verify_google_token(
    token: schemas.GoogleToken,
    db: Session = Depends(get_db)
):
    try:
        print(f"Received token for verification: {token.token[:50]}...") # Debug log
        
        idinfo = id_token.verify_oauth2_token(
            token.token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
        print(f"Verified token info: {idinfo}") # Debug log
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == idinfo['email']).first()
        print(f"Found user: {user}") # Debug log
        
        if not user:
            print("Creating new user") # Debug log
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
        else:
            print(f"User already exists: {user.email}") # Debug log
            # Update user first name, last name, and picture if they exist
            user.first_name = idinfo.get('given_name', user.first_name)
            user.last_name = idinfo.get('family_name', user.last_name)
            user.picture = idinfo.get('picture', user.picture)
            user.last_login_at = datetime.utcnow()
            # Update google_id if it's not set (for pre-defined users)
            if not user.google_id:
                user.google_id = idinfo.get('sub')
            db.commit()
            db.refresh(user)
        
        # Generate JWT token
        access_token = create_access_token(data={"sub": user.email})
        print(f"Generated access token: {access_token[:50]}...") # Debug log
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "user": user,
            "role": user.role,
        }
        
    except Exception as e:
        print(f"Error verifying token: {str(e)}") # Debug log
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

@app.post("/appointments/new", response_model=schemas.Appointment)
async def create_appointment(
    appointment: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"Received appointment data: {appointment.dict()}")  # Debug log
    try:
        # Create appointment
        db_appointment = models.Appointment(
            requester_id=current_user.id,
            dignitary_id=appointment.dignitary_id,
            status="PENDING",
            purpose=appointment.purpose,
            preferred_date=appointment.preferred_date,
            preferred_time=appointment.preferred_time,
            duration=appointment.duration,
            location=appointment.location,
            pre_meeting_notes=appointment.pre_meeting_notes
        )
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        
        # Send email notifications
        notify_appointment_creation(db, db_appointment)
        
        return db_appointment
    except Exception as e:
        print(f"Error creating appointment: {str(e)}")  # Debug log
        raise

@app.post("/dignitaries/new", response_model=schemas.Dignitary)
async def new_dignitary(
    dignitary: schemas.DignitaryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if dignitary exists
    existing_dignitary = db.query(models.Dignitary).filter(models.Dignitary.id == dignitary_id).first()
    if not existing_dignitary:
        raise HTTPException(status_code=404, detail="Dignitary not found")
    
    # Extract poc_relationship_type and create dignitary without it
    poc_relationship_type = dignitary.poc_relationship_type
    dignitary_data = dignitary.dict(exclude={'poc_relationship_type'}, exclude_unset=True)

    # Update dignitary  
    for key, value in dignitary_data.items():
        setattr(existing_dignitary, key, value)
    db.commit()
    db.refresh(existing_dignitary)

    # Update POC relationship
    poc = db.query(models.DignitaryPointOfContact).filter(
        models.DignitaryPointOfContact.dignitary_id == dignitary_id, 
        models.DignitaryPointOfContact.poc_id == current_user.id
    ).first()
    if poc and poc_relationship_type and poc_relationship_type != poc.relationship_type:
        poc.relationship_type = poc_relationship_type
        db.commit()
        db.refresh(poc)

    return existing_dignitary


@app.get("/dignitaries/assigned", response_model=List[schemas.Dignitary])
async def get_assigned_dignitaries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all dignitaries assigned to the current user as POC"""
    dignitaries = (
        db.query(models.Dignitary)
        .join(models.DignitaryPointOfContact)
        .filter(models.DignitaryPointOfContact.poc_id == current_user.id)
        .all()
    )
    return dignitaries


@app.patch("/users/me/update", response_model=schemas.User)
async def update_user(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"Received user update: {user_update.dict()}")
    """Update current user's information"""
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user

@app.get("/users/me", response_model=schemas.User)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's information"""
    return current_user

@app.get("/appointments/my", response_model=List[schemas.Appointment])
async def get_my_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all appointments requested by the current user"""
    appointments = (
        db.query(models.Appointment)
        .filter(models.Appointment.requester_id == current_user.id)
        .all()
    )
    print(f"Appointments: {appointments}")
    return appointments 

@app.get("/appointments/my/{dignitary_id}", response_model=List[schemas.Appointment])
async def get_my_appointments_for_dignitary(
    dignitary_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all appointments requested by the current user for a specific dignitary"""
    appointments = (
        db.query(models.Appointment)
        .filter(models.Appointment.requester_id == current_user.id, models.Appointment.dignitary_id == dignitary_id)
        .all()
    )
    print(f"Appointments: {appointments}")
    return appointments 

@app.get("/admin/dignitaries/all", response_model=List[schemas.DignitaryAdmin])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_dignitaries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all dignitaries"""
    dignitaries = db.query(models.Dignitary).all()
    return dignitaries


@app.get("/admin/appointments/all", response_model=List[schemas.AppointmentAdmin])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None
):
    """Get all appointments with optional status filter"""
    query = db.query(models.Appointment).order_by(models.Appointment.id.asc())
    
    if status:
        query = query.filter(models.Appointment.status == status)
    
    appointments = query.all()
    print(f"Appointments: {appointments}")
    return appointments 

@app.get("/admin/appointments/{appointment_id}", response_model=schemas.AppointmentAdmin)
@requires_role(models.UserRole.SECRETARIAT)
async def get_appointment(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get an appointment"""
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id)
        .first()
    )
    print(f"Appointment: {appointment}")
    return appointment 



@app.patch("/admin/appointments/update/{appointment_id}", response_model=schemas.AppointmentAdmin)
@requires_role(models.UserRole.SECRETARIAT)
async def update_appointment(
    appointment_id: int,
    appointment_update: schemas.AppointmentAdminUpdate,
    current_user: models.User = Depends(get_current_user),
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
    
    # Store old data for comparison
    old_data = {
        'status': appointment.status.value,
        'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
        'appointment_time': appointment.appointment_time,
        'duration': appointment.duration,
        'location': appointment.location,
        'meeting_notes': appointment.meeting_notes,
        'follow_up_actions': appointment.follow_up_actions,
        'secretariat_comments': appointment.secretariat_comments,
    }
        
    if appointment.status != models.AppointmentStatus.APPROVED and appointment_update.status == models.AppointmentStatus.APPROVED:
        print("Appointment is approved")
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
    notify_appointment_update(db, appointment, old_data, update_data)
    
    return appointment


@app.get("/admin/users/all", response_model=List[schemas.User])
@requires_role(models.UserRole.SECRETARIAT)
async def get_all_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users"""
    users = db.query(models.User).all()
    return users

@app.get("/appointments/status-options", response_model=List[str])
async def get_appointment_status_options():
    """Get all possible appointment status options"""
    return [status.value for status in models.AppointmentStatus]

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
