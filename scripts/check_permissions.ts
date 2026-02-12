
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysujcewkfhbenxtaguuw.supabase.co';
// using service role key
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWpjZXdrZmhiZW54dGFndXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3NTczMiwiZXhwIjoyMDc5NzUxNzMyfQ.OevJPUKIuxC4UtukyjPh4MB6Lap0Vwp7Hmt4Bw1qkmA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMemberPermissions() {
    const { data, error } = await supabase
        .from('store_members')
        .select('user_id, name, role, permissions');

    if (error) {
        console.error('Error fetching members:', error);
    } else {
        console.log('Member Permissions:');
        console.table(data);
    }
}

checkMemberPermissions();
