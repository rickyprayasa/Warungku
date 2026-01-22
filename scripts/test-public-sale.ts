/**
 * Test RPC function create_public_sale
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

async function testPublicSale() {
  console.log('='.repeat(60));
  console.log('TESTING PUBLIC SALE RPC FUNCTION');
  console.log('='.repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Check if function exists
  console.log('\n1. Testing if function exists...');
  try {
    const { data, error } = await supabase.rpc('create_public_sale', {
      sale_data: {
        store_id: '00000000-0000-0000-0000-000000000000', // Invalid ID
        items: [],
        notes: 'test'
      }
    });

    if (error) {
      console.log('   Error response:', error);
      if (error.message.includes('does not exist')) {
        console.error('   ❌ FUNCTION DOES NOT EXIST');
        console.log('   → Run SQL from: supabase/migrations/033_create_public_sales_rpc_working.sql');
        return;
      } else if (error.message.includes('Store not found')) {
        console.log('   ✅ FUNCTION EXISTS! (Store not found is expected)');
      } else {
        console.log('   ⚠️  Other error:', error.message);
      }
    } else {
      console.log('   Response:', data);
    }
  } catch (e: any) {
    console.error('   Exception:', e.message);
    return;
  }

  // Test 2: Test with real data (need valid store_id and product_id)
  console.log('\n2. To test with real data, you need:');
  console.log('   - A valid store_id from your stores table');
  console.log('   - A valid product_id from that store');
  console.log('\n   Example test data:');
  console.log(`
    await supabase.rpc('create_public_sale', {
      sale_data: {
        store_id: 'YOUR_STORE_ID_HERE',
        items: [{
          productId: 'YOUR_PRODUCT_ID_HERE',
          productName: 'Test Product',
          quantity: 1,
          price: 10000
        }],
        notes: 'Test sale'
      }
    });
  `);

  // Test 3: Check function grants
  console.log('\n3. Checking function info...');
  try {
    // This query checks if the function exists and has security definer
    const { data, error } = await supabase
      .rpc('create_public_sale', {
        sale_data: {
          store_id: 'test',
          items: [],
          notes: 'test'
        }
      });

    // We expect an error, but we're checking if it's accessible
    if (error) {
      if (error.message.includes('permission denied')) {
        console.error('   ❌ PERMISSION DENIED - anon role cannot execute function');
        console.log('   → Run: GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO anon;');
      } else if (error.message.includes('Store not found') || error.message.includes('invalid uuid')) {
        console.log('   ✅ Function is accessible to anon role');
      }
    }
  } catch (e: any) {
    console.log('   Skip:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

testPublicSale().catch(console.error);
