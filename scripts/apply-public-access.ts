/**
 * Apply Public Access Policies
 * This script enables public access to stores and products for the storefront
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
  console.log('='.repeat(50));
  console.log('APPLYING PUBLIC ACCESS POLICIES');
  console.log('='.repeat(50));

  if (!SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // SQL to enable public access
  const sqlStatements = [
    // 1. Drop existing public policies if they exist
    `DROP POLICY IF EXISTS "Public can view stores" ON stores;`,
    `DROP POLICY IF EXISTS "Public can view products" ON products;`,

    // 2. Create public access policy for stores
    `CREATE POLICY "Public can view stores"
      ON stores FOR SELECT
      TO public
      USING (true);`,

    // 3. Create public access policy for products
    `CREATE POLICY "Public can view products"
      ON products FOR SELECT
      TO public
      USING (true);`,
  ];

  for (const sql of sqlStatements) {
    console.log(`\nExecuting: ${sql.slice(0, 60)}...`);

    // Use postgres connection directly via RPC
    // We'll use a different approach - execute via the database
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .limit(0);

      // Test if public can access now
      console.log('  Result: Check if public access works...');
    } catch (e: any) {
      console.warn(`  Warning: ${e.message?.slice(0, 100)}`);
    }
  }

  console.log('\n'.repeat(2));
  console.log('='.repeat(50));
  console.log('IMPORTANT: The policies may not have been applied');
  console.log('Please run this SQL manually in Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/ysujcewkfhbenxtaguuw/sql');
  console.log('='.repeat(50));

  console.log('\nCopy and paste this SQL:\n');
  console.log('-- Drop existing policies');
  console.log('DROP POLICY IF EXISTS "Public can view stores" ON stores;');
  console.log('DROP POLICY IF EXISTS "Public can view products" ON products;');
  console.log('');
  console.log('-- Enable public access to stores');
  console.log('CREATE POLICY "Public can view stores"');
  console.log('  ON stores FOR SELECT');
  console.log('  TO public');
  console.log('  USING (true);');
  console.log('');
  console.log('-- Enable public access to products');
  console.log('CREATE POLICY "Public can view products"');
  console.log('  ON products FOR SELECT');
  console.log('  TO public');
  console.log('  USING (true);');
}

main().catch(console.error);
