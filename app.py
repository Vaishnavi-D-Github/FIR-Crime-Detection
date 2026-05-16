"""Flask application for FIR assistance, crime classification, and hotspot insights."""

import os
import pickle
import re
import hashlib
from datetime import date, datetime
from functools import wraps
from pathlib import Path

import bcrypt
import numpy as np
import torch
import torch.nn as nn
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

from config import Config
from extensions import db, migrate
from models import FIR, PoliceOfficer, User

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - optional dependency for uploads
    PdfReader = None

try:
    from PIL import Image, ImageOps, UnidentifiedImageError
    import pytesseract
except ImportError:  # pragma: no cover - optional dependency for image OCR
    Image = None
    ImageOps = None
    UnidentifiedImageError = None
    pytesseract = None


app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
migrate.init_app(app, db)


MODEL_PATH = "model/crime_classifier.pth"
VECTORIZER_PATH = "model/tfidf_vectorizer.pkl"
LABEL_ENCODER_PATH = "model/label_encoder.pkl"
UPLOAD_EXTENSIONS = {".txt", ".pdf", ".png", ".jpg", ".jpeg"}
UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)
FIR_ID_PATTERN = re.compile(r"\bFIR[-\s]?\d{4}[-\s]?\d{3,6}\b", re.IGNORECASE)
FIR_SPACED_PATTERN = re.compile(r"\bFIR[\s\-:#]*(\d{4})[\s\-:/]*(\d{2,6})\b", re.IGNORECASE)
FIR_PS_PATTERN = re.compile(r"\b(?:FIR|PS)[\s\-#]*(\d{1,4})[\s\-/]{1,2}(\d{1,4})\b", re.IGNORECASE)
FIR_SLASH_PATTERN = re.compile(r"\b(\d{1,4})/(\d{1,4})\b")
OCR_NUM_FIXES = str.maketrans(
    {
        "O": "0",
        "o": "0",
        "Q": "0",
        "D": "0",
        "S": "5",
        "s": "5",
        "B": "8",
        "Z": "2",
        "z": "2",
    }
)
TESSERACT_CANDIDATES = [
    os.environ.get("TESSERACT_CMD"),
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]


FRIENDLY_CRIME_LABELS = {
    "ARSON": "Arson",
    "ASSAULT": "Assault",
    "BATTERY": "Battery",
    "BURGLARY": "Burglary",
    "CONCEALED CARRY LICENSE VIOLATION": "Weapons License Violation",
    "CRIMINAL DAMAGE": "Criminal Damage",
    "CRIMINAL SEXUAL ASSAULT": "Sexual Assault",
    "CRIMINAL TRESPASS": "Criminal Trespass",
    "DECEPTIVE PRACTICE": "Fraud / Deceptive Practice",
    "HOMICIDE": "Homicide",
    "HUMAN TRAFFICKING": "Human Trafficking",
    "INTERFERENCE WITH PUBLIC OFFICER": "Public Officer Interference",
    "INTIMIDATION": "Intimidation",
    "KIDNAPPING": "Kidnapping",
    "LIQUOR LAW VIOLATION": "Liquor Law Violation",
    "MOTOR VEHICLE THEFT": "Motor Vehicle Theft",
    "NARCOTICS": "Narcotics",
    "OBSCENITY": "Obscenity",
    "OFFENSE INVOLVING CHILDREN": "Offense Involving Children",
    "OTHER OFFENSE": "Other Offense",
    "PROSTITUTION": "Prostitution",
    "PUBLIC INDECENCY": "Public Indecency",
    "PUBLIC PEACE VIOLATION": "Public Peace Violation",
    "ROBBERY": "Robbery",
    "SEX OFFENSE": "Sex Offense",
    "STALKING": "Stalking",
    "THEFT": "Theft",
    "WEAPONS VIOLATION": "Weapons Violation",
}

COGNIZABLE_CRIMES = {
    "ARSON",
    "ASSAULT",
    "BATTERY",
    "BURGLARY",
    "CRIMINAL DAMAGE",
    "CRIMINAL SEXUAL ASSAULT",
    "DECEPTIVE PRACTICE",
    "HOMICIDE",
    "HUMAN TRAFFICKING",
    "INTIMIDATION",
    "KIDNAPPING",
    "MOTOR VEHICLE THEFT",
    "NARCOTICS",
    "ROBBERY",
    "SEX OFFENSE",
    "STALKING",
    "THEFT",
    "WEAPONS VIOLATION",
    "OFFENSE INVOLVING CHILDREN",
}

