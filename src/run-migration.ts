import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260225_admin_delete_auth_user.sql'), 'utf8');

    console.log('Running migration...');

    // Note: DDL commands cannot be executed directly from API in Supabase
    // If the user hasn't provided the CLI link, we might have to use a workaround or tell them to run it
    // Let's try running it via postgres functions if available
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
        console.error('Failed to run migration:', error.message);
        // If exec_sql doesn't exist, we can't run DDL commands from the client
        console.log('----------------------------------------------------');
        console.log('You must run this SQL in your Supabase SQL Editor:');
        console.log(sql);
        console.log('----------------------------------------------------');
    } else {
        console.log('Migration successful', data);
    }
}

run();
