/**
 * AlertBridge Frontend Application Logic
 * Real-time Open-Meteo integration, Leaflet mapping, Rule-based risk analysis, and state management.
 */

let currentLocation = {
    name: "Bareilly, Uttar Pradesh, India",
    lat: 28.3670,
    lon: 79.4304
};

let weatherData = null;
let isDemoMode = false;
let mapInstance = null;
let markersLayer = null;

let incidentsList = [
    { id: 1, type: "Flood", location: "Bareilly Urban Sector", severity: "HIGH", team: "NDRF Alpha", status: "Monitoring", notes: "River water levels stable but high." },
    { id: 2, type: "Cyclone / Storm", location: "Coastal Sector 9", severity: "MODERATE", team: "State Disaster Response", status: "Preparedness", notes: "Wind gusts monitored." }
];

let alertsList = [
    { id: 1, type: "Flood Risk", severity: "HIGH", location: "Bareilly", score: 78, time: "Just now", action: "Move away from flood-prone areas and follow local emergency authority instructions.", source: "Open-Meteo Weather API", status: "Active" }
];

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    fetchWeatherData();
    setupSearchAutocomplete();
    renderIncidents();
    renderAlerts();
    switchCodeTab('main');
    
    // Auto refresh every 10 minutes
    setInterval(() => {
        if (!isDemoMode) fetchWeatherData();
    }, 600000);
});

// Tab Navigation
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');

    // Reset buttons
    ['dashboard', 'alerts', 'map', 'response', 'contacts', 'backend'].forEach(t => {
        const btn = document.getElementById('nav-' + t);
        if (btn) {
            btn.className = "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition";
        }
    });

    const activeBtn = document.getElementById('nav-' + tabId);
    if (activeBtn) {
        activeBtn.className = "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white shadow-lg shadow-red-600/20";
    }

    if (tabId === 'map' && mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 200);
    }
}

// Fetch Weather Data from Open-Meteo
async function fetchWeatherData() {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('fa-spin');

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLocation.lat}&longitude=${currentLocation.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather API unavailable");
        const data = await response.json();

        weatherData = data;
        isDemoMode = false;
        document.getElementById('demo-banner').classList.remove('bg-red-600/90', 'text-red-950');
        document.getElementById('demo-banner').classList.add('bg-amber-600/90', 'text-amber-950');
        
        updateDashboardUI();
    } catch (error) {
        console.error("API Error:", error);
        showWeatherErrorState();
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
}

function showWeatherErrorState() {
    document.getElementById('weather-temp').innerText = "Unavailable";
    document.getElementById('weather-condition-text').innerText = "Weather data temporarily unavailable.";
    document.getElementById('footer-sync-time').innerText = "API Error / Offline";
}

// Update Dashboard UI with Weather & Risk
function updateDashboardUI() {
    if (!weatherData || !weatherData.current) return;

    const cur = weatherData.current;
    const timeStr = new Date().toLocaleTimeString();
    
    document.getElementById('header-timestamp').innerText = timeStr;
    document.getElementById('footer-sync-time').innerText = new Date().toLocaleString();

    document.getElementById('weather-temp').innerText = `${cur.temperature_2m}°C`;
    document.getElementById('weather-rain').innerText = `${cur.precipitation} mm`;
    document.getElementById('weather-wind').innerText = `${cur.wind_speed_10m} km/h`;
    document.getElementById('weather-gusts').innerText = `Gusts: ${cur.wind_gusts_10m || cur.wind_speed_10m} km/h`;
    document.getElementById('weather-humidity').innerText = `${cur.relative_humidity_2m}%`;
    document.getElementById('weather-pressure').innerText = `Pressure: ${cur.surface_pressure} hPa`;

    const weatherDesc = getWeatherDescription(cur.weather_code);
    document.getElementById('weather-condition-text').innerText = weatherDesc;

    // Run AI / Rule-based Risk Analysis
    calculateRiskScores({
        temp: cur.temperature_2m,
        feelsLike: cur.apparent_temperature,
        rain: cur.precipitation,
        wind: cur.wind_speed_10m,
        gusts: cur.wind_gusts_10m || cur.wind_speed_10m,
        humidity: cur.relative_humidity_2m,
        pressure: cur.surface_pressure
    });

    renderForecast();
    updateMapMarkers();
}

