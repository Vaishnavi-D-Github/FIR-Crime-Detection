const UI = window.PortalUI || {};

const CRIME_COLORS = {
    "Arson": "#f472b6",
    "Assault": "#34d399",
    "Battery": "#6ee7b7",
    "Burglary": "#a78bfa",
    "Criminal Damage": "#94a3b8",
    "Criminal Trespass": "#64748b",
    "Fraud / Deceptive Practice": "#38bdf8",
    "Homicide": "#fb7185",
    "Human Trafficking": "#f43f5e",
    "Intimidation": "#ec4899",
    "Kidnapping": "#10b981",
    "Motor Vehicle Theft": "#818cf8",
    "Narcotics": "#22d3ee",
    "Obscenity": "#f97316",
    "Offense Involving Children": "#ef4444",
    "Other Offense": "#94a3b8",
    "Public Peace Violation": "#fbbf24",
    "Robbery": "#c084fc",
    "Sex Offense": "#f472b6",
    "Sexual Assault": "#ec4899",
    "Stalking": "#e879f9",
    "Theft": "#4ade80",
    "Weapons License Violation": "#2dd4bf",
    "Weapons Violation": "#22c55e"
};

let map;
let mapMarker;
let crimeChart;
let firVerified = false;

function notify(message, type) {
    if (UI.showToast) {
        UI.showToast(message, type);
    } else {
        alert(message);
    }
}

function setWorkflowStep(step) {
    document.querySelectorAll(".step-item").forEach((item) => {
        const n = Number(item.dataset.step);
        item.classList.toggle("step-active", n === step);
        item.classList.toggle("step-done", n < step);
    });
    if (UI.syncStepDots) {
        UI.syncStepDots(step);
    }
}

function updateComplaintCount() {
    const textarea = document.getElementById("complaint");
    const counter = document.getElementById("complaint-count");
    if (!textarea || !counter) return;

    const length = textarea.value.trim().length;
    counter.textContent = `${length} characters · minimum 40`;
    counter.classList.toggle("text-ok", length >= 40);
    counter.classList.toggle("text-warn", length > 0 && length < 40);
}

function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    map = L.map("map", {
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    }).setView([19.076, 72.8777], 11);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 19
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 250);
}

function setMapLocation(latitude, longitude) {
    if (!map || latitude == null || longitude == null) return;

    const lat = Number(latitude);
    const lng = Number(longitude);

    document.getElementById("latitude").value = lat.toFixed(6);
    document.getElementById("longitude").value = lng.toFixed(6);

    if (mapMarker) {
        map.removeLayer(mapMarker);
    }

    mapMarker = L.marker([lat, lng]).addTo(map);
    map.setView([lat, lng], 14);
    setTimeout(() => map.invalidateSize(), 200);
}

