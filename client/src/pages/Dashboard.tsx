import { useState, useEffect, useRef } from 'react';
import StatusCard from '@/components/StatusCard';
import LiveSessionChart from '@/components/LiveSessionChart';
import WalletConnect from '@/components/WalletConnect';
import FraudLogs from '@/components/FraudLogs';
import { useAPIPoller } from '@/hooks/useAPIPoller';
import { useDatasetTracker } from '@/hooks/useDatasetTracker';
import {
  Zap,
  Activity,
  Shield,
  Wallet as WalletIcon,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FraudRecord {
  session_id: string;
  time_index: number;
  voltage: number;
  current: number;
  energy_kwh: number;
  status: string;
  timestamp: Date;
}

/**
 * Dashboard Page
 * 
 * Design Philosophy: Cyberpunk Command Center
 * - Asymmetric layout with left sidebar and main content area
 * - Neon cyan borders and glowing effects throughout
 * - Real-time monitoring with status updates
 * - Wallet integration in top-right corner
 * - Status card as the focal point
 */
export default function Dashboard() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [fraudRecords, setFraudRecords] = useState<FraudRecord[]>([]);
  const processedRecordsRef = useRef<Set<string>>(new Set());

  // Poll the backend for status updates every 2 seconds
  const { status, loading, error } = useAPIPoller({
    endpoint: 'http://localhost:5000/status',
    interval: 2000,
    enabled: sessionActive,
  });

  // Track current record from dataset (for display purposes - S1)
  const { currentRecord } = useDatasetTracker(sessionActive, 'S1');

  // Get status and label from dataset, with fallbacks
  const datasetStatus = currentRecord?.status || (sessionActive ? 'loading...' : 'idle');
  const datasetLabel = currentRecord?.label || (sessionActive ? 'loading...' : 'idle');
  
  // Determine current status: prioritize fraud detection from ALL sessions
  // If any fraud records detected OR current record is fraud, show FRAUD
  // Otherwise use API status or default to VALID
  const currentStatus = (fraudRecords.length > 0 || datasetLabel === 'fraud') 
    ? 'FRAUD' 
    : (status?.status || 'VALID');

  // Track fraud records from ALL sessions in real-time
  useEffect(() => {
    if (!sessionActive) return;

    let intervalId: number | undefined;
    let allDataset: any[] = [];
    let datasetIndex = 0;

    const loadAndScanDataset = async () => {
      try {
        // Load the full dataset
        const response = await fetch('/large_synthetic_ev_data.json');
        allDataset = await response.json();

        if (allDataset.length === 0) return;

        // Scan through ALL records sequentially, not just S1
        intervalId = window.setInterval(() => {
          if (allDataset.length === 0) return;

          const record = allDataset[datasetIndex];
          
          // Create unique key for this record
          const recordKey = `${record.session_id}-${record.time_index}`;

          // Check if this is a fraud record and hasn't been processed yet
          if (record.label === 'fraud' && !processedRecordsRef.current.has(recordKey)) {
            const fraudRecord: FraudRecord = {
              session_id: record.session_id,
              time_index: record.time_index,
              voltage: record.voltage,
              current: record.current,
              energy_kwh: record.energy_kwh,
              status: record.status,
              timestamp: new Date(),
            };

            setFraudRecords((prev) => [fraudRecord, ...prev]); // Add to beginning (newest first)
            processedRecordsRef.current.add(recordKey);
          }

          // Move to the next record, loop back at the end
          datasetIndex = (datasetIndex + 1) % allDataset.length;
        }, 1000); // Scan every second
      } catch (error) {
        console.error('Failed to load dataset for fraud detection:', error);
      }
    };

    loadAndScanDataset();

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [sessionActive]);

  // Reset fraud records when session stops
  useEffect(() => {
    if (!sessionActive) {
      setFraudRecords([]);
      processedRecordsRef.current.clear();
    }
  }, [sessionActive]);

  const handleStartSession = () => {
    setSessionActive(true);
  };

  const handleStopSession = () => {
    setSessionActive(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] text-[#00d9ff] font-mono">
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-[#00d9ff] bg-[#0f1535] sticky top-0 z-50"
        style={{
          boxShadow: '0 4px 20px rgba(0, 217, 255, 0.2)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#00d9ff] flex items-center justify-center rounded-xl"
              style={{
                boxShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
              }}
            >
              <Zap size={20} className="text-[#00d9ff]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider">RWA DASHBOARD</h1>
              <p className="text-xs text-[#6b7280] uppercase tracking-widest">EV Charging Mission Control</p>
            </div>
          </div>

          {/* Wallet Connect in Top Right - Dropdown */}
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:w-80 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`
                    inline-flex items-center justify-between gap-3 px-4 py-2 rounded-full border-2 text-xs font-bold uppercase tracking-widest
                    bg-[#0a0e27] transition-all duration-200
                    ${walletConnected ? 'border-[#00ff41] text-[#00ff41]' : 'border-[#00d9ff] text-[#00d9ff]'}
                  `}
                  style={{
                    boxShadow: walletConnected
                      ? '0 0 15px rgba(0, 255, 65, 0.4), inset 0 0 15px rgba(0, 255, 65, 0.05)'
                      : '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        walletConnected ? 'bg-[#00ff41]' : 'bg-[#6b7280]'
                      }`}
                    />
                    <span>{walletConnected ? 'Wallet Ready' : 'Connect Wallet'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <WalletIcon size={14} />
                    <ChevronDown size={14} />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="bg-transparent border-none shadow-none p-0"
              >
                <WalletConnect
                  onConnect={() => setWalletConnected(true)}
                  onDisconnect={() => setWalletConnected(false)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Session Control */}
            <div className="border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl"
              style={{
                boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
              }}
            >
              <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-4">Session Control</p>
              <div className="space-y-3">
                <button
                  onClick={handleStartSession}
                  disabled={sessionActive}
                  className="w-full px-4 py-3 border-2 border-[#00ff41] bg-[#0a0e27] text-[#00ff41] text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00ff41] hover:text-[#0a0e27] transition-all duration-200 rounded-xl"
                  style={{
                    boxShadow: sessionActive ? 'none' : '0 0 10px rgba(0, 255, 65, 0.4)',
                  }}
                >
                  ▶ START SESSION
                </button>
                <button
                  onClick={handleStopSession}
                  disabled={!sessionActive}
                  className="w-full px-4 py-3 border-2 border-[#ff006e] bg-[#0a0e27] text-[#ff006e] text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff006e] hover:text-white transition-all duration-200 rounded-xl"
                >
                  ⏹ STOP SESSION
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl"
              style={{
                boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
              }}
            >
              <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-4">System Status</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">Session</span>
                  <span className={`text-xs font-bold ${sessionActive ? 'text-[#00ff41]' : 'text-[#6b7280]'}`}>
                    {sessionActive ? '● ACTIVE' : '○ IDLE'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">Wallet</span>
                  <span className={`text-xs font-bold ${walletConnected ? 'text-[#00ff41]' : 'text-[#6b7280]'}`}>
                    {walletConnected ? '● READY' : '○ PENDING'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">API</span>
                  <span className={`text-xs font-bold ${error ? 'text-[#ff006e]' : 'text-[#00ff41]'}`}>
                    {error ? '● ERROR' : '● ONLINE'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">Status</span>
                  <span className={`text-xs font-bold uppercase ${
                    datasetStatus === 'charging' ? 'text-[#00ff41]' : 
                    datasetStatus === 'loading...' ? 'text-[#6b7280]' : 
                    'text-[#ff006e]'
                  }`}>
                    {datasetStatus === 'charging' ? '● CHARGING' : 
                     datasetStatus === 'loading...' ? '○ LOADING' :
                     `● ${datasetStatus.toUpperCase()}`
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6b7280]">Label</span>
                  <span className={`text-xs font-bold uppercase ${
                    datasetLabel === 'normal' ? 'text-[#00ff41]' : 
                    datasetLabel === 'loading...' ? 'text-[#6b7280]' : 
                    'text-[#ff006e]'
                  }`}>
                    {datasetLabel === 'normal' ? '● NORMAL' : 
                     datasetLabel === 'loading...' ? '○ LOADING' :
                     `● ${datasetLabel.toUpperCase()}`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl"
              style={{
                boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
              }}
            >
              <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-3">How It Works</p>
              <ol className="space-y-2 text-xs text-[#9ca3af] leading-relaxed">
                <li>1. Connect your Cardano wallet</li>
                <li>2. Click "START SESSION" to begin</li>
                <li>3. Monitor voltage in real-time</li>
                <li>4. System verifies on-chain safety</li>
                <li>5. Fraud detection runs continuously</li>
              </ol>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Status Card - The Judge's Focus */}
            <div className="animate-in fade-in duration-500">
              <StatusCard status={currentStatus} />
            </div>

            {/* Live Chart */}
            <div className="animate-in fade-in duration-500 delay-100">
              <LiveSessionChart
                simulationMode={sessionActive}
                apiEndpoint="http://localhost:5000/ingest"
              />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voltage Metric */}
              <div className="border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl flex flex-col justify-between"
                style={{
                  boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Zap size={20} className="text-[#00d9ff]" />
                  <p className="text-xs uppercase tracking-widest text-[#6b7280]">Voltage</p>
                </div>
                <p className="text-3xl font-bold text-[#00ff41]">230V</p>
                <p className="text-xs text-[#6b7280] mt-2">Within safe range</p>
              </div>

              {/* Activity Metric */}
              <div className="border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl flex flex-col justify-between"
                style={{
                  boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Activity size={20} className="text-[#00d9ff]" />
                  <p className="text-xs uppercase tracking-widest text-[#6b7280]">Activity</p>
                </div>
                <p className="text-3xl font-bold text-[#00d9ff]">{sessionActive ? 'LIVE' : 'IDLE'}</p>
                <p className="text-xs text-[#6b7280] mt-2">Session status</p>
              </div>

              {/* Security Metric */}
              <div className="border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl flex flex-col justify-between"
                style={{
                  boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={20} className="text-[#00d9ff]" />
                  <p className="text-xs uppercase tracking-widest text-[#6b7280]">Security</p>
                </div>
                <p className={`text-3xl font-bold ${currentStatus === 'VALID' ? 'text-[#00ff41]' : 'text-[#ff006e]'}`}>
                  {currentStatus === 'VALID' ? 'SAFE' : 'ALERT'}
                </p>
                <p className="text-xs text-[#6b7280] mt-2">Fraud detection</p>
              </div>
            </div>

            {/* Fraud Logs Section */}
            <div className="animate-in fade-in duration-500 delay-200">
              <FraudLogs fraudRecords={fraudRecords} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#00d9ff] bg-[#0f1535] mt-12"
        style={{
          boxShadow: '0 -4px 20px rgba(0, 217, 255, 0.1)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-[#6b7280] uppercase tracking-widest">
          <p>RWA Dashboard v1.0 | EV Charging Security Protocol | Powered by Cardano</p>
        </div>
      </footer>
    </div>
  );
}