function getWeatherDescription(code) {
    const codes = {
        0: "Clear Sky ☀️",
        1: "Mainly Clear 🌤️",
        2: "Partly Cloudy ⛅",
        3: "Overcast ☁️",
        51: "Light Drizzle 🌧️",
        61: "Slight Rain 🌧️",
        63: "Moderate Rain 🌧️",
        65: "Heavy Rain 🌧️🚨",
        95: "Thunderstorm ⚡"
    };
    return codes[code] || "Fair Conditions";
}

// Rule-Based Risk Analysis Engine
function calculateRiskScores(metrics) {
    // Flood Risk calculation
    let floodScore = Math.min(100, Math.round((metrics.rain * 1.5) + (metrics.humidity > 85 ? 20 : 10)));
    if (isDemoMode && metrics.rain > 100) floodScore = 92;

    // Storm Risk calculation
    let stormScore = Math.min(100, Math.round((metrics.wind * 0.8) + ((1013 - metrics.pressure) * 0.5)));
    if (stormScore < 10) stormScore = 15;

    // Heatwave Risk calculation
    let heatScore = metrics.temp > 40 ? Math.round((metrics.temp - 35) * 15) : Math.round(metrics.temp * 0.5);
    heatScore = Math.max(5, Math.min(100, heatScore));

    // Landslide Risk calculation
    let landslideScore = Math.min(100, Math.round((metrics.rain * 0.8) + (metrics.wind * 0.3)));

    // Update UI elements
    updateRiskBar('flood', floodScore);
    updateRiskBar('storm', stormScore);
    updateRiskBar('heat', heatScore);
    updateRiskBar('landslide', landslideScore);

    const maxRisk = Math.max(floodScore, stormScore, heatScore, landslideScore);
    let riskLevel = "LOW";
    let riskClass = "text-emerald-400";
    let bgClass = "bg-emerald-600";

    if (maxRisk >= 80) {
        riskLevel = "CRITICAL";
        riskClass = "text-red-500 animate-pulse";
        bgClass = "bg-red-600";
    } else if (maxRisk >= 60) {
        riskLevel = "HIGH";
        riskClass = "text-red-400";
        bgClass = "bg-red-500";
    } else if (maxRisk >= 30) {
        riskLevel = "MODERATE";
        riskClass = "text-amber-400";
        bgClass = "bg-amber-500";
    }

    document.getElementById('overall-risk-status').innerText = `${riskLevel} (${maxRisk}%)`;
    document.getElementById('overall-risk-status').className = `font-bold uppercase ${riskClass}`;

    // Update banner
    const banner = document.getElementById('active-alert-banner');
    if (maxRisk >= 60) {
        banner.classList.remove('hidden');
        document.getElementById('banner-severity-badge').innerText = `${riskLevel} RISK`;
        document.getElementById('banner-severity-badge').className = `${bgClass} text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider`;
        document.getElementById('banner-title').innerText = maxRisk === floodScore ? "Heavy rainfall & flood warning active in target sector." : "Severe weather hazard detected in regional perimeter.";
    }
}

function updateRiskBar(type, score) {
    document.getElementById(`risk-val-${type}`).innerText = `${score}%`;
    const bar = document.getElementById(`risk-bar-${type}`);
    bar.style.width = `${score}%`;
    
    if (score >= 80) bar.className = "bg-red-600 h-2.5 rounded-full transition-all duration-500";
    else if (score >= 60) bar.className = "bg-red-500 h-2.5 rounded-full transition-all duration-500";
    else if (score >= 30) bar.className = "bg-amber-500 h-2.5 rounded-full transition-all duration-500";
    else bar.className = "bg-emerald-500 h-2.5 rounded-full transition-all duration-500";
}

