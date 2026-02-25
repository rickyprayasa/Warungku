-- =====================================================
-- Create create_global_user RPC for Admin CMS
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_global_user(
    p_email TEXT,
    p_password TEXT,
    p_must_change_password BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_caller_email TEXT;
    v_is_superadmin BOOLEAN;
    v_new_user_id UUID;
    v_existing_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    -- Check if caller is platform admin or super admin
    SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
    
    SELECT EXISTS (
        SELECT 1 FROM platform_admins WHERE email = v_caller_email
    ) OR v_caller_email = 'admin@rsquareidea.my.id' OR v_caller_email = 'tuneeca@gmail.com' INTO v_is_superadmin;
    
    IF NOT v_is_superadmin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tidak memiliki izin admin platform.');
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
        -- If user exists and we are forcing a password change
        IF p_must_change_password THEN
            v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));
            UPDATE auth.users
            SET encrypted_password = v_encrypted_pw,
                raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('must_change_password', true),
                updated_at = now()
            WHERE id = v_existing_user_id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'User sudah terdaftar di sistem. Password diperbarui.',
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
        jsonb_build_object('must_change_password', p_must_change_password),
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

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User platform baru berhasil dibuat.',
        'user_id', v_new_user_id::TEXT
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email sudah terdaftar.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_global_user(TEXT, TEXT, BOOLEAN) TO authenticated;
