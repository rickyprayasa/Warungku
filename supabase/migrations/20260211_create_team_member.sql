-- =====================================================
-- Team System: Create Team Member with Account
-- =====================================================
-- This function allows store owners/admins to create
-- a new user account AND add them as a team member
-- in a single step. No separate registration needed.
-- =====================================================

-- Drop existing function if any
DROP FUNCTION IF EXISTS public.create_team_member(TEXT, TEXT, TEXT);

-- Create the function
CREATE OR REPLACE FUNCTION public.create_team_member(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'cashier'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_store_id UUID;
    v_caller_role TEXT;
    v_new_user_id UUID;
    v_existing_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    -- 1. Validate caller's store and role
    SELECT sm.store_id, sm.role INTO v_store_id, v_caller_role
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
    ORDER BY sm.created_at ASC
    LIMIT 1;

    IF v_store_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki toko.');
    END IF;

    IF v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hanya Owner atau Admin yang dapat menambahkan member.');
    END IF;

    -- 2. Validate role
    IF p_role NOT IN ('admin', 'cashier', 'staff') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role tidak valid.');
    END IF;

    -- 3. Validate password length
    IF length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter.');
    END IF;

    -- 4. Check if user already exists
    SELECT id INTO v_existing_user_id
    FROM auth.users
    WHERE email = lower(p_email);

    IF v_existing_user_id IS NOT NULL THEN
        -- User exists, check if already a member
        IF EXISTS (
            SELECT 1 FROM store_members
            WHERE store_id = v_store_id AND user_id = v_existing_user_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'User ini sudah menjadi member toko.');
        END IF;

        -- Add existing user as member
        INSERT INTO store_members (store_id, user_id, role)
        VALUES (v_store_id, v_existing_user_id, p_role);

        RETURN jsonb_build_object(
            'success', true,
            'message', 'User sudah terdaftar, langsung ditambahkan sebagai ' || p_role || '.',
            'user_id', v_existing_user_id::TEXT
        );
    END IF;

    -- 5. Create new auth user
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    v_new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_user_id,
        'authenticated',
        'authenticated',
        lower(p_email),
        v_encrypted_pw,
        now(),  -- Auto-confirm email
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('team_member', true, 'invited_by', auth.uid()::TEXT),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- Also insert into auth.identities (required by Supabase)
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_new_user_id,
        v_new_user_id,
        lower(p_email),
        jsonb_build_object('sub', v_new_user_id::TEXT, 'email', lower(p_email)),
        'email',
        now(),
        now(),
        now()
    );

    -- 6. Add to store_members
    INSERT INTO store_members (store_id, user_id, role)
    VALUES (v_store_id, v_new_user_id, p_role);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Akun berhasil dibuat dan ditambahkan sebagai ' || p_role || '.',
        'user_id', v_new_user_id::TEXT
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email sudah terdaftar.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_team_member(TEXT, TEXT, TEXT) TO authenticated;

-- Also ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
