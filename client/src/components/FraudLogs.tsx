import { AlertTriangle, Clock } from 'lucide-react';

interface FraudRecord {
  session_id: string;
  time_index: number;
  voltage: number;
  current: number;
  energy_kwh: number;
  status: string;
  timestamp: Date;
}

interface FraudLogsProps {
  fraudRecords: FraudRecord[];
}

/**
 * FraudLogs Component
 * 
 * Design Philosophy: Cyberpunk Command Center
 * - Displays all detected fraud incidents in a log format
 * - Red/magenta accents for danger
 * - Scrollable list with timestamp and details
 * - Real-time updates as fraud is detected
 */
export default function FraudLogs({ fraudRecords }: FraudLogsProps) {
  return (
    <div className="w-full border-2 border-[#ff006e] bg-[#0f1535] p-6 rounded-2xl"
      style={{
        boxShadow: '0 0 15px rgba(255, 0, 110, 0.4), inset 0 0 15px rgba(255, 0, 110, 0.05)',
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-[#ff006e]" />
          <div>
            <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-1">
              Fraud Detection Log
            </p>
            <h3 className="text-xl font-bold text-[#ff006e] tracking-tight">
              Security Incidents
            </h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6b7280] uppercase tracking-widest">Total Incidents</p>
          <p className="text-2xl font-bold text-[#ff006e]">{fraudRecords.length}</p>
        </div>
      </div>

      {/* Logs Container */}
      <div className="mt-6 max-h-96 overflow-y-auto pr-2 space-y-3"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 0, 110, 0.3) transparent',
        }}
      >
        {fraudRecords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#6b7280] uppercase tracking-widest">
              No fraud incidents detected
            </p>
            <p className="text-xs text-[#9ca3af] mt-2">All sessions verified</p>
          </div>
        ) : (
          fraudRecords.map((record, index) => (
            <div
              key={`${record.session_id}-${record.time_index}-${index}`}
              className="border border-[#ff006e]/30 bg-[#0a0e27] p-4 rounded-lg hover:border-[#ff006e]/60 transition-all duration-200"
              style={{
                boxShadow: '0 0 8px rgba(255, 0, 110, 0.2)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#ff006e] rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-[#ff006e] uppercase tracking-wider">
                    FRAUD #{fraudRecords.length - index}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                  <Clock size={12} />
                  <span>
                    {record.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                <div>
                  <p className="text-[#6b7280] uppercase tracking-widest mb-1">Session</p>
                  <p className="text-[#00d9ff] font-mono font-semibold">{record.session_id}</p>
                </div>
                <div>
                  <p className="text-[#6b7280] uppercase tracking-widest mb-1">Time Index</p>
                  <p className="text-[#00d9ff] font-mono font-semibold">{record.time_index}s</p>
                </div>
                <div>
                  <p className="text-[#6b7280] uppercase tracking-widest mb-1">Voltage</p>
                  <p className="text-[#ff006e] font-mono font-semibold">{record.voltage.toFixed(1)}V</p>
                </div>
                <div>
                  <p className="text-[#6b7280] uppercase tracking-widest mb-1">Current</p>
                  <p className="text-[#ff006e] font-mono font-semibold">{record.current.toFixed(1)}A</p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-[#1a1f3a]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#6b7280] uppercase tracking-widest text-xs mb-1">Energy</p>
                    <p className="text-[#ff006e] font-mono font-semibold text-sm">
                      {record.energy_kwh.toFixed(5)} kWh
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#6b7280] uppercase tracking-widest text-xs mb-1">Status</p>
                    <p className="text-[#ff006e] font-semibold text-sm uppercase">
                      {record.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

