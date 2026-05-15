"""Generate a synthetic FIR crime dataset for training and demonstration."""

import csv
import random

random.seed(42)

CRIME_TYPES = [
    "Theft",
    "Assault",
    "Robbery",
    "Fraud",
    "Kidnapping",
    "Murder",
    "Cybercrime",
    "Drug Offense",
    "Domestic Violence",
    "Burglary",
]

COMPLAINT_TEMPLATES = {
    "Theft": [
        "My mobile phone was stolen while I was travelling in the bus near {area}.",
        "Someone stole my wallet containing cash and cards at {area} market.",
        "My two-wheeler was stolen from the parking lot near {area}.",
        "Gold chain snatched by two men on a bike near {area} junction.",
        "Laptop stolen from my office cabin at {area} tech park.",
        "My car was broken into and valuables were stolen at {area} parking.",
        "Pickpocket stole my purse while shopping at {area} mall.",
        "Bicycle stolen from outside {area} railway station.",
    ],
    "Assault": [
        "I was physically attacked by unknown persons near {area} bus stop.",
        "Got beaten up by a group of men after an argument at {area}.",
        "Was assaulted by neighbour over a property dispute in {area}.",
        "Attacked with a knife by an unknown person near {area} park.",
        "Road rage incident led to physical assault at {area} signal.",
        "Was assaulted by colleagues after office hours near {area}.",
    ],
    "Robbery": [
        "Armed robbery at my shop in {area}. Cash and goods worth lakhs were looted.",
        "Three men with weapons robbed a jewellery store at {area}.",
        "Bank robbery attempt at {area} branch. Suspects fled with cash.",
        "Home invasion robbery at my residence in {area} colony.",
        "ATM robbery by masked men at {area} main road.",
        "Petrol pump looted at gunpoint near {area} highway.",
    ],
    "Fraud": [
        "Online banking fraud. Rs. 50,000 debited from my account without authorisation. I reside in {area}.",
        "Cheated by a fake job placement agency in {area}.",
        "Insurance fraud by agent who collected premiums but never issued policy in {area}.",
        "Real estate fraud. Sold a property with forged documents in {area}.",
        "Credit card cloned and used for unauthorised purchases. I live near {area}.",
        "Investment scam. Lost money to a Ponzi scheme operating from {area}.",
    ],
    "Kidnapping": [
        "My 8-year-old child was kidnapped from outside school near {area}.",
        "A young girl was abducted by unknown men in a white van near {area}.",
        "Businessman kidnapped for ransom from his office in {area}.",
        "Woman kidnapped from her workplace in {area} industrial area.",
        "Child went missing from a park in {area} and is suspected to be kidnapped.",
    ],
    "Murder": [
        "Dead body found with stab wounds near {area} lake.",
        "Man found murdered in his apartment in {area} society.",
        "Woman killed by known assailant in {area} residential area.",
        "Double homicide reported at a house in {area} colony.",
        "Unidentified body found near {area} railway tracks.",
    ],
    "Cybercrime": [
        "My social media account was hacked and used for sending abusive messages. I am from {area}.",
        "Received threatening emails from an unknown sender. Reporting from {area}.",
        "Victim of an online phishing scam. Lost Rs. 1 lakh. I live in {area}.",
        "Someone created a fake profile using my photos and is harassing people. I reside in {area}.",
        "Ransomware attack on my business computer systems at {area} office.",
        "Online stalking and cyber harassment through social media. Complainant from {area}.",
    ],
    "Drug Offense": [
        "Suspected drug dealing activity near {area} slum area.",
        "Found suspicious white powder packets near {area} park.",
        "Drug peddlers operating near {area} college campus.",
        "Illicit liquor being sold at {area} market area.",
        "Narcotics being smuggled through {area} bus terminus.",
    ],
    "Domestic Violence": [
        "Being physically abused by husband at our home in {area}.",
        "Dowry harassment by in-laws at residence in {area}.",
        "Wife beaten and threatened by husband and his family in {area}.",
        "Elderly parents being abused by their son at {area} house.",
        "Domestic violence complaint against spouse. We live in {area}.",
        "Verbal and physical abuse by partner at our flat in {area}.",
    ],
    "Burglary": [
        "House was broken into while we were away. Jewellery and cash stolen from {area} residence.",
        "Office burglary at {area}. Electronic equipment stolen.",
        "Shop broken into at night in {area} market. Stock worth lakhs stolen.",
        "Warehouse burglary at {area} industrial area.",
        "Apartment burglary in {area} society. Lock was broken.",
        "Godown broken into and goods stolen at {area} commercial complex.",
    ],
}

AREAS = [
    "Andheri", "Bandra", "Colaba", "Dadar", "Juhu", "Kurla", "Malad",
    "Borivali", "Thane", "Powai", "Worli", "Chembur", "Goregaon",
    "Kandivali", "Vikhroli", "Ghatkopar", "Mulund", "Bhandup",
    "Vashi", "Nerul", "Panvel", "Airoli", "Kopar Khairane",
    "Sanpada", "Belapur", "Kharghar", "Turbhe", "Seawoods",
    "Kalyan", "Dombivli", "Ambernath", "Badlapur", "Ulhasnagar",
    "Bhiwandi", "Mira Road", "Vasai", "Virar", "Nalasopara",
    "Churchgate", "Marine Lines", "Fort", "Lower Parel", "Mahalaxmi",
]

