-- =============================================
-- TESTIMONIALS TABLE
-- =============================================
-- Deskripsi: Table to store user testimonials for the landing page

CREATE TYPE testimonial_status AS ENUM ('pending', 'approved', 'rejected');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  status testimonial_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- 1. Public can view APPROVED testimonials (for Landing Page)
CREATE POLICY "Public can view approved testimonials"
  ON testimonials FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- 2. Users can view their OWN testimonials (regardless of status)
CREATE POLICY "Users can view their own testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Users can insert their OWN testimonials
CREATE POLICY "Users can insert their own testimonials"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can update their OWN testimonials (reset status to pending on update)
CREATE POLICY "Users can update their own testimonials"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Users can delete their OWN testimonials
CREATE POLICY "Users can delete their own testimonials"
  ON testimonials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Admins can view ALL testimonials
CREATE POLICY "Admins can view all testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (is_admin());

-- 7. Admins can update ANY testimonial (for approval/rejection)
CREATE POLICY "Admins can update all testimonials"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (is_admin());

-- 8. Admins can delete ANY testimonial
CREATE POLICY "Admins can delete all testimonials"
  ON testimonials FOR DELETE
  TO authenticated
  USING (is_admin());

-- Create trigger to update updated_at
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTIMONIALS TABLE CREATED';
  RAISE NOTICE '========================================';
END $$;
