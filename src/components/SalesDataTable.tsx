import { useWarungStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from './ui/button';
import { ChevronDown } from 'lucide-react';
import type { Sale } from '@shared/types';
import { useTranslation } from '@/lib/i18n';
export function SalesDataTable() {
  const sales = useWarungStore((state) => state.sales);
  const { t } = useTranslation();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };
  const calculateProfit = (sale: Sale) => {
    const totalCost = sale.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    return sale.total - totalCost;
  };
  if (sales.length === 0) {
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
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="font-bold text-brand-black">{t('tables.date')}</TableHead>
            <TableHead className="font-bold text-brand-black">{t('tables.items')}</TableHead>
            <TableHead className="font-bold text-brand-black text-right">{t('tables.totalSale')}</TableHead>
            <TableHead className="font-bold text-brand-black text-right">{t('tables.profit')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <Collapsible key={sale.id} asChild>
              <>
                <TableRow className="border-b-2 border-brand-black last:border-b-0">
                  <TableCell>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        <ChevronDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell className="font-mono">{formatDate(sale.createdAt)}</TableCell>
                  <TableCell className="font-mono">{sale.items.length}</TableCell>
                  <TableCell className="font-mono text-right font-bold">{formatCurrency(sale.total)}</TableCell>
                  <TableCell className="font-mono text-right font-bold text-green-600">{formatCurrency(calculateProfit(sale))}</TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                  <tr className="bg-muted/40">
                    <td colSpan={5} className="p-0">
                      <div className="p-4">
                        <h4 className="font-bold mb-2">Sale Details:</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-bold text-brand-black">{t('tables.product')}</TableHead>
                              <TableHead className="font-bold text-brand-black">{t('tables.qty')}</TableHead>
                              <TableHead className="font-bold text-brand-black">{t('tables.price')}</TableHead>
                              <TableHead className="font-bold text-brand-black">{t('tables.cost')}</TableHead>
                              <TableHead className="font-bold text-brand-black text-right">{t('tables.subtotal')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sale.items.map((item, index) => (
                              <TableRow key={index} className="border-0">
                                <TableCell>{item.productName}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.price)}</TableCell>
                                <TableCell>{formatCurrency(item.cost)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </td>
                  </tr>
                </CollapsibleContent>
              </>
            </Collapsible>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}