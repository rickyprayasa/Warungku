// Restore deleted [REKON] sales from reconciliation records
// The reconciliation records still have the correct total_stock_value and dates

const SUPABASE_URL = 'https://ysujcewkfhbenxtaguuw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWpjZXdrZmhiZW54dGFndXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3NTczMiwiZXhwIjoyMDc5NzUxNzMyfQ.OevJPUKIuxC4UtukyjPh4MB6Lap0Vwp7Hmt4Bw1qkmA';

const headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
};

async function query(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, ...options });
    return res.json();
}

async function main() {
    const STORE_ID = '2feec27e-301e-4fe7-9a0e-4875817b5760';

    // 1. Get all reconciliations with generated_sale_ids (stock rekon only)
    const recons = await query(
        `reconciliations?store_id=eq.${STORE_ID}&total_stock_value=gt.0&order=created_at.asc`
    );

    console.log(`Found ${recons.length} stock reconciliations with sale references\n`);

    // 2. Check which sale IDs still exist
    const allSaleIds = recons.flatMap(r => r.generated_sale_ids || []);
    const existingSales = await query(
        `sales?id=in.(${allSaleIds.join(',')})`
    );
    const existingIds = new Set(existingSales.map(s => s.id));

    console.log(`Total sale IDs from recons: ${allSaleIds.length}`);
    console.log(`Still existing: ${existingIds.size}`);
    console.log(`Missing (deleted): ${allSaleIds.length - existingIds.size}\n`);

    // 3. For each recon with missing sales, recreate the sale
    let restoredCount = 0;
    let restoredTotal = 0;

    for (const recon of recons) {
        const saleIds = recon.generated_sale_ids || [];
        const missingIds = saleIds.filter(id => !existingIds.has(id));

        if (missingIds.length === 0) {
            console.log(`✓ ${recon.created_at} - sale exists (Rp ${recon.total_stock_value})`);
            continue;
        }

        // This recon's sale was deleted - recreate it
        const stockValue = parseFloat(recon.total_stock_value);
        const stockCost = parseFloat(recon.total_stock_cost);

        // Skip the buggy 23 April rekon we already restored manually
        // (the one with Rp 469,319)
        if (recon.notes?.includes('data dikoreksi')) {
            console.log(`⏭ ${recon.created_at} - already manually restored (Rp ${stockValue})`);
            continue;
        }

        console.log(`⚡ Restoring: ${recon.created_at} - Rp ${stockValue} (was sale ${missingIds.join(',')})`);

        // Create the replacement sale
        const saleData = {
            store_id: STORE_ID,
            total: stockValue,
            profit: stockValue - stockCost,
            sale_type: 'retail',
            notes: '[REKON] Penjualan cash dari rekonsiliasi terpadu',
            created_at: recon.created_at,
        };

        const newSale = await query('sales', {
            method: 'POST',
            body: JSON.stringify(saleData),
        });

        if (newSale && newSale[0]?.id) {
            // Update reconciliation with new sale ID
            const newSaleId = newSale[0].id;
            await fetch(`${SUPABASE_URL}/rest/v1/reconciliations?id=eq.${recon.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ generated_sale_ids: [newSaleId] }),
            });

            restoredCount++;
            restoredTotal += stockValue;
            console.log(`  ✅ Created sale ${newSaleId}`);
        } else {
            console.log(`  ❌ Failed:`, JSON.stringify(newSale));
        }
    }

    console.log(`\n=== RESTORATION COMPLETE ===`);
    console.log(`Restored ${restoredCount} sales, total Rp ${restoredTotal}`);

    // 4. Verify new totals
    const allSales = await query(
        `sales?store_id=eq.${STORE_ID}&select=total`
    );
    const newTotal = allSales.reduce((s, r) => s + parseFloat(r.total), 0);
    console.log(`\nNew Total Uang Masuk: Rp ${newTotal}`);
}

main().catch(console.error);
