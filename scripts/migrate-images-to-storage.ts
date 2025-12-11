/**
 * Migrate Product Images from Base64 to Supabase Storage
 * 
 * This script:
 * 1. Fetches all products with base64 images
 * 2. Uploads each image to Supabase Storage
 * 3. Updates the product with the new public URL
 * 
 * Usage: npx tsx scripts/migrate-images-to-storage.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysujcewkfhbenxtaguuw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET_NAME = 'product-images';

async function main() {
  console.log('='.repeat(50));
  console.log('MIGRATE IMAGES TO SUPABASE STORAGE');
  console.log('='.repeat(50));

  if (!SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Step 1: Create bucket if not exists
  console.log('\n[1/4] Checking storage bucket...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });

    if (createError) {
      console.error('Failed to create bucket:', createError.message);
      process.exit(1);
    }
    console.log('  Created bucket:', BUCKET_NAME);
  } else {
    console.log('  Bucket exists:', BUCKET_NAME);
  }

  // Step 2: Fetch products with base64 images
  console.log('\n[2/4] Fetching products with base64 images...');
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, image_url, store_id')
    .like('image_url', 'data:%');

  if (fetchError) {
    console.error('Failed to fetch products:', fetchError.message);
    process.exit(1);
  }

  console.log(`  Found ${products?.length || 0} products with base64 images`);

  if (!products || products.length === 0) {
    console.log('\nNo images to migrate!');
    return;
  }

  // Step 3: Upload images
  console.log('\n[3/4] Uploading images to storage...');
  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const base64Data = product.image_url;
      if (!base64Data || !base64Data.startsWith('data:')) {
        continue;
      }

      // Parse base64
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.log(`  [SKIP] ${product.name}: Invalid base64 format`);
        failed++;
        continue;
      }

      const mimeType = matches[1];
      const base64Content = matches[2];
      const buffer = Buffer.from(base64Content, 'base64');

      // Determine file extension
      const ext = mimeType.split('/')[1] || 'jpg';
      const fileName = `${product.store_id}/${product.id}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        console.log(`  [FAIL] ${product.name}: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      // Update product with new URL
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: urlData.publicUrl })
        .eq('id', product.id);

      if (updateError) {
        console.log(`  [FAIL] ${product.name}: Failed to update - ${updateError.message}`);
        failed++;
        continue;
      }

      const sizeKB = Math.round(buffer.length / 1024);
      console.log(`  [OK] ${product.name} (${sizeKB}KB) -> ${fileName}`);
      success++;

    } catch (error: any) {
      console.log(`  [FAIL] ${product.name}: ${error.message}`);
      failed++;
    }
  }

  // Step 4: Summary
  console.log('\n[4/4] Migration Summary');
  console.log('='.repeat(50));
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${products.length}`);
  console.log('='.repeat(50));

  if (success > 0) {
    console.log('\nImages are now served from Supabase Storage CDN!');
    console.log(`URL format: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/[store_id]/[product_id].[ext]`);
  }
}

main().catch(console.error);
