import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface FuelDataPoint {
  _id: { year: number; month: number; day: number };
  avgFuelLevelPercent: number;
  totalConsumedLiters: number;
  readings: number;
}

interface FuelTrendChartProps {
  data: FuelDataPoint[];
  className?: string;
}

function pointToDate(p: FuelDataPoint['_id']): string {
  const d = new Date(p.year, p.month - 1, p.day);
  return format(d, 'MMM d');
}

export function FuelTrendChart({ data, className = '' }: FuelTrendChartProps) {
  const chartData = data.map((d) => ({
    date: pointToDate(d._id),
    fuelLevel: parseFloat(d.avgFuelLevelPercent.toFixed(1)),
    consumed: parseFloat(d.totalConsumedLiters.toFixed(2)),
  }));

  if (chartData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-gray-400 text-sm ${className}`}
        style={{ height: 256 }}
      >
        No data for this period
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height: 256 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            domain={[0, 100]}
            unit="%"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            unit="L"
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="fuelLevel"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Avg Fuel Level (%)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="consumed"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Total Consumed (L)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
