-- RPC Function: Create User with Store
-- Allows admins to create new users with their stores from the admin panel

CREATE OR REPLACE FUNCTION create_user_with_store(
    p_email TEXT,
    p_password TEXT,
    p_store_name TEXT DEFAULT 'New Store',
    p_plan TEXT DEFAULT 'demo',
    p_role TEXT DEFAULT 'admin'
)
RETURNS TABLE (
    user_id TEXT,
    store_id TEXT,
    member_id TEXT,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_user_id TEXT;
    v_store_id TEXT;
    v_member_id TEXT;
    v_slug TEXT;
    v_attempt INT := 0;
    v_random_part TEXT;
BEGIN
    -- Check if email already exists in auth.users
    -- We'll let the auth.signUp handle this check
    
    -- Generate a unique slug
    LOOP
        v_attempt := v_attempt + 1;
        v_random_part := substr(md5(random()::text), 1, 8);
        v_slug := lower(regexp_replace(p_store_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || v_random_part;
        
        -- Check if slug is unique
        SELECT id INTO v_store_id FROM stores WHERE slug = v_slug LIMIT 1;
        
        EXIT WHEN v_store_id IS NULL OR v_attempt > 10;
    END LOOP;
    
    IF v_store_id IS NOT NULL THEN
        -- Use a timestamp-based slug as fallback
        v_slug := 'store-' || extract(epoch from now())::bigint;
    END IF;
    
    -- Note: This function assumes the auth user has already been created
    -- The frontend should call supabase.auth.signUp() first, then call this function
    
    -- Return error if no user context
    RETURN QUERY
    SELECT 
        NULL::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        FALSE,
        'Please create auth user first, then call create_store_for_user'
    LIMIT 1;
    
    RETURN;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            FALSE,
            'Error: ' || SQLERRM
        LIMIT 1;
END;
$$;

-- RPC Function: Create Store for User
-- Called after auth user is created
CREATE OR REPLACE FUNCTION create_store_for_user(
    p_user_id TEXT,
    p_store_name TEXT DEFAULT 'New Store',
    p_plan TEXT DEFAULT 'demo'
)
RETURNS TABLE (
    store_id TEXT,
    member_id TEXT,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store_id TEXT;
    v_member_id TEXT;
    v_slug TEXT;
    v_attempt INT := 0;
    v_random_part TEXT;
BEGIN
    -- Generate a unique slug
    LOOP
        v_attempt := v_attempt + 1;
        v_random_part := substr(md5(random()::text), 1, 8);
        v_slug := lower(regexp_replace(p_store_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || v_random_part;
        
        -- Check if slug is unique
        SELECT id INTO v_store_id FROM stores WHERE slug = v_slug LIMIT 1;
        
        EXIT WHEN v_store_id IS NULL OR v_attempt > 10;
    END LOOP;
    
    IF v_store_id IS NOT NULL THEN
        -- Use a timestamp-based slug as fallback
        v_slug := 'store-' || extract(epoch from now())::bigint;
    END IF;
    
    -- Create the store
    INSERT INTO stores (
        id,
        name,
        slug,
        plan,
        cart_enabled,
        settings,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid()::TEXT,
        p_store_name,
        v_slug,
        p_plan,
        false,
        '{}'::jsonb,
        now(),
        now()
    )
    RETURNING id INTO v_store_id;
    
    -- Create store member
    INSERT INTO store_members (
        store_id,
        user_id,
        role,
        created_at
    )
    VALUES (
        v_store_id,
        p_user_id,
        'admin',
        now()
    )
    RETURNING id INTO v_member_id;
    
    -- Return success
    RETURN QUERY
    SELECT 
        v_store_id,
        v_member_id,
        TRUE,
        'Store and member created successfully'
    LIMIT 1;
    
    RETURN;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            NULL::TEXT,
            NULL::TEXT,
            FALSE,
            'Error: ' || SQLERRM
        LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_with_store(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_store(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION create_store_for_user(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_store_for_user(TEXT, TEXT, TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION create_user_with_store IS 'Creates a new user with store (called from admin panel)';
COMMENT ON FUNCTION create_store_for_user IS 'Creates a store for an existing auth user (called after auth.signUp)';
