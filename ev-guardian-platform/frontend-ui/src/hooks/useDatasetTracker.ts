import { useState, useEffect } from 'react';

interface CSVRow {
  time_index: number;
  session_id: string;
  voltage: number;
  current: number;
  energy_kwh: number;
  status: string;
  label: string;
}

interface UseDatasetTrackerReturn {
  currentRecord: CSVRow | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to track the current record from the dataset
 * Syncs with the LiveSessionChart's data progression
 */
export function useDatasetTracker(
  sessionActive: boolean,
  sessionId: string = 'S1'
): UseDatasetTrackerReturn {
  const [currentRecord, setCurrentRecord] = useState<CSVRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dataset, setDataset] = useState<CSVRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load dataset once
  useEffect(() => {
    const loadDataset = async () => {
      try {
        setLoading(true);
        const response = await fetch('/large_synthetic_ev_data.json');
        const allRows: CSVRow[] = await response.json();

        // Filter by session_id
        const rows = allRows.filter((row) => row.session_id === sessionId);

        if (rows.length === 0) {
          console.warn(`No rows found for session ${sessionId}, falling back to full dataset`);
          setDataset(allRows);
        } else {
          setDataset(rows);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to load dataset:', err);
        setError(err instanceof Error ? err : new Error('Failed to load dataset'));
      } finally {
        setLoading(false);
      }
    };

    loadDataset();
  }, [sessionId]);

  // Track current record when session is active
  useEffect(() => {
    if (!sessionActive || dataset.length === 0) {
      setCurrentRecord(null);
      setCurrentIndex(0);
      return;
    }

    // Set initial record
    setCurrentRecord(dataset[0]);
    setCurrentIndex(0);

    // Update every second to match the chart's progression
    const intervalId = window.setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % dataset.length;
        setCurrentRecord(dataset[nextIndex]);
        return nextIndex;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [sessionActive, dataset]);

  return { currentRecord, loading, error };
}

