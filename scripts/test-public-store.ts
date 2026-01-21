/**
 * Test Public Store Access
 * Simulates what happens when a public user visits a store URL
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

async function testPublicStore(slug: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('='.repeat(60));
  console.log(`TESTING PUBLIC ACCESS: /${slug}`);
  console.log('='.repeat(60));

  // Step 1: Fetch store by slug
  console.log('\n1. Fetching store by slug...');
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
    .eq('slug', slug)
    .single();

  if (storeError) {
    console.error('   ❌ FAILED to fetch store:', storeError.message);
    console.error('   Code:', storeError.code);
    console.error('   Hint:', storeError.hint);
    return;
  }

  console.log('   ✅ SUCCESS: Store found');
  console.log('   Store:', store?.name);
  console.log('   ID:', store?.id);
  console.log('   Slug:', store?.slug);

  // Step 2: Fetch products for this store
  console.log('\n2. Fetching products for this store...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store?.id)
    .eq('is_active', true);

  if (productsError) {
    console.error('   ❌ FAILED to fetch products:', productsError.message);
    console.error('   Code:', productsError.code);
    console.error('   Hint:', productsError.hint);
  } else {
    console.log(`   ✅ SUCCESS: Found ${products?.length || 0} active products`);
    if (products && products.length > 0) {
      console.log('   Sample products:');
      products.slice(0, 3).forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.name} - Rp${(p.price || 0).toLocaleString('id-ID')}`);
      });
    }
  }

  // Step 3: Try to fetch payment methods (from settings table)
  console.log('\n3. Fetching payment methods...');
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .eq('store_id', store?.id)
    .eq('key', 'payment_methods')
    .maybeSingle();

  if (settingsError) {
    console.error('   ❌ FAILED to fetch settings:', settingsError.message);
    console.error('   Code:', settingsError.code);
  } else {
    console.log('   ✅ Settings fetched');
    if (settings?.value) {
      try {
        const methods = JSON.parse(settings.value);
        console.log('   Payment methods:', methods);
      } catch {
        console.log('   Payment methods: (parse error)');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n✅ URL http://localhost:3001/${slug} should work!`);
  console.log(`✅ URL https://omzetin.web.id/${slug} should work!\n`);
}

// Get slug from command line
const slug = process.argv[2] || 'warungku';
testPublicStore(slug).catch(console.error);