// Forecast Rendering
function renderForecast() {
    if (!weatherData || !weatherData.daily) return;
    const daily = weatherData.daily;
    const container = document.getElementById('forecast-container');
    container.innerHTML = '';

    for (let i = 0; i < Math.min(7, daily.time.length); i++) {
        const date = new Date(daily.time[i]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const maxT = Math.round(daily.temperature_2m_max[i]);
        const minT = Math.round(daily.temperature_2m_min[i]);
        const rainSum = daily.precipitation_sum[i];
        
        let icon = "fa-sun text-amber-400";
        let cond = "Sunny";
        if (rainSum > 5) { icon = "fa-cloud-rain text-blue-400"; cond = "Rain"; }
        else if (rainSum > 0) { icon = "fa-cloud-sun text-slate-300"; cond = "Cloudy"; }

        container.innerHTML += `
            <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center space-y-2">
                <div class="text-[11px] text-slate-400 font-medium">${date}</div>
                <div class="my-1"><i class="fa-solid ${icon} text-xl"></i></div>
                <div class="text-xs font-bold text-white">${maxT}° / <span class="text-slate-400">${minT}°</span></div>
                <div class="text-[10px] text-blue-400">${rainSum} mm</div>
            </div>
        `;
    }
}

// Interactive Map Setup (Leaflet)
function initMap() {
    mapInstance = L.map('leaflet-map').setView([currentLocation.lat, currentLocation.lon], 11);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{z}.png', {
        attribution: '&copy; OpenStreetMap contributors & CARTO',
        maxZoom: 19
    }).addTo(mapInstance);

    markersLayer = L.layerGroup().addTo(mapInstance);
    updateMapMarkers();
}

function updateMapMarkers() {
    if (!mapInstance || !markersLayer) return;
    markersLayer.clearLayers();

    mapInstance.setView([currentLocation.lat, currentLocation.lon], 11);

    // Selected location marker
    const marker = L.marker([currentLocation.lat, currentLocation.lon]).addTo(markersLayer);
    marker.bindPopup(`<b>${currentLocation.name}</b><br>Active Monitoring Station<br>Status: High Risk Alert`).openPopup();

    // Risk buffer circle
    L.circle([currentLocation.lat, currentLocation.lon], {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        radius: 8000
    }).addTo(markersLayer);
}

// Geocoding & City Search
function setupSearchAutocomplete() {
    const input = document.getElementById('location-search-input');
    const box = document.getElementById('search-suggestions');

    let timeout = null;
    input.addEventListener('input', (e) => {
        clearTimeout(timeout);
        const query = e.target.value.trim();
        if (query.length < 2) {
            box.classList.add('hidden');
            return;
        }

        timeout = setTimeout(async () => {
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
                const data = await res.json();
                
                box.innerHTML = '';
                if (data.results && data.results.length > 0) {
                    box.classList.remove('hidden');
                    data.results.forEach(loc => {
                        const div = document.createElement('div');
                        div.className = "p-2.5 hover:bg-slate-900 cursor-pointer text-xs text-slate-200 flex justify-between items-center";
                        div.innerHTML = `<span>${loc.name}, ${loc.country || ''}</span> <span class="text-slate-500 font-mono">${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}</span>`;
                        div.onclick = () => {
                            selectNewLocation(loc.name + (loc.country ? `, ${loc.country}` : ''), loc.latitude, loc.longitude);
                            box.classList.add('hidden');
                            input.value = '';
                        };
                        box.appendChild(div);
                    });
                } else {
                    box.classList.add('hidden');
                }
            } catch (err) {
                console.error("Geocoding error:", err);
            }
        }, 300);
    });
}

function selectNewLocation(name, lat, lon) {
    currentLocation = { name, lat, lon };
    document.getElementById('current-location-name').innerText = name;
    document.getElementById('current-coords').innerText = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
    fetchWeatherData();
}

