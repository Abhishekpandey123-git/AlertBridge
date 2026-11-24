# AlertBridge — AI-Powered Disaster Early Warning & Response System

> **Tagline:** Predict • Alert • Protect

AlertBridge is a professional emergency management platform that monitors real-time weather and environmental metrics, evaluates disaster risks through transparent rule-based and machine-learning models, and dispatches early warnings and incident responses.

## 🚀 Key Features
- **Real-Time Weather API**: Integrates Open-Meteo live endpoints without API key requirements.
- **Location Geocoding Search**: Interactive city autocomplete and browser GPS geolocation support.
- **AI / Rule-Based Risk Engine**: Evaluates flood, cyclone storm, heatwave, and landslide risk scores with confidence metrics.
- **Interactive Leaflet Map**: Spatial rendering of hazard zones, risk radii, and monitoring stations.
- **Emergency Incident Command**: Incident logging, tracking, and response team assignment.
- **Demo Scenario Simulator**: One-click simulation presets for severe floods, cyclones, and heatwaves.
- **FastAPI Python Backend**: Complete backend architecture, SQLAlchemy models, and Docker configuration.

## 🛠️ Local Setup & Installation

1. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Run Backend FastAPI Server:**
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

4. **Launch Frontend:**
   Open `frontend/index.html` in any modern web browser or serve with Nginx / Live Server.
   python run.py
---
*Note: This is a student project prototype and not a substitute for official meteorological authorities.*
