// Simple test to verify Supabase connection
import { supabase, testConnection } from './lib/supabase';

async function runTest() {
  console.log('Testing Supabase connection...');
  
  // First, test the basic connection
  const result = await testConnection();
  
  if (result.success) {
    console.log('✅ Basic connection test passed');
    
    // Try to perform a simple query
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .limit(1);
        
      if (error) {
        console.error('❌ Query failed:', error.message);
      } else {
        console.log('✅ Query successful:', data);
      }
    } catch (err) {
      console.error('❌ Query error:', err);
    }
  }
}

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('load', runTest);
} else if (typeof module !== 'undefined' && module.exports) {
  // Node environment
  runTest().catch(console.error);
}