function searchCity() {
    const input = document.getElementById('location-search-input');
    if (input.value.trim()) {
        // Trigger geocoding search directly
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.value)}&count=1`)
            .then(res => res.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const loc = data.results[0];
                    selectNewLocation(loc.name + (loc.country ? `, ${loc.country}` : ''), loc.latitude, loc.longitude);
                    input.value = '';
                } else {
                    alert("Location not found.");
                }
            });
    }
}

function useCurrentGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                selectNewLocation("GPS Verified Location", pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                alert("Geolocation access denied or unavailable.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Demo Scenario Simulator
function loadScenario(type) {
    isDemoMode = true;
    document.getElementById('demo-banner').classList.remove('bg-amber-600/90', 'text-amber-950');
    document.getElementById('demo-banner').classList.add('bg-red-600/90', 'text-red-950');

    if (type === 'flood') {
        weatherData = {
            current: { temperature_2m: 26, relative_humidity_2m: 94, apparent_temperature: 28, precipitation: 150, weather_code: 65, wind_speed_10m: 35, wind_gusts_10m: 55, surface_pressure: 998 },
            daily: { time: [new Date()], temperature_2m_max: [28], temperature_2m_min: [23], precipitation_sum: [160] }
        };
    } else if (type === 'cyclone') {
        weatherData = {
            current: { temperature_2m: 29, relative_humidity_2m: 88, apparent_temperature: 33, precipitation: 75, weather_code: 95, wind_speed_10m: 115, wind_gusts_10m: 140, surface_pressure: 978 },
            daily: { time: [new Date()], temperature_2m_max: [31], temperature_2m_min: [25], precipitation_sum: [90] }
        };
    } else if (type === 'heatwave') {
        weatherData = {
            current: { temperature_2m: 46, relative_humidity_2m: 22, apparent_temperature: 51, precipitation: 0, weather_code: 0, wind_speed_10m: 12, wind_gusts_10m: 18, surface_pressure: 1010 },
            daily: { time: [new Date()], temperature_2m_max: [47], temperature_2m_min: [32], precipitation_sum: [0] }
        };
    }
    updateDashboardUI();
}

function resetToLiveWeather() {
    isDemoMode = false;
    fetchWeatherData();
}

function toggleDemoModeModal() {
    const modal = document.getElementById('scenario-modal');
    modal.classList.toggle('hidden');
}

// Emergency Response Incidents Table
function renderIncidents() {
    const tbody = document.getElementById('incidents-table-body');
    tbody.innerHTML = '';

    incidentsList.forEach(inc => {
        let badgeColor = "bg-red-500/20 text-red-400";
        if (inc.severity === "MODERATE") badgeColor = "bg-amber-500/20 text-amber-400";
        if (inc.severity === "LOW") badgeColor = "bg-emerald-500/20 text-emerald-400";

        tbody.innerHTML += `
            <tr class="hover:bg-slate-950/40 transition">
                <td class="p-3 font-bold text-slate-200">${inc.type}</td>
                <td class="p-3 text-slate-300">${inc.location}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}">${inc.severity}</span></td>
                <td class="p-3 text-slate-300 font-mono">${inc.team || 'Unassigned'}</td>
                <td class="p-3"><span class="text-cyan-400 font-medium">${inc.status}</span></td>
                <td class="p-3 text-right space-x-2">
                    <button onclick="updateIncidentStatus(${inc.id}, 'Responding')" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition">Respond</button>
                    <button onclick="updateIncidentStatus(${inc.id}, 'Resolved')" class="text-xs bg-emerald-900/40 hover:bg-emerald-900 text-emerald-300 px-2.5 py-1 rounded transition">Resolve</button>
                </td>
            </tr>
        `;
    });
    document.getElementById('badge-incidents-count').innerText = incidentsList.length;
}

function updateIncidentStatus(id, newStatus) {
    const inc = incidentsList.find(i => i.id === id);
    if (inc) {
        inc.status = newStatus;
        renderIncidents();
    }
}

function openNewIncidentModal() {
    const modal = document.getElementById('incident-modal');
    modal.classList.toggle('hidden');
}

function handleNewIncidentSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('inc-type').value;
    const location = document.getElementById('inc-location').value;
    const severity = document.getElementById('inc-severity').value;
    const team = document.getElementById('inc-team').value;

    incidentsList.push({
        id: Date.now(),
        type,
        location,
        severity,
        team,
        status: "Monitoring",
        notes: "Newly logged incident."
    });

    renderIncidents();
    openNewIncidentModal();
    e.target.reset();
}

// Render Alerts Page
function renderAlerts() {
    const container = document.getElementById('alerts-list-container');
    container.innerHTML = '';

    alertsList.forEach(alert => {
        container.innerHTML += `
            <div class="bg-slate-950/60 border border-red-900/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div class="flex items-start gap-3">
                    <div class="bg-red-600 text-white p-2.5 rounded-lg">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">${alert.severity}</span>
                            <span class="font-bold text-slate-200 text-sm">${alert.type} — ${alert.location}</span>
                        </div>
                        <p class="text-xs text-slate-300 mt-1">${alert.action}</p>
                        <div class="text-[10px] text-slate-500 mt-2 flex gap-3">
                            <span>Source: ${alert.source}</span>
                            <span>Risk Score: ${alert.score}%</span>
                        </div>
                    </div>
                </div>
                <span class="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg font-medium">${alert.status}</span>
            </div>
        `;
    });
}

function fetchAllAlerts() {
    renderAlerts();
    alert("Alerts refreshed successfully.");
}

function triggerRefresh() {
    fetchWeatherData();
}

// Backend Architecture Code Viewer Data
const backendCodeSnippets = {
    main: `# backend/main.py — FastAPI Application Entry Point
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import get_db, engine, Base
from .risk.risk_engine import evaluate_disaster_risk
import requests

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AlertBridge API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/weather")
def get_weather(lat: float, lon: float):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure"
    res = requests.get(url)
    if res.status_code != 200:
        raise HTTPException(status_code=503, detail="Weather API unavailable")
    return res.json()

