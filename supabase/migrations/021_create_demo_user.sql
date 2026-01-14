-- Create Demo Account if not exists
-- Email: ryussquall@gmail.com
-- Password: omzetindemo
-- This script creates a demo user with super_admin role

-- =============================================
-- CHECK IF DEMO USER ALREADY EXISTS
-- =============================================
DO $$
DECLARE
    v_demo_user_id UUID;
    v_demo_exists BOOLEAN;
BEGIN
    -- Check if demo user exists
    SELECT id INTO v_demo_user_id
    FROM auth.users
    WHERE email = 'ryussquall@gmail.com'
    LIMIT 1;

    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'ryussquall@gmail.com'
    ) INTO v_demo_exists;

    -- Only create if not exists
    IF NOT v_demo_exists THEN
        -- Log for debugging
        RAISE NOTICE 'Demo user does not exist. Creating...';

        -- Create auth user using password hasher
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_user_meta_data,
            created_at,
            updated_at,
            last_sign_in_at
        )
        VALUES (
            gen_random_uuid(),
            'ryussquall@gmail.com',
            crypt('omzetindemo', gen_salt('bf')),
            NOW(),
            NOW(),
            NULL,
            '{"role": "super_admin", "is_demo": true}',
            NOW(),
            NOW()
        );

        -- Create a demo store for the demo user
        -- Using the helper function from migration 013
        -- If store already exists, we'll just add membership
        DECLARE
            v_store_id UUID;
        v_member_id UUID;
        BEGIN
            -- Check for existing store
            SELECT id INTO v_store_id
            FROM stores
            WHERE slug = 'demo-store'
            LIMIT 1;

            IF NOT FOUND THEN
                -- Create store
                INSERT INTO stores (
                    id,
                    name,
                    slug,
                    plan,
                    created_at,
                    updated_at,
                    cart_enabled,
                    settings
                )
                VALUES (
                    gen_random_uuid(),
                    'Demo Store',
                    'demo-store',
                    'demo',
                    NOW(),
                    NOW(),
                    true,
                    '{"currency": "IDR", "language": "id"}'::jsonb
                );

                -- Get the created store ID
                SELECT id INTO v_store_id
                FROM stores
                WHERE slug = 'demo-store'
                LIMIT 1;
            END IF;

            -- Create store membership
            SELECT gen_random_uuid() INTO v_member_id;

            INSERT INTO store_members (
                id,
                store_id,
                user_id,
                role,
                created_at
            )
            SELECT
                v_member_id,
                v_store_id,
                (SELECT id FROM auth.users WHERE email = 'ryussquall@gmail.com' LIMIT 1),
                'admin',
                NOW();

            RAISE NOTICE 'Demo user created successfully! Email: ryussquall@gmail.com, Password: omzetindemo';
        ELSE
            RAISE NOTICE 'Demo user already exists. Skipping creation.';
        END IF;
    ELSE
        RAISE NOTICE 'Demo user already exists. Skipping creation.';
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE auth.users IS 'Demo user: ryussquall@gmail.com / omzetindemo with super_admin role';
