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
    FileText,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    Calendar,
    User,
    Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLog {
    id: string;
    admin_id: string;
    admin_email: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: any;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

interface AuditLogStats {
    totalLogs: number;
    todayLogs: number;
    uniqueAdmins: number;
    mostCommonAction: string;
}

export function AdminAuditLogPage() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(20);
    const [stats, setStats] = useState<AuditLogStats | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            // Note: Since we don't have a real audit_logs table yet,
            // we'll use a mock implementation. In production, you would:
            // 1. Create an audit_logs table in Supabase
            // 2. Use RPC functions to log admin actions
            // 3. Query from that table

            // For now, we'll return mock data
            const mockLogs: AuditLog[] = [
                {
                    id: '1',
                    admin_id: user?.id || '',
                    admin_email: user?.email || 'admin@omzetin.com',
                    action: 'create_user',
                    entity_type: 'user',
                    entity_id: 'user-123',
                    details: { email: 'newuser@example.com', store_name: 'New Store' },
                    ip_address: '192.168.1.1',
                    user_agent: 'Mozilla/5.0...',
                    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                },
                {
                    id: '2',
                    admin_id: user?.id || '',
                    admin_email: user?.email || 'admin@omzetin.com',
                    action: 'update_role',
                    entity_type: 'store_member',
                    entity_id: 'member-456',
                    details: { email: 'user@example.com', old_role: 'viewer', new_role: 'admin' },
                    ip_address: '192.168.1.1',
                    user_agent: 'Mozilla/5.0...',
                    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                },
                {
                    id: '3',
                    admin_id: user?.id || '',
                    admin_email: user?.email || 'admin@omzetin.com',
                    action: 'reset_password',
                    entity_type: 'user',
                    entity_id: 'user-789',
                    details: { email: 'reset@example.com' },
                    ip_address: '192.168.1.1',
                    user_agent: 'Mozilla/5.0...',
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                },
                {
                    id: '4',
                    admin_id: user?.id || '',
                    admin_email: user?.email || 'admin@omzetin.com',
                    action: 'delete_store',
                    entity_type: 'store',
                    entity_id: 'store-abc',
                    details: { store_name: 'Deleted Store' },
                    ip_address: '192.168.1.1',
                    user_agent: 'Mozilla/5.0...',
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                },
            ];

            setLogs(mockLogs);

            // Calculate stats
            const uniqueAdmins = new Set(mockLogs.map(log => log.admin_id)).size;
            const actionCounts = mockLogs.reduce((acc, log) => {
                acc[log.action] = (acc[log.action] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const mostCommonAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

            setStats({
                totalLogs: mockLogs.length,
                todayLogs: mockLogs.filter(log => {
                    const logDate = new Date(log.created_at);
                    const today = new Date();
                    return logDate.toDateString() === today.toDateString();
                }).length,
                uniqueAdmins,
                mostCommonAction,
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            toast.error('Gagal memuat audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        if (!searchQuery) return logs;
        const query = searchQuery.toLowerCase();
        return logs.filter(
            (log) =>
                log.action?.toLowerCase().includes(query) ||
                log.entity_type?.toLowerCase().includes(query) ||
                log.admin_email?.toLowerCase().includes(query)
        );
    }, [logs, searchQuery]);

    const paginatedLogs = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredLogs.slice(start, start + rowsPerPage);
    }, [filteredLogs, page, rowsPerPage]);

    const pageCount = Math.ceil(filteredLogs.length / rowsPerPage);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getActionBadgeColor = (action: string) => {
        const colorMap: Record<string, string> = {
            create_user: 'bg-green-500 text-white',
            update_role: 'bg-blue-500 text-white',
            reset_password: 'bg-yellow-500 text-white',
            delete_store: 'bg-red-500 text-white',
            update_settings: 'bg-purple-500 text-white',
        };
        return colorMap[action] || 'bg-gray-500 text-white';
    };

    const getActionLabel = (action: string) => {
        const labelMap: Record<string, string> = {
            create_user: 'Create User',
            update_role: 'Update Role',
            reset_password: 'Reset Password',
            delete_store: 'Delete Store',
            update_settings: 'Update Settings',
        };
        return labelMap[action] || action;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <FileText className="w-8 h-8" />
                    Audit Log
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Log aktivitas admin untuk audit dan keamanan
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-mono text-muted-foreground">Total Logs</p>
                                    <p className="text-3xl font-bold font-mono mt-2">{stats.totalLogs}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-500 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-mono text-muted-foreground">Logs Hari Ini</p>
                                    <p className="text-3xl font-bold font-mono mt-2">{stats.todayLogs}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-500 flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-mono text-muted-foreground">Admin Aktif</p>
                                    <p className="text-3xl font-bold font-mono mt-2">{stats.uniqueAdmins}</p>
                                </div>
                                <div className="w-12 h-12 bg-orange-500 flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-mono text-muted-foreground">Action Terbanyak</p>
                                    <p className="text-lg font-bold font-mono mt-2 capitalize">{stats.mostCommonAction}</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-500 flex items-center justify-center">
                                    <Filter className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Cari action, entity type, atau admin email..."
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

            {/* Logs Table */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardHeader className="border-b-2 border-brand-black">
                    <CardTitle className="font-display flex items-center justify-between">
                        <span>Audit Logs ({filteredLogs.length})</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchLogs}
                            disabled={isLoading}
                            className="rounded-none border-2 border-brand-black font-mono"
                        >
                            Refresh
                        </Button>
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
                                        <TableHead className="font-mono font-bold">Timestamp</TableHead>
                                        <TableHead className="font-mono font-bold">Admin</TableHead>
                                        <TableHead className="font-mono font-bold">Action</TableHead>
                                        <TableHead className="font-mono font-bold">Entity</TableHead>
                                        <TableHead className="font-mono font-bold">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLogs.map((log) => (
                                        <TableRow key={log.id} className="border-b-2 border-brand-black last:border-b-0">
                                            <TableCell className="font-mono text-sm">
                                                {formatDate(log.created_at)}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{log.admin_email}</TableCell>
                                            <TableCell>
                                                <Badge className={`rounded-none font-mono uppercase text-xs ${getActionBadgeColor(log.action)}`}>
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm capitalize">{log.entity_type}</TableCell>
                                            <TableCell>
                                                <div className="text-xs font-mono text-muted-foreground max-w-xs truncate">
                                                    {JSON.stringify(log.details)}
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

            {/* Info Card */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard bg-blue-50">
                <CardContent className="p-6">
                    <p className="font-mono text-sm text-blue-800">
                        <strong>ℹ️ Info:</strong> Audit log digunakan untuk memantau aktivitas admin demi keamanan
                        dan compliance. Semua perubahan penting akan dicatat secara otomatis.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
