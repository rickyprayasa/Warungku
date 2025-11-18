import { useWarungStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { JajananRequest } from '@shared/types';
export function JajananRequestsDataTable() {
  const requests = useWarungStore((state) => state.jajananRequests);
  const updateStatus = useWarungStore((state) => state.updateJajananRequestStatus);
  const handleStatusChange = (id: string, status: JajananRequest['status']) => {
    const promise = updateStatus(id, status);
    toast.promise(promise, {
      loading: 'Updating status...',
      success: `Request has been ${status}.`,
      error: 'Failed to update status.',
    });
  };
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
            <TableHead className="font-bold text-brand-black">Status</TableHead>
            <TableHead className="font-bold text-brand-black text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} className="border-b-2 border-brand-black last:border-b-0">
              <TableCell className="font-mono">{formatDate(request.createdAt)}</TableCell>
              <TableCell className="font-bold">{request.name}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">{request.notes || '-'}</TableCell>
              <TableCell>
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
              <TableCell className="text-right">
                {request.status === 'pending' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-none border-2 border-brand-black bg-brand-white">
                      <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'approved')} className="cursor-pointer">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        <span>Setujui</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'rejected')} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                        <XCircle className="mr-2 h-4 w-4" />
                        <span>Tolak</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}