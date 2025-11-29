import { useEffect, useState, useCallback } from 'react';

export interface StatusResponse {
  status: 'VALID' | 'FRAUD';
  timestamp: number;
  voltage?: number;
  message?: string;
}

interface UseAPIPollerOptions {
  endpoint: string;
  interval?: number;
  enabled?: boolean;
}

/**
 * useAPIPoller Hook
 * 
 * Polls a backend API endpoint at regular intervals to fetch status updates.
 * Designed for the RWA Dashboard to monitor EV charging session security.
 * 
 * Usage:
 * const { status, loading, error } = useAPIPoller({
 *   endpoint: 'http://localhost:5000/status',
 *   interval: 2000,
 *   enabled: true
 * });
 */
export function useAPIPoller({
  endpoint,
  interval = 2000,
  enabled = true,
}: UseAPIPollerOptions) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const poll = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('API polling error:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Poll immediately on mount
    poll();

    // Set up interval for subsequent polls
    const intervalId = setInterval(poll, interval);

    return () => clearInterval(intervalId);
  }, [poll, interval, enabled]);

  return { status, loading, error };
}
