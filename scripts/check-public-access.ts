/**
 * Debug Public Access Issues
 * Run this script to check if public access is working
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

async function checkPublicAccess() {
  console.log('='.repeat(50));
  console.log('CHECKING PUBLIC ACCESS');
  console.log('='.repeat(50));

  // Create client with ANON key (simulating public user)
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('\n1. Testing public access to STORES table...');
  const { data: stores, error: storesError } = await supabaseAnon
    .from('stores')
    .select('id, name, slug')
    .limit(5);

  if (storesError) {
    console.error('   ❌ FAILED:', storesError.message);
    console.error('   Code:', storesError.code);
    console.error('   Details:', storesError.details);
    console.error('   Hint:', storesError.hint);
  } else {
    console.log('   ✅ SUCCESS: Found', stores?.length || 0, 'stores');
    if (stores && stores.length > 0) {
      console.log('   Sample:', stores[0]);
    }
  }

  console.log('\n2. Testing public access to PRODUCTS table...');
  const { data: products, error: productsError } = await supabaseAnon
    .from('products')
    .select('id, name, store_id')
    .limit(5);

  if (productsError) {
    console.error('   ❌ FAILED:', productsError.message);
    console.error('   Code:', productsError.code);
    console.error('   Details:', productsError.details);
    console.error('   Hint:', productsError.hint);
  } else {
    console.log('   ✅ SUCCESS: Found', products?.length || 0, 'products');
    if (products && products.length > 0) {
      console.log('   Sample:', products[0]);
    }
  }

  console.log('\n3. Checking RLS policies on STORES table...');
  // This requires service role key
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (SUPABASE_SERVICE_KEY) {
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: policies, error: policiesError } = await supabaseService
      .rpc('exec_sql', {
        sql: `
          SELECT tablename, policyname, roles, cmd
          FROM pg_policies
          WHERE tablename IN ('stores', 'products')
          ORDER BY tablename, policyname
        `
      });

    if (!policiesError && policies) {
      console.log('   Current policies:');
      console.log(policies);
    } else {
      console.log('   Could not fetch policies (this is OK)');
    }
  } else {
    console.log('   Skipping (no service key)');
  }

  console.log('\n' + '='.repeat(50));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(50));

  if (storesError || productsError) {
    console.log('\n🔧 FIX SUGGESTIONS:');
    console.log('\n1. Check if RLS is enabled:');
    console.log('   SELECT tablename, rowsecurity');
    console.log('   FROM pg_tables');
    console.log('   WHERE tablename IN (\'stores\', \'products\');');
    console.log('\n2. Check current policies:');
    console.log('   SELECT * FROM pg_policies');
    console.log('   WHERE tablename IN (\'stores\', \'products\');');
    console.log('\n3. Re-run the SQL migration in Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/ysujcewkfhbenxtaguuw/sql');
  }
}

checkPublicAccess().catch(console.error);
