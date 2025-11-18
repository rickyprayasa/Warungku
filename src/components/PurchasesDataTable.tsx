import { useWarungStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/lib/i18n';
export function PurchasesDataTable() {
  const purchases = useWarungStore((state) => state.purchases);
  const { t } = useTranslation();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('id-ID');
  };
  if (purchases.length === 0) {
    return (
      <div className="text-center border-2 border-dashed border-brand-black p-12">
        <p className="font-mono text-muted-foreground">{t('cashflowDashboard.noTransactions')}</p>
      </div>
    );
  }
  return (
    <div className="border-4 border-brand-black bg-brand-white">
      <Table>
        <TableHeader className="border-b-4 border-brand-black bg-muted/40">
          <TableRow>
            <TableHead className="font-bold text-brand-black">{t('tables.date')}</TableHead>
            <TableHead className="font-bold text-brand-black">{t('tables.name')}</TableHead>
            <TableHead className="font-bold text-brand-black">{t('tables.quantity')}</TableHead>
            <TableHead className="font-bold text-brand-black">{t('tables.supplier')}</TableHead>
            <TableHead className="font-bold text-brand-black text-right">{t('tables.totalCost')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.id} className="border-b-2 border-brand-black last:border-b-0">
              <TableCell className="font-mono">{formatDate(purchase.createdAt)}</TableCell>
              <TableCell className="font-bold">{purchase.productName}</TableCell>
              <TableCell className="font-mono">{purchase.quantity}</TableCell>
              <TableCell className="font-mono">{purchase.supplier}</TableCell>
              <TableCell className="font-mono text-right font-bold text-red-600">{formatCurrency(purchase.totalCost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}