function populateVerifiedFields(verified, filename) {
    document.getElementById("official_fir_id").value = verified.fir_id;
    document.getElementById("registry_status").value = "Verified · registry match";
    document.getElementById("name").value = verified.name || "";
    document.getElementById("phone_number").value = verified.phone_number || "";
    document.getElementById("age").value = verified.age ?? "";
    document.getElementById("gender").value = verified.gender || "";
    document.getElementById("incident_date").value = verified.incident_date || "";
    document.getElementById("incident_time").value = verified.incident_time || "";
    document.getElementById("incident_location").value = verified.incident_location || "";
    document.getElementById("upload_filename").value = filename || "";
    document.getElementById("complaint").value = "";

    const detailsCard = document.getElementById("details-card");
    const submitBtn = document.getElementById("submit-btn");

    detailsCard.hidden = false;
    submitBtn.disabled = false;
    firVerified = true;

    if (!map) {
        initMap();
    }
    setMapLocation(verified.latitude, verified.longitude);

    updateComplaintCount();
    setWorkflowStep(2);
    detailsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleUpload(event) {
    event.preventDefault();

    const fileInput = document.getElementById("fir_file");
    const firIdInput = document.getElementById("upload_fir_id");
    const preview = document.getElementById("upload-preview");
    const uploadBtn = document.getElementById("upload-btn");

    if (!firIdInput.value.trim()) {
        notify("Enter the official FIR number before uploading.", "error");
        firIdInput.focus();
        return;
    }

    if (!fileInput.files.length) {
        notify("Choose an FIR file to upload.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("fir_file", fileInput.files[0]);
    formData.append("fir_id", firIdInput.value.trim());

    preview.innerHTML = '<div class="status-card status-neutral">Verifying FIR number against uploaded document...</div>';
    const progressBar = document.getElementById("upload-progress-bar");
    const progressWrap = document.getElementById("upload-progress");
    const progressAnim = UI.animateUploadProgress
        ? UI.animateUploadProgress(progressBar, progressWrap)
        : null;

    UI.setButtonLoading(uploadBtn, true, "Verifying...");

    try {
        const response = await fetch("/api/upload-fir", { method: "POST", body: formData });
        const result = await response.json();

        if (!response.ok) {
            if (progressAnim) progressAnim.stop();
            preview.innerHTML = `<div class="status-card status-warning">${result.error || "Verification failed."}</div>`;
            notify(result.error || "Verification failed.", "error");
            firVerified = false;
            return;
        }

        if (progressAnim) progressAnim.complete();

        populateVerifiedFields(result.verified_fir, result.filename);
        preview.innerHTML = `
            <div class="status-card status-success">
                <strong>${result.verified_fir.fir_id}</strong> verified successfully.
                <div class="status-detail">Entered FIR number matches the uploaded document and the police registry.</div>
            </div>
        `;
        notify("FIR verified. Enter your complaint description to classify.", "success");
    } catch {
        if (progressAnim) progressAnim.stop();
        preview.innerHTML = '<div class="status-card status-warning">Network error while verifying the FIR copy.</div>';
        notify("Could not reach the server. Check your connection.", "error");
    } finally {
        UI.setButtonLoading(uploadBtn, false);
    }
}

function destroyChart() {
    if (crimeChart) {
        crimeChart.destroy();
        crimeChart = null;
    }
}

function renderCrimeChart(canvas, probabilities) {
    destroyChart();

    const labels = probabilities.map((entry) => entry.crime_type);
    const values = probabilities.map((entry) => entry.percentage);
    const colors = labels.map((label) => CRIME_COLORS[label] || "#64748b");

    crimeChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Confidence %",
                data: values,
                backgroundColor: colors.map((color) => `${color}cc`),
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.x}%`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: "rgba(184, 188, 200, 0.1)" },
                    ticks: { color: "#B8BCC8", callback: (v) => `${v}%` }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: "#ffffff", font: { size: 12 } }
                }
            }
        }
    });
}

function showResult(result) {
    const card = document.getElementById("result-card");
    const content = document.getElementById("result-content");
    const guidance = result.guidance.map((item) => `<li>${item}</li>`).join("");

    const probBars = (result.probabilities || [])
        .slice(0, 5)
        .map(
            (entry) => `
        <div class="probability-bar">
            <div class="prob-label">
                <span>${entry.crime_type}</span>
                <strong>${entry.percentage}%</strong>
            </div>
            <div class="prob-track">
                <div class="prob-fill" style="width:0%" data-width="${entry.percentage}%"></div>
            </div>
        </div>`
        )
        .join("");

    content.innerHTML = `
        <div class="result-hero">
            <div>
                <div class="result-fir-id">${result.fir_id}</div>
                <div class="result-crime">${result.predicted_crime_type}</div>
                <div class="result-meta">Top match · ${result.fir_type}</div>
            </div>
            <div class="confidence-pill confidence-${result.confidence_band.toLowerCase()}">
                ${result.confidence_score}% ${result.confidence_band}
            </div>
        </div>

        <div class="result-panel">
            <h3>Confidence breakdown</h3>
            <div class="result-stack">${probBars}</div>
        </div>

        <div class="result-panel chart-panel">
            <h3>AI analysis chart</h3>
            <div class="chart-wrap">
                <canvas id="crime-confidence-chart" aria-label="Crime type confidence chart"></canvas>
            </div>
        </div>

        <div class="result-grid">
            <div class="result-panel">
                <h3>Summary</h3>
                <div class="result-stack">
                    <div class="result-item"><span>Review recommended</span><strong>${result.review_recommended ? "Yes" : "No"}</strong></div>
                    <div class="result-item"><span>Police station</span><strong>${result.record.station_name || "Registered station"}</strong></div>
                    <div class="result-item"><span>Incident area</span><strong>${result.record.incident_location}</strong></div>
                </div>
            </div>
        </div>

        <div class="result-panel">
            <h3>Guidance</h3>
            <ul class="guidance-list">${guidance}</ul>
        </div>
    `;

    const canvas = document.getElementById("crime-confidence-chart");
    if (canvas && result.probabilities?.length) {
        renderCrimeChart(canvas, result.probabilities);
    }

    requestAnimationFrame(() => {
        content.querySelectorAll(".prob-fill").forEach((bar) => {
            const width = bar.dataset.width || "0%";
            setTimeout(() => {
                bar.style.width = width;
            }, 120);
        });
    });

    card.hidden = false;
    setWorkflowStep(3);
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    notify("Classification complete.", "success");
}

function validateFirForm() {
    const form = document.getElementById("fir-form");
    UI.clearFormErrors(form);

    const complaint = document.getElementById("complaint");
    const officialId = document.getElementById("official_fir_id");
    let valid = true;

    if (!firVerified || !officialId.value.trim()) {
        notify("Verify your FIR copy before classification.", "error");
        return false;
    }

    if (!UI.validateComplaint(complaint.value)) {
        UI.setFieldError(complaint, "Complaint should be at least 40 characters.");
        valid = false;
    }

    if (!valid) {
        notify("Please complete the complaint description.", "error");
        complaint.focus();
    }

    return valid;
}

async function handleSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById("submit-btn");

    if (!validateFirForm()) return;

    const payload = {
        complaint: document.getElementById("complaint").value.trim(),
        upload_filename: document.getElementById("upload_filename").value,
        official_fir_id: document.getElementById("official_fir_id").value.trim()
    };

    UI.setButtonLoading(submitButton, true, "Analyzing...");

    const resultCard = document.getElementById("result-card");
    const resultContent = document.getElementById("result-content");
    if (resultCard && resultContent) {
        resultCard.hidden = false;
        resultContent.innerHTML = `
            <div class="ai-loader" aria-live="polite">
                <div class="ai-loader-ring"></div>
                <p class="subtitle-muted">AI is analyzing your complaint narrative…</p>
            </div>`;
        resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    try {
        const response = await fetch("/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (response.ok) {
            showResult(result);
        } else {
            notify(result.error || "Classification failed.", "error");
        }
    } catch {
        notify("Could not reach the server.", "error");
    } finally {
        UI.setButtonLoading(submitButton, false);
    }
}

function bindDashboardInteractions() {
    const complaint = document.getElementById("complaint");

    if (complaint) {
        complaint.addEventListener("input", () => {
            updateComplaintCount();
            UI.setFieldError(complaint, null);
        });
        updateComplaintCount();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("upload-form")) return;

    bindDashboardInteractions();
    setWorkflowStep(1);

    document.getElementById("upload-form").addEventListener("submit", handleUpload);
    document.getElementById("fir-form").addEventListener("submit", handleSubmit);
});
