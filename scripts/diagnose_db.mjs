// Diagnostic script to analyze Warungku database
// Queries sales, reconciliations, and products to understand data state

const SUPABASE_URL = 'https://ysujcewkfhbenxtaguuw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWpjZXdrZmhiZW54dGFndXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3NTczMiwiZXhwIjoyMDc5NzUxNzMyfQ.OevJPUKIuxC4UtukyjPh4MB6Lap0Vwp7Hmt4Bw1qkmA';

async function query(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    const params = [];
    if (options.select) params.push(`select=${options.select}`);
    if (options.filters) {
        for (const f of options.filters) params.push(f);
    }
    if (options.order) params.push(`order=${options.order}`);
    if (options.limit) params.push(`limit=${options.limit}`);
    url += params.join('&');

    const res = await fetch(url, {
        headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
        }
    });
    return res.json();
}

async function main() {
    console.log('=== WARUNGKU DATABASE DIAGNOSIS ===\n');

    // 1. Find the store
    const stores = await query('stores', { select: 'id,name,slug', filters: ['name=ilike.*warungku*'] });
    if (!stores.length) { console.log('Store not found!'); return; }
    const store = stores[0];
    console.log(`Store: ${store.name} (${store.id})\n`);

    // 2. Get all products with stock
    const products = await query('products', {
        select: 'id,name,total_stock,price,cost,qty_per_unit',
        filters: [`store_id=eq.${store.id}`],
        order: 'name.asc'
    });
    console.log('=== PRODUCTS & STOCK ===');
    for (const p of products) {
        console.log(`  ${p.name}: stock=${p.total_stock}, price=${p.price}, cost=${p.cost}, qtyPerUnit=${p.qty_per_unit}`);
    }
    console.log(`  Total products: ${products.length}\n`);

    // 3. Get ALL sales (with items count)
    const sales = await query('sales', {
        select: 'id,total,profit,sale_type,notes,status,created_at',
        filters: [`store_id=eq.${store.id}`],
        order: 'created_at.desc',
        limit: 200
    });
    console.log('=== ALL SALES ===');
    let totalSales = 0;
    let rekonSalesTotal = 0;
    let normalSalesTotal = 0;
    for (const s of sales) {
        const isRekon = s.notes?.includes('[REKON]');
        const tag = isRekon ? '[REKON]' : '[NORMAL]';
        console.log(`  ${tag} ${s.created_at} | Rp ${s.total} | profit=${s.profit} | ${s.notes || '-'} | status=${s.status || 'completed'}`);
        totalSales += parseFloat(s.total);
        if (isRekon) rekonSalesTotal += parseFloat(s.total);
        else normalSalesTotal += parseFloat(s.total);
    }
    console.log(`  --- Total: ${sales.length} sales, Rp ${totalSales}`);
    console.log(`  --- Rekon: Rp ${rekonSalesTotal}`);
    console.log(`  --- Normal: Rp ${normalSalesTotal}\n`);

    // 4. Get all reconciliations
    const recons = await query('reconciliations', {
        select: 'id,date,actual_cash,total_stock_value,unidentified_amount,generated_sale_ids,notes,status,created_at',
        filters: [`store_id=eq.${store.id}`],
        order: 'created_at.desc',
        limit: 50
    });
    console.log('=== RECONCILIATIONS ===');
    for (const r of recons) {
        console.log(`  ${r.created_at} | cash=${r.actual_cash} | stockValue=${r.total_stock_value} | saleIds=${JSON.stringify(r.generated_sale_ids)} | ${r.notes}`);
    }
    console.log(`  Total: ${recons.length}\n`);

    // 5. Get all purchases
    const purchases = await query('purchases', {
        select: 'id,product_name,quantity,total_cost,created_at',
        filters: [`store_id=eq.${store.id}`],
        order: 'created_at.desc',
        limit: 50
    });
    console.log('=== PURCHASES (last 50) ===');
    let totalPurchases = 0;
    for (const p of purchases) {
        console.log(`  ${p.created_at} | ${p.product_name} | qty=${p.quantity} | cost=${p.total_cost}`);
        totalPurchases += parseFloat(p.total_cost);
    }
    console.log(`  Total purchases cost: Rp ${totalPurchases}\n`);

    // 6. Summary
    console.log('=== SUMMARY ===');
    console.log(`  Total Uang Masuk (sales): Rp ${totalSales}`);
    console.log(`  Total Uang Keluar (purchases): Rp ${totalPurchases}`);
    console.log(`  Arus Kas Bersih: Rp ${totalSales - totalPurchases}`);
}

main().catch(console.error);
