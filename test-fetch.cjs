const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function test() {
  const storeId = "2feec27e-301e-4fe7-9a0e-4875817b5760"; 
  console.log('Fetching for store:', storeId);
  const { data, error } = await supabasePublic.from('products').select('*').eq('store_id', storeId).order('name');
  if (error) console.error('Error:', error);
  else console.log('Products:', data ? data.length : 0);
}
test();
