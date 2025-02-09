from app import create_app, db
from models.user import User
from models.dignitary import Dignitary
from models.appointment import Appointment

app = create_app('development')

def init_db():
    with app.app_context():
        # Create all tables
        db.create_all()
        print("Database tables created successfully!")

if __name__ == '__main__':
    init_db() 