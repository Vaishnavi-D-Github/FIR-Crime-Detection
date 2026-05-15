"""Flask application for FIR Crime Classification and Hotspot Detection."""

import csv
import json
import os
from datetime import date

import bcrypt
import pandas as pd
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from functools import wraps

from model import load_model, predict_crime_type

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "fir-crime-detection-secret-key-change-in-production")

DATASET_PATH = "dataset/fir_dataset.csv"
USERS_PATH = "data/users.json"

model = load_model()


def ensure_data_dir():
    """Ensure the data directory and users file exist."""
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(USERS_PATH):
        with open(USERS_PATH, "w") as f:
            json.dump({}, f)


def get_users():
    """Load users from JSON file."""
    ensure_data_dir()
    with open(USERS_PATH) as f:
        return json.load(f)


def save_users(users):
    """Save users to JSON file."""
    ensure_data_dir()
    with open(USERS_PATH, "w") as f:
        json.dump(users, f, indent=2)


def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function


def get_dataset():
    """Read the FIR dataset."""
    return pd.read_csv(DATASET_PATH)


@app.route("/")
def home():
    """Render the homepage."""
    return render_template("home.html", user=session.get("user"))


@app.route("/register", methods=["GET", "POST"])
def register():
    """User registration."""
    if request.method == "GET":
        return render_template("register.html")

    data = request.form
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not all([name, email, password, confirm_password]):
        return render_template("register.html", error="All fields are required.")

    if password != confirm_password:
        return render_template("register.html", error="Passwords do not match.")

    if len(password) < 6:
        return render_template("register.html", error="Password must be at least 6 characters.")

    users = get_users()
    if email in users:
        return render_template("register.html", error="Email already registered.")

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    users[email] = {"name": name, "email": email, "password": hashed}
    save_users(users)

    session["user"] = {"name": name, "email": email}
    return redirect(url_for("dashboard"))


@app.route("/login", methods=["GET", "POST"])
def login():
    """User login."""
    if request.method == "GET":
        return render_template("login.html")

    data = request.form
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not all([email, password]):
        return render_template("login.html", error="All fields are required.")

    users = get_users()
    user = users.get(email)

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return render_template("login.html", error="Invalid email or password.")

    session["user"] = {"name": user["name"], "email": user["email"]}
    return redirect(url_for("dashboard"))


@app.route("/logout")
def logout():
    """User logout."""
    session.pop("user", None)
    return redirect(url_for("home"))


@app.route("/dashboard")
@login_required
def dashboard():
    """Render the main FIR filing dashboard."""
    return render_template("dashboard.html", user=session.get("user"))


@app.route("/api/predict", methods=["POST"])
@login_required
def predict():
    """Predict crime type from complaint text and register the FIR."""
    data = request.get_json()
    name = data.get("name", "").strip()
    age = data.get("age")
    gender = data.get("gender", "").strip()
    complaint = data.get("complaint", "").strip()
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not all([name, age, complaint, latitude, longitude, gender]):
        return jsonify({"error": "All fields are required."}), 400

    predicted_crime, probabilities = predict_crime_type(model, complaint)

    df = get_dataset()
    next_id = len(df) + 1
    today = date.today().isoformat()
    fir_id = f"FIR-{date.today().year}-{next_id:05d}"

    new_record = {
        "FIR_ID": fir_id,
        "Name": name,
        "Age": int(age),
        "Gender": gender,
        "Crime_Type": predicted_crime,
        "Complaint": complaint,
        "Latitude": float(latitude),
        "Longitude": float(longitude),
        "Date": today,
        "Area": "User Reported",
    }

    fieldnames = [
        "FIR_ID", "Name", "Age", "Gender", "Crime_Type",
        "Complaint", "Latitude", "Longitude", "Date", "Area",
    ]
    with open(DATASET_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writerow(new_record)

    return jsonify({
        "fir_id": fir_id,
        "predicted_crime_type": predicted_crime,
        "probabilities": probabilities,
        "record": new_record,
    })


@app.route("/api/heatmap-data")
def heatmap_data():
    """Return all crime location data for the heatmap."""
    df = get_dataset()
    crime_filter = request.args.get("crime_type", "")
    if crime_filter and crime_filter != "All":
        df = df[df["Crime_Type"] == crime_filter]

    points = df[["Latitude", "Longitude", "Crime_Type"]].dropna().to_dict("records")
    return jsonify(points)


@app.route("/api/crime-types")
def crime_types():
    """Return the list of unique crime types."""
    df = get_dataset()
    types = sorted(df["Crime_Type"].unique().tolist())
    return jsonify(types)


@app.route("/api/stats")
def stats():
    """Return crime statistics."""
    df = get_dataset()
    crime_counts = df["Crime_Type"].value_counts().to_dict()
    total = len(df)
    return jsonify({
        "total_firs": total,
        "crime_counts": crime_counts,
    })


if __name__ == "__main__":
    ensure_data_dir()
    app.run(debug=True, host="0.0.0.0", port=5000)
