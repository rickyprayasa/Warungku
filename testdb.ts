import { createClient } from 'npm:@supabase/supabase-js@2'
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ysujcewkfhbenxtaguuw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...';
// Wait, I can just use deno to run it locally but I need the anon key.
