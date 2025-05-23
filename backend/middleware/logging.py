from fastapi import Request
from datetime import datetime
import uuid
import logging
import contextvars

# Create a context variable to store request IDs
request_id_var = contextvars.ContextVar('request_id', default='')

# Custom log formatter that includes request ID when available
class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get() or ''
        return True

def create_logging_middleware():
    """Create and return the logging middleware function."""
    logger = logging.getLogger(__name__)
    
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
    
    return log_requests 