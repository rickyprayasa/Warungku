-- RPC Function: Get Analytics Data
-- Returns comprehensive analytics data for the admin dashboard

CREATE OR REPLACE FUNCTION get_analytics_data(
    p_days_range INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_revenue BIGINT,
    revenue_growth NUMERIC,
    active_users INTEGER,
    user_growth NUMERIC,
    total_transactions INTEGER,
    transaction_growth NUMERIC,
    avg_order_value NUMERIC,
    order_value_growth NUMERIC,
    top_stores JSON,
    revenue_by_plan JSON,
    user_activity JSON,
    signups_trend JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_period_start TIMESTAMP;
    v_previous_period_start TIMESTAMP;
    v_current_revenue BIGINT;
    v_previous_revenue BIGINT;
    v_current_users INTEGER;
    v_previous_users INTEGER;
    v_current_transactions INTEGER;
    v_previous_transactions INTEGER;
    v_current_avg_order NUMERIC;
    v_previous_avg_order NUMERIC;
    v_top_stores JSON;
    v_revenue_by_plan JSON;
    v_user_activity JSON;
    v_signups_trend JSON;
BEGIN
    -- Calculate date ranges
    v_current_period_start := CURRENT_DATE - INTERVAL '1 day' * p_days_range;
    v_previous_period_start := CURRENT_DATE - INTERVAL '1 day' * (p_days_range * 2);

    -- Get revenue metrics
    SELECT COALESCE(SUM(s.total), 0)
    INTO v_current_revenue
    FROM sales s
    WHERE s.created_at >= v_current_period_start;

    SELECT COALESCE(SUM(s.total), 0)
    INTO v_previous_revenue
    FROM sales s
    WHERE s.created_at >= v_previous_period_start
      AND s.created_at < v_current_period_start;

    -- Get user metrics (active users = users who logged in or performed actions)
    SELECT COUNT(DISTINCT sm.user_id)
    INTO v_current_users
    FROM store_members sm
    JOIN stores st ON sm.store_id = st.id
    WHERE st.updated_at >= v_current_period_start;

    SELECT COUNT(DISTINCT sm.user_id)
    INTO v_previous_users
    FROM store_members sm
    JOIN stores st ON sm.store_id = st.id
    WHERE st.updated_at >= v_previous_period_start
      AND st.updated_at < v_current_period_start;

    -- Get transaction metrics
    SELECT COUNT(*)
    INTO v_current_transactions
    FROM sales s
    WHERE s.created_at >= v_current_period_start;

    SELECT COUNT(*)
    INTO v_previous_transactions
    FROM sales s
    WHERE s.created_at >= v_previous_period_start
      AND s.created_at < v_current_period_start;

    -- Get average order value
    SELECT COALESCE(AVG(s.total), 0)
    INTO v_current_avg_order
    FROM sales s
    WHERE s.created_at >= v_current_period_start;

    SELECT COALESCE(AVG(s.total), 0)
    INTO v_previous_avg_order
    FROM sales s
    WHERE s.created_at >= v_previous_period_start
      AND s.created_at < v_current_period_start;

    -- Get top stores by revenue
    SELECT json_agg(json_build_object(
        'name', store_data.name,
        'slug', store_data.slug,
        'revenue', COALESCE(store_data.revenue, 0),
        'transactions', COALESCE(store_data.transaction_count, 0)
    ))
    INTO v_top_stores
    FROM (
        SELECT
            st.id,
            st.name,
            st.slug,
            SUM(s.total) AS revenue,
            COUNT(*) AS transaction_count
        FROM stores st
        LEFT JOIN sales s ON s.store_id = st.id
            AND s.created_at >= v_current_period_start
        GROUP BY st.id, st.name, st.slug
        ORDER BY revenue DESC NULLS LAST
        LIMIT 5
    ) store_data;

    -- Get revenue by plan
    SELECT json_agg(json_build_object(
        'plan', plan_data.plan,
        'value', COALESCE(plan_data.revenue, 0),
        'count', COALESCE(plan_data.store_count, 0)
    ))
    INTO v_revenue_by_plan
    FROM (
        SELECT
            st.plan,
            SUM(s.total) AS revenue,
            COUNT(DISTINCT st.id) AS store_count
        FROM stores st
        LEFT JOIN sales s ON s.store_id = st.id
            AND s.created_at >= v_current_period_start
        GROUP BY st.plan
        ORDER BY revenue DESC NULLS LAST
    ) plan_data;

    -- Get user activity for last 7 days
    SELECT json_agg(json_build_object(
        'date', activity_data.date,
        'active', COALESCE(activity_data.active_count, 0),
        'signups', COALESCE(activity_data.signup_count, 0)
    ))
    INTO v_user_activity
    FROM (
        SELECT
            CURRENT_DATE - (n || ' days')::INTERVAL AS date,
            COUNT(DISTINCT sm.user_id) AS active_count,
            COUNT(*) AS signup_count
        FROM generate_series(0, 6) AS n
        LEFT JOIN store_members sm ON sm.created_at >= (CURRENT_DATE - (n || ' days')::INTERVAL)
            AND sm.created_at < (CURRENT_DATE - ((n - 1) || ' days')::INTERVAL)
        GROUP BY n
        ORDER BY n DESC
    ) activity_data;

    -- Get signups trend
    SELECT json_agg(json_build_object(
        'date', signup_data.date,
        'count', COALESCE(signup_data.signup_count, 0)
    ))
    INTO v_signups_trend
    FROM (
        SELECT
            DATE(sm.created_at) AS date,
            COUNT(*) AS signup_count
        FROM store_members sm
        WHERE sm.created_at >= v_current_period_start
        GROUP BY DATE(sm.created_at)
        ORDER BY date ASC
    ) signup_data;

    RETURN QUERY SELECT
        v_current_revenue,
        CASE WHEN v_previous_revenue = 0 THEN 0
             ELSE ((v_current_revenue - v_previous_revenue)::NUMERIC / v_previous_revenue) * 100
        END,
        v_current_users,
        CASE WHEN v_previous_users = 0 THEN 0
             ELSE ((v_current_users - v_previous_users)::NUMERIC / v_previous_users) * 100
        END,
        v_current_transactions,
        CASE WHEN v_previous_transactions = 0 THEN 0
             ELSE ((v_current_transactions - v_previous_transactions)::NUMERIC / v_previous_transactions) * 100
        END,
        v_current_avg_order,
        CASE WHEN v_previous_avg_order = 0 THEN 0
             ELSE ((v_current_avg_order - v_previous_avg_order)::NUMERIC / v_previous_avg_order) * 100
        END,
        COALESCE(v_top_stores, '[]'::JSON),
        COALESCE(v_revenue_by_plan, '[]'::JSON),
        COALESCE(v_user_activity, '[]'::JSON),
        COALESCE(v_signups_trend, '[]'::JSON);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_analytics_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_data(INTEGER) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_analytics_data IS 'Returns comprehensive analytics data including revenue, users, transactions, and trends for the admin dashboard';
