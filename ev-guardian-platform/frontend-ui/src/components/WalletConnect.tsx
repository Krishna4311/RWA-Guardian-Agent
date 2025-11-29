import { useState } from 'react';
import { Wallet, Copy, LogOut } from 'lucide-react';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

/**
 * WalletConnect Component
 * 
 * Design Philosophy: Cyberpunk Command Center
 * - Hexagonal badge styling for wallet address
 * - Cyan glow for connected state
 * - Monospace font for address display
 * - Ready for MeshSDK integration
 */
export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    // Placeholder for MeshSDK integration
    // In production, this will use @meshsdk/react CardanoWallet component
    try {
      // Simulate wallet connection
      const mockAddress = 'addr1qy2kkd...7xz9';
      setWalletAddress(mockAddress);
      setIsConnected(true);
      onConnect?.(mockAddress);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    setWalletAddress('');
    setIsConnected(false);
    onDisconnect?.();
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-sm">
      {!isConnected ? (
        <button
          onClick={handleConnect}
          className="w-full px-6 py-4 border-2 border-[#00d9ff] bg-[#0f1535] text-[#00d9ff] font-bold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-lg active:scale-95 rounded-2xl"
          style={{
            boxShadow: '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 217, 255, 0.8), inset 0 0 20px rgba(0, 217, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 217, 255, 0.4), inset 0 0 15px rgba(0, 217, 255, 0.05)';
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <Wallet size={20} />
            <span>Connect Wallet</span>
          </div>
        </button>
      ) : (
        <div
          className="w-full px-6 py-4 border-2 border-[#00ff41] bg-[#0f1535] rounded-2xl"
          style={{
            boxShadow: '0 0 15px rgba(0, 255, 65, 0.4), inset 0 0 15px rgba(0, 255, 65, 0.05)',
          }}
        >
          {/* Connected Status */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-[#00ff41] rounded-full animate-pulse" />
            <p className="text-xs uppercase tracking-widest text-[#00ff41]">Connected</p>
          </div>

          {/* Wallet Address */}
          <div className="mb-4">
            <p className="text-xs text-[#6b7280] uppercase tracking-widest mb-2">Wallet Address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-[#00d9ff] break-all bg-[#0a0e27] px-3 py-2 border border-[#1a1f3a]">
                {walletAddress}
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-2 text-[#00d9ff] hover:text-[#00ff41] transition-colors"
                title="Copy address"
              >
                <Copy size={18} />
              </button>
            </div>
            {copied && (
              <p className="text-xs text-[#00ff41] mt-2">✓ Copied to clipboard</p>
            )}
          </div>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 border border-[#ff006e] text-[#ff006e] text-xs uppercase tracking-wider font-semibold hover:bg-[#ff006e] hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}
