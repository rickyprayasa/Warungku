import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Store,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    TrendingUp,
    ExternalLink,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StoreData {
    id: string;
    name: string;
    slug: string;
    plan: string;
    plan_expires_at: string | null;
    created_at: string;
    owner_email: string;
    owner_id: string;
}

interface StoreMetrics {
    productCount: number;
    salesCount: number;
    totalRevenue: number;
}

interface StoreWithMetrics extends StoreData {
    metrics: StoreMetrics;
}

export function AdminStoresPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [selectedStore, setSelectedStore] = useState<StoreWithMetrics | null>(null);
    const [isDetailOpen, setDetailOpen] = useState(false);
    const [filterPlan, setFilterPlan] = useState<string | null>(null);

    // Fetch stores and their owners
    const { data: stores = [], isLoading } = useQuery({
        queryKey: ['admin', 'stores-performance'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_users_for_admin');
            if (error) throw error;

            const storesList: StoreWithMetrics[] = [];
            const processedStoreIds = new Set<string>();

            // Transform user-centric data to store-centric
            (data || []).forEach((item: any) => {
                if (item.store_id && !processedStoreIds.has(item.store_id)) {
                    processedStoreIds.add(item.store_id);
                    storesList.push({
                        id: item.store_id,
                        name: item.store_name,
                        slug: item.store_slug || '',
                        plan: item.store_plan || 'free',
                        plan_expires_at: item.plan_expires_at || null,
                        created_at: item.store_created_at || new Date().toISOString(),
                        owner_email: item.email || 'Unknown',
                        owner_id: item.user_id,
                        metrics: {
                            productCount: 0,
                            salesCount: 0,
                            totalRevenue: 0
                        }
                    });
                }
            });

            // Fetch metrics for each store
            await Promise.all(storesList.map(async (store) => {
                try {
                    // Get Product Count
                    const { count: pCount } = await supabase
                        .from('products')
                        .select('id', { count: 'exact', head: true })
                        .eq('store_id', store.id);

                    // Get Sales Count & Revenue
                    const { data: sales } = await supabase
                        .from('sales')
                        .select('total_price')
                        .eq('store_id', store.id)
                        .eq('status', 'completed'); // Only completed sales

                    const sCount = sales?.length || 0;
                    const revenue = sales?.reduce((sum, s: any) => sum + (s.total_price || 0), 0) || 0;

                    store.metrics = {
                        productCount: pCount || 0,
                        salesCount: sCount,
                        totalRevenue: revenue
                    };
                } catch (e) {
                    console.error(`Failed to load metrics for store ${store.name}`, e);
                }
            }));

            return storesList;
        },
        staleTime: 1000 * 60 * 5, // 5 mins
    });

    const filteredStores = useMemo(() => {
        let result = stores;

        if (filterPlan) {
            result = result.filter(s => s.plan === filterPlan);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.slug.toLowerCase().includes(query) ||
                s.owner_email.toLowerCase().includes(query)
            );
        }

        // Sort by revenue desc by default
        return result.sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue);
    }, [stores, searchQuery, filterPlan]);

    const paginatedStores = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredStores.slice(start, start + rowsPerPage);
    }, [filteredStores, page, rowsPerPage]);

    const pageCount = Math.ceil(filteredStores.length / rowsPerPage);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case 'pro': return 'bg-purple-500 text-white';
            case 'enterprise': return 'bg-brand-orange text-brand-black';
            default: return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <TrendingUp className="w-8 h-8" />
                    Store Performance
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Analisis performa, revenue, dan statistik detail setiap toko
                </p>
            </div>

            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama toko, slug, atau email owner..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(0);
                                }}
                                className="pl-10 rounded-none border-2 border-brand-black"
                            />
                        </div>
                        <Select
                            value={filterPlan}
                            onValueChange={(value) => setFilterPlan(value === 'all' ? null : value)}
                        >
                            <SelectTrigger className="w-40 border-2 border-brand-black rounded-none">
                                <SelectValue placeholder="Filter Plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Plan</SelectItem>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

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
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-2 border-brand-black bg-gray-50">
                                    <TableHead className="font-mono font-bold">Store Details</TableHead>
                                    <TableHead className="font-mono font-bold">Owner</TableHead>
                                    <TableHead className="font-mono font-bold text-center">Plan</TableHead>
                                    <TableHead className="font-mono font-bold text-center">Items</TableHead>
                                    <TableHead className="font-mono font-bold text-center">Orders</TableHead>
                                    <TableHead className="font-mono font-bold text-right">Revenue</TableHead>
                                    <TableHead className="font-mono font-bold text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedStores.map((store) => (
                                    <TableRow key={store.id} className="border-b-2 border-brand-black last:border-b-0">
                                        <TableCell className="font-mono font-bold">
                                            <div className="flex flex-col">
                                                <span className="text-base">{store.name}</span>
                                                <a
                                                    href={`/${store.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-normal"
                                                >
                                                    /{store.slug} <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-muted-foreground">
                                            {store.owner_email}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`rounded-none font-mono uppercase text-xs ${getPlanBadgeColor(store.plan || 'demo')}`}>
                                                {store.plan || 'Demo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-base">
                                            {store.metrics.productCount}
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-base">
                                            {store.metrics.salesCount}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-brand-orange text-base">
                                            {formatCurrency(store.metrics.totalRevenue)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedStore(store);
                                                    setDetailOpen(true);
                                                }}
                                                className="rounded-none border-2 border-brand-black hover:bg-brand-black hover:text-white"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {paginatedStores.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center p-8 text-muted-foreground font-mono">
                                            No stores found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {pageCount > 1 && (
                        <div className="flex items-center justify-between p-4 border-t-2 border-brand-black">
                            <p className="font-mono text-sm text-muted-foreground">
                                Page {page + 1} of {pageCount}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 0}
                                    className="rounded-none border-2 border-brand-black"
                                    onClick={() => setPage(page - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= pageCount - 1}
                                    onClick={() => setPage(page + 1)}
                                    className="rounded-none border-2 border-brand-black"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-lg">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Store className="w-6 h-6" />
                            Detail Toko: {selectedStore?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedStore && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 border-2 border-brand-black text-center">
                                    <p className="text-xs font-mono text-muted-foreground mb-1">Total Revenue</p>
                                    <p className="text-2xl font-bold font-mono text-brand-orange">
                                        {formatCurrency(selectedStore.metrics.totalRevenue)}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 border-2 border-brand-black text-center">
                                    <p className="text-xs font-mono text-muted-foreground mb-1">Total Orders</p>
                                    <p className="text-2xl font-bold font-mono text-brand-black">
                                        {selectedStore.metrics.salesCount}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm font-mono text-muted-foreground">Owner</span>
                                    <span className="font-bold text-sm">{selectedStore.owner_email}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm font-mono text-muted-foreground">Plan</span>
                                    <Badge variant="outline" className="font-mono uppercase text-xs">{selectedStore.plan}</Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm font-mono text-muted-foreground">Expires At</span>
                                    <span className="font-bold text-sm">
                                        {selectedStore.plan_expires_at
                                            ? new Date(selectedStore.plan_expires_at).toLocaleDateString('id-ID')
                                            : '-'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-sm font-mono text-muted-foreground">Created At</span>
                                    <span className="font-bold text-sm">
                                        {new Date(selectedStore.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t-2 border-brand-black">
                                <Button
                                    className="w-full bg-brand-black text-white hover:bg-brand-orange hover:text-brand-black border-2 border-brand-black font-bold uppercase rounded-none"
                                    onClick={() => setDetailOpen(false)}
                                >
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
