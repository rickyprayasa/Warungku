import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
interface ChartData {
  name: string;
  revenue: number;
  profit: number;
}
interface FinancialChartProps {
  data: ChartData[];
}
export function FinancialChart({ data }: FinancialChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-center border-2 border-dashed border-brand-black">
        <p className="font-mono text-muted-foreground">Data penjualan tidak cukup untuk menampilkan grafik.</p>
      </div>
    );
  }
  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `Rp${Number(value) / 1000}k`}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '2px solid hsl(var(--border))',
              borderRadius: '0',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            formatter={(value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
          />
          <Bar dataKey="revenue" fill="rgb(243, 128, 32)" radius={[4, 4, 0, 0]} name="Pendapatan Kotor" />
          <Bar dataKey="profit" fill="rgb(17, 17, 17)" radius={[4, 4, 0, 0]} name="Laba Bersih" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}