@app.get("/api/risk")
def get_risk_analysis(lat: float, lon: float):
    # Fetch weather and run rule-based/ML risk analysis
    weather = requests.get(f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m,surface_pressure,relative_humidity_2m").json()
    cur = weather.get("current", {})
    risks = evaluate_disaster_risk(cur)
    return {"location": {"lat": lat, "lon": lon}, "risks": risks}
`,
    risk: `# backend/risk/risk_engine.py — Transparent Rule-Based Baseline Risk Engine
def evaluate_disaster_risk(metrics: dict) -> dict:
    rain = metrics.get("precipitation", 0.0)
    wind = metrics.get("wind_speed_10m", 0.0)
    temp = metrics.get("temperature_2m", 25.0)
    pressure = metrics.get("surface_pressure", 1013.0)
    
    flood_risk = min(100, int(rain * 1.5 + 20))
    storm_risk = min(100, int(wind * 0.8 + (1013 - pressure) * 0.5))
    heat_risk = 90 if temp > 40 else int(temp * 1.2)
    
    max_score = max(flood_risk, storm_risk, heat_risk)
    level = "CRITICAL" if max_score >= 80 else "HIGH" if max_score >= 60 else "MODERATE" if max_score >= 30 else "LOW"
    
    return {
        "flood_risk": flood_risk,
        "storm_risk": storm_risk,
        "heatwave_risk": heat_risk,
        "overall_risk_level": level,
        "confidence_score": 84,
        "model_type": "Rule-Based Baseline (Ready for ML replacement)"
    }
`,
    db: `# backend/database.py — SQLAlchemy SQLite / PostgreSQL Configuration
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./alertbridge.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`,
    docker: `# docker-compose.yml — Multi-container Deployment Architecture
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./alertbridge.db
    restart: always

  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./frontend:/usr/share/nginx/html
    restart: always
`
};

function switchCodeTab(tab) {
    ['main', 'risk', 'db', 'docker'].forEach(t => {
        const btn = document.getElementById('btn-code-' + t);
        if (btn) {
            btn.className = t === tab ? "px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium transition" : "px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium transition";
        }
    });
    document.getElementById('code-viewer-content').innerText = backendCodeSnippets[tab] || "# Code not found";
}

function copyCode() {
    const text = document.getElementById('code-viewer-content').innerText;
    navigator.clipboard.writeText(text);
    alert("Code copied to clipboard.");
}
