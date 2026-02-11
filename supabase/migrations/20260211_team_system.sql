-- =====================================================
-- Team System: RPC Functions for Store Members
-- =====================================================
-- This migration creates the RPC functions needed for
-- the Team System features (invite, remove, list members).
-- Run this in your Supabase SQL Editor.
-- =====================================================

-- Drop existing functions first (required if return type changed)
DROP FUNCTION IF EXISTS public.invite_store_member(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.remove_store_member(UUID);
DROP FUNCTION IF EXISTS public.get_store_members();

-- 1. invite_store_member: Add a user to a store by email
CREATE OR REPLACE FUNCTION public.invite_store_member(
    p_email TEXT,
    p_role TEXT DEFAULT 'cashier'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_store_id UUID;
    v_caller_role TEXT;
BEGIN
    -- Get the caller's store and role
    SELECT sm.store_id, sm.role INTO v_store_id, v_caller_role
    FROM public.store_members sm
    WHERE sm.user_id = auth.uid()
    ORDER BY sm.created_at ASC
    LIMIT 1;

    IF v_store_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Anda tidak memiliki toko.');
    END IF;

    -- Only owner or admin can invite
    IF v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object('success', false, 'message', 'Hanya Owner atau Admin yang dapat menambahkan member.');
    END IF;

    -- Validate role
    IF p_role NOT IN ('admin', 'cashier', 'staff') THEN
        RETURN json_build_object('success', false, 'message', 'Role tidak valid. Pilih: admin, cashier, atau staff.');
    END IF;

    -- Find user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User dengan email ' || p_email || ' tidak ditemukan. Pastikan mereka sudah mendaftar.');
    END IF;

    -- Check if already a member
    IF EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_id = v_store_id AND user_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'message', 'User ini sudah menjadi member toko.');
    END IF;

    -- Insert member
    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (v_store_id, v_user_id, p_role);

    RETURN json_build_object('success', true, 'message', 'Member berhasil ditambahkan.');
END;
$$;

-- 2. remove_store_member: Remove a user from a store
CREATE OR REPLACE FUNCTION public.remove_store_member(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    -- Get the caller's store and role
    SELECT sm.store_id, sm.role INTO v_store_id, v_caller_role
    FROM public.store_members sm
    WHERE sm.user_id = auth.uid()
    ORDER BY sm.created_at ASC
    LIMIT 1;

    IF v_store_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Anda tidak memiliki toko.');
    END IF;

    -- Only owner or admin can remove
    IF v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN json_build_object('success', false, 'message', 'Hanya Owner atau Admin yang dapat menghapus member.');
    END IF;

    -- Cannot remove yourself
    IF p_user_id = auth.uid() THEN
        RETURN json_build_object('success', false, 'message', 'Anda tidak dapat menghapus diri sendiri.');
    END IF;

    -- Check target's role - admin cannot remove owner
    SELECT role INTO v_target_role
    FROM public.store_members
    WHERE store_id = v_store_id AND user_id = p_user_id;

    IF v_target_role IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'User bukan member toko ini.');
    END IF;

    IF v_target_role = 'owner' THEN
        RETURN json_build_object('success', false, 'message', 'Tidak dapat menghapus Owner toko.');
    END IF;

    -- Delete member
    DELETE FROM public.store_members
    WHERE store_id = v_store_id AND user_id = p_user_id;

    RETURN json_build_object('success', true, 'message', 'Member berhasil dihapus.');
END;
$$;

-- 3. get_store_members: List all members of the caller's store
CREATE OR REPLACE FUNCTION public.get_store_members()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role TEXT,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID;
BEGIN
    -- Get the caller's store
    SELECT sm.store_id INTO v_store_id
    FROM public.store_members sm
    WHERE sm.user_id = auth.uid()
    ORDER BY sm.created_at ASC
    LIMIT 1;

    IF v_store_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        sm.user_id,
        u.email::TEXT,
        sm.role::TEXT,
        sm.created_at AS joined_at
    FROM public.store_members sm
    JOIN auth.users u ON u.id = sm.user_id
    WHERE sm.store_id = v_store_id
    ORDER BY
        CASE sm.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            ELSE 3
        END,
        sm.created_at ASC;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.invite_store_member(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_store_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_members() TO authenticated;
