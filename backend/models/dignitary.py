from app import db
from datetime import datetime

class Dignitary(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    honorific_title = db.Column(db.String(100))
    primary_domain = db.Column(db.String(100))
    title_in_organization = db.Column(db.String(100))
    organization = db.Column(db.String(100))
    bio_summary = db.Column(db.String(100))
    linked_in_or_website = db.Column(db.String(100))
    country = db.Column(db.String(100))
    state = db.Column(db.String(100))
    city = db.Column(db.String(100))
    pre_meeting_notes = db.Column(db.String(100))
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 
