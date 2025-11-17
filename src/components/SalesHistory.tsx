import { useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
export function SalesHistory() {
  const fetchTransactions = useWarungStore((state) => state.fetchTransactions);
  const transactions = useWarungStore((state) => state.transactions);
  const isLoading = useWarungStore((state) => state.isTransactionsLoading);
  const error = useWarungStore((state) => state.transactionsError);
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" className="border-2 border-brand-black rounded-none">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-bold">Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (transactions.length === 0) {
    return (
      <div className="border-4 border-dashed border-brand-black/50 bg-muted/20 p-12 text-center rounded-none">
        <Info className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-bold font-display text-brand-black">No Sales Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground font-mono">
          Once you complete a transaction, it will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="border-4 border-brand-black bg-brand-white">
      <Table>
        <TableHeader className="border-b-4 border-brand-black bg-muted/40">
          <TableRow>
            <TableHead className="font-bold text-brand-black">Transaction ID</TableHead>
            <TableHead className="font-bold text-brand-black">Date</TableHead>
            <TableHead className="font-bold text-brand-black">Items</TableHead>
            <TableHead className="font-bold text-brand-black text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id} className="border-b-2 border-brand-black last:border-b-0">
              <TableCell className="font-mono text-sm">{tx.id.split('-')[0]}</TableCell>
              <TableCell className="font-mono text-sm">{formatDate(tx.createdAt)}</TableCell>
              <TableCell className="font-mono text-sm">{tx.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
              <TableCell className="font-mono font-bold text-right">{formatCurrency(tx.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}