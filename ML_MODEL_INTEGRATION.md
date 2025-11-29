# ML Model Integration Guide

## Overview

The fraud detection system now uses a **Machine Learning (ML) model** (`fraud_model.pkl`) in addition to rule-based detection. The ML model is a Random Forest Classifier trained on EV charging session data.

## How It Works

### 1. Model Features

The ML model analyzes sessions using 5 key features:
- **max_voltage**: Maximum voltage recorded in the session
- **min_voltage**: Minimum voltage recorded in the session
- **mean_current**: Average current during the session
- **total_energy**: Total reported energy (kWh)
- **physics_diff**: Energy discrepancy between reported and calculated values (key fraud indicator)

### 2. Detection Flow

When new data is fed to the system:

1. **Data Collection**: Session data points are collected via `/ingest` endpoint
2. **Feature Extraction**: Features are calculated from the session data
3. **ML Prediction**: The model predicts fraud probability (0-1)
4. **Rule-Based Check**: Traditional rule-based checks also run
5. **Combined Result**: ML model takes priority, with rule-based as fallback

### 3. API Endpoints

#### GET `/status`
Returns current session status with ML model predictions:
```json
{
  "status": "FRAUD" | "VALID",
  "timestamp": 1234567890,
  "message": "ML Model detected fraud (confidence: 95.2%)",
  "session_id": "S1",
  "detection_method": "ml_model",
  "ml_confidence": 0.952,
  "ml_confidence_pct": 95.2,
  "features": {
    "max_voltage": 245.3,
    "min_voltage": 228.1,
    "mean_current": 12.5,
    "total_energy": 0.234,
    "physics_diff": 0.0123
  }
}
```

#### POST `/predict`
Analyzes a complete session:
```json
{
  "session_id": "S1",
  "data": [
    {
      "time_index": 0,
      "voltage": 230.5,
      "current": 10.2,
      "energy_kwh": 0.001
    }
  ]
}
```

### 4. Frontend Display

The dashboard now shows:
- **ML Confidence**: Percentage confidence in the prediction
- **Detection Method**: Whether ML model or rule-based was used
- **Model Features**: All 5 features used for prediction
- **Analysis Message**: Detailed explanation of the detection

## Installation

### Backend Dependencies

```bash
cd ev-guardian-platform
pip install -r requirements.txt
```

Required packages:
- `flask==3.0.0`
- `flask-cors==4.0.0`
- `pandas==2.1.4`
- `numpy==1.26.2`
- `scikit-learn==1.3.2` (NEW - for ML model)

### Model File

Ensure `fraud_model.pkl` is located at:
```
ev-guardian-platform/guardian-agent/model/fraud_model.pkl
```

## Usage

### Starting the Backend

```bash
cd ev-guardian-platform
python backend_api.py
```

The backend will:
1. Load the dataset (if available)
2. Load the ML model (`fraud_model.pkl`)
3. Start the API server on port 5000

### Testing ML Detection

1. Start the backend: `python backend_api.py`
2. Start the frontend: `pnpm dev`
3. Open dashboard: `http://localhost:3000`
4. Click "START SESSION"
5. Watch for ML model predictions in real-time

### Feeding New Data

#### Via GET `/ingest`
The backend automatically loads data from the dataset and feeds it to the ML model.

#### Via POST `/ingest`
Send new data points:
```bash
curl -X POST http://localhost:5000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "time_index": 0,
    "session_id": "S1",
    "voltage": 230.5,
    "current": 10.2,
    "energy_kwh": 0.001
  }'
```

Then check status:
```bash
curl http://localhost:5000/status
```

## Model Training

To retrain the model:

```bash
cd ev-guardian-platform/guardian-agent/model
python train_model.py
```

This will:
1. Load `training_data.csv`
2. Extract features from sessions
3. Train a Random Forest Classifier
4. Save the model as `fraud_model.pkl`

## Troubleshooting

### Model Not Loading

**Error**: `⚠️ ML model not found at ...`

**Solution**: 
- Ensure `fraud_model.pkl` exists in `ev-guardian-platform/guardian-agent/model/`
- Check file permissions
- Verify the model was trained successfully

### Low Confidence Predictions

**Issue**: ML model shows low confidence (< 50%)

**Possible Causes**:
- Session data doesn't match training data distribution
- Insufficient data points in session
- Model needs retraining with more diverse data

**Solution**:
- Ensure sessions have at least 10-20 data points
- Retrain model with more diverse training data
- Check feature values are within expected ranges

### Fallback to Rule-Based

If ML model fails to load, the system automatically falls back to rule-based detection. You'll see:
```json
{
  "detection_method": "rule_based",
  "message": "Rule-based check: ..."
}
```

## Performance

- **ML Model Prediction**: ~1-5ms per session
- **Feature Extraction**: ~1-2ms per session
- **Total Overhead**: Negligible for real-time monitoring

## Next Steps

1. **Model Retraining**: Periodically retrain with new fraud patterns
2. **Feature Engineering**: Add more features (e.g., time-based patterns)
3. **Model Ensemble**: Combine multiple models for better accuracy
4. **Real-time Learning**: Implement online learning for continuous improvement

