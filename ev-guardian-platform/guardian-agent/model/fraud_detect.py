from flask import Flask, request, jsonify
import pandas as pd

app = Flask(__name__)

class GuardianAgent:
    def __init__(self):
        # [cite_start]Rules defined in PDF Section 3 [cite: 1]
        self.MIN_VOLTAGE = 200
        self.MAX_VOLTAGE = 260
        self.MAX_CURRENT = 50
        
    def check_session(self, session_data):
        """
        Analyzes a session's data points (list of dicts) to detect fraud.
        Returns: 'VALID' or 'FRAUD' along with a reason.
        """
        previous_energy = -1.0
        
        # Convert list of dicts to DataFrame for easy processing
        df = pd.DataFrame(session_data)

        for index, row in df.iterrows():
            voltage = row['voltage']
            current = row['current']
            energy = row['energy_kwh']
            
            # Rule 1: Voltage Safety Range
            if voltage < self.MIN_VOLTAGE or voltage > self.MAX_VOLTAGE:
                return "FRAUD", f"Voltage anomaly detected: {voltage}V at t={row['time_index']}"
            
            # Rule 2: Current Safety Range
            if current < 0 or current > self.MAX_CURRENT:
                return "FRAUD", f"Current anomaly detected: {current}A at t={row['time_index']}"
            
            # [cite_start]Rule 3: Energy must be non-decreasing [cite: 1]
            if previous_energy != -1.0 and energy < previous_energy:
                 return "FRAUD", f"Energy decrease detected at t={row['time_index']} ({previous_energy} -> {energy})"
            
            previous_energy = energy
            
        # [cite_start]Rule 4: If finished with no fraud found -> VALID [cite: 1]
        return "VALID", "Session completed normally."

# --- API Endpoint for the Node.js Agent ---
guardian = GuardianAgent()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # 1. Receive JSON data from Node.js
        # Expected format: { "session_id": "S1", "data": [ { "time_index": 0, "voltage": 230... } ] }
        req_data = request.json
        session_id = req_data.get('session_id', 'Unknown')
        session_readings = req_data.get('data', [])

        if not session_readings:
            return jsonify({"status": "ERROR", "reason": "No data provided"}), 400

        # 2. Run the Logic
        decision, reason = guardian.check_session(session_readings)

        # 3. Return the verdict
        return jsonify({
            "session_id": session_id,
            "status": decision,
            "reason": reason
        })

    except Exception as e:
        return jsonify({"status": "ERROR", "reason": str(e)}), 500

if __name__ == "__main__":
    # Run the server on Port 5000
    print("Guardian AI Brain is running on port 5000...")
    app.run(host='0.0.0.0', port=5000)