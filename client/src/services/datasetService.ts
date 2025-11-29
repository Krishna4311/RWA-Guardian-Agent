/**
 * Dataset Service
 * 
 * Handles loading and processing of the EV charging dataset
 */

export interface CSVRow {
  time_index: number;
  session_id: string;
  voltage: number;
  current: number;
  energy_kwh: number;
  status: string;
  label: string;
}

/**
 * Loads the full dataset from the JSON file
 */
export async function loadDataset(): Promise<CSVRow[]> {
  const response = await fetch('/large_synthetic_ev_data.json');
  if (!response.ok) {
    throw new Error('Failed to load dataset');
  }
  return await response.json();
}

/**
 * Filters dataset by session ID
 */
export function filterBySession(dataset: CSVRow[], sessionId: string): CSVRow[] {
  return dataset.filter((row) => row.session_id === sessionId);
}

/**
 * Gets all fraud records from the dataset
 */
export function getFraudRecords(dataset: CSVRow[]): CSVRow[] {
  return dataset.filter((row) => row.label === 'fraud');
}

