
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysujcewkfhbenxtaguuw.supabase.co';
// using service role key
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWpjZXdrZmhiZW54dGFndXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3NTczMiwiZXhwIjoyMDc5NzUxNzMyfQ.OevJPUKIuxC4UtukyjPh4MB6Lap0Vwp7Hmt4Bw1qkmA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase
        .from('store_members')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching members:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('No data found, but query worked.');
            // Try to get column info from error message if we select a non-existent column
            const { error: err2 } = await supabase.from('store_members').select('non_existent_column').limit(1);
            if (err2) {
                console.log('Error from selecting non-existent column (might show valid columns):', err2.message);
            }
        }
    }
}

checkColumns();
