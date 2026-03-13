import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    Activity,
    Server,
    Clock,
    CheckCircle,
    XCircle
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

interface CronLog {
    id: string;
    job_name: string;
    status: 'success' | 'error';
    response_time_ms: number | null;
    details: any;
    created_at: string;
}

interface AuditLogStats {
    totalLogs: number;
    todayLogs: number;
    uniqueAdmins: number;
    mostCommonAction: string;
}

interface CronLogStats {
    totalPings: number;
    successPings: number;
    failedPings: number;
    avgResponseTime: number;
}

type LogType = 'audit' | 'cron';

export function AdminAuditLogPage() {
    const { user } = useAuth();
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
    const [isLoadingAudit, setIsLoadingAudit] = useState(true);
    const [isLoadingCron, setIsLoadingCron] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(20);
    const [auditStats, setAuditStats] = useState<AuditLogStats | null>(null);
    const [cronStats, setCronStats] = useState<CronLogStats | null>(null);
    const [activeTab, setActiveTab] = useState<LogType>('audit');

    useEffect(() => {
        fetchAuditLogs();
        fetchCronLogs();
    }, [fetchAuditLogs, fetchCronLogs]);

    const fetchAuditLogs = useCallback(async () => {
        setIsLoadingAudit(true);
        try {
            // Note: Using mock data for audit logs
            // In production, query from admin_audit_logs table
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

            setAuditLogs(mockLogs);

            const uniqueAdmins = new Set(mockLogs.map(log => log.admin_id)).size;
            const actionCounts = mockLogs.reduce((acc, log) => {
                acc[log.action] = (acc[log.action] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const mostCommonAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

            setAuditStats({
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
            setIsLoadingAudit(false);
        }
    }, [user?.id, user?.email]);

    const fetchCronLogs = useCallback(async () => {
        setIsLoadingCron(true);
        try {
            const { data, error } = await supabase
                .from('cron_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            setCronLogs(data || []);

            // Calculate stats
            const successPings = data?.filter(log => log.status === 'success').length || 0;
            const failedPings = data?.filter(log => log.status === 'error').length || 0;
            const responseTimes = data?.map(log => log.response_time_ms).filter((rt): rt is number => rt !== null) || [];
            const avgResponseTime = responseTimes.length > 0
                ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
                : 0;

            setCronStats({
                totalPings: data?.length || 0,
                successPings,
                failedPings,
                avgResponseTime,
            });
        } catch (error) {
            console.error('Error fetching cron logs:', error);
            toast.error('Gagal memuat riwayat ping server');
        } finally {
            setIsLoadingCron(false);
        }
    }, []);

    const filteredAuditLogs = useMemo(() => {
        if (!searchQuery || activeTab !== 'audit') return auditLogs;
        const query = searchQuery.toLowerCase();
        return auditLogs.filter(
            (log) =>
                log.action?.toLowerCase().includes(query) ||
                log.entity_type?.toLowerCase().includes(query) ||
                log.admin_email?.toLowerCase().includes(query)
        );
    }, [auditLogs, searchQuery, activeTab]);

    const filteredCronLogs = useMemo(() => {
        if (!searchQuery || activeTab !== 'cron') return cronLogs;
        const query = searchQuery.toLowerCase();
        return cronLogs.filter(
            (log) =>
                log.job_name?.toLowerCase().includes(query) ||
                log.status?.toLowerCase().includes(query)
        );
    }, [cronLogs, searchQuery, activeTab]);

    const currentLogs = activeTab === 'audit' ? filteredAuditLogs : filteredCronLogs;
    const paginatedLogs = useMemo(() => {
        const start = page * rowsPerPage;
        return currentLogs.slice(start, start + rowsPerPage);
    }, [currentLogs, page, rowsPerPage]);

    const pageCount = Math.ceil(currentLogs.length / rowsPerPage);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatRelativeTime = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit yang lalu`;
        if (diffHours < 24) return `${diffHours} jam yang lalu`;
        return `${diffDays} hari yang lalu`;
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

    const getStatusBadge = (status: string) => {
        return status === 'success'
            ? 'bg-green-500 text-white border-2 border-green-600'
            : 'bg-red-500 text-white border-2 border-red-600';
    };

    const getResponseTimeColor = (responseTime: number | null) => {
        if (!responseTime) return 'text-gray-500';
        if (responseTime < 500) return 'text-green-600';
        if (responseTime < 1500) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <FileText className="w-8 h-8" />
                    Audit & System Logs
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Monitor aktivitas admin dan kesehatan sistem
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => {
                setActiveTab(value as LogType);
                setPage(0);
                setSearchQuery('');
            }} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-gray-100 border-4 border-black shadow-hard">
                    <TabsTrigger
                        value="audit"
                        className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-[2px_2px_0px_0px_#000] font-mono text-sm py-3"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Audit Logs
                    </TabsTrigger>
                    <TabsTrigger
                        value="cron"
                        className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-[2px_2px_0px_0px_#000] font-mono text-sm py-3"
                    >
                        <Server className="w-4 h-4 mr-2" />
                        Ping Server
                    </TabsTrigger>
                </TabsList>

                {/* Audit Logs Tab */}
                <TabsContent value="audit" className="space-y-6">
                    {/* Stats */}
                    {auditStats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-mono text-muted-foreground">Total Logs</p>
                                            <p className="text-3xl font-bold font-mono mt-2">{auditStats.totalLogs}</p>
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
                                            <p className="text-3xl font-bold font-mono mt-2">{auditStats.todayLogs}</p>
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
                                            <p className="text-3xl font-bold font-mono mt-2">{auditStats.uniqueAdmins}</p>
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
                                            <p className="text-lg font-bold font-mono mt-2 capitalize">{auditStats.mostCommonAction}</p>
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
                                <span>Audit Logs ({filteredAuditLogs.length})</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchAuditLogs}
                                    disabled={isLoadingAudit}
                                    className="rounded-none border-2 border-brand-black font-mono"
                                >
                                    Refresh
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingAudit ? (
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
                                            {paginatedLogs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 font-mono text-muted-foreground">
                                                        Tidak ada data
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedLogs.map((log: any) => (
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
                                                ))
                                            )}
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
                </TabsContent>

                {/* Cron Logs Tab */}
                <TabsContent value="cron" className="space-y-6">
                    {/* Stats */}
                    {cronStats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-mono text-muted-foreground">Total Ping</p>
                                            <p className="text-3xl font-bold font-mono mt-2">{cronStats.totalPings}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-500 flex items-center justify-center">
                                            <Server className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-mono text-muted-foreground">Sukses</p>
                                            <p className="text-3xl font-bold font-mono mt-2 text-green-600">{cronStats.successPings}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-500 flex items-center justify-center">
                                            <CheckCircle className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-mono text-muted-foreground">Gagal</p>
                                            <p className="text-3xl font-bold font-mono mt-2 text-red-600">{cronStats.failedPings}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-red-500 flex items-center justify-center">
                                            <XCircle className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-mono text-muted-foreground">Avg Response</p>
                                            <p className={`text-3xl font-bold font-mono mt-2 ${getResponseTimeColor(cronStats.avgResponseTime)}`}>
                                                {cronStats.avgResponseTime}ms
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-orange-500 flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Health Status Card */}
                    <Card className={`border-4 border-brand-black rounded-none shadow-hard ${cronStats && cronStats.failedPings === 0 ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-mono font-bold text-lg">Status Database Supabase</h3>
                                    <p className="font-mono text-sm text-muted-foreground mt-1">
                                        {cronStats && cronStats.failedPings === 0
                                            ? '✅ Database aktif dan berjalan normal'
                                            : '⚠️ Terdeteksi masalah koneksi database'
                                        }
                                    </p>
                                </div>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${cronStats && cronStats.failedPings === 0 ? 'bg-green-500' : 'bg-red-500'
                                    }`}>
                                    <Server className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logs Table */}
                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardHeader className="border-b-2 border-brand-black">
                            <CardTitle className="font-display flex items-center justify-between">
                                <span>Riwayat Ping ({filteredCronLogs.length})</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchCronLogs}
                                    disabled={isLoadingCron}
                                    className="rounded-none border-2 border-brand-black font-mono"
                                >
                                    Refresh
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingCron ? (
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
                                                <TableHead className="font-mono font-bold">Job Name</TableHead>
                                                <TableHead className="font-mono font-bold">Status</TableHead>
                                                <TableHead className="font-mono font-bold">Response Time</TableHead>
                                                <TableHead className="font-mono font-bold">Details</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedLogs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 font-mono text-muted-foreground">
                                                        Tidak ada data ping server
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                (paginatedLogs as CronLog[]).map((log) => (
                                                    <TableRow key={log.id} className="border-b-2 border-brand-black last:border-b-0">
                                                        <TableCell className="font-mono text-sm">
                                                            <div>
                                                                <div className="text-xs">{formatDate(log.created_at)}</div>
                                                                <div className="text-xs text-muted-foreground">{formatRelativeTime(log.created_at)}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">{log.job_name}</TableCell>
                                                        <TableCell>
                                                            <Badge className={`rounded-none font-mono uppercase text-xs ${getStatusBadge(log.status)}`}>
                                                                {log.status === 'success' ? '✓ OK' : '✗ ERROR'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            <span className={getResponseTimeColor(log.response_time_ms)}>
                                                                {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs font-mono text-muted-foreground max-w-xs">
                                                                {log.details?.timestamp && (
                                                                    <div className="truncate">
                                                                        {JSON.stringify(log.details)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
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
                    <Card className="border-4 border-brand-black rounded-none shadow-hard bg-purple-50">
                        <CardContent className="p-6">
                            <p className="font-mono text-sm text-purple-800">
                                <strong>ℹ️ Info:</strong> Cron job ping server dijalankan setiap 10 menit untuk menjaga
                                database Supabase tetap aktif. Response time yang normal adalah &lt;500ms.
                                Jika response time &gt;1500ms, database mungkin sedang "waking up" dari pause state.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
