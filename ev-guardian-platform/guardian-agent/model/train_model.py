import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import classification_report, confusion_matrix

def train():
    # --- 1. PATH SETUP ---
    # Define path relative to this script's location
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = "./training_data.csv"

    print(f"📂 Loading Dataset from: {csv_path}...")
    
    if not os.path.exists(csv_path):
        print("❌ Error: 'training_data.csv' not found.")
        print("   Please run 'python charger_sim.py' in the rwa-data-feed folder first.")
        return

    df = pd.read_csv(csv_path)

    # --- 2. FEATURE ENGINEERING ---
    print("⚙️  Engineering Features (Summarizing Sessions)...")
    
    features = []
    
    # Group by Session ID to calculate session-level stats
    # We iterate through every unique session
    for session_id, group in df.groupby("session_id"):
        
        # A. Basic Physics Stats
        max_voltage = group['voltage'].max()
        min_voltage = group['voltage'].min()
        mean_current = group['current'].mean()
        total_energy_reported = group['energy_kwh'].max()
        
        # B. Physics Integrity Check (The "Secret Weapon" Feature)
        # Calculate what energy SHOULD be: Sum(Power * dt)
        # Power (kW) = (Voltage * Current) / 1000
        # Energy (kWh) = Power * (1 second / 3600)
        calculated_energy = (group['voltage'] * group['current']).sum() / 1000 / 3600
        
        # The difference between what the meter SAID and what physics CALCULATED
        energy_discrepancy = abs(total_energy_reported - calculated_energy)
        
        # C. Target Label Extraction
        # In your new CSV, 'label' is a string: "normal" or "fraud"
        # We check if *any* row in this session is marked as 'fraud'
        # (Usually the label is consistent for the whole session)
        raw_labels = group['label'].unique()
        is_fraud = 1 if "fraud" in raw_labels else 0
        
        features.append({
            "max_voltage": max_voltage,
            "min_voltage": min_voltage,
            "mean_current": mean_current,
            "total_energy": total_energy_reported,
            "physics_diff": energy_discrepancy,  # <--- Crucial Feature
            "is_fraud": is_fraud
        })

    # Create the Feature DataFrame
    feat_df = pd.DataFrame(features)
    
    # Check if we actually have data
    if feat_df.empty:
        print("❌ Error: No valid sessions found in dataset.")
        return

    # Separate Inputs (X) and Target (y)
    X = feat_df.drop(columns=["is_fraud"])
    y = feat_df["is_fraud"]

    print(f"   Processed {len(X)} sessions.")
    print(f"   Fraud Cases: {y.sum()} ({y.sum()/len(y)*100:.1f}%)")

    # --- 3. MODEL TRAINING & CROSS VALIDATION ---
    # Initialize Random Forest
    model = RandomForestClassifier(n_estimators=100, random_state=42)

    print(f"\n🔄 Running 5-Fold Cross-Validation...")
    
    # We use StratifiedKFold to ensure every fold has the same ratio of Fraud/Valid cases
    # (Important because fraud is rare)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    try:
        # Calculate scores (Accuracy)
        cv_scores = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
        
        print("-" * 40)
        print(f"   Fold Scores: {cv_scores}")
        print(f"   Mean Accuracy: {cv_scores.mean() * 100:.2f}%")
        print(f"   Standard Deviation: {cv_scores.std():.4f}")
        print("-" * 40)
        
        if cv_scores.mean() < 0.90:
            print("⚠️  Warning: Model accuracy is unstable. Consider generating more training data.")
    except Exception as e:
        print(f"⚠️ Cross Validation skipped due to small dataset error: {e}")

    # --- 4. FINAL PRODUCTION BUILD ---
    print("\n🧠 Retraining on full dataset for production...")
    
    # Split 80/20 just to show a final report
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)
    
    print("\n📊 Final Test Report (on 20% holdout):")
    predictions = model.predict(X_test)
    print(classification_report(y_test, predictions))
    
    # Final Fit on 100% of data for the saved file
    model.fit(X, y) 
    
    # Save to disk
    save_path = os.path.join(base_dir, "fraud_model.pkl")
    print(f"💾 Saving Production Model to '{save_path}'...")
    with open(save_path, "wb") as f:
        pickle.dump(model, f)
    
    print("✅ Done! ready for the Agent.")

if __name__ == "__main__":
    train()