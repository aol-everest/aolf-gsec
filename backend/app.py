from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from dotenv import load_dotenv

from database import SessionLocal, engine
import models
import schemas

# Load environment variables
load_dotenv()

# Get environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AOLF GSEC API")

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
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency to get current user from token
async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Security(oauth2_scheme)
) -> models.User:
    print(f"Received token: {token[:10]}...")  # Print first 10 chars of token for debugging
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"Attempting to decode token with SECRET_KEY: {SECRET_KEY[:5]}...")  # Print first 5 chars of secret key
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Decoded payload: {payload}")
        
        email: str = payload.get("sub")
        if email is None:
            print("No email found in token payload")
            raise credentials_exception
            
        print(f"Looking up user with email: {email}")
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None:
            print("No user found with this email")
            raise credentials_exception
            
        print(f"Found user: {user.email}")
        return user
    except Exception as e:
        print(f"Error decoding token: {str(e)}")
        raise credentials_exception

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
                last_name=idinfo.get('family_name', '')
            )
            db.add(user)
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
            status="pending",
            purpose=appointment.purpose,
            preferred_date=appointment.preferred_date,  # No need to parse, it's already a date object
            preferred_time=appointment.preferred_time,
            duration=appointment.duration,
            location=appointment.location,
            pre_meeting_notes=appointment.pre_meeting_notes
        )
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        print(f"Appointment created: {db_appointment}")
        
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
    # Create new dignitary
    new_dignitary = models.Dignitary(
        **dignitary.dict(),
        created_by=current_user.id
    )
    db.add(new_dignitary)
    db.commit()
    db.refresh(new_dignitary)

    # Create dignitary point of contact
    poc = models.DignitaryPointOfContact(
        dignitary_id=new_dignitary.id,
        poc_id=current_user.id,
        relationship_type=dignitary.poc_relationship_type,
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
    
    # Update dignitary  
    for key, value in dignitary.dict(exclude_unset=True).items():
        setattr(existing_dignitary, key, value)
    db.commit()
    db.refresh(existing_dignitary)

    # Update POC relationship
    poc = db.query(models.DignitaryPointOfContact).filter(
        models.DignitaryPointOfContact.dignitary_id == dignitary_id, 
        models.DignitaryPointOfContact.poc_id == current_user.id
    ).first()
    if poc:
        poc.relationship_type = dignitary.poc_relationship_type
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

@app.patch("/users/me", response_model=schemas.User)
async def update_user(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's information"""
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
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
    return appointments 