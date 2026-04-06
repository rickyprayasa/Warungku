const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function test() {
    const { data, error } = await supabasePublic.from('products').select('*').eq('store_id', 'e6fecae2-9c84-4929-a76b-c2ff766f0e26').order('name');
    console.log('Error:', error);
    console.log(JSON.stringify(data, null, 2));
}
test();
