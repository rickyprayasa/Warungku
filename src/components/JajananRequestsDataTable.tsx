import { useWarungStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
export function JajananRequestsDataTable() {
  const requests = useWarungStore((state) => state.jajananRequests);
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };
  if (requests.length === 0) {
    return (
      <div className="text-center border-2 border-dashed border-brand-black p-12">
        <p className="font-mono text-muted-foreground">Belum ada request masuk.</p>
      </div>
    );
  }
  return (
    <div className="border-4 border-brand-black bg-brand-white">
      <Table>
        <TableHeader className="border-b-4 border-brand-black bg-muted/40">
          <TableRow>
            <TableHead className="font-bold text-brand-black">Tanggal</TableHead>
            <TableHead className="font-bold text-brand-black">Nama Jajanan</TableHead>
            <TableHead className="font-bold text-brand-black">Catatan</TableHead>
            <TableHead className="font-bold text-brand-black text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} className="border-b-2 border-brand-black last:border-b-0">
              <TableCell className="font-mono">{formatDate(request.createdAt)}</TableCell>
              <TableCell className="font-bold">{request.name}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{request.notes || '-'}</TableCell>
              <TableCell className="text-right">
                <Badge
                  className={cn('rounded-sm font-bold uppercase', {
                    'bg-yellow-400 text-yellow-900': request.status === 'pending',
                    'bg-green-400 text-green-900': request.status === 'approved',
                    'bg-red-400 text-red-900': request.status === 'rejected',
                  })}
                >
                  {request.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}