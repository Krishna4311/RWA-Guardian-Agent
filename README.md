# RWA Dashboard - EV Charging Mission Control

A **Cyberpunk Command Center** dashboard for visualizing EV charging sessions in real-time with wallet integration, voltage monitoring, and fraud detection.

## 🎨 Design Philosophy

This dashboard follows the **Cyberpunk Command Center** aesthetic with:
- **Neon cyan (#00d9ff)** primary accent for trust and precision
- **Neon green (#00ff41)** for safe/verified states
- **Hot magenta (#ff006e)** for danger/fraud alerts
- **Deep navy (#0a0e27)** background for high contrast
- **IBM Plex Mono** monospace typography for technical authority
- **Glowing borders** and animated effects for urgency and sophistication

## 📋 Features

### Task 1: MeshSDK Wallet Integration ✅
- **CardanoWallet Component** placeholder ready for MeshSDK integration
- Wallet connection/disconnection UI in top-right corner
- Address display with copy-to-clipboard functionality
- Connected state indicator with pulse animation

### Task 2: Real-Time Voltage Chart ✅
- **LiveSessionChart Component** using Recharts
- Line graph displaying voltage over time (220-240V range)
- **Simulation Mode**: Generates realistic fake voltage data every second
- Reference lines for safe operating range (MIN 220V, MAX 240V)
- Smooth animations and neon cyan styling
- Ready to connect to real backend API

### Task 3: Status Card ✅
- **StatusCard Component** with two visual states:
  - **SAFE (Green)**: Checkmark icon, "VERIFIED" text, gentle pulse animation
  - **DANGER (Red)**: Warning triangle icon, "FRAUD DETECTED" text, aggressive flash animation
- Accepts `status` prop ('VALID' or 'FRAUD') to switch states
- Scan-line overlay effect for cyberpunk aesthetic
- Glowing borders with color-matched shadows

### Task 4: API Polling ✅
- **useAPIPoller Hook** for polling backend endpoints
- Default endpoint: `http://localhost:5000/status`
- Configurable polling interval (default 2 seconds)
- Automatic status updates when session is active
- Error handling and loading states

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The dashboard will be available at `http://localhost:3000`

### Project Structure

```
rwa-dashboard/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StatusCard.tsx          # Status display with animations
│   │   │   ├── LiveSessionChart.tsx    # Real-time voltage chart
│   │   │   ├── WalletConnect.tsx       # Wallet connection UI
│   │   │   └── ui/                     # shadcn/ui components
│   │   ├── hooks/
│   │   │   └── useAPIPoller.ts         # API polling hook
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx           # Main dashboard page
│   │   │   ├── Home.tsx                # Placeholder
│   │   │   └── NotFound.tsx            # 404 page
│   │   ├── App.tsx                     # Router and theme setup
│   │   ├── index.css                   # Global styles with cyberpunk design
│   │   └── main.tsx                    # React entry point
│   └── index.html
├── server/
│   └── index.ts                        # Express server (static serving)
├── shared/
│   └── const.ts                        # Shared constants
├── package.json
├── vite.config.ts
├── tsconfig.json
└── ideas.md                            # Design exploration document
```

## 🔧 Component API

### StatusCard

```tsx
import StatusCard from '@/components/StatusCard';

<StatusCard status="VALID" />  // Green verified state
<StatusCard status="FRAUD" />  // Red danger state
```

**Props:**
- `status: 'VALID' | 'FRAUD'` - Controls the visual state and animation

### LiveSessionChart

```tsx
import LiveSessionChart from '@/components/LiveSessionChart';

<LiveSessionChart 
  simulationMode={true}
  apiEndpoint="http://localhost:5000/ingest"
/>
```

**Props:**
- `simulationMode?: boolean` (default: true) - Enable fake data generation
- `apiEndpoint?: string` - Backend endpoint for real voltage data

### WalletConnect

```tsx
import WalletConnect from '@/components/WalletConnect';

<WalletConnect 
  onConnect={(address) => console.log(address)}
  onDisconnect={() => console.log('disconnected')}
/>
```

**Props:**
- `onConnect?: (address: string) => void` - Callback when wallet connects
- `onDisconnect?: () => void` - Callback when wallet disconnects

### useAPIPoller

```tsx
import { useAPIPoller } from '@/hooks/useAPIPoller';

const { status, loading, error } = useAPIPoller({
  endpoint: 'http://localhost:5000/status',
  interval: 2000,
  enabled: true
});
```

**Options:**
- `endpoint: string` - API endpoint to poll
- `interval?: number` (default: 2000) - Poll interval in milliseconds
- `enabled?: boolean` (default: true) - Enable/disable polling

**Returns:**
- `status: StatusResponse | null` - Latest status response
- `loading: boolean` - Loading state
- `error: Error | null` - Error if polling failed

## 🔌 Integration with Backend

### Replacing Simulation Mode

To connect to a real backend, modify the `LiveSessionChart` component:

```tsx
// Change from simulation to real API
<LiveSessionChart 
  simulationMode={false}
  apiEndpoint="http://your-backend:5000/ingest"
/>
```

### Expected API Response Format

**GET /status** (for fraud detection)
```json
{
  "status": "VALID",
  "timestamp": 1234567890,
  "message": "Session verified"
}
```

**GET /ingest** (for voltage data)
```json
{
  "voltage": 230.5,
  "timestamp": 1234567890
}
```

## 🎯 Next Steps for Hackathon Integration

1. **MeshSDK Integration**: Replace the mock wallet connection with actual MeshSDK `CardanoWallet` component
2. **Backend Connection**: Replace simulation mode with real API endpoints from your Python backend
3. **Blockchain Integration**: Connect the "Start Charging" button to the `lockFunds` function from Blockchain Dev B2
4. **Real Data Flow**: User clicks "Start" → Wallet opens → Graph starts moving with real voltage data

## 📦 Build for Production

```bash
# Build the project
pnpm build

# Preview production build
pnpm preview

# Start production server
pnpm start
```

## 🎨 Customizing the Design

All colors and animations are defined in `client/src/index.css`. To modify the cyberpunk aesthetic:

```css
/* Color Variables */
--background: #0a0e27;      /* Deep navy */
--foreground: #00d9ff;      /* Electric cyan */
--destructive: #ff006e;     /* Hot magenta */
--chart-2: #00ff41;         /* Neon green */

/* Custom Glow Classes */
.glow-cyan { /* Cyan glow effect */ }
.border-glow-magenta { /* Magenta border glow */ }
.danger-flash { /* Flashing danger animation */ }
```

## 📝 Notes

- **Simulation Mode**: Currently enabled by default. Generates realistic voltage fluctuations (220-240V) every second
- **Responsive Design**: Dashboard is optimized for desktop viewing but includes responsive breakpoints
- **Accessibility**: High contrast neon colors provide excellent visibility; monospace font ensures readability
- **Performance**: Chart limits data points to 60 for smooth rendering

## 🏆 Hackathon Tips

- The **Status Card** is the judge's focal point—it's prominently displayed and animated
- The **Voltage Chart** shows real-time monitoring capability
- The **Wallet Connection** demonstrates blockchain integration readiness
- All components are modular and ready for backend integration

## 📄 License

MIT
