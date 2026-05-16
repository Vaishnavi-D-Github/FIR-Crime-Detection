from datetime import datetime

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)

    email = db.Column(db.String(120), unique=True, nullable=False)

    password = db.Column(db.String(255), nullable=False)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    firs = db.relationship(
        "FIR",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.email}>"


class PoliceOfficer(db.Model):
    __tablename__ = "police_officers"

    id = db.Column(db.Integer, primary_key=True)

    officer_userid = db.Column(db.String(50), unique=True, nullable=False)

    name = db.Column(db.String(100), nullable=False)

    station_name = db.Column(db.String(150), nullable=False)

    secret_key_hash = db.Column(db.String(255), nullable=False)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    firs = db.relationship(
        "FIR",
        backref="officer",
        lazy=True
    )

    def __repr__(self):
        return f"<PoliceOfficer {self.officer_userid}>"
    

class FIR(db.Model):
    __tablename__ = "firs"

    id = db.Column(db.Integer, primary_key=True)

    fir_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    name = db.Column(db.String(100), nullable=False)

    age = db.Column(db.Integer, nullable=False)

    gender = db.Column(db.String(20), nullable=False)

    phone_number = db.Column(db.String(20), nullable=False)

    fir_type = db.Column(db.String(50), nullable=False)

    crime_type = db.Column(db.String(100), nullable=False)

    complaint = db.Column(db.Text, nullable=False)

    incident_date = db.Column(db.Date, nullable=False)

    incident_time = db.Column(db.String(20), nullable=True)

    incident_location = db.Column(db.String(255), nullable=False)

    latitude = db.Column(db.Float, nullable=False)

    longitude = db.Column(db.Float, nullable=False)

    area = db.Column(db.String(100), default="User Reported")

    confidence_score = db.Column(db.Float, nullable=False, default=0.0)

    confidence_band = db.Column(db.String(20), nullable=False, default="Low")

    upload_filename = db.Column(db.String(255), nullable=True)

    document_text = db.Column(db.Text, nullable=True)

    document_hash = db.Column(db.String(64), nullable=True)

    source = db.Column(db.String(30), nullable=False, default="police")

    date = db.Column(
        db.Date,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    officer_id = db.Column(
        db.Integer,
        db.ForeignKey("police_officers.id"),
        nullable=True
    )

    def __repr__(self):
        return f"<FIR {self.fir_id}>"
