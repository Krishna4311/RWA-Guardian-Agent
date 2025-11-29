"""
Backend API Server for RWA Dashboard
Provides /status and /ingest endpoints for the frontend
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import random
import time
import sys
import os
import pickle
from datetime import datetime

# Add guardian-agent path to sys.path
guardian_path = os.path.join(os.path.dirname(__file__), 'guardian-agent')
if guardian_path not in sys.path:
    sys.path.insert(0, guardian_path)

# Import GuardianAgent class
# Note: fraud_detect.py has its own Flask app, but it won't run when imported
from model.fraud_detect import GuardianAgent

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize Guardian Agent for rule-based fraud detection
guardian = GuardianAgent()

# Load ML Model
ml_model = None
model_path = os.path.join(guardian_path, 'model', 'fraud_model.pkl')

def load_ml_model():
    """Load the trained ML model"""
    global ml_model
    try:
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                ml_model = pickle.load(f)
            print(f"✅ Loaded ML model from {model_path}")
            return True
        else:
            print(f"⚠️  ML model not found at {model_path}")
            print("   Using rule-based detection only")
            return False
    except Exception as e:
        print(f"⚠️  Error loading ML model: {str(e)}")
        print("   Using rule-based detection only")
        return False

def extract_features(session_data):
    """
    Extract features from session data for ML model prediction
    Features: max_voltage, min_voltage, mean_current, total_energy, physics_diff
    """
    if not session_data or len(session_data) == 0:
        return None
    
    # Convert to DataFrame
    df = pd.DataFrame(session_data)
    
    # Sort by time_index if available
    if 'time_index' in df.columns:
        df = df.sort_values('time_index')
    
    # Calculate features (same as training)
    max_voltage = df['voltage'].max()
    min_voltage = df['voltage'].min()
    mean_current = df['current'].mean()
    total_energy_reported = df['energy_kwh'].max()
    
    # Calculate physics-based energy
    # Power (kW) = (Voltage * Current) / 1000
    # Energy (kWh) = Power * (1 second / 3600)
    calculated_energy = (df['voltage'] * df['current']).sum() / 1000.0 / 3600.0
    
    # Energy discrepancy (key feature)
    energy_discrepancy = abs(total_energy_reported - calculated_energy)
    
    return {
        'max_voltage': max_voltage,
        'min_voltage': min_voltage,
        'mean_current': mean_current,
        'total_energy': total_energy_reported,
        'physics_diff': energy_discrepancy
    }

def predict_with_ml(session_data):
    """
    Use ML model to predict fraud
    Returns: (prediction, confidence, features)
    prediction: 'FRAUD' or 'VALID'
    confidence: probability score (0-1)
    """
    if ml_model is None:
        return None, None, None
    
    features = extract_features(session_data)
    if features is None:
        return None, None, None
    
    # Convert to array in the correct order
    feature_array = np.array([[
        features['max_voltage'],
        features['min_voltage'],
        features['mean_current'],
        features['total_energy'],
        features['physics_diff']
    ]])
    
    # Get prediction (0 = normal, 1 = fraud)
    prediction = ml_model.predict(feature_array)[0]
    
    # Get prediction probabilities
    probabilities = ml_model.predict_proba(feature_array)[0]
    # probabilities[0] = probability of normal, probabilities[1] = probability of fraud
    confidence = probabilities[1] if prediction == 1 else probabilities[0]
    
    result = 'FRAUD' if prediction == 1 else 'VALID'
    
    return result, float(confidence), features

# In-memory storage for current session data
current_session_data = []
current_session_id = None
session_start_time = None

# Load dataset for simulation
dataset = None
dataset_index = 0

def load_dataset():
    """Load the synthetic EV dataset"""
    global dataset
    try:
        # Try to load from the root directory
        dataset = pd.read_csv('large_synthetic_ev_data.csv')
        print(f"✅ Loaded dataset with {len(dataset)} rows")
    except FileNotFoundError:
        try:
            # Try alternative path
            dataset = pd.read_csv('../large_synthetic_ev_data.csv')
            print(f"✅ Loaded dataset with {len(dataset)} rows")
        except FileNotFoundError:
            print("⚠️  Dataset not found. Running in simulation mode only.")
            dataset = None

@app.route('/status', methods=['GET'])
def get_status():
    """
    GET /status
    Returns the current session status (VALID or FRAUD)
    Uses both ML model and rule-based detection
    """
    global current_session_data, current_session_id
    
    # If we have session data, analyze it
    if current_session_data and len(current_session_data) > 0:
        try:
            # Rule-based detection
            rule_decision, rule_reason = guardian.check_session(current_session_data)
            
            # ML model detection
            ml_decision, ml_confidence, ml_features = predict_with_ml(current_session_data)
            
            # Combine results: ML model takes priority if available, otherwise use rules
            if ml_decision is not None:
                # Use ML model result
                decision = ml_decision
                confidence_pct = ml_confidence * 100 if ml_confidence else None
                
                # Create detailed message
                if ml_decision == 'FRAUD':
                    reason = f"ML Model detected fraud (confidence: {confidence_pct:.1f}%)"
                    if ml_features:
                        reason += f" | Physics diff: {ml_features['physics_diff']:.4f} kWh"
                else:
                    reason = f"ML Model: Valid session (confidence: {confidence_pct:.1f}%)"
                
                # If rule-based also detected fraud, mention it
                if rule_decision == 'FRAUD' and ml_decision == 'VALID':
                    reason += f" | Rule-based check: {rule_reason}"
                elif rule_decision == 'FRAUD' and ml_decision == 'FRAUD':
                    reason += f" | Confirmed by rule-based check"
            else:
                # Fallback to rule-based only
                decision = rule_decision
                reason = rule_reason
            
            response = {
                'status': decision,
                'timestamp': int(time.time() * 1000),
                'message': reason,
                'session_id': current_session_id or 'unknown',
                'detection_method': 'ml_model' if ml_decision is not None else 'rule_based'
            }
            
            # Add ML model details if available
            if ml_decision is not None and ml_confidence is not None:
                response['ml_confidence'] = float(ml_confidence)
                response['ml_confidence_pct'] = float(ml_confidence * 100)
                if ml_features:
                    response['features'] = {
                        'max_voltage': float(ml_features['max_voltage']),
                        'min_voltage': float(ml_features['min_voltage']),
                        'mean_current': float(ml_features['mean_current']),
                        'total_energy': float(ml_features['total_energy']),
                        'physics_diff': float(ml_features['physics_diff'])
                    }
            
            return jsonify(response)
        except Exception as e:
            return jsonify({
                'status': 'VALID',
                'timestamp': int(time.time() * 1000),
                'message': f'Analysis error: {str(e)}'
            }), 500
    
    # Default status when no session is active
    return jsonify({
        'status': 'VALID',
        'timestamp': int(time.time() * 1000),
        'message': 'No active session'
    })

@app.route('/ingest', methods=['GET', 'POST'])
def ingest_data():
    """
    GET/POST /ingest
    Returns or receives voltage/current/energy data
    For GET: Returns next data point from dataset or generates simulated data
    For POST: Receives data point and stores it for fraud analysis
    """
    global dataset, dataset_index, current_session_data, current_session_id, session_start_time
    
    if request.method == 'POST':
        # Receive data from external source
        data = request.json
        if data:
            current_session_data.append(data)
            if not current_session_id:
                current_session_id = data.get('session_id', f'SESSION_{int(time.time())}')
            return jsonify({'status': 'received', 'count': len(current_session_data)})
        return jsonify({'error': 'No data provided'}), 400
    
    # GET request - return next data point
    if dataset is not None and len(dataset) > 0:
        # Use dataset
        if dataset_index >= len(dataset):
            dataset_index = 0  # Loop back to start
        
        row = dataset.iloc[dataset_index]
        dataset_index += 1
        
        # Update session tracking
        session_id = row.get('session_id', 'S1')
        if current_session_id != session_id:
            # New session started
            current_session_id = session_id
            current_session_data = []
            session_start_time = time.time()
        
        # Add to current session data for fraud analysis
        data_point = {
            'time_index': int(row.get('time_index', 0)),
            'session_id': session_id,
            'voltage': float(row.get('voltage', 230)),
            'current': float(row.get('current', 10)),
            'energy_kwh': float(row.get('energy_kwh', 0)),
            'status': row.get('status', 'charging'),
            'label': row.get('label', 'normal')
        }
        current_session_data.append(data_point)
        
        return jsonify({
            'voltage': data_point['voltage'],
            'current': data_point['current'],
            'energy_kwh': data_point['energy_kwh'],
            'timestamp': int(time.time() * 1000),
            'session_id': session_id
        })
    else:
        # Generate simulated data
        voltage = round(230 + random.uniform(-5, 5), 2)
        current = round(10 + random.uniform(-1, 1), 2)
        energy_kwh = round(random.uniform(0, 50), 3)
        
        return jsonify({
            'voltage': voltage,
            'current': current,
            'energy_kwh': energy_kwh,
            'timestamp': int(time.time() * 1000)
        })

@app.route('/predict', methods=['POST'])
def predict_fraud():
    """
    POST /predict
    Analyzes a complete session for fraud detection using both ML model and rule-based
    """
    try:
        req_data = request.json
        session_id = req_data.get('session_id', 'Unknown')
        session_readings = req_data.get('data', [])

        if not session_readings:
            return jsonify({"status": "ERROR", "reason": "No data provided"}), 400

        print(f"🧠 Analyzing Session {session_id} with {len(session_readings)} data points...")
        
        # Rule-based detection
        rule_decision, rule_reason = guardian.check_session(session_readings)
        
        # ML model detection
        ml_decision, ml_confidence, ml_features = predict_with_ml(session_readings)
        
        # Combine results
        if ml_decision is not None:
            decision = ml_decision
            confidence_pct = ml_confidence * 100 if ml_confidence else None
            
            if ml_decision == 'FRAUD':
                reason = f"ML Model: Fraud detected (confidence: {confidence_pct:.1f}%)"
            else:
                reason = f"ML Model: Valid (confidence: {confidence_pct:.1f}%)"
            
            if rule_decision == 'FRAUD':
                reason += f" | Rule-based: {rule_reason}"
        else:
            decision = rule_decision
            reason = rule_reason
        
        print(f"👉 Result: {decision} ({reason})")

        response = {
            "session_id": session_id,
            "status": decision,
            "reason": reason,
            "detection_method": "ml_model" if ml_decision is not None else "rule_based"
        }
        
        # Add ML model details if available
        if ml_decision is not None and ml_confidence is not None:
            response['ml_confidence'] = float(ml_confidence)
            response['ml_confidence_pct'] = float(ml_confidence * 100)
            if ml_features:
                response['features'] = {
                    'max_voltage': float(ml_features['max_voltage']),
                    'min_voltage': float(ml_features['min_voltage']),
                    'mean_current': float(ml_features['mean_current']),
                    'total_energy': float(ml_features['total_energy']),
                    'physics_diff': float(ml_features['physics_diff'])
                }

        return jsonify(response)

    except Exception as e:
        return jsonify({"status": "ERROR", "reason": str(e)}), 500

@app.route('/reset', methods=['POST'])
def reset_session():
    """Reset current session data"""
    global current_session_data, current_session_id, dataset_index, session_start_time
    current_session_data = []
    current_session_id = None
    dataset_index = 0
    session_start_time = None
    return jsonify({'status': 'reset'})

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': int(time.time() * 1000),
        'dataset_loaded': dataset is not None,
        'dataset_rows': len(dataset) if dataset is not None else 0,
        'ml_model_loaded': ml_model is not None
    })

if __name__ == '__main__':
    print("🚀 Starting RWA Dashboard Backend API...")
    load_dataset()
    load_ml_model()
    print("📡 Backend API running on http://localhost:5000")
    print("   Endpoints:")
    print("   - GET  /status  - Get current session status (ML + Rule-based)")
    print("   - GET  /ingest  - Get next data point")
    print("   - POST /ingest  - Receive data point")
    print("   - POST /predict - Analyze session for fraud (ML + Rule-based)")
    print("   - POST /reset   - Reset session")
    print("   - GET  /health  - Health check")
    app.run(host='0.0.0.0', port=5000, debug=True)

