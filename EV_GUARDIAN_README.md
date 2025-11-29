# EV Guardian Agent - Complete Implementation

## Overview

This is a working end-to-end demo of an **EV Charging RWA Guardian** system that monitors EV charging sessions, detects anomalies, and integrates with Cardano blockchain (simulated).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite)                    │
│  - Real-time session monitoring                             │
│  - Interactive charts (Voltage, Current, Energy)            │
│  - Anomaly visualization                                    │
│  - Blockchain status display                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Express/TypeScript)                │
│  - Session simulation engine                                │
│  - Guardian Agent (anomaly detection)                       │
│  - In-memory session storage                                │
│  - Mock Cardano integration                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cardano Integration (Mock)                  │
│  - Aiken smart contract simulation                          │
│  - Transaction hash generation                              │
│  - On-chain status tracking                                 │
└─────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Session Simulation
- **Normal Sessions**: Generate realistic EV charging data with proper voltage (~230V), current (~10A), and cumulative energy
- **Fraudulent Sessions**: Automatically inject anomalies to test detection

### ✅ Anomaly Detection
The Guardian Agent detects the following anomalies:
1. **Voltage Low**: < 200V
2. **Voltage High**: > 260V
3. **Current Negative**: < 0A
4. **Current High**: > 50A
5. **Energy Decrease**: Energy drops between consecutive readings

### ✅ Real-time Monitoring
- Live session updates (1 second refresh)
- Interactive charts for voltage, current, and energy
- Session status tracking (PENDING → VALID/FRAUD)

### ✅ Blockchain Integration (Simulated)
- Automatic submission to Cardano when fraud detected
- Transaction hash generation
- On-chain status display

## Project Structure

```
RWA-Guardian-Agent/
├── client/                    # React frontend
│   └── src/
│       ├── pages/
│       │   └── EVGuardianDashboard.tsx  # Main dashboard
│       └── services/
│           └── evGuardianApi.ts         # API client
├── server/                    # Express backend
│   ├── index.ts              # Main server + API routes
│   ├── guardian.ts           # Guardian Agent logic
│   └── simulator.ts          # Session simulation
├── shared/                    # Shared types
│   └── types.ts              # TypeScript interfaces
└── ev-guardian-platform/     # Cardano/Aiken (future)
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (or npm)

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start development server**:
   ```bash
   pnpm dev
   ```

   This will:
   - Start the backend API on `http://localhost:3000`
   - Start the Vite dev server with HMR
   - Open your browser automatically

### Usage

1. **Start a Normal Session**:
   - Click "Start Normal Session" button
   - Watch real-time data flow in
   - Session will complete after 30 seconds with VALID status

2. **Start a Fraudulent Session**:
   - Click "Start Fraudulent Session" button
   - Guardian Agent will detect anomalies within seconds
   - Session status changes to FRAUD
   - Automatic Cardano transaction submission

3. **View Session Details**:
   - Click on any session in the list
   - View real-time charts
   - Check anomaly details
   - See blockchain status

4. **Stop/Delete Sessions**:
   - Stop running sessions manually
   - Delete completed sessions

## API Endpoints

### Sessions

- `POST /api/sessions/start` - Start a new simulation
  ```json
  {
    "sessionType": "normal" | "fraudulent",
    "duration": 30,
    "interval": 500
  }
  ```

- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/:sessionId` - Get specific session
- `POST /api/sessions/:sessionId/stop` - Stop a session
- `DELETE /api/sessions/:sessionId` - Delete a session

### Cardano

- `GET /api/cardano/status/:sessionId` - Get on-chain status

## Data Model

### Reading
```typescript
{
  sessionId: string;
  timestamp: number;        // seconds from start
  voltage: number;          // volts (normal ~230V)
  current: number;          // amps (normal ~10A)
  energyKWh: number;        // cumulative kWh
  status: "charging" | "finished";
}
```

### Session State
```typescript
{
  sessionId: string;
  readings: Reading[];
  status: "PENDING" | "VALID" | "FRAUD";
  anomalies: AnomalyInfo[];
  onChainAction: "NONE" | "COMPLETE_SESSION" | "FLAG_FRAUD";
  updatedAt: string;
  createdAt: string;
  isSimulating: boolean;
}
```

## Anomaly Detection Logic

The Guardian Agent analyzes each reading in real-time:

```typescript
// Voltage checks
if (voltage < 200 || voltage > 260) → FRAUD

// Current checks  
if (current < 0 || current > 50) → FRAUD

// Energy consistency
if (energyKWh < previousEnergyKWh) → FRAUD
```

## Future Enhancements

### Cardano Integration
- [ ] Real Aiken smart contract deployment
- [ ] Actual transaction submission
- [ ] Wallet integration (Nami, Eternl)
- [ ] Hydra Head for L2 scalability

### AI/ML
- [ ] Advanced anomaly detection models
- [ ] Pattern recognition
- [ ] Predictive analytics

### Features
- [ ] Historical data analysis
- [ ] Export reports
- [ ] Multi-user support
- [ ] Real IoT device integration

## Development

### Build for Production

```bash
pnpm build
```

This creates:
- Frontend bundle in `dist/public/`
- Backend bundle in `dist/index.js`

### Run Production Build

```bash
pnpm start
```

### Type Checking

```bash
pnpm check
```

### Code Formatting

```bash
pnpm format
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Recharts
- **Backend**: Express, TypeScript, Node.js
- **UI Components**: Radix UI, shadcn/ui
- **Charts**: Recharts
- **State**: React Hooks
- **HTTP Client**: Axios

## License

MIT

## Team

Built for the RWA Guardian Agent hackathon project.

---

**Note**: This is a demonstration system. The Cardano integration is currently mocked. For production use, integrate with real Aiken smart contracts and Cardano blockchain infrastructure.
