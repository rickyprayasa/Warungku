/**
 * List All Stores and Their Slugs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

async function listStores() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('='.repeat(60));
  console.log('ALL STORES IN DATABASE');
  console.log('='.repeat(60));

  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, slug, address, phone, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nFound ${stores?.length || 0} stores:\n`);

  stores?.forEach((store, index) => {
    console.log(`${index + 1}. ${store.name}`);
    console.log(`   ID: ${store.id}`);
    console.log(`   Slug: ${store.slug}`);
    console.log(`   URL: omzetin.web.id/${store.slug}`);
    console.log(`   Address: ${store.address || 'Not set'}`);
    console.log(`   Phone: ${store.phone || 'Not set'}`);
    console.log(`   Created: ${new Date(store.created_at).toLocaleString('id-ID')}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('TEST THESE URLs IN YOUR BROWSER:');
  console.log('='.repeat(60));
  stores?.forEach((store) => {
    console.log(`  - http://localhost:3001/${store.slug}`);
    console.log(`  - https://omzetin.web.id/${store.slug}`);
    console.log('');
  });
}

listStores().catch(console.error);
