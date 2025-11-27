/**
 * Migration Script: Cloudflare D1 -> Supabase
 * 
 * This script migrates all data from the current D1 database to Supabase.
 * 
 * Prerequisites:
 * 1. Supabase project created with migrations applied
 * 2. Environment variables set:
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 3. D1 database accessible via API
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - Update these values
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const D1_API_BASE = 'https://omzetin.web.id/api'; // Current production API

// Store info - will be created for existing data
const DEFAULT_STORE = {
  name: 'Omzetin Store',
  slug: 'omzetin',
};

// Owner user - must be created in Supabase Auth first
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';

interface MigrationResult {
  table: string;
  success: number;
  failed: number;
  errors: string[];
}

async function main() {
  console.log('='.repeat(50));
  console.log('OMZETIN D1 -> SUPABASE MIGRATION');
  console.log('='.repeat(50));

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('ERROR: Missing Supabase credentials');
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const results: MigrationResult[] = [];

  try {
    // Step 1: Create owner user (if not exists)
    console.log('\n[1/8] Creating owner user...');
    let ownerId: string;
    
    if (OWNER_EMAIL && OWNER_PASSWORD) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        email_confirm: true,
      });

      if (authError && !authError.message.includes('already exists')) {
        throw authError;
      }

      if (authData?.user) {
        ownerId = authData.user.id;
        console.log(`  Created user: ${OWNER_EMAIL} (${ownerId})`);
      } else {
        // User exists, get their ID
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find(u => u.email === OWNER_EMAIL);
        ownerId = existingUser?.id || '';
        console.log(`  User exists: ${OWNER_EMAIL} (${ownerId})`);
      }
    } else {
      console.log('  SKIPPED: Set OWNER_EMAIL and OWNER_PASSWORD to create user');
      ownerId = '';
    }

    // Step 2: Create store
    console.log('\n[2/8] Creating store...');
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .upsert({
        name: DEFAULT_STORE.name,
        slug: DEFAULT_STORE.slug,
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (storeError) throw storeError;
    console.log(`  Store created: ${store.name} (${store.id})`);

    // Step 3: Link owner to store
    if (ownerId) {
      console.log('\n[3/8] Linking owner to store...');
      const { error: memberError } = await supabase
        .from('store_members')
        .upsert({
          store_id: store.id,
          user_id: ownerId,
          role: 'owner',
        }, { onConflict: 'store_id,user_id' });

      if (memberError) throw memberError;
      console.log(`  Owner linked to store`);
    } else {
      console.log('\n[3/8] SKIPPED: No owner to link');
    }

    // Step 4: Fetch data from D1
    console.log('\n[4/8] Fetching data from D1...');
    
    const [products, sales, purchases, suppliers, stockDetails, snackRequests, reconciliations] = await Promise.all([
      fetchFromD1(`${D1_API_BASE}/products`),
      fetchFromD1(`${D1_API_BASE}/sales`),
      fetchFromD1(`${D1_API_BASE}/purchases`),
      fetchFromD1(`${D1_API_BASE}/suppliers`),
      fetchFromD1(`${D1_API_BASE}/stock-details`).catch(() => []),
      fetchFromD1(`${D1_API_BASE}/jajanan-requests`),
      fetchFromD1(`${D1_API_BASE}/reconciliations`),
    ]);

    console.log(`  Products: ${products.length}`);
    console.log(`  Sales: ${sales.length}`);
    console.log(`  Purchases: ${purchases.length}`);
    console.log(`  Suppliers: ${suppliers.length}`);
    console.log(`  Stock Details: ${stockDetails.length}`);
    console.log(`  Snack Requests: ${snackRequests.length}`);
    console.log(`  Reconciliations: ${reconciliations.length}`);

    // Step 5: Migrate Suppliers
    console.log('\n[5/8] Migrating suppliers...');
    const supplierIdMap = new Map<string, string>();
    const supplierResult: MigrationResult = { table: 'suppliers', success: 0, failed: 0, errors: [] };

    for (const supplier of suppliers) {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .insert({
            store_id: store.id,
            name: supplier.name,
            contact_person: supplier.contactPerson || null,
            phone: supplier.phone || null,
            address: supplier.address || null,
            created_at: new Date(supplier.createdAt).toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        supplierIdMap.set(supplier.id, data.id);
        supplierResult.success++;
      } catch (e: any) {
        supplierResult.failed++;
        supplierResult.errors.push(`${supplier.name}: ${e.message}`);
      }
    }
    results.push(supplierResult);
    console.log(`  Migrated: ${supplierResult.success}, Failed: ${supplierResult.failed}`);

    // Step 6: Migrate Products
    console.log('\n[6/8] Migrating products...');
    const productIdMap = new Map<string, string>();
    const productResult: MigrationResult = { table: 'products', success: 0, failed: 0, errors: [] };

    for (const product of products) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert({
            store_id: store.id,
            name: product.name,
            price: product.price,
            cost: product.cost || 0,
            image_url: product.imageUrl || null,
            category: product.category || null,
            description: product.description || null,
            is_promo: product.isPromo || false,
            promo_price: product.promoPrice || null,
            is_active: product.isActive !== false,
            is_best_seller: product.isBestSeller || false,
            total_stock: product.totalStock || 0,
            min_stock_level: product.minStockLevel || 10,
            qty_per_unit: product.qtyPerUnit || 1,
            created_at: new Date(product.createdAt).toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        productIdMap.set(product.id, data.id);
        productResult.success++;
      } catch (e: any) {
        productResult.failed++;
        productResult.errors.push(`${product.name}: ${e.message}`);
      }
    }
    results.push(productResult);
    console.log(`  Migrated: ${productResult.success}, Failed: ${productResult.failed}`);

    // Step 7: Migrate Purchases & Stock Details
    console.log('\n[7/8] Migrating purchases & stock details...');
    const purchaseIdMap = new Map<string, string>();
    const purchaseResult: MigrationResult = { table: 'purchases', success: 0, failed: 0, errors: [] };
    const stockResult: MigrationResult = { table: 'stock_details', success: 0, failed: 0, errors: [] };

    for (const purchase of purchases) {
      try {
        const newProductId = productIdMap.get(purchase.productId);
        if (!newProductId) {
          purchaseResult.failed++;
          purchaseResult.errors.push(`Product not found: ${purchase.productId}`);
          continue;
        }

        const { data, error } = await supabase
          .from('purchases')
          .insert({
            store_id: store.id,
            product_id: newProductId,
            product_name: purchase.productName,
            quantity: purchase.quantity,
            unit_cost: purchase.unitCost,
            total_cost: purchase.totalCost || (purchase.quantity * purchase.unitCost),
            pack_quantity: purchase.packQuantity || null,
            units_per_pack: purchase.unitsPerPack || null,
            supplier_id: purchase.supplierId ? supplierIdMap.get(purchase.supplierId) : null,
            notes: purchase.notes || null,
            created_at: new Date(purchase.createdAt).toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        purchaseIdMap.set(purchase.id, data.id);
        purchaseResult.success++;
      } catch (e: any) {
        purchaseResult.failed++;
        purchaseResult.errors.push(`Purchase ${purchase.id}: ${e.message}`);
      }
    }
    results.push(purchaseResult);
    console.log(`  Purchases - Migrated: ${purchaseResult.success}, Failed: ${purchaseResult.failed}`);

    // Migrate stock details
    for (const stock of stockDetails) {
      try {
        const newProductId = productIdMap.get(stock.productId);
        const newPurchaseId = stock.purchaseId ? purchaseIdMap.get(stock.purchaseId) : null;

        if (!newProductId) {
          stockResult.failed++;
          continue;
        }

        const { error } = await supabase
          .from('stock_details')
          .insert({
            store_id: store.id,
            product_id: newProductId,
            purchase_id: newPurchaseId,
            quantity: stock.quantity,
            unit_cost: stock.unitCost,
            created_at: new Date(stock.createdAt).toISOString(),
          });

        if (error) throw error;
        stockResult.success++;
      } catch (e: any) {
        stockResult.failed++;
        stockResult.errors.push(`Stock ${stock.id}: ${e.message}`);
      }
    }
    results.push(stockResult);
    console.log(`  Stock Details - Migrated: ${stockResult.success}, Failed: ${stockResult.failed}`);

    // Step 8: Migrate Sales
    console.log('\n[8/8] Migrating sales...');
    const saleResult: MigrationResult = { table: 'sales', success: 0, failed: 0, errors: [] };

    for (const sale of sales) {
      try {
        // Insert sale
        const { data: newSale, error: saleError } = await supabase
          .from('sales')
          .insert({
            store_id: store.id,
            total: sale.total,
            profit: sale.profit,
            sale_type: sale.saleType || 'retail',
            notes: sale.notes || null,
            created_at: new Date(sale.createdAt).toISOString(),
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Insert sale items
        if (sale.items && sale.items.length > 0) {
          const saleItems = sale.items.map((item: any) => ({
            sale_id: newSale.id,
            product_id: productIdMap.get(item.productId) || item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            price: item.price,
            cost: item.cost || 0,
          }));

          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems);

          if (itemsError) {
            console.warn(`  Warning: Failed to insert items for sale ${newSale.id}`);
          }
        }

        saleResult.success++;
      } catch (e: any) {
        saleResult.failed++;
        saleResult.errors.push(`Sale ${sale.id}: ${e.message}`);
      }
    }
    results.push(saleResult);
    console.log(`  Migrated: ${saleResult.success}, Failed: ${saleResult.failed}`);

    // Migrate Snack Requests
    console.log('\n[Bonus] Migrating snack requests...');
    const requestResult: MigrationResult = { table: 'snack_requests', success: 0, failed: 0, errors: [] };

    for (const request of snackRequests) {
      try {
        const { error } = await supabase
          .from('snack_requests')
          .insert({
            store_id: store.id,
            product_id: request.productId ? productIdMap.get(request.productId) : null,
            requester_name: request.requesterName,
            snack_name: request.snackName,
            quantity: request.quantity,
            notes: request.notes || null,
            request_type: request.requestType || 'stock_request',
            status: request.status || 'pending',
            is_read: request.isRead || false,
            created_at: new Date(request.createdAt).toISOString(),
          });

        if (error) throw error;
        requestResult.success++;
      } catch (e: any) {
        requestResult.failed++;
        requestResult.errors.push(`Request ${request.id}: ${e.message}`);
      }
    }
    results.push(requestResult);
    console.log(`  Migrated: ${requestResult.success}, Failed: ${requestResult.failed}`);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(50));
    
    for (const result of results) {
      const status = result.failed === 0 ? '✓' : '⚠';
      console.log(`${status} ${result.table}: ${result.success} success, ${result.failed} failed`);
      if (result.errors.length > 0 && result.errors.length <= 5) {
        result.errors.forEach(e => console.log(`    - ${e}`));
      } else if (result.errors.length > 5) {
        console.log(`    (${result.errors.length} errors, showing first 5)`);
        result.errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION COMPLETED');
    console.log('='.repeat(50));
    console.log(`\nStore ID: ${store.id}`);
    console.log(`Store Slug: ${store.slug}`);
    if (ownerId) {
      console.log(`Owner ID: ${ownerId}`);
    }

  } catch (error: any) {
    console.error('\nMIGRATION FAILED:', error.message);
    process.exit(1);
  }
}

async function fetchFromD1(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);
    const json = await response.json() as any;
    
    if (!json.success) {
      throw new Error(json.error || 'Failed to fetch');
    }
    
    return json.data || [];
  } catch (error: any) {
    console.warn(`  Warning: Failed to fetch ${url}: ${error.message}`);
    return [];
  }
}

main();
