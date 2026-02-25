import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://ysujcewkfhbenxtaguuw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function uploadLogo() {
    if (!SUPABASE_SERVICE_KEY) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY env variable');
        console.log('Run: SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx src/upload-logo.ts');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Read the PNG file
    const logoPath = path.join(__dirname, '..', 'omzetin.png');
    const logoBuffer = fs.readFileSync(logoPath);

    // Create bucket if not exists
    const { error: bucketError } = await supabase.storage.createBucket('public-assets', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('Bucket creation error:', bucketError);
    }

    // Upload the file
    const { data, error } = await supabase.storage
        .from('public-assets')
        .upload('omzetin-logo.png', logoBuffer, {
            contentType: 'image/png',
            upsert: true,
        });

    if (error) {
        console.error('Upload error:', error);
        process.exit(1);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('public-assets')
        .getPublicUrl('omzetin-logo.png');

    console.log('✅ Upload successful!');
    console.log('📎 Public URL:', urlData.publicUrl);
}

uploadLogo();
