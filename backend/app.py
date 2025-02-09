from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os
from config.config import config

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name='default'):
    app = Flask(__name__)
    CORS(app)

    # Load config
    app.config.from_object(config[config_name])
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)

    # Import routes after db initialization
    from routes import auth_routes, appointment_routes, dignitary_routes

    # Register blueprints
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(appointment_routes.bp)
    app.register_blueprint(dignitary_routes.bp)

    return app

if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    app.run() 