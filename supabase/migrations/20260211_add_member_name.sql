-- =====================================================
-- Member Details & Username
-- =====================================================
-- 1. Add `name` column to store_members
-- 2. Update RPCs to handle name (create, get, update)
-- =====================================================

-- 1. Add name column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_members' AND column_name = 'name') THEN
        ALTER TABLE store_members ADD COLUMN name TEXT;
    END IF;
END $$;


-- 2. Update create_team_member to accept name
DROP FUNCTION IF EXISTS public.create_team_member(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_team_member(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'cashier',
    p_name TEXT DEFAULT NULL
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
    v_final_name TEXT;
BEGIN
    -- Set default name from email if not provided
    v_final_name := COALESCE(p_name, split_part(p_email, '@', 1));

    -- Validate caller's store and role
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

    -- Validate role
    IF p_role NOT IN ('admin', 'cashier', 'staff') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role tidak valid.');
    END IF;

    -- Validate password length
    IF length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter.');
    END IF;

    -- Check if user already exists
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
        INSERT INTO store_members (store_id, user_id, role, name)
        VALUES (v_store_id, v_existing_user_id, p_role, v_final_name);

        RETURN jsonb_build_object(
            'success', true,
            'message', 'User sudah terdaftar, langsung ditambahkan sebagai ' || p_role || '.',
            'user_id', v_existing_user_id::TEXT
        );
    END IF;

    -- Create new auth user
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
        now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('team_member', true, 'invited_by', auth.uid()::TEXT, 'full_name', v_final_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- Insert into auth.identities
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

    -- Add to store_members
    INSERT INTO store_members (store_id, user_id, role, name)
    VALUES (v_store_id, v_new_user_id, p_role, v_final_name);

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


-- 3. Update get_store_members to return name
DROP FUNCTION IF EXISTS public.get_store_members();

CREATE OR REPLACE FUNCTION public.get_store_members()
RETURNS TABLE (
  out_user_id UUID,
  out_email TEXT,
  out_role TEXT,
  out_name TEXT,
  out_joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  -- Get store_id for current user
  SELECT sm.store_id INTO v_store_id
  FROM store_members sm
  WHERE sm.user_id = auth.uid()
  LIMIT 1;

  RETURN QUERY
  SELECT 
    sm.user_id,
    au.email::TEXT,
    sm.role,
    COALESCE(sm.name, split_part(au.email, '@', 1))::TEXT,
    sm.created_at
  FROM store_members sm
  JOIN auth.users au ON sm.user_id = au.id
  WHERE sm.store_id = v_store_id
  ORDER BY sm.created_at DESC;
END;
$$;


-- 4. Create update_store_member RPC (Edit Name/Role/Password)
DROP FUNCTION IF EXISTS public.update_store_member(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_store_member(
    p_user_id UUID,
    p_role TEXT,
    p_name TEXT,
    p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_store_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
    v_encrypted_pw TEXT;
BEGIN
    -- Get caller's store and role
    SELECT store_id, role INTO v_store_id, v_caller_role
    FROM store_members
    WHERE user_id = auth.uid()
    LIMIT 1;

    -- Validate caller
    IF v_store_id IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hanya Owner/Admin yang dapat mengedit member.');
    END IF;

    -- Get target member's role
    SELECT role INTO v_target_role
    FROM store_members
    WHERE store_id = v_store_id AND user_id = p_user_id;

    IF v_target_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Member tidak ditemukan.');
    END IF;

    -- Prevent modifying oneself's role if owner (to avoid lockout)
    IF p_user_id = auth.uid() AND v_caller_role = 'owner' AND p_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Owner tidak dapat menurunkan role sendiri.');
    END IF;

    -- Prevent Admin from modifying Owner
    IF v_caller_role = 'admin' AND v_target_role = 'owner' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Admin tidak dapat mengedit Owner.');
    END IF;

    -- Update member name & role
    UPDATE store_members
    SET role = p_role,
        name = p_name,
        updated_at = now()
    WHERE store_id = v_store_id AND user_id = p_user_id;

    -- Update password if provided
    IF p_password IS NOT NULL AND length(p_password) >= 6 THEN
        v_encrypted_pw := crypt(p_password, gen_salt('bf'));
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            updated_at = now()
        WHERE id = p_user_id;
    ELSIF p_password IS NOT NULL AND length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password minimal 6 karakter.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Data member berhasil diperbarui.');

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_team_member(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_member(UUID, TEXT, TEXT, TEXT) TO authenticated;
