/**
 * Fix script: Recalculate existing [REKON] sales that have inflated values
 * due to bundle products (qtyPerUnit > 1) being priced per-piece instead of per-bundle.
 * 
 * Usage: npx tsx scripts/fix-rekon-sales.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysujcewkfhbenxtaguuw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWpjZXdrZmhiZW54dGFndXV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3NTczMiwiZXhwIjoyMDc5NzUxNzMyfQ.OevJPUKIuxC4UtukyjPh4MB6Lap0Vwp7Hmt4Bw1qkmA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixRekonSales() {
    console.log('=== Fix [REKON] Sales with Bundle Pricing Bug ===\n');

    // 1. Find all [REKON] sales
    const { data: rekonSales, error: salesError } = await supabase
        .from('sales')
        .select('id, total, profit, notes, store_id')
        .like('notes', '%[REKON]%');

    if (salesError) {
        console.error('Error fetching rekon sales:', salesError);
        return;
    }

    if (!rekonSales || rekonSales.length === 0) {
        console.log('No [REKON] sales found. Nothing to fix.');
        return;
    }

    console.log(`Found ${rekonSales.length} [REKON] sale(s) to check.\n`);

    for (const sale of rekonSales) {
        console.log(`--- Sale ID: ${sale.id} ---`);
        console.log(`  Current total: Rp ${sale.total?.toLocaleString()}`);
        console.log(`  Current profit: Rp ${sale.profit?.toLocaleString()}`);

        // 2. Get sale items
        const { data: saleItems, error: itemsError } = await supabase
            .from('sale_items')
            .select('*')
            .eq('sale_id', sale.id);

        if (itemsError || !saleItems) {
            console.error('  Error fetching sale items:', itemsError);
            continue;
        }

        let newTotal = 0;
        let newTotalCost = 0;
        let hasChanges = false;

        for (const item of saleItems) {
            // 3. Get product to check qtyPerUnit
            const { data: product } = await supabase
                .from('products')
                .select('id, name, price, cost, qty_per_unit')
                .eq('id', item.product_id)
                .single();

            const qtyPerUnit = product?.qty_per_unit || 1;

            if (qtyPerUnit > 1) {
                // This is a bundle product - recalculate
                // item.quantity was stored as pieces, should be selling units (bundles)
                const oldQty = item.quantity;
                const correctQty = oldQty / qtyPerUnit;
                const correctSubtotal = Math.round(correctQty * item.price);
                const correctCostTotal = Math.round(correctQty * item.cost);

                console.log(`  Product "${product?.name}" (qtyPerUnit=${qtyPerUnit}):`);
                console.log(`    Old qty: ${oldQty} pcs → Correct qty: ${correctQty} units`);
                console.log(`    Old subtotal: Rp ${(oldQty * item.price).toLocaleString()} → Correct: Rp ${correctSubtotal.toLocaleString()}`);

                // Update sale_items quantity
                const { error: updateItemError } = await supabase
                    .from('sale_items')
                    .update({ quantity: correctQty })
                    .eq('sale_id', sale.id)
                    .eq('product_id', item.product_id);

                if (updateItemError) {
                    console.error(`    Error updating sale item:`, updateItemError);
                } else {
                    console.log(`    ✅ Sale item updated`);
                    hasChanges = true;
                }

                newTotal += correctSubtotal;
                newTotalCost += correctCostTotal;
            } else {
                // Non-bundle product - keep as is
                newTotal += item.quantity * item.price;
                newTotalCost += item.quantity * item.cost;
            }
        }

        if (hasChanges) {
            const newProfit = newTotal - newTotalCost;
            console.log(`  New total: Rp ${newTotal.toLocaleString()} (was Rp ${sale.total?.toLocaleString()})`);
            console.log(`  New profit: Rp ${newProfit.toLocaleString()} (was Rp ${sale.profit?.toLocaleString()})`);

            // 4. Update the sale totals
            const { error: updateSaleError } = await supabase
                .from('sales')
                .update({ total: newTotal, profit: newProfit })
                .eq('id', sale.id);

            if (updateSaleError) {
                console.error('  Error updating sale:', updateSaleError);
            } else {
                console.log('  ✅ Sale totals updated');
            }

            // 5. Also fix the reconciliation record if exists
            const { data: recons } = await supabase
                .from('reconciliations')
                .select('id, generated_sale_ids, total_stock_value, total_stock_cost')
                .eq('store_id', sale.store_id)
                .contains('generated_sale_ids', [sale.id]);

            if (recons && recons.length > 0) {
                for (const recon of recons) {
                    const { error: updateReconError } = await supabase
                        .from('reconciliations')
                        .update({
                            total_stock_value: newTotal,
                            total_stock_cost: newTotalCost,
                            unidentified_amount: (recon as any).actual_cash - newTotal,
                        })
                        .eq('id', recon.id);

                    if (updateReconError) {
                        console.error('  Error updating reconciliation:', updateReconError);
                    } else {
                        console.log(`  ✅ Reconciliation ${recon.id} updated`);
                    }
                }
            }
        } else {
            console.log('  No bundle products found, no changes needed.');
        }

        console.log('');
    }

    console.log('=== Done ===');
}

fixRekonSales().catch(console.error);
