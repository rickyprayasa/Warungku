/**
 * Test if RPC function exists in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

async function testRPC() {
  console.log('='.repeat(50));
  console.log('TESTING RPC FUNCTION');
  console.log('='.repeat(50));

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Check if function exists by trying to call it with dummy data
  console.log('\n1. Testing if function exists...');
  try {
    const { data, error } = await supabase.rpc('create_public_sale', {
      sale_data: {
        store_id: '00000000-0000-0000-0000-000000000000', // Invalid ID on purpose
        items: [],
        notes: 'test'
      }
    });

    if (error) {
      console.log('   RPC Function response:', error);
      if (error.message.includes('does not exist')) {
        console.error('   ❌ FUNCTION DOES NOT EXIST - SQL needs to be run!');
      } else if (error.message.includes('Store not found')) {
        console.log('   ✅ FUNCTION EXISTS! (Store not found is expected with invalid ID)');
      } else {
        console.log('   ⚠️  Other error:', error.message);
      }
    } else {
      console.log('   ✅ Function called successfully');
      console.log('   Response:', data);
    }
  } catch (e: any) {
    console.error('   Exception:', e.message);
  }

  // Test 2: Check available RPC functions
  console.log('\n2. Listing all RPC functions...');
  try {
    // This won't work via anon client, but let's try
    const { data, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'create_public_sale')
      .maybeSingle();

    if (!error && data) {
      console.log('   ✅ Function found in pg_proc:', data);
    } else if (error) {
      console.log('   Cannot check pg_proc (expected):', error.message);
    }
  } catch (e: any) {
    console.log('   Skip:', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('TEST COMPLETE');
  console.log('='.repeat(50));

  console.log('\nIf function does not exist, run SQL from:');
  console.log('supabase/migrations/032_add_public_sales_rpc.sql');
}

testRPC().catch(console.error);
