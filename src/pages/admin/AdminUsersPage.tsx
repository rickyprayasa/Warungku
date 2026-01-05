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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    Store,
    Package,
    ShoppingCart,
    KeyRound
} from 'lucide-react';
import { toast } from 'sonner';

interface UserWithStore {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
    email: string; // Added email
    store: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        created_at: string;
    };
}

interface UserDetails {
    user: UserWithStore;
    productCount: number;
    salesCount: number;
    purchasesCount: number;
}

export function AdminUsersPage() {
    const [users, setUsers] = useState<UserWithStore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [isDetailOpen, setDetailOpen] = useState(false);
    const [isResetting, setIsResetting] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Use RPC to get users with email
            const { data, error } = await supabase.rpc('get_users_with_email');

            if (error) throw error;

            // Map RPC result to UserWithStore interface
            const mappedData = (data || []).map((item: any) => ({
                id: item.id,
                user_id: item.user_id,
                role: item.role,
                created_at: item.created_at,
                email: item.email,
                store: {
                    id: item.store_id,
                    name: item.store_name,
                    slug: item.store_slug,
                    plan: item.store_plan,
                    created_at: item.store_created_at,
                },
            }));

            setUsers(mappedData);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Gagal memuat data users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (email: string, userId: string) => {
        if (!confirm(`Kirim link reset password ke ${email}?`)) return;

        setIsResetting(userId);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;
            toast.success(`Link reset password dikirim ke ${email}`);
        } catch (error: any) {
            console.error('Error resetting password:', error);
            toast.error(`Gagal mengirim link: ${error.message}`);
        } finally {
            setIsResetting(null);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(
            (u) =>
                u.store?.name?.toLowerCase().includes(query) ||
                u.store?.slug?.toLowerCase().includes(query) ||
                u.role?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    const paginatedUsers = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredUsers.slice(start, start + rowsPerPage);
    }, [filteredUsers, page, rowsPerPage]);

    const pageCount = Math.ceil(filteredUsers.length / rowsPerPage);

    const viewUserDetails = async (user: UserWithStore) => {
        try {
            // Fetch product count
            const { count: productCount } = await supabase
                .from('products')
                .select('id', { count: 'exact', head: false }) // Use safer count query
                .eq('store_id', user.store.id);

            // Fetch sales count
            const { count: salesCount } = await supabase
                .from('sales')
                .select('id', { count: 'exact', head: false })
                .eq('store_id', user.store.id);

            // Fetch purchases count
            const { count: purchasesCount } = await supabase
                .from('purchases')
                .select('id', { count: 'exact', head: false })
                .eq('store_id', user.store.id);

            setSelectedUser({
                user,
                productCount: productCount || 0,
                salesCount: salesCount || 0,
                purchasesCount: purchasesCount || 0,
            });
            setDetailOpen(true);
        } catch (error) {
            console.error('Error fetching user details:', error);
            toast.error('Gagal memuat detail user');
        }
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <Users className="w-8 h-8" />
                    User Management
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Kelola semua user dan store di platform
                </p>
            </div>

            {/* Search */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama, email, atau slug..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(0);
                            }}
                            className="pl-10 rounded-none border-2 border-brand-black"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardHeader className="border-b-2 border-brand-black">
                    <CardTitle className="font-display flex items-center justify-between">
                        <span>Users ({filteredUsers.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mx-auto"></div>
                            <p className="mt-4 font-mono text-sm text-muted-foreground">Loading...</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-brand-black bg-gray-50">
                                        <TableHead className="font-mono font-bold">Store</TableHead>
                                        <TableHead className="font-mono font-bold">Email</TableHead>
                                        <TableHead className="font-mono font-bold">Role</TableHead>
                                        <TableHead className="font-mono font-bold">Plan</TableHead>
                                        <TableHead className="font-mono font-bold">Joined</TableHead>
                                        <TableHead className="font-mono font-bold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedUsers.map((user) => (
                                        <TableRow key={user.id} className="border-b-2 border-brand-black last:border-b-0">
                                            <TableCell className="font-mono font-bold">
                                                {user.store?.name || '-'}
                                                <div className="text-xs text-muted-foreground font-normal">/{user.store?.slug || '-'}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-none font-mono uppercase text-xs">
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`rounded-none font-mono uppercase text-xs ${getPlanBadgeColor(user.store?.plan || 'demo')}`}>
                                                    {user.store?.plan || 'demo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {formatDate(user.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-none border-2 border-brand-black"
                                                        onClick={() => handleResetPassword(user.email, user.id)}
                                                        disabled={isResetting === user.id}
                                                        title="Kirim link reset password"
                                                    >
                                                        {isResetting === user.id ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-brand-black border-t-transparent rounded-full" />
                                                        ) : (
                                                            <KeyRound className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-none border-2 border-brand-black"
                                                        onClick={() => viewUserDetails(user)}
                                                        title="Lihat detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
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

            {/* User Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-lg">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Store className="w-6 h-6" />
                            {selectedUser?.user.store?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                    <p className="text-xs font-mono text-muted-foreground">Slug</p>
                                    <p className="font-mono font-bold">/{selectedUser.user.store?.slug}</p>
                                </div>
                                <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                    <p className="text-xs font-mono text-muted-foreground">Plan</p>
                                    <Badge className={`rounded-none font-mono ${getPlanBadgeColor(selectedUser.user.store?.plan || 'demo')}`}>
                                        {selectedUser.user.store?.plan || 'demo'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 bg-blue-50 border-2 border-blue-200 text-center">
                                    <Package className="w-6 h-6 mx-auto text-blue-600" />
                                    <p className="text-2xl font-bold font-mono mt-2">{selectedUser.productCount}</p>
                                    <p className="text-xs font-mono text-muted-foreground">Products</p>
                                </div>
                                <div className="p-4 bg-green-50 border-2 border-green-200 text-center">
                                    <ShoppingCart className="w-6 h-6 mx-auto text-green-600" />
                                    <p className="text-2xl font-bold font-mono mt-2">{selectedUser.salesCount}</p>
                                    <p className="text-xs font-mono text-muted-foreground">Sales</p>
                                </div>
                                <div className="p-4 bg-orange-50 border-2 border-orange-200 text-center">
                                    <Package className="w-6 h-6 mx-auto text-orange-600" />
                                    <p className="text-2xl font-bold font-mono mt-2">{selectedUser.purchasesCount}</p>
                                    <p className="text-xs font-mono text-muted-foreground">Purchases</p>
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                <p className="text-xs font-mono text-muted-foreground">Joined</p>
                                <p className="font-mono">{formatDate(selectedUser.user.created_at)}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
