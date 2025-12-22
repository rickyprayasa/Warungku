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
    Package,
    ShoppingCart,
    ExternalLink,
    Eye,
    Users,
    User
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
    purchasesCount?: number;
    userCount?: number;
}

interface StoreWithUsers {
    id: string;
    name: string;
    slug: string;
    plan: string;
    created_at: string;
    productCount?: number;
    salesCount?: number;
    purchasesCount?: number;
    userCount?: number;
    users?: Array<{
        id: string;
        user_id: string;
        role: string;
        created_at: string;
        email?: string;
    }>;
}

export function AdminStoresPage() {
    const [stores, setStores] = useState<StoreWithUsers[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [selectedStore, setSelectedStore] = useState<StoreWithUsers | null>(null);
    const [isDetailOpen, setDetailOpen] = useState(false);

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

                    const { count: purchasesCount } = await supabase
                        .from('purchases')
                        .select('*', { count: 'exact', head: true })
                        .eq('store_id', store.id);

                    const { count: userCount } = await supabase
                        .from('store_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('store_id', store.id);

                    return {
                        ...store,
                        productCount: productCount || 0,
                        salesCount: salesCount || 0,
                        purchasesCount: purchasesCount || 0,
                        userCount: userCount || 0,
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

    const viewStoreDetails = async (store: StoreWithUsers) => {
        try {
            // Fetch users for this store
            const { data: usersData, error: usersError } = await supabase
                .from('store_members')
                .select('id, user_id, role, created_at')
                .eq('store_id', store.id);

            if (usersError) throw usersError;

            // For each user, we could fetch their email from auth.users if needed
            // But for now, we'll just use the basic user data

            const storeWithUsers = {
                ...store,
                users: usersData || [],
            };

            setSelectedStore(storeWithUsers);
            setDetailOpen(true);
        } catch (error) {
            console.error('Error fetching store details:', error);
            toast.error('Gagal memuat detail store');
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
                    Kelola semua toko dan pengguna di platform
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
                                        <TableHead className="font-mono font-bold">Users</TableHead>
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
                                                    <Users className="w-4 h-4 text-purple-500" />
                                                    {store.userCount}
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
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-none border-2 border-brand-black"
                                                        onClick={() => viewStoreDetails(store)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-none border-2 border-brand-black"
                                                        onClick={() => window.open(`/store/${store.slug}`, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </div>
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

            {/* Store Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-2xl">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Store className="w-6 h-6" />
                            {selectedStore?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedStore && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                    <p className="text-xs font-mono text-muted-foreground">Slug</p>
                                    <p className="font-mono font-bold">/{selectedStore.slug}</p>
                                </div>
                                <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                    <p className="text-xs font-mono text-muted-foreground">Plan</p>
                                    <Badge className={`rounded-none font-mono ${getPlanBadgeColor(selectedStore.plan || 'demo')}`}>
                                        {selectedStore.plan || 'demo'}
                                    </Badge>
                                </div>
                                <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                    <p className="text-xs font-mono text-muted-foreground">Created</p>
                                    <p className="font-mono">{formatDate(selectedStore.created_at)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                    <p className="text-xs font-mono text-muted-foreground">Users</p>
                                    <p className="font-mono font-bold">{selectedStore.userCount}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 border-2 border-blue-200 text-center">
                                    <Package className="w-6 h-6 mx-auto text-blue-600" />
                                    <p className="text-2xl font-bold font-mono mt-2">{selectedStore.productCount}</p>
                                    <p className="text-xs font-mono text-muted-foreground">Products</p>
                                </div>
                                <div className="p-4 bg-green-50 border-2 border-green-200 text-center">
                                    <ShoppingCart className="w-6 h-6 mx-auto text-green-600" />
                                    <p className="text-2xl font-bold font-mono mt-2">{selectedStore.salesCount}</p>
                                    <p className="text-xs font-mono text-muted-foreground">Sales</p>
                                </div>
                                <div className="p-4 bg-orange-50 border-2 border-orange-200 text-center">
                                    <Package className="w-6 h-6 mx-auto text-orange-600" />
                                    <p className="text-2xl font-bold font-mono mt-2">{selectedStore.purchasesCount}</p>
                                    <p className="text-xs font-mono text-muted-foreground">Purchases</p>
                                </div>
                            </div>

                            {/* Users Table */}
                            <div>
                                <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Pengguna
                                </h3>
                                <div className="border-2 border-brand-black rounded-none max-h-60 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50 sticky top-0">
                                            <TableRow className="border-b-2 border-brand-black">
                                                <TableHead className="font-mono font-bold">User ID</TableHead>
                                                <TableHead className="font-mono font-bold">Role</TableHead>
                                                <TableHead className="font-mono font-bold">Joined</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedStore.users && selectedStore.users.length > 0 ? (
                                                selectedStore.users.map((user) => (
                                                    <TableRow key={user.id} className="border-b-2 border-brand-black last:border-b-0">
                                                        <TableCell className="font-mono text-sm">{user.user_id}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="rounded-none font-mono uppercase text-xs">
                                                                {user.role}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {formatDate(user.created_at)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center font-mono text-muted-foreground py-8">
                                                        Tidak ada pengguna
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
