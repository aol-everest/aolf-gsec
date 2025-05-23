from database import WriteSessionLocal, ReadSessionLocal
import logging

logger = logging.getLogger(__name__)

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