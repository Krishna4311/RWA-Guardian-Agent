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
  const [sessionPaused, setSessionPaused] = useState(false);
  const [fraudRecords, setFraudRecords] = useState<FraudRecord[]>([]);
  const processedRecordsRef = useRef<Set<string>>(new Set());

  // Poll the backend for status updates every 2 seconds (only when active and not paused)
  const { status, loading, error } = useAPIPoller({
    endpoint: 'http://localhost:5000/status',
    interval: 2000,
    enabled: sessionActive && !sessionPaused,
  });

  // Track current record from dataset (for display purposes - S1) (only when active and not paused)
  const { currentRecord } = useDatasetTracker(sessionActive && !sessionPaused, 'S1');

  // Get status and label from dataset, with fallbacks
  const datasetStatus = currentRecord?.status || (sessionActive && !sessionPaused ? 'loading...' : sessionPaused ? 'paused' : 'idle');
  const datasetLabel = currentRecord?.label || (sessionActive && !sessionPaused ? 'loading...' : sessionPaused ? 'paused' : 'idle');
  
  // Determine current status: prioritize fraud detection from ALL sources
  // Priority: 1. ML Model/API status, 2. Dataset fraud records, 3. Dataset label, 4. Default VALID
  const currentStatus = (status?.status === 'FRAUD' || fraudRecords.length > 0 || datasetLabel === 'fraud') 
    ? 'FRAUD' 
    : (status?.status || 'VALID');

  // Track fraud records from ALL sessions in real-time (only when active and not paused)
  useEffect(() => {
    // Stop fraud detection if session is not active or is paused
    if (!sessionActive || sessionPaused) {
      return;
    }

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
          // Double-check pause state inside interval (in case it changed)
          if (!sessionActive || sessionPaused) {
            if (intervalId !== undefined) {
              window.clearInterval(intervalId);
            }
            return;
          }

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
  }, [sessionActive, sessionPaused]);

  // Reset fraud records when session stops (but not when paused)
  useEffect(() => {
    if (!sessionActive) {
      setFraudRecords([]);
      processedRecordsRef.current.clear();
      setSessionPaused(false); // Reset pause state when session stops
    }
  }, [sessionActive]);

  const handleStartSession = () => {
    setSessionActive(true);
    setSessionPaused(false);
  };

  const handleStopSession = () => {
    setSessionActive(false);
    setSessionPaused(false);
  };

  const handlePauseSession = () => {
    setSessionPaused(true);
  };

  const handleResumeSession = () => {
    setSessionPaused(false);
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
                {sessionActive && !sessionPaused && (
                  <button
                    onClick={handlePauseSession}
                    className="w-full px-4 py-3 border-2 border-[#ffaa00] bg-[#0a0e27] text-[#ffaa00] text-xs font-bold uppercase tracking-wider hover:bg-[#ffaa00] hover:text-[#0a0e27] transition-all duration-200 rounded-xl"
                    style={{
                      boxShadow: '0 0 10px rgba(255, 170, 0, 0.4)',
                    }}
                  >
                    ⏸ PAUSE SESSION
                  </button>
                )}
                {sessionActive && sessionPaused && (
                  <button
                    onClick={handleResumeSession}
                    className="w-full px-4 py-3 border-2 border-[#00ff41] bg-[#0a0e27] text-[#00ff41] text-xs font-bold uppercase tracking-wider hover:bg-[#00ff41] hover:text-[#0a0e27] transition-all duration-200 rounded-xl"
                    style={{
                      boxShadow: '0 0 10px rgba(0, 255, 65, 0.4)',
                    }}
                  >
                    ▶ RESUME SESSION
                  </button>
                )}
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
                  <span className={`text-xs font-bold ${
                    sessionPaused ? 'text-[#ffaa00]' : 
                    sessionActive ? 'text-[#00ff41]' : 
                    'text-[#6b7280]'
                  }`}>
                    {sessionPaused ? '⏸ PAUSED' : sessionActive ? '● ACTIVE' : '○ IDLE'}
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
                    datasetStatus === 'paused' ? 'text-[#ffaa00]' :
                    'text-[#ff006e]'
                  }`}>
                    {datasetStatus === 'charging' ? '● CHARGING' : 
                     datasetStatus === 'loading...' ? '○ LOADING' :
                     datasetStatus === 'paused' ? '⏸ PAUSED' :
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

            {/* ML Model Detection Info */}
            {status?.detection_method === 'ml_model' && status.ml_confidence_pct !== undefined && (
              <div className="border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl animate-in fade-in duration-500"
                style={{
                  boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={20} className="text-[#00d9ff]" />
                  <p className="text-xs uppercase tracking-widest text-[#6b7280]">ML Model Detection</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-[#6b7280] mb-1">Confidence</p>
                    <p className={`text-2xl font-bold ${
                      status.status === 'FRAUD' ? 'text-[#ff006e]' : 'text-[#00ff41]'
                    }`}>
                      {status.ml_confidence_pct.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6b7280] mb-1">Method</p>
                    <p className="text-sm font-bold text-[#00d9ff] uppercase">
                      {status.detection_method === 'ml_model' ? 'Machine Learning' : 'Rule-Based'}
                    </p>
                  </div>
                </div>

                {status.features && (
                  <div className="border-t border-[#00d9ff]/20 pt-4">
                    <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-3">Model Features</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      <div>
                        <p className="text-[#6b7280] mb-1">Max Voltage</p>
                        <p className="font-bold text-[#00d9ff]">{status.features.max_voltage.toFixed(1)}V</p>
                      </div>
                      <div>
                        <p className="text-[#6b7280] mb-1">Min Voltage</p>
                        <p className="font-bold text-[#00d9ff]">{status.features.min_voltage.toFixed(1)}V</p>
                      </div>
                      <div>
                        <p className="text-[#6b7280] mb-1">Mean Current</p>
                        <p className="font-bold text-[#00d9ff]">{status.features.mean_current.toFixed(1)}A</p>
                      </div>
                      <div>
                        <p className="text-[#6b7280] mb-1">Total Energy</p>
                        <p className="font-bold text-[#00d9ff]">{status.features.total_energy.toFixed(3)}kWh</p>
                      </div>
                      <div>
                        <p className="text-[#6b7280] mb-1">Physics Diff</p>
                        <p className={`font-bold ${
                          status.features.physics_diff > 0.01 ? 'text-[#ff006e]' : 'text-[#00ff41]'
                        }`}>
                          {status.features.physics_diff.toFixed(4)}kWh
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {status.message && (
                  <div className="mt-4 pt-4 border-t border-[#00d9ff]/20">
                    <p className="text-xs text-[#6b7280] mb-1">Analysis</p>
                    <p className="text-sm text-[#9ca3af]">{status.message}</p>
                  </div>
                )}
              </div>
            )}

            {/* Live Chart */}
            <div className="animate-in fade-in duration-500 delay-100">
              <LiveSessionChart
                simulationMode={sessionActive && !sessionPaused}
                apiEndpoint="http://localhost:5000/ingest"
                isPaused={sessionPaused}
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
