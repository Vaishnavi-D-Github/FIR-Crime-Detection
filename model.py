"""Crime type classification model using PyTorch neural network with TF-IDF features."""

import json
import os
import pickle

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import shutil

MODEL_DIR = "model"
MODEL_PATH = os.path.join(MODEL_DIR, "crime_classifier.pth")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")
LABEL_ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")
DATASET_PATH = "dataset/Crimes_dataset.csv"


class CrimeClassifier(nn.Module):
    """Multi-layer neural network for crime type classification."""

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


class CrimeModel:
    """Wrapper for the PyTorch crime classifier with TF-IDF vectorizer."""

    def __init__(self):
        self.vectorizer = None
        self.label_encoder = None
        self.model = None
        self.classes = None

    def train(self, dataset_path=DATASET_PATH, sample_size=100000):
        """Train the crime classifier."""
        print(f"Loading dataset from {dataset_path} ...")
        df = pd.read_csv(
            dataset_path,
            usecols=["Description", "Primary Type"],
            low_memory=False,
        )
        print(f"Loaded {len(df):,} rows.")
        df = df.dropna(subset=["Description", "Primary Type"])
        df["Description"] = df["Description"].astype(str)
        df["Primary Type"] = df["Primary Type"].astype(str)

        if sample_size and len(df) > sample_size:
            df = df.sample(n=sample_size, random_state=42)
            print(f"Using random sample of {sample_size:,} rows for training.")

        df = df[df["Description"].str.strip().str.len() > 0]
        class_counts = df["Primary Type"].value_counts()
        valid_classes = class_counts[class_counts >= 2].index
        dropped_classes = len(class_counts) - len(valid_classes)
        if dropped_classes:
            print(f"Dropped {dropped_classes} crime type(s) with fewer than 2 samples.")
        df = df[df["Primary Type"].isin(valid_classes)]

        X_text = df["Description"].values
        y_text = df["Primary Type"].values

        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y_text)
        self.classes = self.label_encoder.classes_.tolist()

        X_train_text, X_test_text, y_train, y_test = train_test_split(
            X_text,
            y_encoded,
            test_size=0.2,
            random_state=42,
            stratify=y_encoded,
        )

        self.vectorizer = TfidfVectorizer(
            max_features=1000, ngram_range=(1, 1), stop_words="english"
        )
        X_train_tfidf = self.vectorizer.fit_transform(X_train_text).toarray()
        X_test_tfidf = self.vectorizer.transform(X_test_text).toarray()

        input_dim = X_train_tfidf.shape[1]
        num_classes = len(self.classes)

        X_train_tensor = torch.FloatTensor(X_train_tfidf)
        y_train_tensor = torch.LongTensor(y_train)
        X_test_tensor = torch.FloatTensor(X_test_tfidf)

        self.model = CrimeClassifier(input_dim, num_classes)
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)

        self.model.train()
        num_epochs = 50
        batch_size = 32
        n_samples = X_train_tensor.shape[0]

        for epoch in range(num_epochs):
            indices = torch.randperm(n_samples)
            total_loss = 0.0
            n_batches = 0

            for start in range(0, n_samples, batch_size):
                end = min(start + batch_size, n_samples)
                batch_idx = indices[start:end]
                batch_X = X_train_tensor[batch_idx]
                batch_y = y_train_tensor[batch_idx]

                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y)

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                total_loss += loss.item()
                n_batches += 1

            if (epoch + 1) % 10 == 0:
                avg_loss = total_loss / n_batches
                print(f"Epoch [{epoch + 1}/{num_epochs}], Loss: {avg_loss:.4f}")

        self.model.eval()
        with torch.no_grad():
            test_outputs = self.model(X_test_tensor)
            _, predicted = torch.max(test_outputs, 1)
            y_pred = predicted.numpy()

        labels = np.unique(np.concatenate([y_test, y_pred]))

        print("\nClassification Report:")

        print(classification_report(
            y_test,
            y_pred,
            labels=labels,
            target_names=self.label_encoder.inverse_transform(labels)
        ))

        # Calculate Accuracy
        accuracy = accuracy_score(y_test, y_pred)

        print("\nModel Accuracy:")
        print(f"Accuracy: {accuracy * 100:.2f}%")

        self._save()
        return self

    def _save(self):
        """Save model, vectorizer, and label encoder to disk."""
        os.makedirs(MODEL_DIR, exist_ok=True)
        torch.save(self.model.state_dict(), MODEL_PATH)
        with open(VECTORIZER_PATH, "wb") as f:
            pickle.dump(self.vectorizer, f)
        with open(LABEL_ENCODER_PATH, "wb") as f:
            pickle.dump(self.label_encoder, f)
        metadata = {
            "input_dim": len(self.vectorizer.vocabulary_),
            "num_classes": len(self.classes),
            "classes": self.classes,
        }
        with open(METADATA_PATH, "w") as f:
            json.dump(metadata, f)

        print(f"Model saved to {MODEL_DIR}/")

        # Copy .pkl files to project root for easy download/access
        shutil.copy(VECTORIZER_PATH, "tfidf_vectorizer.pkl")
        shutil.copy(LABEL_ENCODER_PATH, "label_encoder.pkl")

        print("PKL files copied successfully.")

    def load(self):
        """Load model from disk."""
        with open(METADATA_PATH) as f:
            metadata = json.load(f)
        with open(VECTORIZER_PATH, "rb") as f:
            self.vectorizer = pickle.load(f)
        with open(LABEL_ENCODER_PATH, "rb") as f:
            self.label_encoder = pickle.load(f)
        self.classes = metadata["classes"]
        input_dim = len(self.vectorizer.vocabulary_)
        num_classes = metadata["num_classes"]
        self.model = CrimeClassifier(input_dim, num_classes)
        self.model.load_state_dict(torch.load(MODEL_PATH, weights_only=True))
        self.model.eval()
        return self

    def predict(self, complaint_text):
        """Predict crime type with probabilities."""
        tfidf = self.vectorizer.transform([complaint_text]).toarray()
        x = torch.FloatTensor(tfidf)
        with torch.no_grad():
            output = self.model(x)
            probabilities = torch.softmax(output, dim=1).numpy()[0]

        predicted_idx = int(np.argmax(probabilities))
        predicted_class = self.classes[predicted_idx]

        prob_dict = {
            cls: round(float(prob), 4)
            for cls, prob in sorted(
                zip(self.classes, probabilities),
                key=lambda x: x[1],
                reverse=True,
            )
        }
        return predicted_class, prob_dict


def load_model():
    """Load or train the crime classifier."""
    crime_model = CrimeModel()
    if all(
        os.path.exists(p)
        for p in [MODEL_PATH, VECTORIZER_PATH, LABEL_ENCODER_PATH, METADATA_PATH]
    ):
        crime_model.load()
        print("Model loaded from disk.")
    else:
        print("Model not found, training...")
        crime_model.train()
    return crime_model


def predict_crime_type(model, complaint_text):
    """Predict the crime type and return probabilities."""
    return model.predict(complaint_text)


if __name__ == "__main__":
    crime_model = CrimeModel()
    crime_model.train()
