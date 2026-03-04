-- Create cron_logs table for tracking keep-alive cron job pings
CREATE TABLE IF NOT EXISTS public.cron_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name TEXT NOT NULL DEFAULT 'keep-alive',
    status TEXT NOT NULL DEFAULT 'success', -- 'success' or 'error'
    response_time_ms INTEGER,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by date
CREATE INDEX IF NOT EXISTS idx_cron_logs_created_at ON public.cron_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for the cron API)
CREATE POLICY "Service role can manage cron_logs"
    ON public.cron_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read (for admin CMS)
CREATE POLICY "Authenticated users can read cron_logs"
    ON public.cron_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Auto-cleanup: delete logs older than 30 days (optional, run manually or via pg_cron)
-- DELETE FROM public.cron_logs WHERE created_at < NOW() - INTERVAL '30 days';
