"""Flask application for FIR Crime Classification and Hotspot Detection."""

import csv
import os
from datetime import date

import pandas as pd
from flask import Flask, jsonify, render_template, request

from model import load_model, predict_crime_type

app = Flask(__name__)

DATASET_PATH = "dataset/fir_dataset.csv"

model = load_model()


def get_dataset():
    """Read the FIR dataset."""
    return pd.read_csv(DATASET_PATH)


@app.route("/")
def index():
    """Render the main page."""
    return render_template("index.html")


@app.route("/api/predict", methods=["POST"])
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
    app.run(debug=True, host="0.0.0.0", port=5000)
