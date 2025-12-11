// Debug script to check environment variables
console.log('=== Environment Variables Debug ===');
console.log('process.env.VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('process.env.VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '[REDACTED]' : 'UNDEFINED');
console.log('import.meta.env.VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('import.meta.env.VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '[REDACTED]' : 'UNDEFINED');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MODE:', process.env.MODE);
console.log('===============================');