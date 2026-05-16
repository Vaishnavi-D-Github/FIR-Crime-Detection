# Citizen FIR Portal

Citizen FIR Portal is a Flask-based web application that helps common citizens prepare incident reports, upload FIR drafts, classify the likely crime type, estimate the likely FIR category, and visualize reporting hotspots on a map.

## What Makes This Version Stronger

- More polished citizen-facing interface with a premium dashboard layout
- FIR workflow designed around real user needs instead of only a demo form
- Upload support for `.txt` and `.pdf` FIR drafts
- Upload support for `.txt`, searchable `.pdf`, `.png`, `.jpg`, and `.jpeg` files
- Separate police officer portal for registering official FIR softcopies
- Citizen-side FIR verification before classification to block dummy FIR submissions
- Registry-backed crime classification after FIR verification
- FIR category support:
  - `Sensitive FIR`
  - `Cognizable FIR`
  - `Non-Cognizable Complaint`
- Hotspot visualization and live statistics
- Better portability through SQLite fallback

## Important Academic Honesty Note

The current model is trained on a generic crime dataset and not on real Indian FIR narratives. Because of that:

- the system is best presented as an **FIR assistance and classification support tool**
- the output should **not** be described as a final legal FIR decision
- real deployment would require FIR-specific annotated training data and legal validation

This makes the concept realistic, defensible in presentation, and more appropriate for real-life assisted use.

## Features

- User registration and login
- Police officer login with officer user ID and secret key
- Official police FIR registration portal
- Incident reporting form with:
  - full name
  - contact number
  - age and gender
  - incident date and time
  - address or locality
  - complaint narrative
  - map-based incident location
- FIR upload analysis for text, PDF, and OCR-supported image files
- Registry match scoring against police-registered FIRs
- Predicted crime type from the verified official FIR record
- Confidence score and confidence band
- FIR type guidance for user awareness
- Live crime hotspot map
- Real-time dashboard statistics

## Tech Stack

- Backend: Flask
- Database: SQLite by default, MySQL supported through `DATABASE_URL`
- ML: PyTorch + TF-IDF
- Frontend: HTML, CSS, JavaScript
- Maps: Leaflet.js + OpenStreetMap
- Migrations: Flask-Migrate / Alembic

## Setup

```bash
pip install -r requirements.txt
flask db upgrade
python seed_database.py
python app.py
```

Open: [http://localhost:5000](http://localhost:5000)

Image OCR uses `pytesseract` and Tesseract OCR. On Windows, the app auto-detects common Tesseract install paths such as `C:\Program Files\Tesseract-OCR\tesseract.exe`. If Tesseract is installed somewhere else, set `TESSERACT_CMD` to the full `tesseract.exe` path before running the app.

## Demo Officer Credentials

After running `python seed_database.py`, use any of these officer accounts:

```text
MH-PI-1001 / andheri-2026-key
MH-PI-1002 / dadar-2026-key
MH-PI-1003 / bandra-2026-key
```

The seed script creates 100 official FIR records in the police registry. The citizen portal can classify only FIRs that match those official records.

## Database Configuration

By default, the application uses SQLite:

```env
DATABASE_URL=sqlite:///fir_crime.db
```

If you want MySQL, set:

```env
DATABASE_URL=mysql+pymysql://username:password@localhost/fir_crime_db
```

## Real-Life Use Case

This project can be positioned as a first-stage citizen support system for:

- police help desks
- e-governance complaint portals
- legal aid support centers
- NGO victim-support desks
- incident pre-screening and digital intake counters

## Workflow

1. A police officer logs into `/police/login`.
2. The officer registers the FIR details and uploads the official softcopy.
3. The official FIR becomes part of the registry and appears on the hotspot map.
4. A citizen logs into the normal dashboard and uploads or enters their FIR copy.
5. The system compares the citizen copy with the official registry.
6. Classification is shown only if the FIR is verified.

## Suggested Next Upgrade

For a stronger final version, the next best improvement would be:

1. Collect FIR-style training examples from Indian legal/reporting formats
2. Add multilingual complaint support
3. Add OCR for scanned FIR images
4. Add officer review workflow and downloadable report export
