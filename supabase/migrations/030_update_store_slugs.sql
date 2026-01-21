-- Migration: Update Store Slugs to Match Store Names
-- This migration updates all store slugs to match their store names

DO $$
DECLARE
  store_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  slug_exists INTEGER;
  counter INTEGER;
BEGIN
  -- Loop through all stores
  FOR store_record IN SELECT id, name FROM stores
  LOOP
    -- Generate base slug from store name
    base_slug := lower(trim(store_record.name));
    -- Replace non-alphanumeric characters with hyphens
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    -- Remove leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);

    -- Start with base slug
    final_slug := base_slug;
    counter := 0;

    -- Check if slug exists and make it unique if necessary
    LOOP
      SELECT COUNT(*) INTO slug_exists
      FROM stores
      WHERE slug = final_slug
        AND id != store_record.id;

      EXIT WHEN slug_exists = 0;

      -- If exists, append counter
      counter := counter + 1;
      final_slug := base_slug || '-' || counter::text;
    END LOOP;

    -- Update the store slug
    UPDATE stores
    SET slug = final_slug
    WHERE id = store_record.id;

    RAISE NOTICE 'Updated store % (%) slug to %', store_record.id, store_record.name, final_slug;
  END LOOP;
END $$;

-- Verify the update
SELECT id, name, slug FROM stores ORDER BY name;
