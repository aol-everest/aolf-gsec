from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Callable
import jwt
from jwt.exceptions import InvalidTokenError
import os
import logging
from functools import wraps
import inspect

from dependencies.database import get_read_db, get_db
import models

logger = logging.getLogger(__name__)

# Get environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:  
    raise ValueError("JWT_SECRET_KEY is not set")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise ValueError("GOOGLE_CLIENT_ID is not set")

# OAuth2 scheme for JWT
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
    



