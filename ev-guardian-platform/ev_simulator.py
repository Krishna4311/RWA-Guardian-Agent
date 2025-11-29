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
            
            # Capture the specific reason for logging
            row_label = "normal"
            row_note = ""

            if is_fraud and is_anomaly_time:
                row_label = "fraud"
                if anomaly_type == "voltage_spike":
                    voltage = round(random.uniform(265, 290), 1) 
                    row_note = "Voltage Spike > 260V"
                elif anomaly_type == "voltage_dip":
                    voltage = round(random.uniform(150, 190), 1)
                    row_note = "Voltage Dip < 200V"
                elif anomaly_type == "current_spike":
                    current = round(random.uniform(55, 80), 1)
                    row_note = "Current Spike > 50A"
                elif anomaly_type == "energy_drop":
                    energy_kwh = max(0, energy_kwh - 0.02)
                    row_note = "Energy Decrease"
            
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
                "label": "fraud" if is_fraud else "normal", # Session level label
                "row_type": row_label, # Specific row label
                "note": row_note # Description of the anomaly
            }
            data.append(record)
            
        return data

# --- MAIN GENERATION ---
if __name__ == "__main__":
    NUM_SESSIONS = 50
    DURATION_PER_SESSION = 30 
    FRAUD_RATIO = 0.2         

    sim = EVSessionSimulator()
    all_data = []

    print(f"Generating {NUM_SESSIONS} sessions ({DURATION_PER_SESSION}s each)...")

    for i in range(1, NUM_SESSIONS + 1):
        sid = f"S{i}"
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

    # --- NEW: FRAUD LOGS SECTION ---
    print("\n🚨 FRAUD SIMULATION LOGS (Preview) 🚨")
    print(f"{'Session':<10} | {'Time':<5} | {'Type':<20} | {'Value':<10} | {'Note'}")
    print("-" * 70)

    # Filter for rows where row_type is 'fraud'
    fraud_rows = df[df['row_type'] == 'fraud']

    if fraud_rows.empty:
        print("No fraud simulated this time (random chance). Try running again.")
    else:
        # Show first 10 fraud events
        for index, row in fraud_rows.head(10).iterrows():
            # Determine main value to show based on note
            val = f"{row['voltage']}V" if "Voltage" in row['note'] else f"{row['current']}A"
            if "Energy" in row['note']: val = f"{row['energy_kwh']}kWh"
            
            print(f"{row['session_id']:<10} | {row['time_index']:<5} | {row['note']:<20} | {val:<10} | Fraud Detected")
        
        print(f"\n... and {len(fraud_rows) - 10} more anomaly frames.")
        print(f"Total Fraud Sessions: {df[df['label'] == 'fraud']['session_id'].nunique()}")