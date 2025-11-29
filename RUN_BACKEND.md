# How to Run Backend and Frontend Together

This guide explains how to run both the backend API server and the frontend React application.

## Prerequisites

1. **Python 3.8+** with pip
2. **Node.js 18+** with npm/pnpm
3. **Python packages**: Flask, Flask-CORS, pandas, numpy

## Step 1: Install Python Dependencies

```bash
cd ev-guardian-platform
pip install -r requirements.txt
```

Or install individually:
```bash
pip install flask flask-cors pandas numpy
```

## Step 2: Install Frontend Dependencies

```bash
# From project root
pnpm install
# or
npm install
```

## Step 3: Run the Backend API Server

Open a terminal and run:

```bash
cd ev-guardian-platform
python backend_api.py
```

You should see:
```
🚀 Starting RWA Dashboard Backend API...
✅ Loaded dataset with X rows
📡 Backend API running on http://localhost:5000
   Endpoints:
   - GET  /status  - Get current session status
   - GET  /ingest  - Get next data point
   - POST /ingest  - Receive data point
   - POST /predict - Analyze session for fraud
   - POST /reset   - Reset session
   - GET  /health  - Health check
```

The backend will be available at `http://localhost:5000`

## Step 4: Run the Frontend

Open a **new terminal** (keep the backend running) and run:

```bash
# From project root
pnpm dev
# or
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy).

## Step 5: Access the Dashboard

1. Open your browser and go to `http://localhost:5173` (or the port shown in terminal)
2. Navigate to the Dashboard page
3. Click "START SESSION" to begin real-time monitoring
4. The dashboard will:
   - Poll `/status` endpoint every 2 seconds
   - Fetch data from `/ingest` endpoint for the chart
   - Display fraud detection results

## API Endpoints

### GET /status
Returns the current session status:
```json
{
  "status": "VALID" | "FRAUD",
  "timestamp": 1234567890,
  "message": "Session completed normally.",
  "session_id": "S1"
}
```

### GET /ingest
Returns the next data point from the dataset:
```json
{
  "voltage": 230.5,
  "current": 10.2,
  "energy_kwh": 0.123,
  "timestamp": 1234567890,
  "session_id": "S1"
}
```

### POST /ingest
Receives a data point (for external data sources):
```json
{
  "time_index": 0,
  "session_id": "S1",
  "voltage": 230.5,
  "current": 10.2,
  "energy_kwh": 0.123
}
```

### POST /predict
Analyzes a complete session for fraud:
```json
{
  "session_id": "S1",
  "data": [
    {
      "time_index": 0,
      "voltage": 230.5,
      "current": 10.2,
      "energy_kwh": 0.123
    }
  ]
}
```

### POST /reset
Resets the current session data

### GET /health
Health check endpoint

## Troubleshooting

### Backend won't start
- Make sure port 5000 is not in use: `netstat -ano | findstr :5000` (Windows) or `lsof -i :5000` (Mac/Linux)
- Check Python version: `python --version` (should be 3.8+)
- Verify all dependencies are installed: `pip list | grep flask`

### Frontend can't connect to backend
- Make sure backend is running on port 5000
- Check CORS is enabled (flask-cors is installed)
- Verify the frontend is using `http://localhost:5000` (not `127.0.0.1`)

### Dataset not found
- The backend will work without the dataset (simulation mode)
- To use real data, ensure `large_synthetic_ev_data.csv` is in the `ev-guardian-platform/` directory
- Or place it in the project root directory

## Running in Production

For production, you may want to:
1. Use a process manager like PM2 for the backend
2. Build the frontend: `pnpm build`
3. Serve the frontend from the Node.js server: `pnpm start`

