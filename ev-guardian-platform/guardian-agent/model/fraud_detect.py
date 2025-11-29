from flask import Flask, request, jsonify
import pandas as pd
import numpy as np

app = Flask(__name__)

class GuardianAgent:
    def __init__(self):
        # Rules defined in PDF Section 3
        self.MIN_VOLTAGE = 200
        self.MAX_VOLTAGE = 260
        self.MAX_CURRENT = 50
        
        # Physics Tolerance (Real world isn't perfect, allow 5% error)
        self.ENERGY_TOLERANCE = 0.05 

    def check_session(self, session_data):
        """
        Analyzes a session's data points (list of dicts) to detect fraud.
        Returns: 'VALID' or 'FRAUD' along with a reason.
        """
        previous_energy = -1.0
        calculated_energy = 0.0
        
        # Convert list of dicts to DataFrame for easy processing
        df = pd.DataFrame(session_data)
        
        # Sort by time just in case
        if 'time_index' in df.columns:
            df = df.sort_values('time_index')

        for index, row in df.iterrows():
            voltage = float(row['voltage'])
            current = float(row['current'])
            reported_energy = float(row['energy_kwh'])
            time_idx = int(row['time_index'])
            
            # --- Rule 1: Safety Limits (Hard Hardware Faults) ---
            if voltage < self.MIN_VOLTAGE or voltage > self.MAX_VOLTAGE:
                return "FRAUD", f"Voltage anomaly: {voltage}V at t={time_idx}"
            
            if current < 0 or current > self.MAX_CURRENT:
                return "FRAUD", f"Current anomaly: {current}A at t={time_idx}"
            
            # --- Rule 2: Logical Consistency (The 'Time Machine' Check) ---
            # Energy must be non-decreasing
            if previous_energy != -1.0 and reported_energy < previous_energy:
                 return "FRAUD", f"Energy drop detected at t={time_idx}"
            
            # --- Rule 3: Physics Verification (The 'Integrity' Check) ---
            # We calculate energy manually: Power (kW) = (V * A) / 1000
            # Energy (kWh) = Power * (1 second / 3600)
            # We assume dt=1 second based on simulator
            if index > 0:
                power_kw = (voltage * current) / 1000.0
                energy_step = power_kw * (1 / 3600.0)
                calculated_energy += energy_step
                
                # Check if Reported Energy deviates from Physics by > 5%
                # We only check if we have accumulated enough energy (> 0.01 kWh) to avoid divide-by-zero noise
                if calculated_energy > 0.01:
                    diff = abs(reported_energy - calculated_energy)
                    error_percent = diff / calculated_energy
                    
                    if error_percent > self.ENERGY_TOLERANCE:
                        return "FRAUD", f"Physics Mismatch! Calc: {calculated_energy:.4f}, Reported: {reported_energy:.4f} at t={time_idx}"

            previous_energy = reported_energy
            
        return "VALID", "Session completed normally."

# --- API Endpoint ---
guardian = GuardianAgent()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        req_data = request.json
        session_id = req_data.get('session_id', 'Unknown')
        session_readings = req_data.get('data', [])

        if not session_readings:
            return jsonify({"status": "ERROR", "reason": "No data provided"}), 400

        print(f"🧠 Analyzing Session {session_id} with {len(session_readings)} data points...")
        decision, reason = guardian.check_session(session_readings)
        print(f"👉 Result: {decision} ({reason})")

        return jsonify({
            "session_id": session_id,
            "status": decision,
            "reason": reason
        })

    except Exception as e:
        return jsonify({"status": "ERROR", "reason": str(e)}), 500

if __name__ == "__main__":
    print("🧠 Guardian AI Brain is running on port 5000...")
    app.run(host='0.0.0.0', port=5000)