import { useWarungStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Scale, ArrowRight, ArrowLeft } from "lucide-react";
import { useMemo } from "react";
export function CashFlowDashboard() {
  const sales = useWarungStore((state) => state.sales);
  const purchases = useWarungStore((state) => state.purchases);
  const { cashIn, cashOut, netFlow } = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
    return {
      cashIn: totalSales,
      cashOut: totalPurchases,
      netFlow: totalSales - totalPurchases,
    };
  }, [sales, purchases]);
  const combinedTransactions = useMemo(() => {
    const saleTransactions = sales.map(s => ({ type: 'Sale', date: s.createdAt, amount: s.total, description: `${s.items.length} item terjual` }));
    const purchaseTransactions = purchases.map(p => ({ type: 'Purchase', date: p.createdAt, amount: p.totalCost, description: `${p.productName}` }));
    return [...saleTransactions, ...purchaseTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, purchases]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };
  const kpiData = [
    { title: "Total Uang Masuk", value: formatCurrency(cashIn), icon: TrendingUp },
    { title: "Total Uang Keluar", value: formatCurrency(cashOut), icon: TrendingDown },
    { title: "Arus Kas Bersih", value: formatCurrency(netFlow), icon: Scale },
  ];
  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Laporan Arus Kas</h3>
        <p className="font-mono text-sm text-muted-foreground">Analisis pergerakan uang masuk dan keluar.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="rounded-none border-2 border-brand-black shadow-hard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-mono font-bold uppercase">{kpi.title}</CardTitle>
              <kpi.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-brand-orange">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <h4 className="text-xl font-display font-bold text-brand-black mb-4">Transaksi Terkini</h4>
      <div className="border-4 border-brand-black bg-brand-white">
        <Table>
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="w-[100px] font-bold text-brand-black">Tipe</TableHead>
              <TableHead className="font-bold text-brand-black">Tanggal</TableHead>
              <TableHead className="font-bold text-brand-black">Deskripsi</TableHead>
              <TableHead className="font-bold text-brand-black text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combinedTransactions.slice(0, 10).map((tx, index) => (
              <TableRow key={index} className="border-b-2 border-brand-black last:border-b-0">
                <TableCell>
                  <span className={`inline-flex items-center font-mono text-xs font-bold px-2 py-1 ${tx.type === 'Sale' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {tx.type === 'Sale' ? <ArrowLeft className="w-3 h-3 mr-1" /> : <ArrowRight className="w-3 h-3 mr-1" />}
                    {tx.type === 'Sale' ? "Masuk" : "Keluar"}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">{new Date(tx.date).toLocaleString('id-ID')}</TableCell>
                <TableCell className="font-mono text-sm">{tx.description}</TableCell>
                <TableCell className={`font-mono text-right font-bold ${tx.type === 'Sale' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'Sale' ? '+' : '-'} {formatCurrency(tx.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {combinedTransactions.length === 0 && (
           <div className="text-center p-12">
             <p className="font-mono text-muted-foreground">Belum ada transaksi.</p>
           </div>
        )}
      </div>
    </div>
  );
}