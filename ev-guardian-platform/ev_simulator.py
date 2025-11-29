import random
import pandas as pd

class EVSessionSimulator:
    def __init__(self):
        self.voltage_nominal = 230
        self.current_nominal = 10
        self.dt = 1 # 1 second time step

    def generate_session(self, session_id, is_fraud=False, duration_seconds=30):
        data = []
        energy_kwh = 0.0
        
        # Assign a stable random baseline for this session
        base_voltage = self.voltage_nominal + random.uniform(-3, 3)
        base_current = self.current_nominal + random.uniform(-1, 1)

        # Determine anomaly type if fraud
        anomaly_type = None
        if is_fraud:
            # Randomly pick one of the fraud rules from the PDF
            anomaly_type = random.choice(["voltage_spike", "voltage_dip", "current_spike", "energy_drop"])

        for t in range(duration_seconds):
            # Normal variations
            voltage = round(base_voltage + random.uniform(-1, 1), 1)
            current = round(base_current + random.uniform(-0.5, 0.5), 1)
            
            # Inject Anomaly (roughly in the middle of the session, e.g., seconds 10-15)
            is_anomaly_time = (t >= 10 and t < 15)
            
            if is_fraud and is_anomaly_time:
                if anomaly_type == "voltage_spike":
                    voltage = round(random.uniform(265, 290), 1) # Rule: > 260 [cite: 168]
                elif anomaly_type == "voltage_dip":
                    voltage = round(random.uniform(150, 190), 1) # Rule: < 200 [cite: 168]
                elif anomaly_type == "current_spike":
                    current = round(random.uniform(55, 80), 1)   # Rule: > 50 [cite: 169]
                elif anomaly_type == "energy_drop":
                    # Directly manipulate energy to drop
                    energy_kwh = max(0, energy_kwh - 0.02) # Rule: Energy decreases [cite: 170]
            
            # Calculate Energy (Skip accumulation if we are simulating an energy drop anomaly)
            if not (is_fraud and is_anomaly_time and anomaly_type == "energy_drop"):
                power_kw = (voltage * current) / 1000.0
                energy_step = power_kw * (self.dt / 3600.0)
                energy_kwh += energy_step
            
            status = "charging" if t < duration_seconds - 1 else "finished"
            
            record = {
                "time_index": t,
                "session_id": session_id,
                "voltage": voltage,
                "current": current,
                "energy_kwh": round(energy_kwh, 5),
                "status": status,
                # 'label' column is for your reference to check accuracy later
                "label": "fraud" if is_fraud else "normal"
            }
            data.append(record)
            
        return data

# --- MAIN GENERATION ---
if __name__ == "__main__":
    # Configuration for > 1000 rows
    NUM_SESSIONS = 50
    DURATION_PER_SESSION = 30 # 50 sessions * 30 seconds = 1500 rows
    FRAUD_RATIO = 0.2         # 20% of sessions will be fraudulent

    sim = EVSessionSimulator()
    all_data = []

    print(f"Generating {NUM_SESSIONS} sessions ({DURATION_PER_SESSION}s each)...")

    for i in range(1, NUM_SESSIONS + 1):
        sid = f"S{i}"
        # Determine if this session is fraud based on random chance
        is_fraud = True if random.random() < FRAUD_RATIO else False
        
        session_data = sim.generate_session(sid, is_fraud, DURATION_PER_SESSION)
        all_data.extend(session_data)

    df = pd.DataFrame(all_data)
    
    # Save to CSV
    csv_filename = "large_synthetic_ev_data.csv"
    df.to_csv(csv_filename, index=False)
    
    print("-" * 50)
    print(f"Done! Generated {len(df)} rows.")
    print(f"Saved to: {csv_filename}")
    print("-" * 50)
    print("Sample Data:")
    print(df.head())
