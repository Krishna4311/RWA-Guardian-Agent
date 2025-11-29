import random
import pandas as pd
import numpy as np
import time

class RobustEVSimulator:
    def __init__(self):
        self.voltage_nominal = 230
        self.current_max = 32 # 32A Standard Charger
        self.dt = 1 # 1 second time step

    def generate_session(self, session_id, scenario="normal", duration_seconds=60):
        """
        Generates a charging session based on a specific 'scenario'.
        Scenarios: 'normal', 'salami_slicing', 'meter_bypass', 'ghost_injection'
        """
        data = []
        energy_accumulator = 0.0
        
        # Physics State
        battery_soc = random.uniform(20, 50) # Start with 20-50% battery
        battery_capacity = 60.0 # 60kWh standard EV battery
        
        print(f"   Generating Scenario: {scenario.upper()}")

        for t in range(duration_seconds):
            # 1. BASE PHYSICS (The Truth)
            # ---------------------------------------------------------
            # CC-CV Curve: If SOC > 80%, current drops exponentially
            target_current = self.current_max
            if battery_soc > 80:
                decay = (100 - battery_soc) / 20.0
                target_current = self.current_max * max(0.1, decay)
            
            # Add natural electrical noise (Real world isn't perfect)
            real_voltage = np.random.normal(self.voltage_nominal, 0.5)
            real_current = np.random.normal(target_current, 0.2)
            
            # Calculate REAL physics energy for this second
            # Power (kW) = (V * A) / 1000
            real_power_kw = (real_voltage * real_current) / 1000.0
            real_energy_step = real_power_kw * (self.dt / 3600.0)

            # 2. ATTACK LAYER (The Lie)
            # ---------------------------------------------------------
            reported_voltage = real_voltage
            reported_current = real_current
            reported_energy_step = real_energy_step

            if scenario == "salami_slicing":
                # FRAUD: Inflate energy by 3% (Hard to detect!)
                # The user pays for 1.03x what they actually got.
                reported_energy_step = real_energy_step * 1.03
            
            elif scenario == "meter_bypass":
                # FRAUD: The car is charging, but meter counts 90% slower
                # Energy Theft / Free Riding
                reported_energy_step = real_energy_step * 0.1
                
            elif scenario == "ghost_injection":
                # FRAUD: Fake data. Perfect numbers, but "Physics Mismatch" if checked closely.
                # We inject a math error: Energy claims to be consistent with 50A, but current shows 32A
                fake_current = 50.0 
                fake_power = (reported_voltage * fake_current) / 1000.0
                reported_energy_step = fake_power * (self.dt / 3600.0)
            
            # 3. STATE UPDATE
            # ---------------------------------------------------------
            energy_accumulator += reported_energy_step
            
            # Update virtual battery SOC (using REAL energy, not reported)
            battery_soc += (real_energy_step / battery_capacity) * 100

            record = {
                "time_index": t,
                "session_id": session_id,
                "scenario": scenario,
                "voltage": round(reported_voltage, 2),
                "current": round(reported_current, 2),
                "energy_kwh": round(energy_accumulator, 5)
            }
            data.append(record)

        return data

# --- MAIN GENERATION ---# Inside charger_sim.py (Update the bottom part)

if __name__ == "__main__":
    sim = RobustEVSimulator()
    all_data = []
    
    print("🚀 Generating Training Dataset (2000 Sessions)...")
    
    # Generate 1500 Normal Sessions (Real life is mostly normal)
    for i in range(1500):
        all_data.extend(sim.generate_session(f"S_NORM_{i}", scenario="normal"))

    # Generate 150 "Salami Slicing" (Hard to catch)
    for i in range(150):
        all_data.extend(sim.generate_session(f"S_SALAMI_{i}", scenario="salami_slicing"))

    # Generate 150 "Meter Bypass" (Energy Theft)
    for i in range(150):
        all_data.extend(sim.generate_session(f"S_BYPASS_{i}", scenario="meter_bypass"))
        
    # Generate 200 "Ghost" Attacks (Obvious fraud)
    for i in range(200):
        all_data.extend(sim.generate_session(f"S_GHOST_{i}", scenario="ghost_injection"))

    df = pd.DataFrame(all_data)
    df.to_csv("training_data.csv", index=False)
    print(f"✅ Saved {len(df)} rows to 'training_data.csv'")
