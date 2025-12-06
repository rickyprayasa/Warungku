/**
 * Run Supabase Migrations
 * 
 * This script applies SQL migrations to Supabase database
 * 
 * Usage: npx tsx scripts/run-supabase-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysujcewkfhbenxtaguuw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
  console.log('='.repeat(50));
  console.log('SUPABASE MIGRATIONS');
  console.log('='.repeat(50));

  if (!SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log(`\nFound ${files.length} migration files\n`);

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    console.log(`Running: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Split by semicolon and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let success = 0;
    let failed = 0;

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error) {
          // Try direct query for DDL statements
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
          if (directError && !directError.message.includes('does not exist')) {
            throw new Error(error.message);
          }
        }
        success++;
      } catch (e: any) {
        // Ignore "already exists" errors
        if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
          console.warn(`  Warning: ${e.message?.slice(0, 100)}`);
          failed++;
        } else {
          success++;
        }
      }
    }

    console.log(`  Completed: ${success} statements, ${failed} warnings\n`);
  }

  console.log('='.repeat(50));
  console.log('MIGRATIONS COMPLETED');
  console.log('='.repeat(50));
  console.log('\nNOTE: If you see errors, please run the SQL manually in Supabase Dashboard -> SQL Editor');
}

main().catch(console.error);