SPECIAL_REVIEW_CRIMES = {
    "CRIMINAL SEXUAL ASSAULT",
    "HOMICIDE",
    "HUMAN TRAFFICKING",
    "KIDNAPPING",
    "OFFENSE INVOLVING CHILDREN",
    "SEX OFFENSE",
}

EMERGENCY_CRIMES = {
    "HOMICIDE",
    "HUMAN TRAFFICKING",
    "KIDNAPPING",
    "CRIMINAL SEXUAL ASSAULT",
    "SEX OFFENSE",
    "ARSON",
}


class CrimeClassifier(nn.Module):
    """Neural network for FIR crime classification."""

    def __init__(self, input_dim, num_classes, hidden_dim=256):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes),
        )

    def forward(self, x):
        return self.network(x)


with open(VECTORIZER_PATH, "rb") as vectorizer_file:
    vectorizer = pickle.load(vectorizer_file)

with open(LABEL_ENCODER_PATH, "rb") as encoder_file:
    label_encoder = pickle.load(encoder_file)

classes = label_encoder.classes_.tolist()
input_dim = len(vectorizer.vocabulary_)
num_classes = len(classes)

model = CrimeClassifier(input_dim, num_classes)
model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device("cpu")))
model.eval()


def configure_tesseract():
    if pytesseract is None:
        return None

    for candidate in TESSERACT_CANDIDATES:
        if candidate and Path(candidate).exists():
            pytesseract.pytesseract.tesseract_cmd = candidate
            tessdata_dir = Path(candidate).parent / "tessdata"
            if tessdata_dir.exists():
                os.environ["TESSDATA_PREFIX"] = str(tessdata_dir)
            return candidate

    return None


TESSERACT_CMD = configure_tesseract()


PASSWORD_RESET_SALT = "password-reset-salt"
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(email):
    return (email or "").strip().lower()


def is_valid_email(email):
    return bool(EMAIL_PATTERN.match(normalize_email(email)))


def find_user_by_email(email):
    normalized = normalize_email(email)
    if not normalized:
        return None
    return User.query.filter(func.lower(func.trim(User.email)) == normalized).first()


def get_password_reset_serializer():
    return URLSafeTimedSerializer(app.config["SECRET_KEY"], salt=PASSWORD_RESET_SALT)


def generate_password_reset_token(email):
    return get_password_reset_serializer().dumps(normalize_email(email))


def verify_password_reset_token(token):
    try:
        return get_password_reset_serializer().loads(
            token,
            max_age=app.config["PASSWORD_RESET_MAX_AGE"],
        )
    except (BadSignature, SignatureExpired):
        return None


def normalize_password(password):
    return (password or "").strip()


def hash_password(password):
    normalized = normalize_password(password)
    return bcrypt.hashpw(normalized.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password, password_hash):
    if not password_hash:
        return False
    stored_hash = password_hash.strip()
    normalized = normalize_password(password)
    if not normalized:
        return False
    try:
        return bcrypt.checkpw(normalized.encode("utf-8"), stored_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)

    return decorated_function


def police_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "police_officer" not in session:
            return redirect(url_for("police_login"))
        return f(*args, **kwargs)

    return decorated_function


def get_friendly_crime_label(crime_label):
    return FRIENDLY_CRIME_LABELS.get(crime_label, crime_label.title())


def classify_fir_type(crime_label):
    if crime_label in SPECIAL_REVIEW_CRIMES:
        return "Sensitive FIR"
    if crime_label in COGNIZABLE_CRIMES:
        return "Cognizable FIR"
    return "Non-Cognizable Complaint"


def confidence_band(top_probability, margin):
    if top_probability >= 0.72 and margin >= 0.24:
        return "High"
    if top_probability >= 0.48 and margin >= 0.12:
        return "Medium"
    return "Low"


def build_guidance(crime_label, fir_type, band):
    guidance = []
    if crime_label in EMERGENCY_CRIMES:
        guidance.append("This report may involve an urgent or high-risk offense. Contact local police or emergency services immediately.")
    if fir_type == "Non-Cognizable Complaint":
        guidance.append("This looks closer to a non-cognizable complaint. In real use, a police station may first record an NCR or diary entry instead of a full FIR.")
    if band == "Low":
        guidance.append("Model confidence is low. A manual review by police staff or legal support is strongly recommended before relying on this prediction.")
    else:
        guidance.append("Use this result as decision support only. Final FIR registration and section mapping should be verified by authorized officers.")
    return guidance


