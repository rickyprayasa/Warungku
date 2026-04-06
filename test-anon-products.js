const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function test() {
  const { data, error } = await supabasePublic.from('products').select('*').eq('store_id', '2feec27e-301e-4fe7-9a0e-4875817b5760').order('name');
  console.log('Error:', error);
  console.log('Data count:', data ? data.length : 0);
}
test();
