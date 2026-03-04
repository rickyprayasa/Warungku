import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow GET requests (Vercel cron sends GET)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify the request is from Vercel Cron (optional security header)
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const startTime = Date.now();

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error('Missing Supabase environment variables');
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // 1. Ping the database with a simple query to keep it active
        const { data, error: pingError } = await supabase
            .from('stores')
            .select('id')
            .limit(1);

        const responseTime = Date.now() - startTime;

        if (pingError) {
            // Log the error but don't throw — we still want to record it
            console.error('[keep-alive] Ping failed:', pingError.message);

            await supabase.from('cron_logs').insert({
                job_name: 'keep-alive',
                status: 'error',
                response_time_ms: responseTime,
                details: {
                    error: pingError.message,
                    code: pingError.code,
                    timestamp: new Date().toISOString(),
                },
            });

            return res.status(500).json({
                status: 'error',
                message: pingError.message,
                response_time_ms: responseTime,
            });
        }

        // 2. Log the successful ping
        await supabase.from('cron_logs').insert({
            job_name: 'keep-alive',
            status: 'success',
            response_time_ms: responseTime,
            details: {
                stores_found: data?.length || 0,
                timestamp: new Date().toISOString(),
            },
        });

        // 3. Cleanup old logs (keep last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
            .from('cron_logs')
            .delete()
            .lt('created_at', thirtyDaysAgo);

        console.log(`[keep-alive] ✓ Ping successful in ${responseTime}ms`);

        return res.status(200).json({
            status: 'ok',
            message: 'Supabase is alive',
            response_time_ms: responseTime,
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        const responseTime = Date.now() - startTime;
        console.error('[keep-alive] Error:', err.message);

        return res.status(500).json({
            status: 'error',
            message: err.message,
            response_time_ms: responseTime,
        });
    }
}
