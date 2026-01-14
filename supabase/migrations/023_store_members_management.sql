-- Function to add a member by email
CREATE OR REPLACE FUNCTION add_store_member_by_email(
  p_email TEXT,
  p_role TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_store_id UUID;
  v_current_role TEXT;
BEGIN
  -- Get current user's store and role
  SELECT store_id, role INTO v_store_id, v_current_role
  FROM store_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_store_id IS NULL OR v_current_role != 'owner' THEN
    RAISE EXCEPTION 'Only store owners can add members';
  END IF;

  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User dengan email tersebut belum terdaftar di Omzetin');
  END IF;

  -- Insert into store_members
  INSERT INTO store_members (store_id, user_id, role)
  VALUES (v_store_id, v_user_id, p_role);

  RETURN jsonb_build_object('success', true, 'message', 'Member berhasil ditambahkan');
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'User tersebut sudah menjadi member');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Function to get store members with emails
CREATE OR REPLACE FUNCTION get_store_members()
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
  -- Get store_id for current user
  SELECT store_id INTO v_store_id
  FROM store_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN QUERY
  SELECT 
    sm.user_id,
    au.email::TEXT,
    sm.role,
    sm.created_at
  FROM store_members sm
  JOIN auth.users au ON sm.user_id = au.id
  WHERE sm.store_id = v_store_id
  ORDER BY sm.created_at DESC;
END;
$$;

-- Function to remove a member
CREATE OR REPLACE FUNCTION remove_store_member(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id UUID;
  v_current_role TEXT;
BEGIN
  -- Get current user's store and role
  SELECT store_id, role INTO v_store_id, v_current_role
  FROM store_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_store_id IS NULL OR v_current_role != 'owner' THEN
    RAISE EXCEPTION 'Only store owners can remove members';
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Anda tidak bisa menghapus diri sendiri');
  END IF;

  DELETE FROM store_members
  WHERE store_id = v_store_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Member berhasil dihapus');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_store_member_by_email(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_members() TO authenticated;
GRANT EXECUTE ON FUNCTION remove_store_member(UUID) TO authenticated;
