import pandas as pd

class GuardianAgent:
    def __init__(self):
        # Rules defined in PDF Section 3 [cite: 40-41]
        self.MIN_VOLTAGE = 200
        self.MAX_VOLTAGE = 260
        self.MAX_CURRENT = 50
        
    def check_session(self, session_data):
        """
        Analyzes a single session's data points to detect fraud.
        Returns: 'VALID' or 'FRAUD' along with a reason.
        """
        previous_energy = -1.0
        
        for index, row in session_data.iterrows():
            voltage = row['voltage']
            current = row['current']
            energy = row['energy_kwh']
            
            # Rule 1: Voltage Safety Range
            if voltage < self.MIN_VOLTAGE or voltage > self.MAX_VOLTAGE:
                return "FRAUD", f"Voltage anomaly detected: {voltage}V at t={row['time_index']}"
            
            # Rule 2: Current Safety Range
            if current < 0 or current > self.MAX_CURRENT:
                return "FRAUD", f"Current anomaly detected: {current}A at t={row['time_index']}"
            
            # Rule 3: Energy must be non-decreasing [cite: 42]
            # (We skip the check for the very first reading)
            if previous_energy != -1.0 and energy < previous_energy:
                 return "FRAUD", f"Energy decrease detected at t={row['time_index']} ({previous_energy} -> {energy})"
            
            previous_energy = energy
            
        # Rule 4: If finished with no fraud found -> VALID [cite: 44]
        return "VALID", "Session completed normally."

# --- Main Execution ---
if __name__ == "__main__":
    # 1. Load the dataset you generated
    print("Loading dataset...")
    df = pd.read_csv("large_synthetic_ev_data.csv")
    
    # 2. Group data by Session ID so we process one car at a time
    unique_sessions = df['session_id'].unique()
    guardian = GuardianAgent()
    
    print(f"Analyzing {len(unique_sessions)} sessions...\n")
    print(f"{'Session ID':<10} | {'Decision':<10} | {'Reason'}")
    print("-" * 60)
    
    results = []
    
    for session_id in unique_sessions:
        # Get all rows for this specific session
        session_rows = df[df['session_id'] == session_id]
        
        # Ask Guardian to check it
        decision, reason = guardian.check_session(session_rows)
        
        # Print result
        print(f"{session_id:<10} | {decision:<10} | {reason}")
        
        # Store for summary
        results.append({"id": session_id, "decision": decision})

    # Summary
    print("-" * 60)
    fraud_count = len([r for r in results if r['decision'] == 'FRAUD'])
    print(f"Analysis Complete.")
    print(f"Total Sessions: {len(results)}")
    print(f"Valid Sessions: {len(results) - fraud_count}")
    print(f"Fraud Sessions: {fraud_count}")