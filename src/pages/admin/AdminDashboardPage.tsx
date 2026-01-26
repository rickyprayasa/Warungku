import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/contexts/AdminContext';
import { useAdminStats, useAdminRecentStores } from '@/hooks/useAdminData';
import {
    Users,
    Store,
    ShoppingCart,
    Package,
    TrendingUp,
    Activity,
    Calendar,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminDashboardPage() {
    const { adminRole } = useAdmin();

    // Use React Query hooks with caching
    const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useAdminStats();
    const { data: recentStores = [], isLoading: isLoadingStores, refetch: refetchStores } = useAdminRecentStores(5);

    const isLoading = isLoadingStats || isLoadingStores;

    const handleRefresh = () => {
        refetchStats();
        refetchStores();
    };

    const statCards = [
        { title: 'Total Stores', value: stats?.totalStores || 0, icon: Store, color: 'bg-blue-500' },
        { title: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'bg-green-500' },
        { title: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'bg-purple-500' },
        { title: 'Total Sales', value: stats?.totalSales || 0, icon: ShoppingCart, color: 'bg-orange-500' },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-brand-black">
                        Platform Dashboard
                    </h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">
                        Overview statistik dan aktivitas platform OMZETIN
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="rounded-none border-2 border-brand-black font-mono hover:bg-brand-orange hover:text-brand-black"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Badge className="rounded-none bg-brand-orange text-brand-black font-mono uppercase">
                        {adminRole}
                    </Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <Card key={stat.title} className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-mono text-muted-foreground">{stat.title}</p>
                                    <p className="text-3xl font-bold font-mono mt-2">
                                        {isLoading ? '...' : stat.value.toLocaleString()}
                                    </p>
                                </div>
                                <div className={`w-12 h-12 ${stat.color} flex items-center justify-center`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Stores */}
                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardHeader className="border-b-2 border-brand-black">
                        <CardTitle className="flex items-center gap-2 font-display">
                            <Store className="w-5 h-5" />
                            Toko Terbaru
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentStores.length === 0 ? (
                            <p className="p-6 text-center text-muted-foreground font-mono">
                                Belum ada toko
                            </p>
                        ) : (
                            <div className="divide-y-2 divide-brand-black">
                                {recentStores.map((store: any) => (
                                    <div key={store.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-bold font-mono">{store.name}</p>
                                                <a
                                                    href={`/${store.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-mono flex items-center gap-1 hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    /{store.slug}
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                            <div className="text-right">
                                                <Badge className="rounded-none font-mono text-xs" variant="outline">
                                                    {store.plan || 'demo'}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                                    {formatDate(store.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardHeader className="border-b-2 border-brand-black">
                        <CardTitle className="flex items-center gap-2 font-display">
                            <Activity className="w-5 h-5" />
                            Quick Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="p-4 bg-blue-50 border-2 border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <p className="font-bold font-mono text-blue-800">Platform Status</p>
                            </div>
                            <p className="text-sm text-blue-700 font-mono">
                                Semua sistem berjalan normal
                            </p>
                        </div>

                        <div className="p-4 bg-green-50 border-2 border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-5 h-5 text-green-600" />
                                <p className="font-bold font-mono text-green-800">Today</p>
                            </div>
                            <p className="text-sm text-green-700 font-mono">
                                {new Date().toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        <div className="p-4 bg-orange-50 border-2 border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Store className="w-5 h-5 text-orange-600" />
                                <p className="font-bold font-mono text-orange-800">SaaS Mode</p>
                            </div>
                            <p className="text-sm text-orange-700 font-mono">
                                Multi-tenant enabled
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
