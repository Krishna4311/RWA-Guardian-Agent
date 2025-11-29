import requests
import json
import random

# The URL of your running Flask App
URL = "http://localhost:5000/predict"

def generate_mock_data(is_fraud=False):
    data = []
    energy_acc = 0.0
    
    print(f"\n--- Generating {'FRAUD' if is_fraud else 'VALID'} Session ---")
    
    for t in range(30):
        voltage = 230.0
        current = 10.0
        
        # FRAUD SCENARIO: Sudden Voltage Spike
        if is_fraud and t == 15:
            voltage = 300.0 # Huge spike!
        
        # Physics Math
        power = (voltage * current) / 1000.0
        step = power * (1/3600.0)
        energy_acc += step
        
        # SUBTLE FRAUD SCENARIO: Physics Mismatch
        # The machine reports higher energy than physics allows
        reported_energy = energy_acc
        if is_fraud and t > 20:
            reported_energy = energy_acc * 1.5 # Report 50% extra fake energy

        data.append({
            "time_index": t,
            "voltage": voltage,
            "current": current,
            "energy_kwh": reported_energy
        })
    return data

def run_test():
    # 1. Test a Valid Session
    valid_payload = {
        "session_id": "TEST_VALID_001",
        "data": generate_mock_data(is_fraud=False)
    }
    try:
        res = requests.post(URL, json=valid_payload)
        print(f"✅ Valid Test Response: {res.json()}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

    # 2. Test a Fraud Session
    fraud_payload = {
        "session_id": "TEST_FRAUD_999",
        "data": generate_mock_data(is_fraud=True)
    }
    try:
        res = requests.post(URL, json=fraud_payload)
        print(f"🚨 Fraud Test Response: {res.json()}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    run_test()