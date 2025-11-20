// D1 Repository for Warungku
// Handles all database operations with Cloudflare D1

import type { Product, Sale, Purchase, Supplier, StockDetail, JajananRequest } from '@shared/types';

export class D1Repository {
    constructor(private db: D1Database) { }

    // ==================== PRODUCTS ====================

    async getProducts(): Promise<Product[]> {
        const { results } = await this.db
            .prepare('SELECT * FROM products ORDER BY name')
            .all<Product>();
        return results || [];
    }

    async getProduct(id: string): Promise<Product | null> {
        return await this.db
            .prepare('SELECT * FROM products WHERE id = ?')
            .bind(id)
            .first<Product>();
    }

    async createProduct(product: Product): Promise<Product> {
        await this.db
            .prepare(`
        INSERT INTO products (id, name, price, cost, imageUrl, category, totalStock, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                product.id,
                product.name,
                product.price,
                product.cost || 0,
                product.imageUrl || '',
                product.category || '',
                product.totalStock || 0,
                product.createdAt
            )
            .run();
        return product;
    }

    async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.price !== undefined) {
            fields.push('price = ?');
            values.push(updates.price);
        }
        if (updates.cost !== undefined) {
            fields.push('cost = ?');
            values.push(updates.cost);
        }
        if (updates.imageUrl !== undefined) {
            fields.push('imageUrl = ?');
            values.push(updates.imageUrl);
        }
        if (updates.category !== undefined) {
            fields.push('category = ?');
            values.push(updates.category);
        }
        if (updates.totalStock !== undefined) {
            fields.push('totalStock = ?');
            values.push(updates.totalStock);
        }

        if (fields.length === 0) return;

        values.push(id);

        await this.db
            .prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`)
            .bind(...values)
            .run();
    }

    async deleteProduct(id: string): Promise<boolean> {
        try {
            const result = await this.db
                .prepare('DELETE FROM products WHERE id = ?')
                .bind(id)
                .run();
            return (result.meta.changes || 0) > 0;
        } catch (error: any) {
            if (error.message && (error.message.includes('FOREIGN KEY') || error.message.includes('constraint'))) {
                throw new Error('Produk tidak dapat dihapus karena memiliki riwayat transaksi.');
            }
            throw error;
        }
    }

    // ==================== SALES ====================

