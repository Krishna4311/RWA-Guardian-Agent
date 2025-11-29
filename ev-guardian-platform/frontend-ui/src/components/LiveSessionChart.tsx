import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CSVRow {
  time_index: number;
  session_id: string;
  voltage: number;
  current: number;
  energy_kwh: number;
  status: string;
  label: string;
}

interface DataPoint {
  time: string;
  voltage: number;
  current: number;
  energy_kwh: number;
}

type MetricType = 'voltage' | 'current' | 'energy_kw';

interface LiveSessionChartProps {
  simulationMode?: boolean;
  apiEndpoint?: string;
}

/**
 * LiveSessionChart Component
 * 
 * Design Philosophy: Cyberpunk Command Center
 * - Neon cyan line for voltage data
 * - Grid overlay for technical aesthetic
 * - Real-time data updates with smooth animations
 * - Simulation mode generates fake data for development
 * - Can be replaced with real API data when backend is ready
 */
export default function LiveSessionChart({
  simulationMode = true,
  apiEndpoint = 'http://localhost:5000/ingest',
}: LiveSessionChartProps) {
  const [data, setData] = useState<DataPoint[]>([
    { time: '0s', voltage: 230, current: 10, energy_kwh: 0 },
  ]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('voltage');
  const [totalDataPoints, setTotalDataPoints] = useState(0);
  
  useEffect(() => {
    if (simulationMode) {
      let intervalId: number | undefined;
      let datasetIndex = 0;
      let dataset: CSVRow[] = [];
  
      const startSimulation = async () => {
        try {
          // 1. Load the dataset (converted CSV) from public/
          const response = await fetch('/large_synthetic_ev_data.json');
          const allRows: CSVRow[] = await response.json();
  
          // (Optional) Use only one session, e.g., S1
          const rows = allRows.filter((row) => row.session_id === 'S1');
  
          if (rows.length === 0) {
            console.warn('No rows found for session S1, falling back to full dataset');
            dataset = allRows;
          } else {
            dataset = rows;
          }
  
          // Reset chart data
          setData([]);
          setTotalDataPoints(0);
          datasetIndex = 0;
  
          // 2. Every second, push the next row from the dataset into the chart
          intervalId = window.setInterval(() => {
            if (dataset.length === 0) return;
            
            const row = dataset[datasetIndex];
  
            const newDataPoint: DataPoint = {
              time: `${row.time_index}s`,   // from CSV
              voltage: row.voltage,        // from CSV
              current: row.current,        // from CSV
              energy_kwh: row.energy_kwh,  // from CSV
            };
  
            setData((prevData) => {
              const updated = [...prevData, newDataPoint];
              // Keep only last 60 points for performance
              return updated.slice(-60);
            });
            
            // Increment total data points counter
            setTotalDataPoints((prev) => prev + 1);
  
            // Move to the next row, loop back at the end
            datasetIndex = (datasetIndex + 1) % dataset.length;
          }, 1000);
        } catch (error) {
          console.error('Failed to start CSV-based simulation:', error);
        }
      };
  
      startSimulation();
  
      // Cleanup on unmount or when simulationMode changes
      return () => {
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      };
    } else {
      // Real API mode: poll the backend (keep your existing code here)
      const interval = setInterval(async () => {
        try {
          const response = await fetch(apiEndpoint);
          const result = await response.json();
  
          if (result.voltage !== undefined) {
            setData((prevData) => {
              const newTime = prevData.length;
              const newDataPoint: DataPoint = {
                time: `${newTime}s`,
                voltage: result.voltage,
                current: result.current || 10,
                energy_kwh: result.energy_kwh || 0,
              };
  
              const updated = [...prevData, newDataPoint];
              return updated.slice(-60);
            });
            
            // Increment total data points counter
            setTotalDataPoints((prev) => prev + 1);
          }
        } catch (error) {
          console.error('Failed to fetch voltage data:', error);
        }
      }, 1000);
  
      return () => clearInterval(interval);
    }
  }, [simulationMode, apiEndpoint]);

  // Get chart configuration based on selected metric
  const getChartConfig = () => {
    switch (selectedMetric) {
      case 'voltage':
        return {
          title: 'Voltage Heartbeat',
          dataKey: 'voltage',
          yAxisDomain: [210, 250] as [number, number],
          yAxisLabel: 'Voltage (V)',
          tooltipFormatter: (value: number) => [`${value}V`, 'Voltage'],
          referenceLines: [
            { value: 220, label: 'MIN (220V)', color: 'rgba(0, 255, 65, 0.3)', textColor: '#00ff41' },
            { value: 240, label: 'MAX (240V)', color: 'rgba(255, 0, 110, 0.3)', textColor: '#ff006e' },
          ],
          currentValue: data[data.length - 1]?.voltage || 0,
          unit: 'V',
        };
      case 'current':
        return {
          title: 'Current Flow',
          dataKey: 'current',
          yAxisDomain: [8, 12] as [number, number],
          yAxisLabel: 'Current (A)',
          tooltipFormatter: (value: number) => [`${value}A`, 'Current'],
          referenceLines: [
            { value: 9, label: 'MIN (9A)', color: 'rgba(0, 255, 65, 0.3)', textColor: '#00ff41' },
            { value: 11, label: 'MAX (11A)', color: 'rgba(255, 0, 110, 0.3)', textColor: '#ff006e' },
          ],
          currentValue: data[data.length - 1]?.current || 0,
          unit: 'A',
        };
      case 'energy_kw':
        return {
          title: 'Energy Consumption',
          dataKey: 'energy_kwh',
          yAxisDomain: [0, 0.02] as [number, number],
          yAxisLabel: 'Energy (kWh)',
          tooltipFormatter: (value: number) => [`${value.toFixed(5)}kWh`, 'Energy'],
          referenceLines: [],
          currentValue: data[data.length - 1]?.energy_kwh || 0,
          unit: 'kWh',
        };
      default:
        return {
          title: 'Voltage Heartbeat',
          dataKey: 'voltage',
          yAxisDomain: [210, 250] as [number, number],
          yAxisLabel: 'Voltage (V)',
          tooltipFormatter: (value: number) => [`${value}V`, 'Voltage'],
          referenceLines: [
            { value: 220, label: 'MIN (220V)', color: 'rgba(0, 255, 65, 0.3)', textColor: '#00ff41' },
            { value: 240, label: 'MAX (240V)', color: 'rgba(255, 0, 110, 0.3)', textColor: '#ff006e' },
          ],
          currentValue: data[data.length - 1]?.voltage || 0,
          unit: 'V',
        };
    }
  };

  const chartConfig = getChartConfig();

  return (
    <div className="w-full border-2 border-[#00d9ff] bg-[#0f1535] p-6 rounded-2xl"
      style={{
        boxShadow: '0 0 15px rgba(0, 217, 255, 0.6), inset 0 0 15px rgba(0, 217, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">
            Real-Time Monitoring
          </p>
          <h3 className="text-2xl font-bold text-[#00d9ff] tracking-tight">
            {chartConfig.title}
          </h3>
        </div>
        {/* Metric Selector Dropdown */}
        <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
          <SelectTrigger className="w-48 border-[#00d9ff] bg-[#0a0e27] text-[#00d9ff] hover:bg-[#0f1535]"
            style={{
              boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
            }}
          >
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent className="bg-[#0f1535] border-[#00d9ff] text-[#00d9ff]">
            <SelectItem value="voltage" className="focus:bg-[#0a0e27] focus:text-[#00d9ff]">
              Voltage
            </SelectItem>
            <SelectItem value="current" className="focus:bg-[#0a0e27] focus:text-[#00d9ff]">
              Current
            </SelectItem>
            <SelectItem value="energy_kw" className="focus:bg-[#0a0e27] focus:text-[#00d9ff]">
              Energy (kWh)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chart Container */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            {/* Grid with cyberpunk styling */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0, 217, 255, 0.2)"
              vertical={true}
              horizontalPoints={[]}
            />

            {/* Reference lines for safe operating range */}
            {chartConfig.referenceLines.map((refLine, idx) => (
              <ReferenceLine
                key={idx}
                y={refLine.value}
                stroke={refLine.color}
                strokeDasharray="5 5"
                label={{
                  value: refLine.label,
                  position: 'insideLeft',
                  fill: refLine.textColor,
                  fontSize: 11,
                  offset: 10,
                }}
              />
            ))}

            {/* Axes */}
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              domain={chartConfig.yAxisDomain}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6b7280' }}
              label={{ value: chartConfig.yAxisLabel, angle: -90, position: 'insideLeft', fill: '#6b7280' }}
            />

            {/* Tooltip */}
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a0e27',
                border: '2px solid #00d9ff',
                boxShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
              }}
              labelStyle={{ color: '#00d9ff' }}
              formatter={chartConfig.tooltipFormatter}
            />

            {/* Main data line */}
            <Line
              type="monotone"
              dataKey={chartConfig.dataKey}
              stroke="#00d9ff"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={300}
              style={{
                filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.8))',
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-[#1a1f3a] flex justify-between items-center">
        <div>
          <p className="text-xs text-[#6b7280] uppercase tracking-widest">Status</p>
          <p className="text-sm text-[#00d9ff] font-semibold">
            {simulationMode ? '🔄 SIMULATION MODE' : '📡 LIVE FEED'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280] uppercase tracking-widest">Data Points</p>
          <p className="text-sm text-[#00d9ff] font-semibold">{totalDataPoints}</p>
        </div>
        <div>
          <p className="text-xs text-[#6b7280] uppercase tracking-widest">Current</p>
          <p className="text-sm text-[#00d9ff] font-semibold">
            {selectedMetric === 'energy_kw' 
              ? `${chartConfig.currentValue.toFixed(5)}${chartConfig.unit}`
              : `${chartConfig.currentValue.toFixed(1)}${chartConfig.unit}`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
