-- RPC Function: Get User Statistics
-- Returns statistics for a specific user: products, sales, and purchases
-- Used in admin user detail view

CREATE OR REPLACE FUNCTION get_user_statistics(
    p_user_id UUID
)
RETURNS TABLE (
    product_count BIGINT,
    sales_count BIGINT,
    purchases_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if executing user is an admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Return statistics for the user
    RETURN QUERY
    SELECT
        COALESCE((SELECT COUNT(*) FROM products WHERE store_id = (SELECT store_id FROM store_members WHERE user_id = p_user_id LIMIT 1)), 0) AS product_count,
        COALESCE((SELECT COUNT(*) FROM sales WHERE store_id = (SELECT store_id FROM store_members WHERE user_id = p_user_id LIMIT 1)), 0) AS sales_count,
        COALESCE((SELECT COUNT(*) FROM sales WHERE customer_id = p_user_id), 0) AS purchases_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_statistics(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_user_statistics IS 'Returns statistics for a specific user including products, sales, and purchases';
