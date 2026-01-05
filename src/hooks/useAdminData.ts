import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Custom hook for fetching admin dashboard stats with caching
export function useAdminStats() {
    return useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
            // Helper to safely fetch count
            const getCount = async (table: string) => {
                try {
                    const { count, error } = await supabase
                        .from(table)
                        .select('*', { count: 'exact', head: true });

                    if (error) {
                        console.warn(`Error fetching count for ${table}:`, error);
                        return 0;
                    }
                    return count || 0;
                } catch (err) {
                    console.warn(`Exception fetching count for ${table}:`, err);
                    return 0;
                }
            };

            // Fetch all stats in parallel, handling errors individually
            const [storeCount, productCount, salesCount, userCount] = await Promise.all([
                getCount('stores'),
                getCount('products'),
                getCount('sales'),
                getCount('store_members')
            ]);

            return {
                totalUsers: userCount,
                totalStores: storeCount,
                totalProducts: productCount,
                totalSales: salesCount,
                activeStoresToday: 0,
                newUsersThisWeek: 0,
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes cache
        retry: false, // Don't retry stats if they fail, just show what we have
    });
}

// Custom hook for fetching recent stores with caching
export function useAdminRecentStores(limit = 5) {
    return useQuery({
        queryKey: ['admin', 'recentStores', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stores')
                .select('id, name, slug, created_at, plan')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes cache
    });
}

// Custom hook for fetching Duitku settings with caching
export function useAdminDuitkuSettings() {
    return useQuery({
        queryKey: ['admin', 'duitkuSettings'],
        queryFn: async () => {
            // Check admin status first
            const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');

            if (adminError || !isAdminData) {
                throw new Error('Unauthorized: Admin access required');
            }

            // Try platform_settings first
            let { data, error } = await supabase
                .from('platform_settings')
                .select('key, value')
                .in('key', [
                    'duitku_enabled',
                    'duitku_merchant_code',
                    'duitku_api_key',
                    'duitku_sandbox_mode',
                    'duitku_callback_url',
                    'duitku_return_url'
                ]);

            // If platform_settings doesn't exist, try RPC
            if (error && error.code === '42P01') {
                const { data: rpcData } = await (supabase.rpc as any)('get_duitku_settings');
                data = rpcData;
            }

            const settingsMap: Record<string, string> = {};
            data?.forEach((item: any) => {
                if (item && typeof item === 'object' && 'key' in item && 'value' in item) {
                    settingsMap[item.key] = item.value;
                }
            });

            return {
                duitkuEnabled: settingsMap['duitku_enabled'] === 'true',
                merchantCode: settingsMap['duitku_merchant_code'] || '',
                apiKey: settingsMap['duitku_api_key'] || '',
                sandboxMode: settingsMap['duitku_sandbox_mode'] !== 'false',
                webhookUrl: 'https://omzetin.web.id/functions/v1/duitku-payment/callback',
                callbackUrl: settingsMap['duitku_callback_url'] || 'https://omzetin.web.id/functions/v1/duitku-payment/callback',
                returnUrl: settingsMap['duitku_return_url'] || 'https://omzetin.web.id/dashboard?tab=billing&status=success',
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes cache
        retry: false, // Don't retry on auth errors
    });
}

// Custom hook for fetching all stores with caching
export function useAdminStores() {
    return useQuery({
        queryKey: ['admin', 'stores'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stores')
                .select(`
          *,
          store_members (
            user_id,
            role
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes cache
    });
}

// Custom hook for fetching subscription plans with caching
export function useAdminSubscriptionPlans() {
    return useQuery({
        queryKey: ['admin', 'subscriptionPlans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 10, // 10 minutes - plans don't change often
        gcTime: 1000 * 60 * 30, // 30 minutes cache
    });
}

// Custom hook for fetching transactions with caching
export function useAdminTransactions() {
    return useQuery({
        queryKey: ['admin', 'transactions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscription_transactions')
                .select(`
          *,
          stores (name, slug),
          subscription_plans (name)
        `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes - transactions may update more often
        gcTime: 1000 * 60 * 10, // 10 minutes cache
    });
}
