# FIR Crime Detection System

A web-based FIR (First Information Report) Classification and Crime Hotspot Detection system built with Flask, PyTorch, and Leaflet.js.

## Features

- **User Authentication**: Login and Registration with bcrypt password hashing
- **Homepage**: Landing page with feature overview and crime type listing
- **FIR Filing Form**: Submit complaints with Name, Age, Gender, Complaint text, and map-based address selection (latitude/longitude)
- **Crime Type Classification**: Automatically detects the crime type from complaint text using a PyTorch neural network (TF-IDF + Multi-layer NN)
- **Crime Hotspot Heatmap**: Interactive map showing crime hotspots across Mumbai metropolitan region, including newly filed FIRs
- **Crime Statistics**: Real-time dashboard showing total FIRs and crime type distribution
- **Crime Type Filtering**: Filter the heatmap by specific crime types

## Crime Types Detected

Theft, Assault, Robbery, Fraud, Kidnapping, Murder, Cybercrime, Drug Offense, Domestic Violence, Burglary

## Setup & Installation

```bash
# Clone the repository
git clone https://github.com/Vaishnavi-D-Github/FIR-Crime-Detection.git
cd FIR-Crime-Detection

# Install dependencies
pip install -r requirements.txt

# Generate the dataset (if not already present)
python generate_dataset.py

# Train the PyTorch model
python model.py

# Run the application
python app.py
```

The application will be available at `http://localhost:5000`.

## How to Use

1. **Register/Login**: Create an account or sign in
2. **Fill the Form**: Enter your Name, Age, Gender, and describe your complaint
3. **Select Location**: Click anywhere on the map to set your address (latitude and longitude are auto-filled)
4. **Submit**: Click "Submit Complaint" to file the FIR
5. **View Results**: The system predicts the crime type with confidence scores
6. **Explore Heatmap**: Your complaint location is added to the heatmap in real-time
7. **Filter Crimes**: Use the dropdown to filter the heatmap by crime type

## Project Structure

```
FIR-Crime-Detection/
├── app.py                  # Flask application with auth
├── model.py                # PyTorch crime classifier
├── generate_dataset.py     # Synthetic dataset generator
├── requirements.txt        # Python dependencies
├── dataset/
│   └── fir_dataset.csv     # FIR crime dataset (1000 records)
├── templates/
│   ├── base.html           # Base layout template
│   ├── home.html           # Homepage
│   ├── login.html          # Login page
│   ├── register.html       # Registration page
│   └── dashboard.html      # FIR filing dashboard with map
└── static/
    ├── css/
    │   └── style.css       # Styles
    └── js/
        └── app.js          # Frontend JavaScript (map, form, heatmap)
```

## Tech Stack

- **Backend**: Flask (Python)
- **ML**: PyTorch (Multi-layer Neural Network with TF-IDF features)
- **Auth**: bcrypt for password hashing, Flask sessions
- **Frontend**: HTML, CSS, JavaScript
- **Maps**: Leaflet.js with OpenStreetMap tiles
- **Heatmap**: leaflet-heat plugin
- **Data**: pandas for data handling
