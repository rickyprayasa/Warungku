// Analyze and fix April 23 duplicate rekon entries
const SUPABASE_URL = 'https://ysujcewkfhbenxtaguuw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWpjZXdrZmhiZW54dGFndXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3NTczMiwiZXhwIjoyMDc5NzUxNzMyfQ.OevJPUKIuxC4UtukyjPh4MB6Lap0Vwp7Hmt4Bw1qkmA';
const headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
};
const STORE_ID = '2feec27e-301e-4fe7-9a0e-4875817b5760';

async function main() {
    // 1. Show all April 23 sales
    console.log('=== ALL SALES ON APRIL 23 ===');
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/sales?store_id=eq.${STORE_ID}&created_at=gte.2026-04-23T00:00:00&created_at=lt.2026-04-24T00:00:00&order=created_at.asc&select=id,total,profit,notes,created_at`,
        { headers }
    );
    const apr23Sales = await res.json();
    let total = 0;
    for (const s of apr23Sales) {
        const tag = s.notes?.includes('[REKON]') ? '[REKON]' : '[NORMAL]';
        console.log(`  ${tag} ${s.created_at} | Rp ${s.total} | ${s.id} | ${s.notes}`);
        total += parseFloat(s.total);
    }
    console.log(`  Total: Rp ${total} (${apr23Sales.length} entries)\n`);

    // 2. Show all April 23 reconciliations
    console.log('=== ALL RECONCILIATIONS ON APRIL 23 ===');
    const res2 = await fetch(
        `${SUPABASE_URL}/rest/v1/reconciliations?store_id=eq.${STORE_ID}&date=eq.2026-04-23&order=created_at.asc&select=id,actual_cash,total_stock_value,generated_sale_ids,notes,created_at,stock_items`,
        { headers }
    );
    const apr23Recons = await res2.json();
    for (const r of apr23Recons) {
        const itemCount = Array.isArray(r.stock_items) ? r.stock_items.length : 0;
        console.log(`  ${r.created_at} | stockValue=Rp ${r.total_stock_value} | cash=${r.actual_cash} | items=${itemCount} | saleIds=${JSON.stringify(r.generated_sale_ids)} | ${r.notes}`);
    }
    console.log(`  Total: ${apr23Recons.length}\n`);

    // 3. The correct state for April 23 should be:
    // - ONE sale of Rp 469,319 (the valid SO result)
    // - The 5 sub-entries (7500, 33000, 231000, 112819, 85000) are the buggy 
    //   duplicates from repeated failed attempts - they should be deleted
    //   because the user confirmed total should be Rp 469,319

    // Identify the REKON sales to delete (the duplicates from Apr 23)
    // Keep the Rp 469,319 entry, delete the rest
    const rekonSalesToDelete = apr23Sales.filter(s =>
        s.notes?.includes('[REKON]') && parseFloat(s.total) !== 469319
    );

    console.log(`=== REKON SALES TO DELETE (Apr 23 duplicates) ===`);
    let deleteTotal = 0;
    for (const s of rekonSalesToDelete) {
        console.log(`  DELETE: ${s.created_at} | Rp ${s.total} | ${s.id}`);
        deleteTotal += parseFloat(s.total);
    }
    console.log(`  Total to delete: Rp ${deleteTotal}\n`);

    // Also identify duplicate reconciliation records from Apr 23
    // Keep only the one with notes containing 'data dikoreksi'
    const reconsToDel = apr23Recons.filter(r =>
        !r.notes?.includes('data dikoreksi')
    );
    console.log(`=== RECONCILIATION RECORDS TO DELETE ===`);
    for (const r of reconsToDel) {
        console.log(`  DELETE: ${r.created_at} | Rp ${r.total_stock_value} | ${r.id}`);
    }

    // 4. Execute deletions
    if (rekonSalesToDelete.length > 0) {
        const ids = rekonSalesToDelete.map(s => s.id).join(',');
        const delRes = await fetch(
            `${SUPABASE_URL}/rest/v1/sales?id=in.(${ids})`,
            { method: 'DELETE', headers }
        );
        console.log(`\n✅ Deleted ${rekonSalesToDelete.length} duplicate REKON sales (Rp ${deleteTotal})`);
    }

    if (reconsToDel.length > 0) {
        const ids = reconsToDel.map(r => r.id).join(',');
        const delRes = await fetch(
            `${SUPABASE_URL}/rest/v1/reconciliations?id=in.(${ids})`,
            { method: 'DELETE', headers }
        );
        console.log(`✅ Deleted ${reconsToDel.length} duplicate reconciliation records`);
    }

    // 5. Verify final state
    const finalRes = await fetch(
        `${SUPABASE_URL}/rest/v1/sales?store_id=eq.${STORE_ID}&select=total`,
        { headers }
    );
    const finalSales = await finalRes.json();
    const finalTotal = finalSales.reduce((s, r) => s + parseFloat(r.total), 0);
    console.log(`\n=== FINAL STATE ===`);
    console.log(`Total sales: ${finalSales.length}`);
    console.log(`Total Uang Masuk: Rp ${finalTotal}`);
}

main().catch(console.error);
