import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Banknote, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Transaction {
    id: string;
    merchant_order_id: string;
    reference_id: string;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    store: {
        name: string;
        slug: string;
    };
    plan: {
        name: string;
    };
}

export function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_transactions')
                .select(`
          *,
          store:stores(name, slug),
          plan:subscription_plans(name)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            toast.error('Gagal memuat data transaksi');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge className="bg-green-500 rounded-none">Success</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500 rounded-none">Pending</Badge>;
            case 'failed':
                return <Badge className="bg-red-500 rounded-none">Failed</Badge>;
            default:
                return <Badge className="bg-gray-500 rounded-none">{status}</Badge>;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const filteredTransactions = transactions.filter(
        (t) =>
            t.merchant_order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.store?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.reference_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <Banknote className="w-8 h-8" />
                    Transactions
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Riwayat pembayaran langganan
                </p>
            </div>

            {/* Search */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Cari Order ID, Store, atau Referensi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 rounded-none border-2 border-brand-black"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardHeader className="border-b-2 border-brand-black">
                    <CardTitle className="font-display flex items-center justify-between">
                        <span>History ({filteredTransactions.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mx-auto"></div>
                            <p className="mt-4 font-mono text-sm text-muted-foreground">Loading transactions...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-2 border-brand-black bg-gray-50">
                                    <TableHead className="font-mono font-bold">Date</TableHead>
                                    <TableHead className="font-mono font-bold">Order ID</TableHead>
                                    <TableHead className="font-mono font-bold">Store</TableHead>
                                    <TableHead className="font-mono font-bold">Plan</TableHead>
                                    <TableHead className="font-mono font-bold">Amount</TableHead>
                                    <TableHead className="font-mono font-bold">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map((t) => (
                                    <TableRow key={t.id} className="border-b-2 border-brand-black last:border-b-0">
                                        <TableCell className="font-mono text-sm">{formatDate(t.created_at)}</TableCell>
                                        <TableCell className="font-mono text-sm">
                                            <div>{t.merchant_order_id}</div>
                                            <div className="text-xs text-muted-foreground">{t.reference_id || '-'}</div>
                                        </TableCell>
                                        <TableCell className="font-mono font-bold">{t.store?.name || 'Unknown'}</TableCell>
                                        <TableCell className="font-mono text-sm">{t.plan?.name || '-'}</TableCell>
                                        <TableCell className="font-mono font-bold">{formatCurrency(t.amount)}</TableCell>
                                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
