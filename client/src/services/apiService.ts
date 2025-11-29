/**
 * API Service
 * 
 * Handles all API communication for the RWA Dashboard
 */

export interface StatusResponse {
  status: 'VALID' | 'FRAUD';
  timestamp: number;
  voltage?: number;
  message?: string;
  session_id?: string;
  detection_method?: 'ml_model' | 'rule_based';
  ml_confidence?: number;
  ml_confidence_pct?: number;
  features?: {
    max_voltage: number;
    min_voltage: number;
    mean_current: number;
    total_energy: number;
    physics_diff: number;
  };
}

/**
 * Polls a backend API endpoint at regular intervals
 */
export async function pollStatus(endpoint: string): Promise<StatusResponse> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return await response.json();
}

/**
 * Fetches voltage data from the ingest endpoint
 */
export async function fetchVoltageData(endpoint: string): Promise<{ voltage: number; current?: number; energy_kwh?: number }> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return await response.json();
}

