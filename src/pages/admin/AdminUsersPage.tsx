import { useEffect, useState, useMemo } from 'react';
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
    Save
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
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewName] = useState('');
    const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserWithStore | null>(null);
    const [newRole, setNewRole] = useState('admin');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

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
            // Determine redirect URL
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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUserEmail || !newUserPassword) {
            toast.error('Email dan password wajib diisi');
            return;
        }

        if (newUserPassword.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }

        setIsCreatingUser(true);
        try {
            // Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('User creation failed');
            }

            // Create store for the new user using RPC
            const { data: storeResult, error: storeError } = await (supabase.rpc as any)('create_store_for_user', {
                p_user_id: authData.user.id,
                p_store_name: newUserName || 'New Store',
                p_plan: 'demo',
            });

            if (storeError) {
                console.error('RPC error:', storeError);
                throw new Error(storeError.message || 'Failed to create store');
            }

            const storeData = storeResult?.[0];
            if (!storeData || !storeData.success) {
                throw new Error(storeData?.message || 'Failed to create store');
            }

            toast.success('User baru berhasil dibuat!');
            setNewUserEmail('');
            setNewUserPassword('');
            setNewName('');
            setIsCreateDialogOpen(false);
            fetchUsers();
        } catch (error: any) {
            console.error('Error creating user:', error);
            toast.error(`Gagal membuat user: ${error.message}`);
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleEditRole = (user: UserWithStore) => {
        setEditingUser(user);
        setNewRole(user.role);
        setIsEditRoleOpen(true);
    };

    const handleUpdateRole = async () => {
        if (!editingUser) return;

        setIsUpdatingRole(true);
        try {
            const { error } = await (supabase.from('store_members') as any)
                .update({ role: newRole })
                .eq('user_id', editingUser.user_id);

            if (error) throw error;

            toast.success(`Role berhasil diubah ke ${newRole}`);
            setIsEditRoleOpen(false);
            fetchUsers();
        } catch (error: any) {
            console.error('Error updating role:', error);
            toast.error(`Gagal mengubah role: ${error.message}`);
        } finally {
            setIsUpdatingRole(false);
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

            {/* Search & Actions */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
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
                        <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah User
                        </Button>
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
                                                        onClick={() => handleEditRole(user)}
                                                        title="Edit role"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </Button>
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

            {/* Create User Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-md">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Plus className="w-6 h-6" />
                            Tambah User Baru
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="store-name">Nama Toko</Label>
                            <Input
                                id="store-name"
                                value={newUserName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="rounded-none border-2 border-brand-black"
                                placeholder="Contoh: Warung Berkah"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="pl-10 rounded-none border-2 border-brand-black"
                                    placeholder="email@contoh.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                className="rounded-none border-2 border-brand-black"
                                placeholder="Minimal 6 karakter"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isCreatingUser}
                            className="w-full bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
                        >
                            {isCreatingUser ? (
                                <>
                                    <Building2 className="w-4 h-4 mr-2 animate-spin" />
                                    Membuat User...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat User Baru
                                </>
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-md">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Shield className="w-6 h-6" />
                            Edit Role User
                        </DialogTitle>
                    </DialogHeader>

                    {editingUser && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-gray-50 border-2 border-gray-200">
                                <p className="text-xs font-mono text-muted-foreground">User</p>
                                <p className="font-bold font-mono">{editingUser.email}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-1">{editingUser.store?.name}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <select
                                    id="role"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full border-2 border-brand-black p-2 font-mono rounded-none"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>

                            <div className="p-3 bg-blue-50 border-2 border-blue-200">
                                <p className="text-xs font-mono text-blue-800">
                                    <strong>Role:</strong><br />
                                    • Admin: Full access to all features<br />
                                    • Editor: Can manage products and sales<br />
                                    • Viewer: Read-only access
                                </p>
                            </div>

                            <Button
                                onClick={handleUpdateRole}
                                disabled={isUpdatingRole}
                                className="w-full bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
                            >
                                {isUpdatingRole ? (
                                    <>
                                        <Building2 className="w-4 h-4 mr-2 animate-spin" />
                                        Mengupdate...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Simpan Perubahan
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
