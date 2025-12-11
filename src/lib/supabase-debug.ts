// Debug script to test Supabase connection and data access
import { supabase } from './lib/supabase';

async function debugSupabase() {
  console.log('=== Supabase Debug Information ===');
  
  // Test 1: Basic connection
  try {
    const { data: test, error: testError } = await supabase
      .from('stores')
      .select('id, name')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed:', testError);
    } else {
      console.log('✅ Connection successful');
      console.log('Sample data from stores table:', test);
    }
  } catch (e) {
    console.error('❌ Connection test error:', e);
  }
  
  // Test 2: Check if we can list all tables 
  try {
    // Check if we can access the storage buckets which is often allowed
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    console.log('Storage buckets:', buckets, 'Error:', bucketError);
  } catch (e) {
    console.log('Storage access error (this is normal if no permissions):', e.message);
  }
  
  // Test 3: Try to get session info
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Current session:', session ? 'Active' : 'None', 'Error:', sessionError);
  } catch (e) {
    console.log('Session check error:', e.message);
  }
  
  // Test 4: Check if we can access public schema
  try {
    const { data, error } = await supabase.rpc('get_user_store_ids');
    console.log('User store IDs (from RPC):', data, 'Error:', error);
  } catch (e) {
    console.log('RPC call error (expected if not authenticated):', e.message);
  }
  
  console.log('=== End Debug Information ===');
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).debugSupabase = debugSupabase;
}

export { debugSupabase };