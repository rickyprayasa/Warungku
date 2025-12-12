import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/contexts/AdminContext';
import {
    Users,
    Store,
    ShoppingCart,
    Package,
    TrendingUp,
    Activity,
    Calendar
} from 'lucide-react';

interface PlatformStats {
    totalUsers: number;
    totalStores: number;
    totalProducts: number;
    totalSales: number;
    activeStoresToday: number;
    newUsersThisWeek: number;
}

export function AdminDashboardPage() {
    const { adminRole } = useAdmin();
    const [stats, setStats] = useState<PlatformStats>({
        totalUsers: 0,
        totalStores: 0,
        totalProducts: 0,
        totalSales: 0,
        activeStoresToday: 0,
        newUsersThisWeek: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [recentStores, setRecentStores] = useState<any[]>([]);

    useEffect(() => {
        fetchPlatformStats();
        fetchRecentStores();
    }, []);

    const fetchPlatformStats = async () => {
        setIsLoading(true);
        try {
            // Fetch total stores
            const { count: storeCount } = await supabase
                .from('stores')
                .select('*', { count: 'exact', head: true });

            // Fetch total products
            const { count: productCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true });

            // Fetch total sales
            const { count: salesCount } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true });

            // Fetch store members (users)
            const { count: userCount } = await supabase
                .from('store_members')
                .select('*', { count: 'exact', head: true });

            setStats({
                totalUsers: userCount || 0,
                totalStores: storeCount || 0,
                totalProducts: productCount || 0,
                totalSales: salesCount || 0,
                activeStoresToday: 0, // Would need more complex query
                newUsersThisWeek: 0, // Would need more complex query
            });
        } catch (error) {
            console.error('Error fetching platform stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRecentStores = async () => {
        try {
            const { data } = await supabase
                .from('stores')
                .select('id, name, slug, created_at, plan')
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentStores(data || []);
        } catch (error) {
            console.error('Error fetching recent stores:', error);
        }
    };

    const statCards = [
        { title: 'Total Stores', value: stats.totalStores, icon: Store, color: 'bg-blue-500' },
        { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-green-500' },
        { title: 'Total Products', value: stats.totalProducts, icon: Package, color: 'bg-purple-500' },
        { title: 'Total Sales', value: stats.totalSales, icon: ShoppingCart, color: 'bg-orange-500' },
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
                <Badge className="rounded-none bg-brand-orange text-brand-black font-mono uppercase">
                    {adminRole}
                </Badge>
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
                                {recentStores.map((store) => (
                                    <div key={store.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold font-mono">{store.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    /{store.slug}
                                                </p>
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
