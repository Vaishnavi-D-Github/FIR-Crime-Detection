// Crime type color mapping
const CRIME_COLORS = {
    "Theft": "#e74c3c",
    "Assault": "#e67e22",
    "Robbery": "#9b59b6",
    "Fraud": "#3498db",
    "Kidnapping": "#1abc9c",
    "Murder": "#c0392b",
    "Cybercrime": "#2980b9",
    "Drug Offense": "#27ae60",
    "Domestic Violence": "#d35400",
    "Burglary": "#8e44ad",
};

let map;
let heatLayer;
let userMarker;
let crimeMarkers = [];

function initMap() {
    map = L.map("map").setView([19.076, 72.8777], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
    }).addTo(map);

    map.on("click", function (e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);

        document.getElementById("latitude").value = lat;
        document.getElementById("longitude").value = lng;

        if (userMarker) {
            map.removeLayer(userMarker);
        }

        userMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: "user-location-marker",
                html: '<div style="background:#e74c3c;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
            }),
        })
            .addTo(map)
            .bindPopup(
                '<div class="user-marker-info"><strong>Your Selected Location</strong><br>Lat: ' +
                    lat +
                    "<br>Lng: " +
                    lng +
                    "</div>"
            )
            .openPopup();
    });

    loadHeatmapData();
    loadCrimeTypes();
    loadStats();
}

async function loadHeatmapData(crimeType) {
    const filter = crimeType || "All";
    const url = `/api/heatmap-data?crime_type=${encodeURIComponent(filter)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (heatLayer) {
        map.removeLayer(heatLayer);
    }

    crimeMarkers.forEach(function (m) {
        map.removeLayer(m);
    });
    crimeMarkers = [];

    const heatPoints = data.map(function (point) {
        return [point.Latitude, point.Longitude, 0.5];
    });

    heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
            0.2: "#ffffb2",
            0.4: "#fecc5c",
            0.6: "#fd8d3c",
            0.8: "#f03b20",
            1.0: "#bd0026",
        },
    }).addTo(map);

    data.forEach(function (point) {
        const color = CRIME_COLORS[point.Crime_Type] || "#999";
        const marker = L.circleMarker([point.Latitude, point.Longitude], {
            radius: 4,
            fillColor: color,
            color: "white",
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.7,
        })
            .bindPopup(
                "<strong>" +
                    point.Crime_Type +
                    "</strong><br>Lat: " +
                    point.Latitude.toFixed(4) +
                    "<br>Lng: " +
                    point.Longitude.toFixed(4)
            )
            .addTo(map);
        crimeMarkers.push(marker);
    });

    updateLegend();
}

async function loadCrimeTypes() {
    const response = await fetch("/api/crime-types");
    const types = await response.json();
    const select = document.getElementById("crime-filter");

    types.forEach(function (type) {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    });

    select.addEventListener("change", function () {
        loadHeatmapData(this.value);
    });
}

async function loadStats() {
    const response = await fetch("/api/stats");
    const data = await response.json();
    const container = document.getElementById("stats-content");

    let html =
        '<div class="stats-grid">' +
        '<div class="stat-item stat-total">' +
        '<div class="stat-count">' +
        data.total_firs +
        "</div>" +
        '<div class="stat-label">Total FIRs Filed</div>' +
        "</div>";

    const sortedCrimes = Object.entries(data.crime_counts).sort(function (
        a,
        b
    ) {
        return b[1] - a[1];
    });

    sortedCrimes.forEach(function (entry) {
        const crime = entry[0];
        const count = entry[1];
        html +=
            '<div class="stat-item">' +
            '<div class="stat-count">' +
            count +
            "</div>" +
            '<div class="stat-label">' +
            crime +
            "</div>" +
            "</div>";
    });

    html += "</div>";
    container.innerHTML = html;
}

function updateLegend() {
    const container = document.getElementById("map-legend");
    let html =
        '<div class="legend-title">Crime Type Legend</div>' +
        '<div class="legend-items">';

    Object.entries(CRIME_COLORS).forEach(function (entry) {
        const crime = entry[0];
        const color = entry[1];
        html +=
            '<div class="legend-item">' +
            '<div class="legend-color" style="background:' +
            color +
            '"></div>' +
            "<span>" +
            crime +
            "</span>" +
            "</div>";
    });

    html += "</div>";
    container.innerHTML = html;
}

document.getElementById("fir-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submit-btn");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoading = submitBtn.querySelector(".btn-loading");

    submitBtn.disabled = true;
    btnText.style.display = "none";
    btnLoading.style.display = "inline";

    const formData = {
        name: document.getElementById("name").value,
        age: parseInt(document.getElementById("age").value),
        gender: document.getElementById("gender").value,
        complaint: document.getElementById("complaint").value,
        latitude: parseFloat(document.getElementById("latitude").value),
        longitude: parseFloat(document.getElementById("longitude").value),
    };

    if (!formData.latitude || !formData.longitude) {
        alert("Please click on the map to select your address location.");
        submitBtn.disabled = false;
        btnText.style.display = "inline";
        btnLoading.style.display = "none";
        return;
    }

    const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
        showResult(result);
        loadHeatmapData(document.getElementById("crime-filter").value);
        loadStats();
    } else {
        alert(result.error || "Something went wrong. Please try again.");
    }

    submitBtn.disabled = false;
    btnText.style.display = "inline";
    btnLoading.style.display = "none";
});

function showResult(result) {
    const card = document.getElementById("result-card");
    const content = document.getElementById("result-content");

    let html =
        '<div class="result-item">' +
        '<span class="result-label">FIR ID</span>' +
        '<span class="result-value">' +
        result.fir_id +
        "</span>" +
        "</div>" +
        '<div class="result-item">' +
        '<span class="result-label">Detected Crime Type</span>' +
        '<span class="crime-type-badge">' +
        result.predicted_crime_type +
        "</span>" +
        "</div>" +
        '<div style="margin-top:1rem;">' +
        '<div class="result-label" style="margin-bottom:0.5rem;">Confidence Scores</div>';

    const topProbs = Object.entries(result.probabilities).slice(0, 5);
    topProbs.forEach(function (entry) {
        const crime = entry[0];
        const prob = entry[1];
        const pct = (prob * 100).toFixed(1);
        const color = CRIME_COLORS[crime] || "#999";
        html +=
            '<div class="probability-bar">' +
            '<div class="prob-label">' +
            "<span>" +
            crime +
            "</span>" +
            "<span>" +
            pct +
            "%</span>" +
            "</div>" +
            '<div class="prob-track">' +
            '<div class="prob-fill" style="width:' +
            pct +
            "%;background:" +
            color +
            '"></div>' +
            "</div>" +
            "</div>";
    });

    html += "</div>";
    content.innerHTML = html;
    card.style.display = "block";
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.addEventListener("DOMContentLoaded", initMap);
