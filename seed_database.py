"""Seed demo police officers and 100 official FIR records."""

import random
from datetime import date, timedelta

import bcrypt

from app import app, build_document_hash
from extensions import db
from models import FIR, PoliceOfficer


OFFICERS = [
    ("MH-PI-1001", "Inspector Asha Patil", "Andheri Police Station", "andheri-2026-key"),
    ("MH-PI-1002", "Inspector Rohan Deshmukh", "Dadar Police Station", "dadar-2026-key"),
    ("MH-PI-1003", "Inspector Meera Shaikh", "Bandra Police Station", "bandra-2026-key"),
]

NAMES = [
    ("Aarav Sharma", "Male"),
    ("Isha Nair", "Female"),
    ("Rohan Mehta", "Male"),
    ("Sneha Kulkarni", "Female"),
    ("Kabir Khan", "Male"),
    ("Priya Rao", "Female"),
    ("Vikram Joshi", "Male"),
    ("Ananya Menon", "Female"),
    ("Aditya Singh", "Male"),
    ("Neha Shah", "Female"),
]

AREAS = [
    ("Andheri East, Mumbai", 19.1155, 72.8727),
    ("Dadar West, Mumbai", 19.0196, 72.8308),
    ("Bandra West, Mumbai", 19.0607, 72.8362),
    ("Kurla West, Mumbai", 19.0726, 72.8845),
    ("Borivali East, Mumbai", 19.2290, 72.8567),
    ("Ghatkopar West, Mumbai", 19.0896, 72.9081),
    ("Malad West, Mumbai", 19.1860, 72.8484),
    ("Chembur, Mumbai", 19.0522, 72.9005),
    ("Byculla, Mumbai", 18.9750, 72.8338),
    ("Powai, Mumbai", 19.1176, 72.9060),
]

INCIDENTS = [
    (
        "Theft",
        "Cognizable FIR",
        "The complainant reported that an unknown person removed a mobile phone and wallet from their bag while they were boarding a crowded bus near {area}. The estimated loss is Rs. {amount}. CCTV cameras near the bus stop may have captured the incident.",
    ),
    (
        "Robbery",
        "Cognizable FIR",
        "The complainant stated that two unknown persons threatened them near {area} and forcibly took a gold chain and cash worth approximately Rs. {amount}. The suspects escaped on a motorcycle without a visible number plate.",
    ),
    (
        "Burglary",
        "Cognizable FIR",
        "The complainant returned home at night and found the door lock broken at {area}. Jewellery and electronic items worth around Rs. {amount} were missing from the cupboard. Neighbours reported seeing an unknown person near the building staircase.",
    ),
    (
        "Fraud / Deceptive Practice",
        "Cognizable FIR",
        "The complainant received a call from a person claiming to be a bank officer and shared OTP details under pressure. An amount of Rs. {amount} was withdrawn through online transactions. The call was received while the complainant was at {area}.",
    ),
    (
        "Motor Vehicle Theft",
        "Cognizable FIR",
        "The complainant parked a two-wheeler near {area} in the evening. On returning, the vehicle was missing. A search in nearby lanes was unsuccessful and the original registration documents are available with the complainant.",
    ),
    (
        "Assault",
        "Cognizable FIR",
        "The complainant alleged that during an argument near {area}, the accused pushed and struck them, causing visible injury and pain. A medical examination was requested and two local witnesses were named.",
    ),
    (
        "Criminal Damage",
        "Cognizable FIR",
        "The complainant stated that unknown persons damaged the windshield and side mirrors of a parked car at {area}. The estimated repair cost is Rs. {amount}. The incident appears to have occurred late at night.",
    ),
    (
        "Kidnapping",
        "Sensitive FIR",
        "The complainant reported that a minor family member did not return from tuition near {area}. The child was last seen with an unknown adult. Immediate tracing and CCTV review were requested.",
    ),
    (
        "Narcotics",
        "Cognizable FIR",
        "Police staff received information about suspected narcotic substance distribution near {area}. On verification, suspicious packets were recovered and seized under proper panchnama procedure.",
    ),
    (
        "Weapons Violation",
        "Cognizable FIR",
        "During patrol near {area}, police found a person carrying a sharp weapon without lawful reason. The weapon was seized and the accused was brought to the police station for further inquiry.",
    ),
]


def get_or_create_officers():
    officers = []
    for officer_userid, name, station_name, secret_key in OFFICERS:
        officer = PoliceOfficer.query.filter_by(officer_userid=officer_userid).first()
        if officer is None:
            officer = PoliceOfficer(
                officer_userid=officer_userid,
                name=name,
                station_name=station_name,
                secret_key_hash=bcrypt.hashpw(secret_key.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            )
            db.session.add(officer)
        officers.append(officer)
    db.session.commit()
    return officers


def seed_firs():
    officers = get_or_create_officers()
    random.seed(42)

    existing_count = FIR.query.filter_by(source="police").count()
    if existing_count >= 100:
        print(f"Police registry already has {existing_count} FIRs. No seed records added.")
        return

    start_index = existing_count + 1
    for index in range(start_index, 101):
        name, gender = random.choice(NAMES)
        area, base_lat, base_lng = random.choice(AREAS)
        crime_type, fir_type, template = random.choice(INCIDENTS)
        officer = random.choice(officers)
        incident_date = date.today() - timedelta(days=random.randint(1, 90))
        incident_time = f"{random.randint(0, 23):02d}:{random.choice([0, 10, 15, 20, 30, 45]):02d}"
        age = random.randint(19, 68)
        phone_number = f"9{random.randint(100000000, 999999999)}"
        amount = random.choice([3500, 7200, 12500, 18000, 25000, 42000, 68000, 95000])
        fir_id = f"FIR-2026-{index:05d}"
        complaint = template.format(area=area, amount=amount)
        document_text = (
            f"FIR Number: {fir_id}\n"
            f"Police Station: {officer.station_name}\n"
            f"Complainant: {name}, Age {age}, Gender {gender}, Contact {phone_number}\n"
            f"Incident Date: {incident_date.isoformat()} Time: {incident_time}\n"
            f"Incident Location: {area}\n"
            f"Crime Type: {crime_type}\n"
            f"FIR Type: {fir_type}\n"
            f"Statement: {complaint}\n"
            "This report has been registered by the duty officer after preliminary verification of the complainant statement."
        )

        fir = FIR(
            fir_id=fir_id,
            name=name,
            age=age,
            gender=gender,
            phone_number=phone_number,
            fir_type=fir_type,
            crime_type=crime_type,
            complaint=complaint,
            incident_date=incident_date,
            incident_time=incident_time,
            incident_location=area,
            latitude=round(base_lat + random.uniform(-0.018, 0.018), 6),
            longitude=round(base_lng + random.uniform(-0.018, 0.018), 6),
            area=area,
            confidence_score=100.0,
            confidence_band="Official",
            upload_filename=f"{fir_id}.txt",
            document_text=document_text,
            document_hash=build_document_hash(document_text),
            source="police",
            date=date.today(),
            officer_id=officer.id,
        )
        db.session.add(fir)

    db.session.commit()
    print("Seeded police officers and 100 official FIR records.")
    print("Demo officer credentials:")
    for officer_userid, _, _, secret_key in OFFICERS:
        print(f"{officer_userid} / {secret_key}")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        seed_firs()
