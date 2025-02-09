from app import db
from datetime import datetime

class DignitaryPointOfContact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dignitary_id = db.Column(db.Integer, db.ForeignKey('dignitary.id'), nullable=False)
    poc_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    relationship_type = db.Column(db.String(100))
    dignitary = db.relationship('Dignitary', backref=db.backref('point_of_contacts', lazy=True))
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 

