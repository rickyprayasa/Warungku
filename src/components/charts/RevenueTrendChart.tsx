import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  revenue: number;
  profit: number;
}

interface RevenueTrendChartProps {
  data: DataPoint[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'monospace' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'monospace' }}
          tickFormatter={formatCurrency}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '2px solid #000',
            borderRadius: '0',
            fontFamily: 'monospace',
          }}
          formatter={(value: number) => formatCurrency(value)}
          labelStyle={{ fontWeight: 'bold' }}
        />
        <Legend
          wrapperStyle={{
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#f97316"
          strokeWidth={3}
          name="Pendapatan"
          dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="#10b981"
          strokeWidth={3}
          name="Profit"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
