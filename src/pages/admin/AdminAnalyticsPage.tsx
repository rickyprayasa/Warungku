import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Store, ShoppingCart, Package, TrendingUp, Activity, Calendar, DollarSign } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdminData';
import { Button } from '@/components/ui/button';

interface TimeRange {
    value: '7d' | '30d' | '90d' | 'all';
    label: string;
}

export function AdminAnalyticsPage() {
    const { data: stats, isLoading, refetch } = useAdminStats();
    const [timeRange, setTimeRange] = useState<TimeRange['value']>('30d');

    const timeRanges: TimeRange[] = [
        { value: '7d', label: '7 Hari' },
        { value: '30d', label: '30 Hari' },
        { value: '90d', label: '90 Hari' },
        { value: 'all', label: 'Semua' },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // Mock data for demonstration - replace with real API calls
    const analyticsData = {
        totalRevenue: 150000000,
        revenueGrowth: 23.5,
        activeUsers: 156,
        userGrowth: 12.3,
        totalTransactions: 2456,
        transactionGrowth: 18.7,
        avgOrderValue: 61000,
        orderValueGrowth: 8.2,
        topStores: [
            { name: 'Warung Berkah', slug: 'warung-berkah', revenue: 25000000, transactions: 410 },
            { name: 'Toko Sejahtera', slug: 'toko-sejahtera', revenue: 18500000, transactions: 320 },
            { name: 'Minimarket Jaya', slug: 'minimarket-jaya', revenue: 15600000, transactions: 280 },
            { name: 'Toko Pagi', slug: 'toko-pagi', revenue: 12000000, transactions: 210 },
            { name: 'Warung Mamah', slug: 'warung-mamah', revenue: 9500000, transactions: 185 },
        ],
        revenueByPlan: [
            { plan: 'Pro', value: 85000000, percentage: 57 },
            { plan: 'Trial', value: 45000000, percentage: 30 },
            { plan: 'Demo', value: 20000000, percentage: 13 },
        ],
        userActivity: [
            { date: '2025-01-01', active: 120, signups: 5 },
            { date: '2025-01-02', active: 135, signups: 8 },
            { date: '2025-01-03', active: 142, signups: 3 },
            { date: '2025-01-04', active: 128, signups: 6 },
            { date: '2025-01-05', active: 156, signups: 12 },
            { date: '2025-01-06', active: 148, signups: 4 },
            { date: '2025-01-07', active: 152, signups: 7 },
        ],
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
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="border-2 border-brand-black"
                    >
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
                                    Rp {analyticsData.totalRevenue.toLocaleString('id-ID')}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-xs font-mono text-green-600">+{analyticsData.revenueGrowth}%</span>
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
                                    {analyticsData.activeUsers}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-xs font-mono text-green-600">+{analyticsData.userGrowth}%</span>
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
                                    {analyticsData.totalTransactions}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-xs font-mono text-green-600">+{analyticsData.transactionGrowth}%</span>
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
                                    Rp {analyticsData.avgOrderValue.toLocaleString('id-ID')}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-xs font-mono text-green-600">+{analyticsData.orderValueGrowth}%</span>
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
                        {analyticsData.topStores.map((store, index) => (
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
                        ))}
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
                        {analyticsData.revenueByPlan.map((item) => (
                            <div key={item.plan} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold font-mono">{item.plan}</span>
                                    <span className="font-mono">Rp {item.value.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-none border-2 border-brand-black h-4">
                                    <div
                                        className="bg-brand-orange h-full rounded-none border-2 border-brand-black"
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground font-mono text-right">{item.percentage}%</p>
                            </div>
                        ))}
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
                            {analyticsData.userActivity.map((day) => (
                                <div key={day.date} className="flex items-center gap-4">
                                    <div className="w-24 text-sm font-mono">{formatDate(day.date)}</div>
                                    <div className="flex-1 flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="text-xs font-mono text-muted-foreground mb-1">Active: {day.active}</div>
                                            <div className="w-full bg-gray-200 rounded-none border-2 border-gray-300 h-3">
                                                <div
                                                    className="bg-blue-500 h-full rounded-none border-2 border-brand-black"
                                                    style={{ width: `${(day.active / 160) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="w-24">
                                            <div className="text-xs font-mono text-muted-foreground mb-1">Signups: {day.signups}</div>
                                            <div className="w-full bg-gray-200 rounded-none border-2 border-gray-300 h-3">
                                                <div
                                                    className="bg-green-500 h-full rounded-none border-2 border-brand-black"
                                                    style={{ width: `${(day.signups / 12) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
