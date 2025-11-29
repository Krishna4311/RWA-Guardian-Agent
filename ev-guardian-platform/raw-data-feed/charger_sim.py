import random
import pandas as pd
import numpy as np
import time

class RobustEVSimulator:
    def __init__(self):
        self.voltage_nominal = 230
        self.current_max = 32
        self.dt = 1 

    def generate_session(self, session_id, scenario="normal", duration_seconds=60):
        data = []
        energy_accumulator = 0.0
        
        # Physics State
        battery_soc = random.uniform(20, 50) 
        battery_capacity = 60.0 
        
        session_label = "normal" if scenario == "normal" else "fraud"

        # --- REALISM: Sensor Calibration Error ---
        # Every charger is slightly different. Some read high, some low.
        # A normal sensor might have a permanent bias of +1.5% or -1.5%
        sensor_bias = random.uniform(0.98, 1.02) 

        for t in range(duration_seconds):
            # 1. TRUE PHYSICS (What actually happens)
            if battery_soc > 80:
                decay = (100 - battery_soc) / 20.0
                target_current = self.current_max * max(0.1, decay)
            else:
                target_current = self.current_max

            # True values (with natural electrical fluctuation)
            real_voltage = np.random.normal(self.voltage_nominal, 0.5)
            real_current = np.random.normal(target_current, 0.2)
            
            real_power_kw = (real_voltage * real_current) / 1000.0
            real_energy_step = real_power_kw * (self.dt / 3600.0)

            # 2. SENSOR LAYER (The "Dirty" Reality)
            # Sensors aren't perfect. They add noise and bias.
            # Normal Readings = True Physics * Sensor Bias + Random Noise
            measured_voltage = real_voltage + np.random.normal(0, 0.1)
            measured_current = real_current + np.random.normal(0, 0.1)
            
            # 3. FRAUD LAYER (The Attack)
            reported_voltage = measured_voltage
            reported_current = measured_current
            
            # Base reported energy (Normal case includes Sensor Bias!)
            reported_energy_step = real_energy_step * sensor_bias

            row_type = "normal"
            note = "Normal Charging"

            if scenario == "salami_slicing":
                # FRAUD: Attackers add EXTRA 3% on top of whatever the sensor says
                # Total Deviation might be 1.02 (sensor) * 1.03 (fraud) = ~1.05
                reported_energy_step = reported_energy_step * 1.03
                row_type = "fraud"
                note = "Energy Inflation (3%)"
            
            elif scenario == "meter_bypass":
                reported_energy_step = reported_energy_step * 0.1
                row_type = "fraud"
                note = "Meter Slowdown"
                
            elif scenario == "ghost_injection":
                fake_current = 50.0 
                fake_power = (reported_voltage * fake_current) / 1000.0
                # Ghosts usually have "perfect" math, which is suspicious in itself!
                # We simulate a "perfect" injection that ignores sensor noise
                reported_energy_step = fake_power * (self.dt / 3600.0)
                row_type = "fraud"
                note = "Ghost Injection"
            
            # 4. ACCUMULATION
            energy_accumulator += reported_energy_step
            battery_soc += (real_energy_step / battery_capacity) * 100
            
            status = "charging" if t < duration_seconds - 1 else "finished"

            record = {
                "time_index": t,
                "session_id": session_id,
                "voltage": round(reported_voltage, 2),
                "current": round(reported_current, 2),
                "energy_kwh": round(energy_accumulator, 5),
                "status": status,
                "label": session_label, 
                "row_type": row_type,
                "note": note
            }
            data.append(record)

        return data

if __name__ == "__main__":
    sim = RobustEVSimulator()
    all_data = []
    
    print("🚀 Generating NOISY Training Dataset (2000 Sessions)...")
    
    # 1500 Normal Sessions (Now with ±2% Sensor Error)
    for i in range(1500):
        all_data.extend(sim.generate_session(f"S_NORM_{i}", scenario="normal"))

    # 150 Salami Slicing (Now overlaps with bad sensors!)
    for i in range(150):
        all_data.extend(sim.generate_session(f"S_SALAMI_{i}", scenario="salami_slicing"))

    # 150 Meter Bypass
    for i in range(150):
        all_data.extend(sim.generate_session(f"S_BYPASS_{i}", scenario="meter_bypass"))
        
    # 200 Ghost Attacks
    for i in range(200):
        all_data.extend(sim.generate_session(f"S_GHOST_{i}", scenario="ghost_injection"))

    df = pd.DataFrame(all_data)
    cols = ["time_index", "session_id", "voltage", "current", "energy_kwh", "status", "label", "row_type", "note"]
    df = df[cols]
    
    df.to_csv("training_data.csv", index=False)
    print(f"✅ Saved {len(df)} rows to 'training_data.csv'")