import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Store,
    Search,
    ChevronLeft,
    ChevronRight,
    Package,
    ShoppingCart,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface StoreData {
    id: string;
    name: string;
    slug: string;
    plan: string;
    created_at: string;
    productCount?: number;
    salesCount?: number;
}

export function AdminStoresPage() {
    const [stores, setStores] = useState<StoreData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('id, name, slug, plan, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch counts for each store
            const storesWithCounts = await Promise.all(
                (data || []).map(async (store) => {
                    const { count: productCount } = await supabase
                        .from('products')
                        .select('*', { count: 'exact', head: true })
                        .eq('store_id', store.id);

                    const { count: salesCount } = await supabase
                        .from('sales')
                        .select('*', { count: 'exact', head: true })
                        .eq('store_id', store.id);

                    return {
                        ...store,
                        productCount: productCount || 0,
                        salesCount: salesCount || 0,
                    };
                })
            );

            setStores(storesWithCounts);
        } catch (error) {
            console.error('Error fetching stores:', error);
            toast.error('Gagal memuat data stores');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStores = useMemo(() => {
        let result = stores;

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (s) =>
                    s.name.toLowerCase().includes(query) ||
                    s.slug.toLowerCase().includes(query)
            );
        }

        // Filter by plan
        if (planFilter !== 'all') {
            result = result.filter((s) => (s.plan || 'demo') === planFilter);
        }

        return result;
    }, [stores, searchQuery, planFilter]);

    const paginatedStores = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredStores.slice(start, start + rowsPerPage);
    }, [filteredStores, page, rowsPerPage]);

    const pageCount = Math.ceil(filteredStores.length / rowsPerPage);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case 'pro':
                return 'bg-purple-500 text-white';
            case 'trial':
                return 'bg-blue-500 text-white';
            case 'demo':
            default:
                return 'bg-gray-500 text-white';
        }
    };

    const handleChangePlan = async (storeId: string, newPlan: string) => {
        try {
            const { error } = await supabase
                .from('stores')
                .update({ plan: newPlan })
                .eq('id', storeId);

            if (error) throw error;

            setStores((prev) =>
                prev.map((s) => (s.id === storeId ? { ...s, plan: newPlan } : s))
            );
            toast.success(`Plan berhasil diubah ke ${newPlan.toUpperCase()}`);
        } catch (error) {
            console.error('Error updating plan:', error);
            toast.error('Gagal mengubah plan');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <Store className="w-8 h-8" />
                    Store Management
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Kelola semua toko di platform
                </p>
            </div>

            {/* Filters */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama store atau slug..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(0);
                                }}
                                className="pl-10 rounded-none border-2 border-brand-black"
                            />
                        </div>
                        <Select value={planFilter} onValueChange={(val) => { setPlanFilter(val); setPage(0); }}>
                            <SelectTrigger className="w-40 rounded-none border-2 border-brand-black">
                                <SelectValue placeholder="Filter Plan" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none border-2 border-brand-black">
                                <SelectItem value="all">Semua Plan</SelectItem>
                                <SelectItem value="demo">Demo</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Stores Table */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardHeader className="border-b-2 border-brand-black">
                    <CardTitle className="font-display flex items-center justify-between">
                        <span>Stores ({filteredStores.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mx-auto"></div>
                            <p className="mt-4 font-mono text-sm text-muted-foreground">Loading stores...</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-brand-black bg-gray-50">
                                        <TableHead className="font-mono font-bold">Store</TableHead>
                                        <TableHead className="font-mono font-bold">Products</TableHead>
                                        <TableHead className="font-mono font-bold">Sales</TableHead>
                                        <TableHead className="font-mono font-bold">Plan</TableHead>
                                        <TableHead className="font-mono font-bold">Created</TableHead>
                                        <TableHead className="font-mono font-bold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedStores.map((store) => (
                                        <TableRow key={store.id} className="border-b-2 border-brand-black last:border-b-0">
                                            <TableCell>
                                                <div>
                                                    <p className="font-mono font-bold">{store.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">/{store.slug}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-mono">
                                                    <Package className="w-4 h-4 text-blue-500" />
                                                    {store.productCount}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-mono">
                                                    <ShoppingCart className="w-4 h-4 text-green-500" />
                                                    {store.salesCount}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={store.plan || 'demo'}
                                                    onValueChange={(val) => handleChangePlan(store.id, val)}
                                                >
                                                    <SelectTrigger className={`w-24 rounded-none border-0 h-8 ${getPlanBadgeColor(store.plan || 'demo')}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-none border-2 border-brand-black">
                                                        <SelectItem value="demo">Demo</SelectItem>
                                                        <SelectItem value="trial">Trial</SelectItem>
                                                        <SelectItem value="pro">Pro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {formatDate(store.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-none border-2 border-brand-black"
                                                    onClick={() => window.open(`/store/${store.slug}`, '_blank')}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {pageCount > 1 && (
                                <div className="flex items-center justify-between p-4 border-t-2 border-brand-black">
                                    <p className="font-mono text-sm text-muted-foreground">
                                        Page {page + 1} of {pageCount}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-none border-2 border-brand-black"
                                            disabled={page === 0}
                                            onClick={() => setPage(page - 1)}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-none border-2 border-brand-black"
                                            disabled={page >= pageCount - 1}
                                            onClick={() => setPage(page + 1)}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
