# backend/risk/risk_engine.py — Transparent Rule-Based Baseline Risk Engine
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
