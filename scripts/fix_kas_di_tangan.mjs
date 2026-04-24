// Fix: Set actual_cash=0 on the manually created rekon record
// The stock rekon should not have actual_cash (that's for kas harian only)
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
    // 1. Show reconciliations with actual_cash > 0 (kas harian entries)
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/reconciliations?store_id=eq.${STORE_ID}&actual_cash=gt.0&order=created_at.desc&limit=10&select=id,date,actual_cash,total_stock_value,notes,created_at`,
        { headers }
    );
    const kasRecons = await res.json();

    console.log('=== RECONCILIATIONS WITH actual_cash > 0 (used for Kas di Tangan) ===');
    for (const r of kasRecons) {
        console.log(`  ${r.created_at} | cash=${r.actual_cash} | stockVal=${r.total_stock_value} | ${r.notes}`);
    }
    console.log(`  Latest: ${kasRecons[0]?.created_at} with cash=${kasRecons[0]?.actual_cash}\n`);

    // 2. Fix: The manually-created "data dikoreksi" rekon has actual_cash=469319
    // But this is a STOCK rekon, not a cash rekon. Set actual_cash=0.
    const fixRes = await fetch(
        `${SUPABASE_URL}/rest/v1/reconciliations?store_id=eq.${STORE_ID}&notes=like.*data dikoreksi*`,
        { headers }
    );
    const toFix = await fixRes.json();

    for (const r of toFix) {
        if (r.actual_cash > 0) {
            console.log(`Fixing rekon ${r.id}: setting actual_cash from ${r.actual_cash} to 0`);
            await fetch(
                `${SUPABASE_URL}/rest/v1/reconciliations?id=eq.${r.id}`,
                { method: 'PATCH', headers, body: JSON.stringify({ actual_cash: 0, cash_difference: 0 }) }
            );
        }
    }

    // 3. Verify: Show updated kas recons
    const res2 = await fetch(
        `${SUPABASE_URL}/rest/v1/reconciliations?store_id=eq.${STORE_ID}&actual_cash=gt.0&order=created_at.desc&limit=5&select=id,date,actual_cash,total_stock_value,notes,created_at`,
        { headers }
    );
    const updated = await res2.json();
    console.log('\n=== UPDATED: Latest Kas Reconciliations ===');
    for (const r of updated) {
        console.log(`  ${r.created_at} | cash=${r.actual_cash} | ${r.notes}`);
    }

    // 4. Calculate what Kas di Tangan should be
    const latestKas = updated[0];
    if (latestKas) {
        console.log(`\nLatest kas rekon: ${latestKas.created_at} = Rp ${latestKas.actual_cash}`);

        // Sales since latest kas
        const salesRes = await fetch(
            `${SUPABASE_URL}/rest/v1/sales?store_id=eq.${STORE_ID}&created_at=gt.${latestKas.created_at}&select=total`,
            { headers }
        );
        const salesSince = await salesRes.json();
        const salesTotal = salesSince.reduce((s, r) => s + parseFloat(r.total), 0);

        // Purchases since latest kas 
        const purchRes = await fetch(
            `${SUPABASE_URL}/rest/v1/purchases?store_id=eq.${STORE_ID}&created_at=gt.${latestKas.created_at}&select=total_cost`,
            { headers }
        );
        const purchSince = await purchRes.json();
        const purchTotal = purchSince.reduce((s, r) => s + parseFloat(r.total_cost), 0);

        const kasdiTangan = parseFloat(latestKas.actual_cash) + salesTotal - purchTotal;
        console.log(`Sales since: Rp ${salesTotal}`);
        console.log(`Purchases since: Rp ${purchTotal}`);
        console.log(`Kas di Tangan = ${latestKas.actual_cash} + ${salesTotal} - ${purchTotal} = Rp ${kasdiTangan}`);
    }

    console.log('\n✅ Done!');
}

main().catch(console.error);
