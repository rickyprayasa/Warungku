import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    KeyRound,
    Plus,
    Mail,
    Building2,
    Shield,
    Save,
    Trash2,
    ExternalLink,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface StoreData {
    id: string;
    name: string;
    slug: string;
    plan: string;
    plan_expires_at: string | null;
    created_at: string;
}

interface UserWithStore {
    id: string;
    user_id: string;
    created_at: string;
    email: string;
    stores: StoreData[];
}

interface UserDetails {
    user: UserWithStore;
    productCount: number;
    salesCount: number;
    purchasesCount: number;
}

export function AdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [isDetailOpen, setDetailOpen] = useState(false);
    const [isResetting, setIsResetting] = useState<string | null>(null);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePlan, setInvitePlan] = useState('free');
    const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
    const [filterPlan, setFilterPlan] = useState<string | null>(null);
    const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserWithStore | null>(null);
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [newPlan, setNewPlan] = useState('free');
    const [planDuration, setPlanDuration] = useState<number>(1); // months
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Use TanStack Query for fetching users - more robust and auto-refetches on mount
    const { data: users = [], isLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['admin', 'users'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_all_users_for_admin');

            if (error) throw error;

            const usersMap = new Map<string, UserWithStore>();

            (data || []).forEach((item: any) => {
                if (!usersMap.has(item.user_id)) {
                    usersMap.set(item.user_id, {
                        id: item.user_id,
                        user_id: item.user_id,
                        email: item.email,
                        created_at: item.created_at,
                        stores: []
                    });
                }

                if (item.store_id) {
                    const user = usersMap.get(item.user_id)!;
                    // Avoid duplicate stores
                    if (!user.stores.find(s => s.id === item.store_id)) {
                        user.stores.push({
                            id: item.store_id,
                            name: item.store_name,
                            slug: item.store_slug,
                            plan: item.store_plan,
                            plan_expires_at: item.plan_expires_at || null,
                            created_at: item.store_created_at,
                        });
                    }
                }
            });

            return Array.from(usersMap.values());
        },
        staleTime: 0, // Always consider data stale - refetch on every mount/window focus
        gcTime: 1000 * 60 * 5,
        retry: 2,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    const handleResetPassword = async (email: string, userId: string) => {
        if (!confirm(`Kirim link reset password ke ${email}?`)) return;

        setIsResetting(userId);
        try {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const redirectUrl = isLocalhost
                ? `${window.location.origin}/update-password`
                : 'https://omzetin.web.id/update-password';

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
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

    const handleInviteUser = async () => {
        if (!inviteEmail) {
            toast.error('Email wajib diisi');
            return;
        }

        setIsInviting(true);
        try {
            const inviteLink = `https://omzetin.web.id/invite?email=${encodeURIComponent(inviteEmail)}`;

            await navigator.clipboard.writeText(inviteLink);
            toast.success(`Link undangan telah disalin! Share link ini: ${inviteLink}`);
            setInviteEmail('');
            setIsInviteDialogOpen(false);
        } catch (error: any) {
            console.error('Error creating invite:', error);
            toast.error('Gagal membuat undangan');
        } finally {
            setIsInviting(false);
        }
    };

    const handleEditRole = (user: UserWithStore) => {
        setEditingUser(user);

        // Default to first store if available
        const defaultStore = user.stores[0];
        setSelectedStoreId(defaultStore?.id || null);

        if (defaultStore) {
            setNewPlan(defaultStore.plan || 'free');
            // Calculate current remaining months
            if (defaultStore.plan_expires_at) {
                const expiry = new Date(defaultStore.plan_expires_at);
                const now = new Date();
                const monthsLeft = Math.max(1, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                setPlanDuration(monthsLeft);
            } else {
                setPlanDuration(1);
            }
        } else {
            setNewPlan('free');
            setPlanDuration(1);
        }

        setIsEditRoleOpen(true);
    };

    const handleUpdatePlan = async () => {
        if (!editingUser || !newPlan) {
            toast.error('Pilih user dan plan terlebih dahulu');
            return;
        }

        const storeId = selectedStoreId || editingUser.stores[0]?.id;
        if (!storeId) {
            toast.error('Store ID tidak ditemukan');
            console.error('Store ID missing for user:', editingUser.email);
            return;
        }

        // Calculate expiry date based on duration
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + planDuration);
        const expiryIso = expiryDate.toISOString();

        console.log('Updating plan:', { storeId, newPlan, planDuration, expiryDate: expiryIso });

        setIsUpdatingPlan(true);
        try {
            const { data, error } = await (supabase.rpc as any)('admin_update_store_plan', {
                p_store_id: storeId,
                p_new_plan: newPlan,
                p_expires_at: expiryIso
            });

            console.log('Update result:', { data, error });

            if (error) throw error;

            // Check if the RPC call was successful
            if (!data || (data as any).success !== true) {
                throw new Error((data as any)?.message || 'Failed to update plan');
            }

            toast.success(`Plan berhasil diubah ke ${newPlan} (${planDuration} bulan)`);
            setIsEditRoleOpen(false);
            setEditingUser(null);
            setSelectedStoreId(null);
            refetchUsers();
        } catch (error: any) {
            console.error('Error updating plan:', error);
            toast.error(`Gagal mengubah plan: ${error.message}`);
        } finally {
            setIsUpdatingPlan(false);
        }
    };

    const handleDeleteStore = async (storeId: string, storeName: string) => {
        if (!confirm(`Hapus store "${storeName}"?\n\nPeringatan: Data store ini akan hilang permanen!`)) return;

        try {
            const { error } = await (supabase as any).from('stores').delete().eq('id', storeId);
            if (error) throw error;

            toast.success(`Store "${storeName}" berhasil dihapus`);

            // If we are viewing details, we should update the view or close it
            // For now, let's close it to be safe as data changed
            setDetailOpen(false);

            refetchUsers();
        } catch (error: any) {
            console.error('Error deleting store:', error);
            toast.error(`Gagal menghapus store: ${error.message}`);
        }
    };

    const handleDeleteUser = async (user: UserWithStore) => {
        const storeCount = user.stores.length;
        const confirmText = `Hapus user "${user.email}" dan ${storeCount} store milik user ini?\n\nPeringatan: Semua data terkait akan ikut terhapus!`;
        if (!confirm(confirmText)) return;

        setIsDeleting(user.user_id);
        try {
            // Delete user cascade (assuming backend handles deletion for user ID)
            // Passing first store ID if required by legacy RPC logic, but user ID is key
            const { data, error } = await (supabase.rpc as any)('admin_delete_user_and_store', {
                p_user_id: user.user_id,
                p_store_id: user.stores[0]?.id // Fallback
            });

            console.log('Delete result:', { data, error });

            if (error) throw error;

            if (!data || (data as any).success !== true) {
                throw new Error((data as any)?.message || 'Failed to delete user');
            }

            toast.success(`User ${user.email} berhasil dihapus`);
            refetchUsers();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error(`Gagal menghapus user: ${error.message}`);
        } finally {
            setIsDeleting(null);
        }
    };

    const viewUserDetails = async (userId: string) => {
        try {
            const user = users.find(u => u.user_id === userId);
            if (!user) {
                toast.error('User tidak ditemukan');
                return;
            }

            let productCount = 0;
            let salesCount = 0;
            let purchasesCount = 0;

            // Use RPC if available, or fetch for each store
            try {
                const { data, error } = await (supabase.rpc as any)('get_user_statistics', {
                    p_user_id: userId,
                });

                if (!error && data && data.length > 0) {
                    const stats = data[0];
                    productCount = stats.product_count || 0;
                    salesCount = stats.sales_count || 0;
                    purchasesCount = stats.purchases_count || 0;
                } else {
                    throw new Error('RPC not available');
                }
            } catch (rpcError) {
                console.log('RPC check failed, summing stats from stores');

                // Aggregate counts from all stores
                for (const store of user.stores) {
                    const { count: pCount } = await supabase
                        .from('products')
                        .select('id', { count: 'exact', head: true })
                        .eq('store_id', store.id);
                    productCount += (pCount || 0);

                    const { count: sCount } = await supabase
                        .from('sales')
                        .select('id', { count: 'exact', head: true })
                        .eq('store_id', store.id);
                    salesCount += (sCount || 0);

                    const { count: puCount } = await supabase
                        .from('purchases')
                        .select('id', { count: 'exact', head: true })
                        .eq('store_id', store.id);
                    purchasesCount += (puCount || 0);
                }
            }

            setSelectedUser({
                user,
                productCount,
                salesCount,
                purchasesCount,
            });
            setDetailOpen(true);
        } catch (error) {
            console.error('Error fetching user details:', error);
            toast.error('Gagal memuat detail user');
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery && !filterPlan) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(
            (u) =>
                u.email?.toLowerCase().includes(query) ||
                u.stores.some(s =>
                    s.name.toLowerCase().includes(query) ||
                    s.slug.toLowerCase().includes(query) ||
                    (s.plan && s.plan.toLowerCase().includes(query))
                )
        ).filter(u => {
            if (!filterPlan) return true;
            return u.stores.some(s => s.plan === filterPlan);
        });
    }, [users, searchQuery, filterPlan]);

    const paginatedUsers = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredUsers.slice(start, start + rowsPerPage);
    }, [filteredUsers, page, rowsPerPage]);

    const pageCount = Math.ceil(filteredUsers.length / rowsPerPage);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatExpiryDate = (dateString: string | null) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getDaysUntilExpiry = (dateString: string | null) => {
        if (!dateString) return null;
        const expiry = new Date(dateString);
        const now = new Date();
        return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case 'pro':
                return 'bg-purple-500 text-white';
            case 'enterprise':
                return 'bg-brand-orange text-brand-black';
            case 'demo':
                return 'bg-gray-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    const getPlanLabel = (plan: string) => {
        return plan.charAt(0).toUpperCase() + plan.slice(1);
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <Users className="w-8 h-8" />
                    User Management
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Kelola semua user dan plan subscription SaaS
                </p>
            </div>

            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama, email, atau plan..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(0);
                                }}
                                className="pl-10 rounded-none border-2 border-brand-black"
                            />
                        </div>
                        <div className="flex gap-2">
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
                            <Button
                                onClick={() => setIsInviteDialogOpen(true)}
                                className="bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Invite User
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                            <p className="mt-4 font-mono text-sm text-muted-foreground">Loading users...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-2 border-brand-black bg-gray-50">
                                    <TableHead className="font-mono font-bold">Stores</TableHead>
                                    <TableHead className="font-mono font-bold">Email</TableHead>
                                    <TableHead className="font-mono font-bold">Plans</TableHead>
                                    <TableHead className="font-mono font-bold">Expiry Info</TableHead>
                                    <TableHead className="font-mono font-bold">Joined</TableHead>
                                    <TableHead className="font-mono font-bold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedUsers.map((user) => (
                                    <TableRow key={user.id} className="border-b-2 border-brand-black last:border-b-0 align-top">
                                        <TableCell className="font-mono font-bold align-top">
                                            <div className="space-y-3">
                                                {user.stores.map((store, idx) => (
                                                    <div key={store.id} className={idx > 0 ? "pt-2 border-t border-gray-200" : ""}>
                                                        <div className="font-bold">{store.name || 'Untitled Store'}</div>
                                                        {store.slug ? (
                                                            <a
                                                                href={`/${store.slug}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-normal flex items-center gap-1 hover:underline mt-0.5"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                /{store.slug}
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        ) : (
                                                            <div className="text-xs text-muted-foreground font-normal">/-</div>
                                                        )}
                                                    </div>
                                                ))}
                                                {user.stores.length === 0 && <span className="text-muted-foreground text-xs">No Stores</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm align-top">{user.email}</TableCell>
                                        <TableCell className="align-top">
                                            <div className="space-y-3">
                                                {user.stores.map((store, idx) => (
                                                    <div key={store.id} className={idx > 0 ? "pt-2 border-t border-transparent" : ""}>
                                                        <Badge className={`rounded-none font-mono uppercase text-xs ${getPlanBadgeColor(store.plan || 'demo')}`}>
                                                            {getPlanLabel(store.plan || 'Demo')}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs align-top">
                                            <div className="space-y-3">
                                                {user.stores.map((store, idx) => (
                                                    <div key={store.id} className={idx > 0 ? "pt-2 border-t border-transparent" : ""}>
                                                        {(() => {
                                                            const expiryDate = store.plan_expires_at;
                                                            const daysLeft = getDaysUntilExpiry(expiryDate);
                                                            const formatted = formatExpiryDate(expiryDate);

                                                            if (!expiryDate) {
                                                                return <span className="text-muted-foreground block h-[22px] flex items-center">-</span>;
                                                            }

                                                            if (daysLeft !== null && daysLeft <= 0) {
                                                                return (
                                                                    <div className="flex items-center gap-1 text-red-600 h-[22px]">
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                        <span>Expired</span>
                                                                    </div>
                                                                );
                                                            }

                                                            if (daysLeft !== null && daysLeft <= 7) {
                                                                return (
                                                                    <div className="flex items-center gap-1 text-amber-600 h-[22px]">
                                                                        <Clock className="w-3 h-3" />
                                                                        <span>{formatted}</span>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="flex items-center gap-1 text-green-600 h-[22px]">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{formatted}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm align-top">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditRole(user)}
                                                    className="rounded-none border-2 border-brand-black"
                                                    title="Edit plan"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleResetPassword(user.email, user.user_id)}
                                                    disabled={isResetting === user.id}
                                                    title="Kirim link reset password"
                                                >
                                                    {isResetting === user.id ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-brand-orange border-t-transparent rounded-full" />
                                                    ) : (
                                                        <KeyRound className="w-4 h-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => viewUserDetails(user.user_id)}
                                                    title="Lihat detail"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user)}
                                                    disabled={isDeleting === user.user_id}
                                                    className="rounded-none border-2 border-red-500 text-red-500 hover:bg-red-50"
                                                    title="Hapus user"
                                                >
                                                    {isDeleting === user.user_id ? (
                                                        <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
                            Details for {selectedUser?.user.email}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-blue-50 border-2 border-blue-200 text-center">
                                    <Package className="w-8 h-8 mx-auto text-blue-600" />
                                    <p className="text-xs font-mono text-blue-800 mb-2">Products</p>
                                    <p className="text-2xl font-bold font-mono text-blue-600">{selectedUser.productCount}</p>
                                </div>
                                <div className="p-3 bg-green-50 border-2 border-green-200 text-center">
                                    <ShoppingCart className="w-8 h-8 mx-auto text-green-600" />
                                    <p className="text-xs font-mono text-green-800 mb-2">Sales</p>
                                    <p className="text-2xl font-bold font-mono text-green-600">{selectedUser.salesCount}</p>
                                </div>
                                <div className="p-3 bg-orange-50 border-2 border-orange-200 text-center">
                                    <Building2 className="w-8 h-8 mx-auto text-orange-600" />
                                    <p className="text-xs font-mono text-orange-800 mb-2">Purchases</p>
                                    <p className="text-2xl font-bold font-mono text-orange-600">{selectedUser.purchasesCount}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-purple-50 border-2 border-purple-200">
                                <p className="text-xs font-mono text-purple-800 font-bold mb-2">Stores Owned:</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {selectedUser.user.stores.map(store => (
                                        <div key={store.id} className="border-b border-purple-200 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0 flex justify-between items-start group">
                                            <div>
                                                <p className="text-sm font-mono text-purple-600 font-bold">{store.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono text-purple-600">/{store.slug || '-'}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1 border-purple-300 text-purple-700">
                                                        {store.plan}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(store.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteStore(store.id, store.name)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8 ml-2"
                                                title="Hapus Store Ini"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                <p className="text-xs text-gray-700 font-mono font-bold">Email:</p>
                                <p className="text-sm font-mono text-gray-700">{selectedUser.user.email}</p>
                            </div>

                            <div className="pt-4 border-t-2 border-brand-black">
                                <Button
                                    onClick={() => setDetailOpen(false)}
                                    className="w-full bg-brand-black text-white hover:bg-brand-orange hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
                                >
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-md">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Plus className="w-6 h-6" />
                            Invite User Baru
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite-email">Email</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="email@contoh.com"
                                className="rounded-none border-2 border-brand-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invite-plan">Default Plan</Label>
                            <Select
                                value={invitePlan}
                                onValueChange={setInvitePlan}
                            >
                                <SelectTrigger className="w-full border-2 border-brand-black rounded-none font-mono">
                                    <SelectValue placeholder="Pilih plan default..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleInviteUser}
                            disabled={isInviting || !inviteEmail}
                            className="w-full bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
                        >
                            {isInviting ? (
                                <>
                                    <Building2 className="w-4 h-4 mr-2 animate-spin" />
                                    Mengirim...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Kirim Undangan
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-md">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Shield className="w-6 h-6" />
                            Edit Plan User
                        </DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-blue-50 border-2 border-blue-200">
                                <p className="text-xs font-mono text-blue-800 font-bold">User:</p>
                                <p className="text-sm font-mono text-blue-600">{editingUser.email}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Select Store</Label>
                                <Select
                                    value={selectedStoreId || ''}
                                    onValueChange={(val) => {
                                        setSelectedStoreId(val);
                                        const store = editingUser.stores.find(s => s.id === val);
                                        if (store) {
                                            setNewPlan(store.plan || 'free');
                                            if (store.plan_expires_at) {
                                                const expiry = new Date(store.plan_expires_at);
                                                const now = new Date();
                                                const monthsLeft = Math.max(1, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                                                setPlanDuration(monthsLeft);
                                            } else {
                                                setPlanDuration(1);
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full border-2 border-brand-black rounded-none font-mono">
                                        <SelectValue placeholder="Pilih toko..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {editingUser.stores.map(store => (
                                            <SelectItem key={store.id} value={store.id}>
                                                {store.name} ({store.plan})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-plan">Plan</Label>
                                <Select
                                    value={newPlan}
                                    onValueChange={setNewPlan}
                                >
                                    <SelectTrigger className="w-full border-2 border-brand-black rounded-none font-mono">
                                        <SelectValue placeholder="Pilih plan baru..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Duration Selection - Only for paid plans */}
                            {newPlan !== 'free' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Durasi Langganan</Label>
                                        <div className="flex gap-2">
                                            {[1, 3, 6, 12].map((months) => (
                                                <Button
                                                    key={months}
                                                    type="button"
                                                    variant={planDuration === months ? 'default' : 'outline'}
                                                    onClick={() => setPlanDuration(months)}
                                                    className={`flex-1 rounded-none border-2 border-brand-black font-mono text-sm ${planDuration === months
                                                        ? 'bg-brand-orange text-brand-black'
                                                        : 'bg-white'
                                                        }`}
                                                >
                                                    {months} bln
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Label htmlFor="custom-duration" className="text-xs">Custom:</Label>
                                            <Input
                                                id="custom-duration"
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={planDuration}
                                                onChange={(e) => setPlanDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-20 h-8 rounded-none border-2 border-brand-black font-mono text-sm text-center"
                                            />
                                            <span className="text-xs text-muted-foreground font-mono">bulan</span>
                                        </div>
                                    </div>

                                    {/* Expiry Preview */}
                                    <div className="p-3 bg-blue-50 border-2 border-blue-300">
                                        <p className="text-xs font-mono text-blue-800">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            <strong>Plan akan berakhir:</strong>
                                        </p>
                                        <p className="text-sm font-mono text-blue-700 font-bold">
                                            {(() => {
                                                const expiry = new Date();
                                                expiry.setMonth(expiry.getMonth() + planDuration);
                                                return expiry.toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                });
                                            })()}
                                        </p>
                                    </div>
                                </>
                            )}

                            <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                <p className="text-xs text-gray-700 font-bold">
                                    <strong>Plan Info:</strong><br />
                                    • Free: Basic features with limitations<br />
                                    • Pro: Advanced features and analytics<br />
                                    • Enterprise: Full access with priority support
                                </p>
                            </div>

                            <div className="pt-4 border-t-2 border-brand-black flex gap-2">
                                <Button
                                    onClick={handleUpdatePlan}
                                    disabled={isUpdatingPlan}
                                    className="flex-1 bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
                                >
                                    {isUpdatingPlan ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-brand-orange border-t-transparent rounded-full mr-2" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Simpan
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => setIsEditRoleOpen(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 border-2 border-brand-black rounded-none font-mono font-bold uppercase"
                                >
                                    Batal
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