def extract_keywords(complaint_text):
    words = re.findall(r"[a-zA-Z]{4,}", complaint_text.lower())
    seen = []
    for word in words:
        if word not in seen:
            seen.append(word)
        if len(seen) == 6:
            break
    return seen


def normalize_document_text(text):
    text = (text or "").lower()
    text = re.sub(r"fir\s*(no|number|id)?\s*[:#-]?\s*[a-z0-9/-]+", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_document_hash(text):
    normalized = normalize_document_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def normalize_fir_id(value):
    if not value:
        return ""

    text = re.sub(r"\s+", "", str(value).strip().upper())
    text = text.translate(OCR_NUM_FIXES)
    standard_match = re.search(r"FIR-?(\d{4})-?(\d+)", text)
    if standard_match:
        year, serial = standard_match.groups()
        return f"FIR-{year}-{int(serial):05d}"

    custom_match = re.match(r"^[\dA-Z]{1,8}[/\-][\dA-Z]{1,8}$", text)
    if custom_match:
        return text.replace("-", "/")

    if re.match(r"^[\w/-]{2,40}$", text):
        return text

    return text


def ocr_corrected_fir_segments(text):
    segments = [text or ""]
    for match in re.finditer(r"FIR[\w\s\-/:#.]{4,32}", text or "", re.IGNORECASE):
        segments.append(match.group(0).translate(OCR_NUM_FIXES))
    return segments


def extract_all_fir_ids(text):
    candidates = set()
    if not text:
        return candidates

    sources = ocr_corrected_fir_segments(text)
    for source in sources:
        for match in FIR_ID_PATTERN.finditer(source):
            normalized = normalize_fir_id(match.group(0))
            if normalized:
                candidates.add(normalized)

        for match in FIR_SPACED_PATTERN.finditer(source):
            normalized = normalize_fir_id(f"FIR-{match.group(1)}-{match.group(2)}")
            if normalized:
                candidates.add(normalized)

        for match in FIR_PS_PATTERN.finditer(source):
            candidates.add(f"{match.group(1)}/{match.group(2)}")

        for match in FIR_SLASH_PATTERN.finditer(source):
            candidates.add(f"{match.group(1)}/{match.group(2)}")

    return candidates


def extract_fir_id_from_text(text):
    candidates = extract_all_fir_ids(text)
    return next(iter(candidates)) if candidates else None


def extract_fir_id_from_filename(filename):
    stem = Path(filename or "").stem.upper()
    if not stem:
        return None

    patterns = [
        r"PS(\d{1,4})[-_](\d{1,4})",
        r"FIR[-_]?(\d{4})[-_](\d+)",
        r"(\d{1,4})[/\-](\d{1,4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, stem)
        if not match:
            continue
        if pattern.startswith("FIR"):
            return normalize_fir_id(f"FIR-{match.group(1)}-{match.group(2)}")
        return f"{match.group(1)}/{match.group(2)}"

    return None


def compact_fir_token(value):
    return re.sub(r"[^A-Z0-9]", "", (value or "").upper())


def document_contains_fir_id(document_text, fir_id):
    submitted = normalize_fir_id(fir_id)
    if not submitted:
        return False

    if submitted in extract_all_fir_ids(document_text):
        return True

    doc_compact = compact_fir_token(document_text)
    submitted_compact = compact_fir_token(submitted)
    if len(submitted_compact) >= 3 and submitted_compact in doc_compact:
        return True

    if "/" in submitted:
        left, right = submitted.split("/", 1)
        left_compact = compact_fir_token(left)
        right_compact = compact_fir_token(right)
        if (
            left_compact
            and right_compact
            and left_compact in doc_compact
            and right_compact in doc_compact
        ):
            return True

        ps_pattern = f"PS{left_compact}{right_compact}"
        if ps_pattern in doc_compact or f"PS{left}-{right}" in document_text.upper():
            return True

    return False


def lookup_registered_fir(fir_id):
    normalized = normalize_fir_id(fir_id)
    if not normalized:
        return None

    matched = FIR.query.filter_by(fir_id=normalized, source="police").first()
    if matched:
        return matched

    return FIR.query.filter(
        func.upper(FIR.fir_id) == normalized,
        FIR.source == "police",
    ).first()


def verify_fir_upload(submitted_fir_id, document_text, upload_filename=None):
    submitted = normalize_fir_id(submitted_fir_id)
    if not submitted:
        return None, "Enter a valid official FIR number (example: FIR-2026-00042 or 58/21)."

    matched_fir = lookup_registered_fir(submitted)
    if matched_fir is None:
        return None, "This FIR is not registered in the official police registry."

    extracted_ids = extract_all_fir_ids(document_text)
    filename_id = extract_fir_id_from_filename(upload_filename)
    if filename_id:
        filename_id = normalize_fir_id(filename_id)

    if submitted in extracted_ids:
        return matched_fir, None

    if document_contains_fir_id(document_text, submitted):
        return matched_fir, None

    if filename_id and filename_id == submitted:
        return matched_fir, None

    upload_hash = build_document_hash(document_text)
    if matched_fir.document_hash and upload_hash == matched_fir.document_hash:
        return matched_fir, None

    if extracted_ids:
        found = ", ".join(sorted(extracted_ids))
        return (
            None,
            f"The entered FIR number does not match the uploaded document. "
            f"Detected in file text: {found}. You entered: {submitted}.",
        )

    if filename_id and filename_id != submitted:
        return (
            None,
            f"The entered FIR number does not match the uploaded file name. "
            f"Detected in file name: {filename_id}. You entered: {submitted}.",
        )

    return (
        None,
        "Could not read a clear FIR number from the uploaded document (common with blurry photos). "
        f"You entered {submitted}. Try a clearer scan, PDF, or TXT export, or re-upload the same file "
        "that was registered at the police station.",
    )


def parse_incident_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def build_ocr_image_variants(upload):
    if Image is None or ImageOps is None:
        raise ValueError("Image OCR requires Pillow and pytesseract.")

    try:
        image = Image.open(upload.stream)
        image = ImageOps.exif_transpose(image)
    except (OSError, UnidentifiedImageError) as exc:
        raise ValueError("The uploaded image could not be opened. Please upload a clear PNG or JPG FIR image.") from exc

    variants = []
    grayscale = image.convert("L")
    width, height = grayscale.size
    if width < 1800:
        scale = 1800 / max(width, 1)
        grayscale = grayscale.resize((int(width * scale), int(height * scale)))

    variants.append(grayscale)
    variants.append(ImageOps.autocontrast(grayscale))
    variants.append(grayscale.point(lambda pixel: 255 if pixel > 165 else 0))
    return variants


def score_ocr_text(text):
    if not text:
        return 0
    ids = extract_all_fir_ids(text)
    digits = len(re.findall(r"\d", text))
    return (len(ids) * 200) + digits + min(len(text) // 40, 80)


def extract_text_from_image(upload):
    if pytesseract is None:
        raise ValueError("Image OCR requires pytesseract to be installed.")

    if TESSERACT_CMD is None:
        raise ValueError("Tesseract OCR was not found. Set TESSERACT_CMD to your tesseract.exe path.")

    variants = build_ocr_image_variants(upload)
    best_text = ""
    best_score = -1

    for image in variants:
        for psm in (6, 3, 11, 4):
            config = f"--oem 3 --psm {psm}"
            try:
                text = pytesseract.image_to_string(image, lang="eng", config=config)
            except pytesseract.TesseractNotFoundError as exc:
                raise ValueError("Tesseract OCR executable was not found. Check the TESSERACT_CMD setting.") from exc
            except pytesseract.TesseractError:
                continue

            cleaned = re.sub(r"\s+", " ", text).strip()
            score = score_ocr_text(cleaned)
            if score > best_score:
                best_score = score
                best_text = cleaned

    if not best_text:
        raise ValueError("Tesseract OCR could not extract readable text from the image.")

    return best_text


def get_tesseract_status():
    if pytesseract is None:
        return {"available": False, "path": None, "version": None, "message": "pytesseract is not installed."}

    if TESSERACT_CMD is None:
        return {"available": False, "path": None, "version": None, "message": "Tesseract executable was not found."}

    try:
        version = str(pytesseract.get_tesseract_version())
    except pytesseract.TesseractError:
        version = "Unknown"

    return {"available": True, "path": TESSERACT_CMD, "version": version, "message": "Image OCR is ready."}


def extract_text_from_upload(upload):
    filename = secure_filename(upload.filename or "")
    extension = Path(filename).suffix.lower()

    if not filename or extension not in UPLOAD_EXTENSIONS:
        raise ValueError("Please upload a .txt, .pdf, .png, .jpg, or .jpeg file.")

    if hasattr(upload.stream, "seek"):
        upload.stream.seek(0)

    if extension == ".txt":
        raw = upload.read()
        text = raw.decode("utf-8", errors="ignore")
    elif extension == ".pdf":
        if PdfReader is None:
            raise ValueError("PDF upload support requires the 'pypdf' package.")
        reader = PdfReader(upload)
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    else:
        text = extract_text_from_image(upload)

    cleaned_text = re.sub(r"\s+", " ", text).strip()
    if len(cleaned_text) < 10:
        raise ValueError("The uploaded FIR content is too short to verify.")

    return filename, cleaned_text


def predict_complaint(complaint_text):
    tfidf = vectorizer.transform([complaint_text]).toarray()
    x_tensor = torch.FloatTensor(tfidf)

    with torch.no_grad():
        logits = model(x_tensor) / 1.35
        probs = torch.softmax(logits, dim=1).numpy()[0]

    ranked = sorted(zip(classes, probs), key=lambda item: item[1], reverse=True)
    predicted_idx = int(np.argmax(probs))
    predicted_crime = classes[predicted_idx]
    top_probability = float(ranked[0][1])
    second_probability = float(ranked[1][1]) if len(ranked) > 1 else 0.0
    margin = top_probability - second_probability
    band = confidence_band(top_probability, margin)
    fir_type = classify_fir_type(predicted_crime)

    probabilities = [
        {
            "crime_type": get_friendly_crime_label(crime),
            "raw_label": crime,
            "probability": round(float(probability), 4),
            "percentage": round(float(probability) * 100, 2),
        }
        for crime, probability in ranked[:8]
    ]

    return {
        "crime_label": predicted_crime,
        "predicted_crime_type": get_friendly_crime_label(predicted_crime),
        "fir_type": fir_type,
        "confidence_score": round(top_probability * 100, 2),
        "confidence_band": band,
        "review_recommended": band != "High",
        "probabilities": probabilities,
        "guidance": build_guidance(predicted_crime, fir_type, band),
        "extracted_keywords": extract_keywords(complaint_text),
    }


def build_citizen_prediction(complaint_text, fir_record):
    """Classify from the citizen's complaint description after registry verification."""
    prediction = predict_complaint(complaint_text)
    prediction["registry_verified"] = True
    prediction["classification_source"] = "complaint_description"

    guidance = [
        "This FIR is verified against the official police registry.",
        "Predicted crime types are based only on your complaint description.",
    ]
    if fir_record.fir_type == "Sensitive FIR":
        guidance.append(
            "This FIR is marked sensitive and should be handled with officer review and appropriate privacy safeguards."
        )

    prediction["guidance"] = guidance + prediction["guidance"]
    return prediction


def serialize_fir_record(fir_record):
    return {
        "fir_id": fir_record.fir_id,
        "name": fir_record.name,
        "age": fir_record.age,
        "gender": fir_record.gender,
        "phone_number": fir_record.phone_number,
        "crime_type": fir_record.crime_type,
        "fir_type": fir_record.fir_type,
        "confidence_score": fir_record.confidence_score,
        "confidence_band": fir_record.confidence_band,
        "complaint": fir_record.complaint,
        "incident_date": str(fir_record.incident_date),
        "incident_time": fir_record.incident_time,
        "incident_location": fir_record.incident_location,
        "latitude": fir_record.latitude,
        "longitude": fir_record.longitude,
        "area": fir_record.area,
        "date": str(fir_record.date),
        "upload_filename": fir_record.upload_filename,
        "station_name": fir_record.officer.station_name if fir_record.officer else None,
    }


@app.route("/")
def home():
    return render_template("home.html", user=session.get("user"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        if "user" in session:
            return redirect(url_for("dashboard"))
        return render_template("register.html", user=session.get("user"))

    data = request.form
    name = data.get("name", "").strip()
    email = normalize_email(data.get("email", ""))
    password = normalize_password(data.get("password", ""))
    confirm_password = normalize_password(data.get("confirm_password", ""))

    form_values = {"name": name, "email": email}

    if not all([name, email, password, confirm_password]):
        return render_template(
            "register.html",
            error="All fields are required.",
            user=session.get("user"),
            **form_values,
        )

    if not is_valid_email(email):
        return render_template(
            "register.html",
            error="Please enter a valid email address.",
            user=session.get("user"),
            **form_values,
        )

    if password != confirm_password:
        return render_template(
            "register.html",
            error="Passwords do not match.",
            user=session.get("user"),
            **form_values,
        )

    if len(password) < 6:
        return render_template(
            "register.html",
            error="Password must be at least 6 characters.",
            user=session.get("user"),
            **form_values,
        )

    if find_user_by_email(email):
        return render_template(
            "register.html",
            error="Email already registered.",
            user=session.get("user"),
            **form_values,
        )

    hashed = hash_password(password)
    new_user = User(name=name, email=email, password=hashed)

    try:
        db.session.add(new_user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return render_template(
            "register.html",
            error="Email already registered.",
            user=session.get("user"),
            **form_values,
        )
    except Exception:
        db.session.rollback()
        return render_template(
            "register.html",
            error="Could not create your account. Please try again.",
            user=session.get("user"),
            **form_values,
        )

    session["user"] = {"id": new_user.id, "name": new_user.name, "email": new_user.email}
    return redirect(url_for("dashboard"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        if "user" in session:
            return redirect(url_for("dashboard"))
        success_message = session.pop("login_success", None)
        return render_template("login.html", user=session.get("user"), success=success_message)

    data = request.form
    email = normalize_email(data.get("email", ""))
    password = normalize_password(data.get("password", ""))

    if not all([email, password]):
        return render_template(
            "login.html",
            error="All fields are required.",
            email=email,
            user=session.get("user"),
        )

    if not is_valid_email(email):
        return render_template(
            "login.html",
            error="Please enter a valid email address.",
            email=email,
            user=session.get("user"),
        )

    user = find_user_by_email(email)
    if not user:
        return render_template(
            "login.html",
            error="No account found for that email. Check the address or register first.",
            email=email,
            user=session.get("user"),
        )

    if not check_password(password, user.password):
        return render_template(
            "login.html",
            error="Incorrect password. Use Forgot your password below to set a new one.",
            email=email,
            user=session.get("user"),
        )

    session["user"] = {"id": user.id, "name": user.name, "email": user.email}
    return redirect(url_for("dashboard"))


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("home"))


@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "GET":
        if "user" in session:
            return redirect(url_for("dashboard"))
        return render_template("forgot_password.html", user=session.get("user"))

    email = normalize_email(request.form.get("email", ""))
    if not email:
        return render_template(
            "forgot_password.html",
            error="Please enter your email address.",
            email=email,
            user=session.get("user"),
        )

    if not is_valid_email(email):
        return render_template(
            "forgot_password.html",
            error="Please enter a valid email address.",
            email=email,
            user=session.get("user"),
        )

    user = find_user_by_email(email)
    reset_url = None
    if user:
        token = generate_password_reset_token(user.email)
        reset_url = url_for("reset_password", token=token, _external=True)

    return render_template(
        "forgot_password.html",
        success=True,
        email=email,
        reset_url=reset_url,
        user=session.get("user"),
    )


@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    email = verify_password_reset_token(token)
    if email is None:
        return render_template(
            "reset_password.html",
            error="This reset link is invalid or has expired. Request a new one.",
            user=session.get("user"),
        )

    if request.method == "GET":
        return render_template("reset_password.html", token=token, user=session.get("user"))

    password = normalize_password(request.form.get("password", ""))
    confirm_password = normalize_password(request.form.get("confirm_password", ""))

    if not password or not confirm_password:
        return render_template(
            "reset_password.html",
            token=token,
            error="Both password fields are required.",
            user=session.get("user"),
        )

    if password != confirm_password:
        return render_template(
            "reset_password.html",
            token=token,
            error="Passwords do not match.",
            user=session.get("user"),
        )

    if len(password) < 6:
        return render_template(
            "reset_password.html",
            token=token,
            error="Password must be at least 6 characters.",
            user=session.get("user"),
        )

    user = find_user_by_email(email)
    if not user:
        return render_template(
            "reset_password.html",
            error="This reset link is invalid or has expired. Request a new one.",
            user=session.get("user"),
        )

    user.password = hash_password(password)
    db.session.commit()

    session["login_success"] = "Your password has been updated. You can sign in now."
    return redirect(url_for("login"))


@app.route("/police/login", methods=["GET", "POST"])
def police_login():
    if request.method == "GET":
        if "police_officer" in session:
            return redirect(url_for("police_portal"))
        return render_template("police_login.html", user=session.get("user"), officer=session.get("police_officer"))

    officer_userid = request.form.get("officer_userid", "").strip()
    secret_key = request.form.get("secret_key", "")

    if not officer_userid or not secret_key:
        return render_template("police_login.html", error="Officer ID and secret key are required.", user=session.get("user"))

    officer = PoliceOfficer.query.filter_by(officer_userid=officer_userid).first()
    if not officer:
        return render_template("police_login.html", error="Invalid officer credentials.", user=session.get("user"))

    if not bcrypt.checkpw(secret_key.encode("utf-8"), officer.secret_key_hash.encode("utf-8")):
        return render_template("police_login.html", error="Invalid officer credentials.", user=session.get("user"))

    session["police_officer"] = {
        "id": officer.id,
        "name": officer.name,
        "officer_userid": officer.officer_userid,
        "station_name": officer.station_name,
    }
    return redirect(url_for("police_portal"))


@app.route("/police/logout")
def police_logout():
    session.pop("police_officer", None)
    return redirect(url_for("police_login"))


@app.route("/police/portal")
@police_required
def police_portal():
    recent_firs = (
        FIR.query.filter_by(source="police", officer_id=session["police_officer"]["id"])
        .order_by(FIR.created_at.desc())
        .limit(8)
        .all()
    )
    return render_template(
        "police_portal.html",
        officer=session.get("police_officer"),
        user=session.get("user"),
        today=date.today().isoformat(),
        recent_firs=recent_firs,
    )


@app.route("/api/police/register-fir", methods=["POST"])
@police_required
def police_register_fir():
    data = request.form
    upload = request.files.get("fir_file")

    if upload is None:
        return jsonify({"error": "Please upload the official FIR softcopy."}), 400

    try:
        filename, document_text = extract_text_from_upload(upload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    fir_id = normalize_fir_id(data.get("fir_id", "").strip())
    name = data.get("name", "").strip()
    age = data.get("age")
    gender = data.get("gender", "").strip()
    phone_number = data.get("phone_number", "").strip()
    crime_type = data.get("crime_type", "").strip()
    fir_type = data.get("fir_type", "").strip()
    incident_date = parse_incident_date(data.get("incident_date"))
    incident_time = data.get("incident_time", "").strip()
    incident_location = data.get("incident_location", "").strip()
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    complaint = data.get("complaint", "").strip() or document_text
    fir_header = f"FIR Number: {fir_id}"
    if fir_id and fir_id not in document_text and compact_fir_token(fir_id) not in compact_fir_token(document_text):
        document_text = f"{fir_header}\n{document_text}"

    if (
        not fir_id
        or not name
        or age in (None, "")
        or not gender
        or not phone_number
        or not crime_type
        or not fir_type
        or incident_date is None
        or not incident_location
        or latitude in (None, "")
        or longitude in (None, "")
        or not complaint
    ):
        return jsonify({"error": "Please complete all official FIR registration fields."}), 400

    if FIR.query.filter_by(fir_id=fir_id).first():
        return jsonify({"error": "This FIR ID is already registered in the police registry."}), 409

    try:
        age = int(age)
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return jsonify({"error": "Age and coordinates must be valid numbers."}), 400

    new_fir = FIR(
        fir_id=fir_id,
        name=name,
        age=age,
        gender=gender,
        phone_number=phone_number,
        fir_type=fir_type,
        crime_type=crime_type,
        complaint=complaint,
        incident_date=incident_date,
        incident_time=incident_time or None,
        incident_location=incident_location,
        latitude=latitude,
        longitude=longitude,
        area=incident_location,
        confidence_score=100.0,
        confidence_band="Official",
        upload_filename=filename,
        document_text=document_text,
        document_hash=build_document_hash(document_text),
        source="police",
        date=date.today(),
        officer_id=session["police_officer"]["id"],
    )

    db.session.add(new_fir)
    db.session.commit()

    return jsonify({"message": "Official FIR registered successfully.", "record": serialize_fir_record(new_fir)})


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", user=session.get("user"), today=date.today().isoformat())


@app.route("/api/ocr-status")
def ocr_status():
    return jsonify(get_tesseract_status())


@app.route("/api/upload-fir", methods=["POST"])
@login_required
def upload_fir():
    upload = request.files.get("fir_file")
    submitted_fir_id = request.form.get("fir_id", "").strip()
    if not submitted_fir_id:
        return jsonify({"error": "Official FIR number is required."}), 400
    if upload is None:
        return jsonify({"error": "Please choose an FIR file to upload."}), 400

    try:
        filename, extracted_text = extract_text_from_upload(upload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    matched_fir, error_message = verify_fir_upload(
        submitted_fir_id,
        extracted_text,
        upload_filename=filename,
    )
    if matched_fir is None:
        return jsonify({"error": error_message}), 404

    return jsonify(
        {
            "filename": filename,
            "verified_fir": serialize_fir_record(matched_fir),
            "verified": True,
        }
    )


@app.route("/api/predict", methods=["POST"])
@login_required
def predict():
    data = request.get_json(silent=True) or {}

    complaint = data.get("complaint", "").strip()
    upload_filename = data.get("upload_filename", "").strip() or None
    submitted_fir_id = data.get("official_fir_id", "").strip()

    if not submitted_fir_id:
        return jsonify({"error": "Verify your FIR copy before classification."}), 400

    if not complaint:
        return jsonify({"error": "Complaint description is required for classification."}), 400

    if len(complaint) < 40:
        return jsonify(
            {"error": "Complaint description should be at least 40 characters for reliable classification."}
        ), 400

    matched_fir = lookup_registered_fir(submitted_fir_id)
    if matched_fir is None:
        return jsonify(
            {"error": "This FIR is not present in the official police registry. Verify your FIR copy first."}
        ), 404

    required_fields = {
        "name": matched_fir.name,
        "age": matched_fir.age,
        "gender": matched_fir.gender,
        "phone_number": matched_fir.phone_number,
        "incident_date": matched_fir.incident_date,
        "incident_location": matched_fir.incident_location,
        "latitude": matched_fir.latitude,
        "longitude": matched_fir.longitude,
    }
    missing = [field for field, value in required_fields.items() if value in (None, "")]
    if missing:
        return jsonify(
            {"error": "Verified FIR record is incomplete. Contact the registering police station."}
        ), 400

    prediction = build_citizen_prediction(complaint, matched_fir)

    return jsonify(
        {
            "fir_id": matched_fir.fir_id,
            **prediction,
            "record": serialize_fir_record(matched_fir),
            "registry_verified": True,
            "upload_filename": upload_filename,
        }
    )


@app.route("/api/heatmap-data")
def heatmap_data():
    crime_filter = request.args.get("crime_type", "")
    query = FIR.query

    if crime_filter and crime_filter != "All":
        query = query.filter_by(crime_type=crime_filter)

    firs = query.all()
    points = [
        {
            "Latitude": fir.latitude,
            "Longitude": fir.longitude,
            "Crime_Type": fir.crime_type,
            "FIR_Type": fir.fir_type,
            "Confidence_Band": fir.confidence_band,
        }
        for fir in firs
    ]
    return jsonify(points)


@app.route("/api/crime-types")
def crime_types():
    crime_types_data = db.session.query(FIR.crime_type).distinct().all()
    return jsonify(sorted([crime[0] for crime in crime_types_data]))


@app.route("/api/stats")
def stats():
    firs = FIR.query.all()
    total = len(firs)
    crime_counts = {}
    fir_type_counts = {}
    confidence_counts = {"High": 0, "Medium": 0, "Low": 0}

    for fir in firs:
        crime_counts[fir.crime_type] = crime_counts.get(fir.crime_type, 0) + 1
        fir_type_counts[fir.fir_type] = fir_type_counts.get(fir.fir_type, 0) + 1
        confidence_counts[fir.confidence_band] = confidence_counts.get(fir.confidence_band, 0) + 1

    return jsonify(
        {
            "total_firs": total,
            "crime_counts": crime_counts,
            "fir_type_counts": fir_type_counts,
            "confidence_counts": confidence_counts,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
