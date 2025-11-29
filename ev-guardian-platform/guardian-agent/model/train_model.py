import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import classification_report, confusion_matrix

def train():
    print("📂 Loading Dataset...")
    # Load raw time-series data
    try:
        df = pd.read_csv("../../rwa-data-feed/training_data.csv")
    except FileNotFoundError:
        print("❌ Error: 'training_data.csv' not found.")
        print("   Please run 'python charger_sim.py' in the rwa-data-feed folder first.")
        return

    # --- FEATURE ENGINEERING ---
    print(" Engineering Features (Summarizing Sessions)...")
    
    features = []
    
    # Group by Session ID to calculate session-level stats
    for session_id, group in df.groupby("session_id"):
        # 1. Basic Stats
        max_voltage = group['voltage'].max()
        min_voltage = group['voltage'].min()
        mean_current = group['current'].mean()
        total_energy_reported = group['energy_kwh'].max()
        
        # 2. Physics Check (The "Secret Weapon" Feature)
        # Calculate what energy SHOULD be: Sum(V * I * dt)
        # We assume dt=1 second
        calculated_energy = (group['voltage'] * group['current']).sum() / 1000 / 3600
        
        # The difference between Reported and Physics
        energy_discrepancy = abs(total_energy_reported - calculated_energy)
        
        # 3. Label (Target)
        # If any row in the group was fraud, the whole session is fraud
        is_fraud = 1 if "fraud" in group['label'].values else 0
        
        features.append({
            "max_voltage": max_voltage,
            "min_voltage": min_voltage,
            "mean_current": mean_current,
            "total_energy": total_energy_reported,
            "physics_diff": energy_discrepancy,
            "is_fraud": is_fraud
        })

    # Create the Feature DataFrame
    feat_df = pd.DataFrame(features)
    
    # Separate Inputs (X) and Target (y)
    X = feat_df.drop(columns=["is_fraud"])
    y = feat_df["is_fraud"]

    # Initialize Random Forest
    model = RandomForestClassifier(n_estimators=100, random_state=42)

    # --- CROSS VALIDATION ---
    print(f"\nRunning 5-Fold Cross-Validation on {len(X)} sessions...")
    
    # We use StratifiedKFold to ensure every fold has the same ratio of Fraud/Valid cases
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # Calculate scores (Accuracy)
    cv_scores = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
    
    print("-" * 40)
    print(f"   Fold Scores: {cv_scores}")
    print(f"   Mean Accuracy: {cv_scores.mean() * 100:.2f}%")
    print(f"   Standard Deviation: {cv_scores.std():.4f}")
    print("-" * 40)
    
    if cv_scores.mean() < 0.90:
        print(" Warning: Model accuracy is unstable. Consider generating more training data.")

    # --- FINAL TRAINING & SAVING ---
    print("\nRetraining on full dataset for production...")
    # We still do a split just to print a final report for you to see
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model.fit(X_train, y_train)
    
    print("\nFinal Test Report (on 20% holdout):")
    predictions = model.predict(X_test)
    print(classification_report(y_test, predictions))
    
    # Save the model trained on the train split (or you could fit on X entire if you prefer)
    # For best production results, we usually refit on EVERYTHING:
    model.fit(X, y) 
    
    print("Saving Production Model to 'fraud_model.pkl'...")
    with open("fraud_model.pkl", "wb") as f:
        pickle.dump(model, f)
    
    print("Done! ready for the Agent.")

if __name__ == "__main__":
    train()