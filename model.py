"""Crime type classification model using TF-IDF and Logistic Regression."""

import os
import pickle

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline

MODEL_PATH = "model/crime_classifier.pkl"
DATASET_PATH = "dataset/fir_dataset.csv"


def train_model():
    """Train the crime type classifier and save it."""
    df = pd.read_csv(DATASET_PATH)
    X = df["Complaint"]
    y = df["Crime_Type"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words="english",
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=10,
            random_state=42,

        )),
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("Classification Report:")
    print(classification_report(y_test, y_pred))

    accuracy = pipeline.score(X_test, y_test)
    print(f"Accuracy: {accuracy:.4f}")

    os.makedirs("model", exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"Model saved to {MODEL_PATH}")

    return pipeline


def load_model():
    """Load the trained model from disk, training if not found."""
    if not os.path.exists(MODEL_PATH):
        print("Model not found, training...")
        return train_model()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def predict_crime_type(model, complaint_text):
    """Predict the crime type and return probabilities."""
    prediction = model.predict([complaint_text])[0]
    probabilities = model.predict_proba([complaint_text])[0]
    classes = model.classes_
    prob_dict = {
        cls: round(float(prob), 4)
        for cls, prob in sorted(
            zip(classes, probabilities), key=lambda x: x[1], reverse=True
        )
    }
    return prediction, prob_dict


if __name__ == "__main__":
    train_model()
