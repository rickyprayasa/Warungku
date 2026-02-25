-- =====================================================
-- Add must_change_password tracking
-- =====================================================

-- 1. Update store_members mapping to track if the user must change password
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_members' AND column_name = 'must_change_password') THEN
        ALTER TABLE store_members ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update create_team_member to accept must_change_password flag
DROP FUNCTION IF EXISTS public.create_team_member(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_team_member(TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.create_team_member(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'cashier',
    p_name TEXT DEFAULT NULL,
    p_must_change_password BOOLEAN DEFAULT FALSE
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
        INSERT INTO store_members (store_id, user_id, role, name, must_change_password)
        VALUES (v_store_id, v_existing_user_id, p_role, v_final_name, p_must_change_password);

        -- If must_change_password is true, update the password of the existing user since they are being invited again with a temporary password
        IF p_must_change_password THEN
            v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));
            UPDATE auth.users
            SET encrypted_password = v_encrypted_pw,
                updated_at = now()
            WHERE id = v_existing_user_id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'User sudah terdaftar, langsung ditambahkan sebagai ' || p_role || '.',
            'user_id', v_existing_user_id::TEXT
        );
    END IF;

    -- Create new auth user
    v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));
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
    INSERT INTO store_members (store_id, user_id, role, name, must_change_password)
    VALUES (v_store_id, v_new_user_id, p_role, v_final_name, p_must_change_password);

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

GRANT EXECUTE ON FUNCTION public.create_team_member(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- 3. Create function to clear must_change_password flag
DROP FUNCTION IF EXISTS public.clear_must_change_password();

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    UPDATE store_members
    SET must_change_password = FALSE,
        updated_at = now()
    WHERE user_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Password change flag cleared.');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
