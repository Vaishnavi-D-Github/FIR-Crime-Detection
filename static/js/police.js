let policeMap;
let policeMarker;

async function loadPoliceOcrStatus() {
    const status = document.getElementById("police-ocr-status");
    if (!status) {
        return;
    }

    try {
        const response = await fetch("/api/ocr-status");
        const data = await response.json();
        status.className = `status-card ${data.available ? "status-success" : "status-warning"}`;
        status.textContent = data.available
            ? `Image OCR ready: Tesseract ${data.version}`
            : data.message;
    } catch {
        status.className = "status-card status-warning";
        status.textContent = "Unable to check OCR status.";
    }
}

function initPoliceMap() {
    policeMap = L.map("police-map").setView([19.076, 72.8777], 11);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 19
    }).addTo(policeMap);

    policeMap.on("click", function (event) {
        setPoliceLocation(event.latlng.lat, event.latlng.lng);
    });
}

function setPoliceLocation(latitude, longitude) {
    const lat = Number(latitude).toFixed(6);
    const lng = Number(longitude).toFixed(6);

    document.getElementById("police_latitude").value = lat;
    document.getElementById("police_longitude").value = lng;

    if (policeMarker) {
        policeMap.removeLayer(policeMarker);
    }

    policeMarker = L.marker([latitude, longitude]).addTo(policeMap).bindPopup(
        `<strong>Official incident location</strong><br>Lat: ${lat}<br>Lng: ${lng}`
    ).openPopup();
}

async function submitPoliceFir(event) {
    event.preventDefault();

    const status = document.getElementById("police-submit-status");
    const form = document.getElementById("police-fir-form");
    const formData = new FormData(form);

    if (!formData.get("latitude") || !formData.get("longitude")) {
        status.innerHTML = '<div class="status-card status-warning">Select the official incident location on the map.</div>';
        return;
    }

    status.innerHTML = '<div class="status-card status-neutral">Registering official FIR...</div>';

    const response = await fetch("/api/police/register-fir", {
        method: "POST",
        body: formData
    });

    const result = await response.json();

    if (!response.ok) {
        status.innerHTML = `<div class="status-card status-warning">${result.error || "Unable to register FIR."}</div>`;
        return;
    }

    status.innerHTML = `
        <div class="status-card status-success">
            ${result.message}
            <div class="status-detail">${result.record.fir_id} is now available for citizen verification.</div>
        </div>
    `;

    form.reset();
    if (policeMarker) {
        policeMap.removeLayer(policeMarker);
        policeMarker = null;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("police-map")) {
        return;
    }

    initPoliceMap();
    loadPoliceOcrStatus();
    document.getElementById("police-fir-form").addEventListener("submit", submitPoliceFir);
});