    async getSales(): Promise<Sale[]> {
        // Get all sales
        const { results: salesResults } = await this.db
            .prepare('SELECT * FROM sales ORDER BY createdAt DESC')
            .all<Sale>();

        if (!salesResults || salesResults.length === 0) return [];

        // Get all sale items for these sales
        const saleIds = salesResults.map(s => `'${s.id}'`).join(',');
        const { results: itemsResults } = await this.db
            .prepare(`SELECT * FROM sale_items WHERE saleId IN (${saleIds})`)
            .all<any>();

        // Combine sales with their items
        return salesResults.map(sale => ({
            id: sale.id,
            total: sale.total,
            profit: sale.profit,
            saleType: sale.saleType,
            createdAt: sale.createdAt,
            items: (itemsResults || [])
                .filter((item: any) => item.saleId === sale.id)
                .map((item: any) => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price,
                    cost: item.cost // This is the critical field
                }))
        }));
    }

    async createSale(sale: Sale): Promise<void> {
        const statements = [
            // Insert sale record
            this.db.prepare(`
        INSERT INTO sales (id, total, profit, saleType, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).bind(sale.id, sale.total, sale.profit, sale.saleType || 'retail', sale.createdAt),

            // Insert sale items
            ...sale.items.map(item =>
                this.db.prepare(`
          INSERT INTO sale_items (id, saleId, productId, productName, quantity, price, cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
                    crypto.randomUUID(),
                    sale.id,
                    item.productId,
                    item.productName,
                    item.quantity,
                    item.price,
                    item.cost
                )
            )
        ];

        await this.db.batch(statements);
    }

    async getSale(id: string): Promise<Sale | null> {
        const sale = await this.db.prepare('SELECT * FROM sales WHERE id = ?').bind(id).first<Sale>();
        if (!sale) return null;
        const { results: items } = await this.db.prepare('SELECT * FROM sale_items WHERE saleId = ?').bind(id).all<any>();
        return { ...sale, items: items || [] };
    }

    async deleteSale(id: string): Promise<void> {
        await this.db.batch([
            this.db.prepare('DELETE FROM sale_items WHERE saleId = ?').bind(id),
            this.db.prepare('DELETE FROM sales WHERE id = ?').bind(id)
        ]);
    }

    async createSaleWithStockUpdate(
        sale: Sale,
        stockUpdates: Array<{ stockDetailId: string; newQuantity: number; shouldDelete: boolean }>,
        productUpdates: Array<{ productId: string; quantityReduction: number }>
    ): Promise<void> {
        const statements = [
            // Insert sale record
            this.db.prepare(`
                INSERT INTO sales (id, total, profit, saleType, createdAt)
                VALUES (?, ?, ?, ?, ?)
            `).bind(sale.id, sale.total, sale.profit, sale.saleType || 'retail', sale.createdAt),

            // Insert sale items
            ...sale.items.map(item =>
                this.db.prepare(`
                    INSERT INTO sale_items (id, saleId, productId, productName, quantity, price, cost)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID(),
                    sale.id,
                    item.productId,
                    item.productName,
                    item.quantity,
                    item.price,
                    item.cost
                )
            ),

            // Update stock details
            ...stockUpdates.map(update => {
                if (update.shouldDelete) {
                    return this.db.prepare('DELETE FROM stock_details WHERE id = ?').bind(update.stockDetailId);
                } else {
                    return this.db.prepare('UPDATE stock_details SET quantity = ? WHERE id = ?')
                        .bind(update.newQuantity, update.stockDetailId);
                }
            }),

            // Update product total stock
            ...productUpdates.map(update =>
                this.db.prepare(`
                    UPDATE products 
                    SET totalStock = totalStock - ? 
                    WHERE id = ?
                `).bind(update.quantityReduction, update.productId)
            )
        ];

        // Execute all in one atomic transaction
        await this.db.batch(statements);
    }

    // ==================== PURCHASES ====================

    async getPurchases(): Promise<Purchase[]> {
        const { results } = await this.db
            .prepare(`
                SELECT 
                    p.*, 
                    (p.quantity * p.unitCost) as totalCost,
                    s.name as supplier
                FROM purchases p
                LEFT JOIN suppliers s ON p.supplierId = s.id
                ORDER BY p.createdAt DESC
            `)
            .all<Purchase>();
        return results || [];
    }

    async createPurchase(purchase: Purchase): Promise<Purchase> {
        await this.db
            .prepare(`
        INSERT INTO purchases (id, productId, productName, quantity, unitCost, packQuantity, unitsPerPack, supplierId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                purchase.id,
                purchase.productId,
                purchase.productName,
                purchase.quantity,
                purchase.unitCost,
                purchase.packQuantity || null,
                purchase.unitsPerPack || null,
                purchase.supplierId || null,
                purchase.createdAt
            )
            .run();
        return purchase;
    }

    async getPurchase(id: string): Promise<Purchase | null> {
        return await this.db.prepare('SELECT * FROM purchases WHERE id = ?').bind(id).first<Purchase>();
    }

    async deletePurchase(id: string): Promise<void> {
        await this.db.prepare('DELETE FROM purchases WHERE id = ?').bind(id).run();
    }

    async getStockDetailByPurchaseId(purchaseId: string): Promise<StockDetail | null> {
        return await this.db.prepare('SELECT * FROM stock_details WHERE purchaseId = ?').bind(purchaseId).first<StockDetail>();
    }

    // ==================== STOCK DETAILS ====================

    async getStockDetails(productId?: string): Promise<StockDetail[]> {
        let query = 'SELECT * FROM stock_details';
        const bindings: any[] = [];

        if (productId) {
            query += ' WHERE productId = ?';
            bindings.push(productId);
        }

        query += ' ORDER BY createdAt ASC';

        const { results } = await this.db
            .prepare(query)
            .bind(...bindings)
            .all<StockDetail>();

        return results || [];
    }

    async createStockDetail(stock: StockDetail): Promise<StockDetail> {
        await this.db
            .prepare(`
        INSERT INTO stock_details (id, productId, quantity, unitCost, purchaseId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
            .bind(
                stock.id,
                stock.productId,
                stock.quantity,
                stock.unitCost,
                stock.purchaseId,
                stock.createdAt
            )
            .run();
        return stock;
    }

    async updateStockDetailQuantity(id: string, quantity: number): Promise<void> {
        await this.db
            .prepare('UPDATE stock_details SET quantity = ? WHERE id = ?')
            .bind(quantity, id)
            .run();
    }

    async deleteStockDetail(id: string): Promise<void> {
        await this.db
            .prepare('DELETE FROM stock_details WHERE id = ?')
            .bind(id)
            .run();
    }

    // ==================== SUPPLIERS ====================

    async getSuppliers(): Promise<Supplier[]> {
        const { results } = await this.db
            .prepare('SELECT * FROM suppliers ORDER BY name')
            .all<Supplier>();
        return results || [];
    }

    async createSupplier(supplier: Supplier): Promise<Supplier> {
        await this.db
            .prepare(`
        INSERT INTO suppliers (id, name, contactPerson, phone, address, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
            .bind(
                supplier.id,
                supplier.name,
                supplier.contactPerson || '',
                supplier.phone || '',
                supplier.address || '',
                supplier.createdAt
            )
            .run();
        return supplier;
    }

    async updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.contactPerson !== undefined) {
            fields.push('contactPerson = ?');
            values.push(updates.contactPerson);
        }
        if (updates.phone !== undefined) {
            fields.push('phone = ?');
            values.push(updates.phone);
        }
        if (updates.address !== undefined) {
            fields.push('address = ?');
            values.push(updates.address);
        }

        if (fields.length === 0) return;

        values.push(id);

        await this.db
            .prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`)
            .bind(...values)
            .run();
    }

    async deleteSupplier(id: string): Promise<boolean> {
        const result = await this.db
            .prepare('DELETE FROM suppliers WHERE id = ?')
            .bind(id)
            .run();
        return (result.meta.changes || 0) > 0;
    }

    // ==================== JAJANAN REQUESTS ====================

    async getJajananRequests(): Promise<JajananRequest[]> {
        const { results } = await this.db
            .prepare('SELECT * FROM snack_requests ORDER BY createdAt DESC')
            .all<JajananRequest>();
        return results || [];
    }

    async createJajananRequest(request: JajananRequest): Promise<JajananRequest> {
        await this.db
            .prepare(`
        INSERT INTO snack_requests (id, productId, requesterName, snackName, quantity, notes, requestType, status, isRead, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                request.id,
                request.productId || '',
                request.requesterName,
                request.snackName,
                request.quantity,
                request.notes || '',
                request.requestType || 'stock_request',
                request.status,
                request.isRead ? 1 : 0,
                request.createdAt,
                request.updatedAt
            )
            .run();
        return request;
    }

    async updateJajananRequestStatus(id: string, status: string): Promise<void> {
        await this.db
            .prepare('UPDATE snack_requests SET status = ?, updatedAt = ? WHERE id = ?')
            .bind(status, Date.now(), id)
            .run();
    }

    async updateJajananRequest(id: string, updates: Partial<JajananRequest>): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.status !== undefined) {
            fields.push('status = ?');
            values.push(updates.status);
        }
        if (updates.isRead !== undefined) {
            fields.push('isRead = ?');
            values.push(updates.isRead ? 1 : 0);
        }
        if (updates.updatedAt !== undefined) {
            fields.push('updatedAt = ?');
            values.push(updates.updatedAt);
        }

        if (fields.length === 0) return;

        values.push(id);

        await this.db
            .prepare(`UPDATE snack_requests SET ${fields.join(', ')} WHERE id = ?`)
            .bind(...values)
            .run();
    }

    // ==================== UTILITIES ====================

    async resetAllData(): Promise<void> {
        await this.db.batch([
            this.db.prepare('DELETE FROM sale_items'),
            this.db.prepare('DELETE FROM sales'),
            this.db.prepare('DELETE FROM stock_details'),
            this.db.prepare('DELETE FROM purchases'),
            this.db.prepare('DELETE FROM products'),
            this.db.prepare('DROP TABLE IF EXISTS suppliers'),
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS suppliers (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  contactPerson TEXT DEFAULT '',
                  phone TEXT DEFAULT '',
                  address TEXT DEFAULT '',
                  createdAt INTEGER NOT NULL
                )
            `),
            this.db.prepare('DELETE FROM snack_requests'),
        ]);
    }
}
