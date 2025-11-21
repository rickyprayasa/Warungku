import { useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, XCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import type { JajananRequest } from '@shared/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
export function JajananRequestsDataTable() {
  const requests = useWarungStore((state) => state.jajananRequests);
  const updateStatus = useWarungStore((state) => state.updateJajananRequestStatus);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const pageCount = Math.ceil(requests.length / rowsPerPage);
  const paginatedRequests = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return requests.slice(start, end);
  }, [requests, page, rowsPerPage]);
  const handleStatusChange = (id: string, status: JajananRequest['status']) => {
    const promise = updateStatus(id, status);
    toast.promise(promise, {
      loading: 'Updating status...',
      success: `Request has been ${status}.`,
      error: 'Failed to update status.',
    });
  };
  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
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
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block border-4 border-brand-black bg-brand-white">
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
            {paginatedRequests.map((request) => (
              <TableRow key={request.id} className="border-b-2 border-brand-black last:border-b-0">
                <TableCell className="font-mono">{formatDate(request.createdAt)}</TableCell>
                <TableCell className="font-bold">{request.snackName}</TableCell>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedRequests.map((request) => (
          <div key={request.id} className="border-4 border-brand-black bg-brand-white p-3 shadow-hard-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight">{request.snackName}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">{formatDate(request.createdAt)}</p>
              </div>
              <Badge
                className={cn('rounded-sm font-bold uppercase text-xs', {
                  'bg-yellow-400 text-yellow-900': request.status === 'pending',
                  'bg-green-400 text-green-900': request.status === 'approved',
                  'bg-red-400 text-red-900': request.status === 'rejected',
                })}
              >
                {request.status}
              </Badge>
            </div>

            {request.notes && (
              <div className="mb-3 p-2 bg-gray-50 border-2 border-dashed border-gray-200">
                <p className="text-sm font-mono text-muted-foreground">{request.notes}</p>
              </div>
            )}

            {request.status === 'pending' && (
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t-2 border-dashed border-brand-black/20">
                <Button
                  onClick={() => handleStatusChange(request.id, 'approved')}
                  className="bg-green-500 hover:bg-green-600 text-white border-2 border-brand-black rounded-none font-bold"
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Setujui
                </Button>
                <Button
                  onClick={() => handleStatusChange(request.id, 'rejected')}
                  variant="destructive"
                  className="border-2 border-brand-black rounded-none font-bold"
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Tolak
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4 font-mono">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Baris per halaman</p>
          <Select
            value={`${rowsPerPage}`}
            onValueChange={(value) => {
              setRowsPerPage(Number(value))
              setPage(0)
            }}
          >
            <SelectTrigger className="h-8 w-[70px] rounded-none border-2 border-brand-black"><SelectValue placeholder={String(rowsPerPage)} /></SelectTrigger>
            <SelectContent side="top" className="rounded-none border-2 border-brand-black">
              {[5, 10, 20].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Halaman {page + 1} dari {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex rounded-none border-2 border-brand-black" onClick={() => setPage(0)} disabled={page === 0}><span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0 rounded-none border-2 border-brand-black" onClick={() => setPage(page - 1)} disabled={page === 0}><span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0 rounded-none border-2 border-brand-black" onClick={() => setPage(page + 1)} disabled={page >= pageCount - 1}><span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex rounded-none border-2 border-brand-black" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}><span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </>
  );
}