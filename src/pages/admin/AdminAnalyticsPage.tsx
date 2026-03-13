import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Store, ShoppingCart, Package, TrendingUp, Activity, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdminData';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TimeRange {
    value: '7d' | '30d' | '90d';
    label: string;
    days: number;
}

interface AnalyticsData {
    total_revenue: number;
    revenue_growth: number;
    active_users: number;
    user_growth: number;
    total_transactions: number;
    transaction_growth: number;
    avg_order_value: number;
    order_value_growth: number;
    top_stores: any[];
    revenue_by_plan: any[];
    user_activity: any[];
    signups_trend: any[];
}

const timeRanges: TimeRange[] = [
    { value: '7d', label: '7 Hari', days: 7 },
    { value: '30d', label: '30 Hari', days: 30 },
    { value: '90d', label: '90 Hari', days: 90 },
];

export function AdminAnalyticsPage() {
    const { data: stats, isLoading: statsLoading, refetch } = useAdminStats();
    const [timeRange, setTimeRange] = useState<TimeRange['value']>('30d');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        setIsLoading(true);
        try {
            const days = timeRanges.find(tr => tr.value === timeRange)?.days || 30;
            const { data, error } = await (supabase.rpc as any)('get_analytics_data', {
                p_days_range: days,
            });

            if (error) throw error;

            if (data && data[0]) {
                setAnalyticsData(data[0] as AnalyticsData);
            }
        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            toast.error('Gagal memuat data analitik');
        } finally {
            setIsLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

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
                    <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                        <BarChart3 className="w-8 h-8" />
                        Platform Analytics
                    </h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">
                        Statistik dan analitik platform OMZETIN
                    </p>
                </div>
                <div className="flex gap-2">
                    {timeRanges.map((range) => (
                        <Button
                            key={range.value}
                            variant={timeRange === range.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTimeRange(range.value)}
                            className={timeRange === range.value ? 'bg-brand-orange text-brand-black border-2 border-brand-black' : 'border-2 border-brand-black'}
                        >
                            {range.label}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            refetch();
                            fetchAnalytics();
                        }}
                        disabled={isLoading || statsLoading}
                        className="border-2 border-brand-black"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading || statsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-mono text-muted-foreground">Total Revenue</p>
                                <p className="text-2xl font-bold font-mono mt-1">
                                    Rp {(analyticsData?.total_revenue || 0).toLocaleString('id-ID')}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    {analyticsData?.revenue_growth && analyticsData.revenue_growth > 0 ? (
                                        <TrendingUp className="w-3 h-3 text-green-500" />
                                    ) : analyticsData?.revenue_growth && analyticsData.revenue_growth < 0 ? (
                                        <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                                    ) : null}
                                    <span className={`text-xs font-mono ${analyticsData?.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {analyticsData?.revenue_growth >= 0 ? '+' : ''}{(analyticsData?.revenue_growth || 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-green-500 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-mono text-muted-foreground">Active Users</p>
                                <p className="text-2xl font-bold font-mono mt-1">
                                    {analyticsData?.active_users || 0}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    {analyticsData?.user_growth && analyticsData.user_growth > 0 ? (
                                        <TrendingUp className="w-3 h-3 text-green-500" />
                                    ) : analyticsData?.user_growth && analyticsData.user_growth < 0 ? (
                                        <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                                    ) : null}
                                    <span className={`text-xs font-mono ${analyticsData?.user_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {analyticsData?.user_growth >= 0 ? '+' : ''}{(analyticsData?.user_growth || 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-blue-500 flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-mono text-muted-foreground">Transactions</p>
                                <p className="text-2xl font-bold font-mono mt-1">
                                    {analyticsData?.total_transactions || 0}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    {analyticsData?.transaction_growth && analyticsData.transaction_growth > 0 ? (
                                        <TrendingUp className="w-3 h-3 text-green-500" />
                                    ) : analyticsData?.transaction_growth && analyticsData.transaction_growth < 0 ? (
                                        <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                                    ) : null}
                                    <span className={`text-xs font-mono ${analyticsData?.transaction_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {analyticsData?.transaction_growth >= 0 ? '+' : ''}{(analyticsData?.transaction_growth || 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-orange-500 flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-mono text-muted-foreground">Avg Order Value</p>
                                <p className="text-2xl font-bold font-mono mt-1">
                                    Rp {(analyticsData?.avg_order_value || 0).toLocaleString('id-ID')}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    {analyticsData?.order_value_growth && analyticsData.order_value_growth > 0 ? (
                                        <TrendingUp className="w-3 h-3 text-green-500" />
                                    ) : analyticsData?.order_value_growth && analyticsData.order_value_growth < 0 ? (
                                        <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                                    ) : null}
                                    <span className={`text-xs font-mono ${analyticsData?.order_value_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {analyticsData?.order_value_growth >= 0 ? '+' : ''}{(analyticsData?.order_value_growth || 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-purple-500 flex items-center justify-center">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Stores */}
                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardHeader className="border-b-2 border-brand-black">
                        <CardTitle className="font-display flex items-center gap-2">
                            <Store className="w-5 h-5" />
                            Top Performing Stores
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {(analyticsData?.top_stores || []).length === 0 ? (
                            <p className="text-center font-mono text-muted-foreground p-4">Belum ada data</p>
                        ) : (
                            (analyticsData?.top_stores || []).map((store, index) => (
                                <div key={store.slug} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-brand-orange text-brand-black flex items-center justify-center font-bold font-mono rounded-none">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold font-mono">{store.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                /{store.slug} • {store.transactions} transactions
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold font-mono">Rp {store.revenue.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Revenue by Plan */}
                <Card className="border-4 border-brand-black rounded-none shadow-hard">
                    <CardHeader className="border-b-2 border-brand-black">
                        <CardTitle className="font-display flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Revenue by Plan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {(analyticsData?.revenue_by_plan || []).length === 0 ? (
                            <p className="text-center font-mono text-muted-foreground p-4">Belum ada data</p>
                        ) : (
                            (analyticsData?.revenue_by_plan || []).map((item, index) => {
                                const totalRevenue = (analyticsData?.revenue_by_plan || []).reduce((sum: number, p: any) => sum + p.value, 0);
                                const percentage = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
                                return (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold font-mono capitalize">{item.plan}</span>
                                            <span className="font-mono">Rp {item.value.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-none border-2 border-brand-black h-4">
                                            <div
                                                className="bg-brand-orange h-full rounded-none border-2 border-brand-black"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono text-right">{percentage.toFixed(1)}%</p>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* User Activity */}
                <Card className="border-4 border-brand-black rounded-none shadow-hard lg:col-span-2">
                    <CardHeader className="border-b-2 border-brand-black">
                        <CardTitle className="font-display flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            User Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            {(analyticsData?.user_activity || []).length === 0 ? (
                                <p className="text-center font-mono text-muted-foreground p-4">Belum ada data</p>
                            ) : (
                                (analyticsData?.user_activity || []).map((day, index) => {
                                    const maxActive = Math.max(...(analyticsData?.user_activity || []).map((d: any) => d.active || 0));
                                    const maxSignups = Math.max(...(analyticsData?.user_activity || []).map((d: any) => d.signups || 0));
                                    return (
                                        <div key={index} className="flex items-center gap-4">
                                            <div className="w-24 text-sm font-mono">{formatDate(day.date)}</div>
                                            <div className="flex-1 flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="text-xs font-mono text-muted-foreground mb-1">Active: {day.active}</div>
                                                    <div className="w-full bg-gray-200 rounded-none border-2 border-gray-300 h-3">
                                                        <div
                                                            className="bg-blue-500 h-full rounded-none border-2 border-brand-black"
                                                            style={{ width: maxActive > 0 ? `${(day.active / maxActive) * 100}%` : '0%' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <div className="text-xs font-mono text-muted-foreground mb-1">Signups: {day.signups}</div>
                                                    <div className="w-full bg-gray-200 rounded-none border-2 border-gray-300 h-3">
                                                        <div
                                                            className="bg-green-500 h-full rounded-none border-2 border-brand-black"
                                                            style={{ width: maxSignups > 0 ? `${(day.signups / maxSignups) * 100}%` : '0%' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Stats Summary */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardHeader className="border-b-2 border-brand-black">
                    <CardTitle className="font-display flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Platform Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-blue-50 border-2 border-blue-200">
                            <p className="text-3xl font-bold font-mono text-blue-600">{stats?.totalStores || 0}</p>
                            <p className="text-sm font-mono text-muted-foreground mt-2">Total Stores</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 border-2 border-green-200">
                            <p className="text-3xl font-bold font-mono text-green-600">{stats?.totalUsers || 0}</p>
                            <p className="text-sm font-mono text-muted-foreground mt-2">Total Users</p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 border-2 border-orange-200">
                            <p className="text-3xl font-bold font-mono text-orange-600">{stats?.totalProducts || 0}</p>
                            <p className="text-sm font-mono text-muted-foreground mt-2">Total Products</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 border-2 border-purple-200">
                            <p className="text-3xl font-bold font-mono text-purple-600">{stats?.totalSales || 0}</p>
                            <p className="text-sm font-mono text-muted-foreground mt-2">Total Sales</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
