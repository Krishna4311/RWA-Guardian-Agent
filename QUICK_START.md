# Quick Start Guide

## 🚀 Run Backend and Frontend Together

### Option 1: Use the Start Scripts (Easiest)

**Windows:**
```bash
# Run both servers at once
start-all.bat
```

**Mac/Linux:**
```bash
chmod +x start-all.sh
./start-all.sh
```

### Option 2: Manual Setup

#### Step 1: Install Dependencies

**Backend (Python):**
```bash
cd ev-guardian-platform
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
pnpm install
```

#### Step 2: Start Backend

Open Terminal 1:
```bash
cd ev-guardian-platform
python backend_api.py
```

You should see:
```
🚀 Starting RWA Dashboard Backend API...
📡 Backend API running on http://localhost:5000
```

#### Step 3: Start Frontend

Open Terminal 2:
```bash
pnpm dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

#### Step 4: Open Dashboard

1. Open browser: `http://localhost:5173`
2. Navigate to Dashboard
3. Click "START SESSION"
4. Watch real-time data and fraud detection!

## 📡 API Endpoints

- **GET /status** - Get session status (polled every 2 seconds)
- **GET /ingest** - Get next data point for chart
- **POST /predict** - Analyze session for fraud
- **GET /health** - Health check

## 🔧 Troubleshooting

**Backend won't start?**
- Check Python version: `python --version` (need 3.8+)
- Install dependencies: `pip install flask flask-cors pandas numpy`
- Check port 5000 is free

**Frontend can't connect?**
- Make sure backend is running on port 5000
- Check browser console for CORS errors
- Verify `http://localhost:5000/health` works

**No data showing?**
- Backend loads dataset automatically if `large_synthetic_ev_data.csv` exists
- Without dataset, backend generates simulated data
- Check backend terminal for dataset loading messages

