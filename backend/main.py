# backend/main.py — FastAPI Application Entry Point
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.database import get_db, engine, Base
from backend.risk.risk_engine import evaluate_disaster_risk
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
    weather = requests.get(f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m,surface_pressure,relative_humidity_2m").json()
    cur = weather.get("current", {})
    risks = evaluate_disaster_risk(cur)
    return {"location": {"lat": lat, "lon": lon}, "risks": risks}
