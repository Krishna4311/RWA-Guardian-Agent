import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StatusCardProps {
  status: 'VALID' | 'FRAUD';
}

/**
 * StatusCard Component
 * 
 * Design Philosophy: Cyberpunk Command Center
 * - High contrast neon colors (cyan for VALID, magenta for FRAUD)
 * - Monospace typography for technical authority
 * - Glowing borders with animated effects
 * - VALID state: Green glow with gentle pulse
 * - FRAUD state: Magenta glow with aggressive flash animation
 */
export default function StatusCard({ status }: StatusCardProps) {
  const isValid = status === 'VALID';

  return (
    <div
      className={`
        relative w-full max-w-5xl mx-auto p-8 rounded-2xl
        border-2 transition-all duration-300
        ${isValid
          ? 'border-[#00ff41] bg-[#0f1535] shadow-lg'
          : 'border-[#ff006e] bg-[#0f1535]'
        }
        ${isValid ? 'pulse-glow' : 'danger-flash'}
      `}
      style={{
        boxShadow: isValid
          ? '0 0 20px rgba(0, 255, 65, 0.6), inset 0 0 20px rgba(0, 255, 65, 0.1)'
          : '0 0 20px rgba(255, 0, 110, 0.6), inset 0 0 20px rgba(255, 0, 110, 0.1)',
      }}
    >
      {/* Scan line effect overlay */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-6">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isValid ? (
            <CheckCircle2
              size={80}
              className="text-[#00ff41]"
              strokeWidth={2.5}
            />
          ) : (
            <AlertTriangle
              size={80}
              className="text-[#ff006e]"
              strokeWidth={2.5}
            />
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">
            SESSION STATUS
          </p>
          <h2 className="text-5xl font-bold tracking-tighter">
            {isValid ? (
              <span className="text-[#00ff41]">VERIFIED</span>
            ) : (
              <span className="text-[#ff006e]">FRAUD DETECTED</span>
            )}
          </h2>

          {/* Masumi Badge */}
          {isValid && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <CheckCircle2 size={12} />
              <span>MASUMI NETWORK AUDITED</span>
            </div>
          )}

          <p className="text-sm text-[#9ca3af] mt-3 leading-relaxed">
            {isValid
              ? 'EV charging session is secure and verified on-chain'
              : 'Anomalous activity detected.'}
          </p>
        </div>
      </div>

    </div>
  );
}
