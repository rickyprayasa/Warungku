import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProductData {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopProductsChartProps {
  data: ProductData[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
  };

  // Limit to top 5 for better visibility
  const topData = data.slice(0, 5);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={topData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
        <XAxis
          type="number"
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'monospace' }}
          tickFormatter={formatCurrency}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: '11px', fontFamily: 'monospace' }}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '2px solid #000',
            borderRadius: '0',
            fontFamily: 'monospace',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
            return [value, 'Terjual'];
          }}
          labelStyle={{ fontWeight: 'bold' }}
        />
        <Bar
          dataKey="revenue"
          fill="#f97316"
          radius={[0, 4, 4, 0]}
          label={{
            position: 'right',
            formatter: formatCurrency,
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