# Mumbai metropolitan region coordinates (lat, lng ranges by area clusters)
AREA_COORDS = {
    "Andheri": (19.1197, 72.8464),
    "Bandra": (19.0596, 72.8295),
    "Colaba": (18.9067, 72.8147),
    "Dadar": (19.0178, 72.8478),
    "Juhu": (19.0883, 72.8264),
    "Kurla": (19.0726, 72.8794),
    "Malad": (19.1872, 72.8484),
    "Borivali": (19.2307, 72.8567),
    "Thane": (19.2183, 72.9781),
    "Powai": (19.1176, 72.9060),
    "Worli": (19.0176, 72.8152),
    "Chembur": (19.0522, 72.8994),
    "Goregaon": (19.1663, 72.8526),
    "Kandivali": (19.2094, 72.8520),
    "Vikhroli": (19.1014, 72.9275),
    "Ghatkopar": (19.0858, 72.9081),
    "Mulund": (19.1726, 72.9563),
    "Bhandup": (19.1498, 72.9375),
    "Vashi": (19.0771, 72.9986),
    "Nerul": (19.0330, 73.0169),
    "Panvel": (18.9894, 73.1175),
    "Airoli": (19.1559, 72.9984),
    "Kopar Khairane": (19.1025, 73.0076),
    "Sanpada": (19.0635, 73.0128),
    "Belapur": (19.0235, 73.0385),
    "Kharghar": (19.0474, 73.0658),
    "Turbhe": (19.0816, 73.0126),
    "Seawoods": (19.0215, 73.0175),
    "Kalyan": (19.2437, 73.1355),
    "Dombivli": (19.2183, 73.0867),
    "Ambernath": (19.2045, 73.1860),
    "Badlapur": (19.1553, 73.2284),
    "Ulhasnagar": (19.2215, 73.1645),
    "Bhiwandi": (19.2813, 73.0483),
    "Mira Road": (19.2812, 72.8685),
    "Vasai": (19.3607, 72.8397),
    "Virar": (19.4559, 72.8116),
    "Nalasopara": (19.4172, 72.8224),
    "Churchgate": (18.9322, 72.8264),
    "Marine Lines": (18.9432, 72.8235),
    "Fort": (18.9338, 72.8358),
    "Lower Parel": (18.9928, 72.8313),
    "Mahalaxmi": (18.9828, 72.8120),
}

FIRST_NAMES_MALE = [
    "Rahul", "Amit", "Suresh", "Rajesh", "Vikram", "Anil", "Deepak",
    "Manoj", "Sanjay", "Ajay", "Rohit", "Nikhil", "Arvind", "Prashant",
    "Sachin", "Mohan", "Ganesh", "Mahesh", "Ramesh", "Dinesh",
    "Akash", "Vishal", "Karan", "Harsh", "Dev", "Ravi", "Sunil",
]

FIRST_NAMES_FEMALE = [
    "Priya", "Sunita", "Rekha", "Neha", "Anita", "Kavita", "Pooja",
    "Swati", "Meera", "Lakshmi", "Shalini", "Ritu", "Geeta", "Seema",
    "Nisha", "Manisha", "Divya", "Sapna", "Komal", "Aarti",
    "Sneha", "Anjali", "Tanvi", "Shruti", "Pallavi",
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Singh", "Kumar", "Gupta", "Joshi",
    "Desai", "Mehta", "Shah", "Patil", "Kulkarni", "Sawant", "Jadhav",
    "Pawar", "More", "Rane", "Naik", "Pillai", "Nair", "Iyer",
    "Reddy", "Rao", "Das", "Bose", "Ghosh", "Banerjee", "Mukherjee",
]


def generate_dataset(num_records=1000):
    records = []
    for i in range(1, num_records + 1):
        gender = random.choice(["Male", "Female"])
        if gender == "Male":
            first_name = random.choice(FIRST_NAMES_MALE)
        else:
            first_name = random.choice(FIRST_NAMES_FEMALE)
        last_name = random.choice(LAST_NAMES)
        name = f"{first_name} {last_name}"
        age = random.randint(18, 70)
        crime_type = random.choice(CRIME_TYPES)
        area = random.choice(AREAS)
        complaint = random.choice(COMPLAINT_TEMPLATES[crime_type]).format(area=area)
        base_lat, base_lng = AREA_COORDS[area]
        latitude = round(base_lat + random.uniform(-0.01, 0.01), 6)
        longitude = round(base_lng + random.uniform(-0.01, 0.01), 6)
        year = random.randint(2020, 2025)
        month = random.randint(1, 12)
        day = random.randint(1, 28)
        date = f"{year}-{month:02d}-{day:02d}"
        fir_id = f"FIR-{year}-{i:05d}"

        records.append({
            "FIR_ID": fir_id,
            "Name": name,
            "Age": age,
            "Gender": gender,
            "Crime_Type": crime_type,
            "Complaint": complaint,
            "Latitude": latitude,
            "Longitude": longitude,
            "Date": date,
            "Area": area,
        })
    return records


def main():
    records = generate_dataset(1000)
    output_path = "dataset/fir_dataset.csv"
    fieldnames = [
        "FIR_ID", "Name", "Age", "Gender", "Crime_Type",
        "Complaint", "Latitude", "Longitude", "Date", "Area",
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"Generated {len(records)} FIR records at {output_path}")


if __name__ == "__main__":
    main()
