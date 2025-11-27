import { Hono } from "hono";
import type { Env } from './core-utils';
import { ok, bad, notFound } from './core-utils';
import { D1Repository } from './d1-repository';
import type { Product, Sale, SaleFormValues, Purchase, Supplier, JajananRequest, StockDetail, OpnamePayload, Reconciliation, ReconciliationPayload, ReconciliationStockItem } from "@shared/types";

export function userRoutes(app: Hono<{ Bindings: Env }>) {

  // ==================== PRODUCTS ====================

  app.get('/api/test-db', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT * FROM products ORDER BY name LIMIT 10')
        .all();

      return ok(c, { products: results });
    } catch (err: any) {
      console.error('D1 test error', err);
      return bad(c, err?.message || 'Failed to query D1 database');
    }
  });

  // ==================== AUTHENTICATION ====================

  app.post('/api/auth/login', async (c) => {
    try {
      const { email, password } = await c.req.json();

      if (!email || !password) {
        return bad(c, 'Email and password required');
      }

      // Get user from database
      const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE email = ?')
        .bind(email)
        .first<any>();

      if (!user) {
        return bad(c, 'Invalid credentials');
      }

      // Verify password using bcrypt
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return bad(c, 'Invalid credentials');
      }

      return ok(c, {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return bad(c, 'Login failed');
    }
  });


  app.get('/api/products', async (c) => {
    const repo = new D1Repository(c.env.DB);
    const products = await repo.getProducts();

    // Calculate totalStock from stock_details
    const productsWithStock = await Promise.all(
      products.map(async (p) => {
        const stocks = await repo.getStockDetails(p.id);
        const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
        return { ...p, totalStock };
      })
    );

    return ok(c, productsWithStock);
  });

  app.post('/api/products', async (c) => {
    const body = (await c.req.json()) as Partial<Product>;

    if (!body.name || body.price === undefined) {
      return bad(c, 'Missing required product fields.');
    }

    const repo = new D1Repository(c.env.DB);

    const product: Product = {
      id: crypto.randomUUID(),
      name: body.name,
      price: body.price,
      cost: body.cost || 0,
      imageUrl: body.imageUrl || '',
      category: body.category || '',
      description: body.description || '',
      isPromo: body.isPromo || false,
      promoPrice: body.promoPrice || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      totalStock: 0,
      minStockLevel: body.minStockLevel || 10,
      qtyPerUnit: body.qtyPerUnit || 1,
      createdAt: Date.now()
    };

    await repo.createProduct(product);
    return ok(c, product);
  });

  app.put('/api/products/:id', async (c) => {
    try {
      const { id } = c.req.param();
      const updates = (await c.req.json()) as Partial<Product>;
      const repo = new D1Repository(c.env.DB);

      const product = await repo.getProduct(id);
      if (!product) return notFound(c, 'Product not found.');

      // Log image size if updating image
      if (updates.imageUrl) {
        const imageSizeKB = Math.round(updates.imageUrl.length / 1024);
        console.log(`[UPDATE PRODUCT] Image size: ${imageSizeKB}KB`);

        // Check if image is too large (>3MB base64)
        if (updates.imageUrl.length > 3 * 1024 * 1024) {
          console.error(`[UPDATE PRODUCT] Image too large: ${imageSizeKB}KB`);
          return bad(c, `Ukuran foto terlalu besar (${imageSizeKB}KB). Maksimal 3MB.`);
        }
      }

      await repo.updateProduct(id, updates);

      const updated = await repo.getProduct(id);
      return ok(c, updated);
    } catch (error: any) {
      console.error('[UPDATE PRODUCT ERROR]', error);
      return bad(c, error.message || 'Failed to update product');
    }
  });

  app.delete('/api/products/:id', async (c) => {
    const { id } = c.req.param();
    const repo = new D1Repository(c.env.DB);

    const deleted = await repo.deleteProduct(id);
    if (!deleted) return notFound(c, 'Product not found.');

    return ok(c, { id });
  });

  app.post('/api/products/:id/add-stock', async (c) => {
    const { id } = c.req.param();
    const { quantity, unitCost, isInitialStock } = await c.req.json();

    if (!quantity || quantity <= 0) {
      return bad(c, 'Quantity must be greater than 0');
    }

    if (unitCost === undefined || unitCost < 0) {
      return bad(c, 'Unit cost must be non-negative');
    }

    const repo = new D1Repository(c.env.DB);
    try {
      await repo.addStock(id, quantity, unitCost, isInitialStock || false);
      return ok(c, { success: true });
    } catch (error: any) {
      return bad(c, error.message);
    }
  });

  app.post('/api/products/:id/adjust-stock', async (c) => {
    const { id } = c.req.param();
    const { quantity, unitCost, isFromProductForm } = await c.req.json();

    if (quantity === undefined || quantity < 0) {
      return bad(c, 'Quantity must be non-negative');
    }

    if (unitCost !== undefined && unitCost < 0) {
      return bad(c, 'Unit cost must be non-negative');
    }

    const repo = new D1Repository(c.env.DB);
    try {
      await repo.adjustStock(id, quantity, unitCost || 0, isFromProductForm || false);
      return ok(c, { success: true });
    } catch (error: any) {
      return bad(c, error.message);
    }
  });

  // ==================== SALES ====================

  app.get('/api/sales', async (c) => {
    const repo = new D1Repository(c.env.DB);
    const sales = await repo.getSales();
    return ok(c, sales);
  });

  app.post('/api/sales', async (c) => {
    const body = (await c.req.json()) as SaleFormValues & { saleType?: 'retail' | 'display' };
    const { items } = body;
    const repo = new D1Repository(c.env.DB);

    try {
      const stockUpdates: Array<{ stockDetailId: string; newQuantity: number; shouldDelete: boolean }> = [];
      const productUpdates: Array<{ productId: string; quantityReduction: number }> = [];

      const saleItemsWithCost = await Promise.all(items.map(async (item) => {
        const { productId, quantity, price } = item;

        // Get product to check qtyPerUnit
        const product = await repo.getProduct(productId);
        const qtyPerUnit = product?.qtyPerUnit || 1;

        // Actual stock to deduct = quantity sold * qtyPerUnit
        const stockToDeduct = quantity * qtyPerUnit;

        // Get FIFO batches
        const stocks = await repo.getStockDetails(productId);
        const batches = stocks.filter(s => s.quantity > 0).sort((a, b) => a.createdAt - b.createdAt);

        let remaining = stockToDeduct;
        let totalCost = 0;

        for (const batch of batches) {
          if (remaining === 0) break;

          const consume = Math.min(batch.quantity, remaining);
          totalCost += consume * batch.unitCost;
          remaining -= consume;

          // Prepare stock update (don't execute yet)
          const newQty = batch.quantity - consume;
          stockUpdates.push({
            stockDetailId: batch.id,
            newQuantity: newQty,
            shouldDelete: newQty === 0
          });
        }

        if (remaining > 0) {
          throw new Error(`Insufficient stock for product ${productId}. Need ${stockToDeduct}, available ${stockToDeduct - remaining}`);
        }

        // Prepare product update (don't execute yet)
        // Use stockToDeduct (quantity * qtyPerUnit) for actual stock reduction
        productUpdates.push({
          productId,
          quantityReduction: stockToDeduct
        });

        // Average cost per unit sold (not per pcs)
        const avgCost = totalCost / quantity;
        return { ...item, cost: avgCost };
      }));

      const total = saleItemsWithCost.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const totalCost = saleItemsWithCost.reduce((sum, i) => sum + (i.cost * i.quantity), 0);
      const profit = total - totalCost;

      const sale: Sale = {
        id: crypto.randomUUID(),
        items: saleItemsWithCost,
        total,
        profit,
        saleType: body.saleType || 'retail',
        notes: body.notes || '',
        createdAt: Date.now()
      };

      // Execute all updates atomically in one transaction
      await repo.createSaleWithStockUpdate(sale, stockUpdates, productUpdates);
      return ok(c, sale);

    } catch (error: any) {
      return bad(c, error.message);
    }
  });

  app.delete('/api/sales/:id', async (c) => {
    const { id } = c.req.param();
    const repo = new D1Repository(c.env.DB);

    try {
      const sale = await repo.getSale(id);
      if (!sale) return notFound(c, 'Sale not found.');

      // Return stock for each item (tanpa membuat transaksi pembelian baru)
      for (const item of sale.items) {
        // Check if product still exists
        const product = await repo.getProduct(item.productId);
        if (!product) {
          console.warn(`Product ${item.productId} not found, skipping stock return`);
          continue;
        }

        // Calculate actual stock to return (considering qtyPerUnit for bundle products)
        const qtyPerUnit = product.qtyPerUnit || 1;
        const stockToReturn = item.quantity * qtyPerUnit;
        // Cost per pcs (item.cost is cost per unit sold, so divide by qtyPerUnit)
        const costPerPcs = item.cost / qtyPerUnit;

        // Buat stock detail baru untuk item yang dikembalikan
        // Gunakan special purchaseId untuk tracking (tetap perlu karena foreign key)
        const returnPurchaseId = `return-${sale.id}-${item.productId}`;

        // Buat hidden purchase record (tidak akan muncul di daftar karena filter di getPurchases)
        const returnPurchase: Purchase = {
          id: returnPurchaseId,
          productId: item.productId,
          productName: item.productName,
          quantity: stockToReturn,
          unitCost: costPerPcs,
          totalCost: stockToReturn * costPerPcs,
          supplierId: 'stock-return', // Special flag untuk filter
          notes: `[SYSTEM] Stok dikembalikan otomatis dari penghapusan transaksi penjualan`,
          createdAt: Date.now()
        };
        await repo.createPurchase(returnPurchase);

        // Buat stock detail untuk item yang dikembalikan
        const stockDetail: StockDetail = {
          id: crypto.randomUUID(),
          productId: item.productId,
          quantity: stockToReturn,
          unitCost: costPerPcs,
          purchaseId: returnPurchaseId,
          createdAt: Date.now()
        };
        await repo.createStockDetail(stockDetail);

        // Update product totalStock
        await repo.updateProduct(item.productId, {
          totalStock: (product.totalStock || 0) + stockToReturn
        });
      }

      await repo.deleteSale(id);
      return ok(c, { id });
    } catch (error: any) {
      console.error('Delete sale error:', error);
      return bad(c, error.message || 'Failed to delete sale');
    }
  });

  // ==================== OPNAME ====================

  app.post('/api/opname', async (c) => {
    try {
      const payload = await c.req.json<OpnamePayload>();
      const repo = new D1Repository(c.env.DB);
      await repo.createOpname(payload);
      return ok(c, { success: true });
    } catch (error: any) {
      console.error('Failed to create opname:', error);
      return bad(c, error.message || 'Failed to create opname');
    }
  });

  // ==================== PURCHASES ====================

  app.get('/api/purchases', async (c) => {
    const repo = new D1Repository(c.env.DB);
    const purchases = await repo.getPurchases();
    return ok(c, purchases);
  });

  app.post('/api/purchases', async (c) => {
    const body = (await c.req.json()) as any;
    const repo = new D1Repository(c.env.DB);

    const product = await repo.getProduct(body.productId);
    if (!product) return notFound(c, 'Product not found.');

    // Calculate quantities (handle pack mode)
    let totalUnits = body.quantity;
    let costPerUnit = body.unitCost;

    if (body.packQuantity && body.unitsPerPack) {
      totalUnits = body.packQuantity * body.unitsPerPack;
      costPerUnit = body.unitCost / body.unitsPerPack;
    }

    // Create purchase record
    const purchase: Purchase = {
      id: crypto.randomUUID(),
      productId: body.productId,
      productName: product.name,
      quantity: totalUnits,
      unitCost: costPerUnit,
      packQuantity: body.packQuantity,
      unitsPerPack: body.unitsPerPack,
      supplierId: body.supplierId || body.supplier,
      totalCost: totalUnits * costPerUnit,
      notes: body.notes || '',
      createdAt: Date.now()
    };

    await repo.createPurchase(purchase);

    // Create stock detail (for FIFO)
    const stockDetail: StockDetail = {
      id: crypto.randomUUID(),
      productId: body.productId,
      quantity: totalUnits,
      unitCost: costPerUnit,
      purchaseId: purchase.id,
      createdAt: Date.now()
    };

    await repo.createStockDetail(stockDetail);

    // Update product totalStock
    const newTotalStock = (product.totalStock || 0) + totalUnits;
    await repo.updateProduct(product.id, { totalStock: newTotalStock });

    return ok(c, purchase);
  });

  app.delete('/api/purchases/:id', async (c) => {
    const { id } = c.req.param();
    const repo = new D1Repository(c.env.DB);

    const purchase = await repo.getPurchase(id);
    if (!purchase) return notFound(c, 'Purchase not found.');

    const stockDetail = await repo.getStockDetailByPurchaseId(id);

    // Validation: Check if stock is still intact
    if (!stockDetail) {
      return bad(c, 'Pembelian tidak dapat dihapus karena stok sudah habis terjual.');
    }

    if (stockDetail.quantity < purchase.quantity) {
      return bad(c, 'Pembelian tidak dapat dihapus karena sebagian stok sudah terjual.');
    }

    // Delete stock detail
    await repo.deleteStockDetail(stockDetail.id);

    // Update product totalStock
    const product = await repo.getProduct(purchase.productId);
    if (product) {
      await repo.updateProduct(purchase.productId, {
        totalStock: Math.max(0, (product.totalStock || 0) - purchase.quantity)
      });
    }

    await repo.deletePurchase(id);
    return ok(c, { id });
  });

  // ==================== SUPPLIERS ====================

  app.get('/api/suppliers', async (c) => {
    const repo = new D1Repository(c.env.DB);
    const suppliers = await repo.getSuppliers();
    return ok(c, suppliers);
  });

  app.post('/api/suppliers', async (c) => {
    const body = (await c.req.json()) as Partial<Supplier>;

    if (!body.name) {
      return bad(c, 'Supplier name is required.');
    }

    const repo = new D1Repository(c.env.DB);

    const supplier: Supplier = {
      id: crypto.randomUUID(),
      name: body.name,
      contactPerson: body.contactPerson || '',
      address: body.address || '',
      createdAt: Date.now()
    };

    await repo.createSupplier(supplier);
    return ok(c, supplier);
  });

  app.put('/api/suppliers/:id', async (c) => {
    const { id } = c.req.param();
    const updates = (await c.req.json()) as Partial<Supplier>;
    const repo = new D1Repository(c.env.DB);

    await repo.updateSupplier(id, updates);
    return ok(c, { id, ...updates });
  });

  app.delete('/api/suppliers/:id', async (c) => {
    const { id } = c.req.param();
    const repo = new D1Repository(c.env.DB);

    const deleted = await repo.deleteSupplier(id);
    if (!deleted) return notFound(c, 'Supplier not found.');

    return ok(c, { id });
  });

  // ==================== JAJANAN REQUESTS ====================

  app.get('/api/jajanan-requests', async (c) => {
    const repo = new D1Repository(c.env.DB);
    const requests = await repo.getJajananRequests();
    return ok(c, requests);
  });

  app.post('/api/jajanan-requests', async (c) => {
    const body = (await c.req.json()) as Partial<JajananRequest>;

    if (!body.requesterName || !body.snackName || !body.quantity) {
      return bad(c, 'Missing required fields.');
    }

    const repo = new D1Repository(c.env.DB);

    const request: JajananRequest = {
      id: crypto.randomUUID(),
      requesterName: body.requesterName,
      snackName: body.snackName,
      quantity: body.quantity,
      notes: body.notes || '',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await repo.createJajananRequest(request);
    return ok(c, request);
  });

  app.put('/api/jajanan-requests/:id', async (c) => {
    const { id } = c.req.param();
    const { status } = (await c.req.json()) as { status: JajananRequest['status'] };

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return bad(c, 'Invalid status value.');
    }

    const repo = new D1Repository(c.env.DB);
    await repo.updateJajananRequestStatus(id, status);

    return ok(c, { id, status });
  });

  // ==================== STOCK DETAILS ====================

  app.get('/api/stock-details/:productId', async (c) => {
    const { productId } = c.req.param();
    const repo = new D1Repository(c.env.DB);

    const stockDetails = await repo.getStockDetails(productId);
    return ok(c, stockDetails);
  });

  // ==================== FEEDBACK ====================

  app.post('/api/feedback', async (c) => {
    const body = (await c.req.json()) as Partial<JajananRequest>;

    if (!body.requesterName || !body.productName) {
      return bad(c, 'Missing required fields.');
    }

    const repo = new D1Repository(c.env.DB);

    const request: JajananRequest = {
      id: crypto.randomUUID(),
      productId: body.productId || '',
      requesterName: body.requesterName,
      snackName: body.productName,
      quantity: body.quantity || 0,
      notes: body.notes || '',
      requestType: body.requestType || 'feedback',
      status: 'pending',
      isRead: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await repo.createJajananRequest(request);
    return ok(c, request);
  });

  app.get('/api/feedback/unread-count', async (c) => {
    const repo = new D1Repository(c.env.DB);
    const requests = await repo.getJajananRequests();
    const unreadCount = requests.filter(r => !r.isRead).length;
    return ok(c, { count: unreadCount });
  });

  app.put('/api/feedback/:id/mark-read', async (c) => {
    const { id } = c.req.param();
    const repo = new D1Repository(c.env.DB);

    await repo.updateJajananRequest(id, { isRead: true, updatedAt: Date.now() });
    return ok(c, { success: true });
  });

  // ==================== AI ====================

  app.post('/api/ai/generate-description', async (c) => {
    try {
      const { productName, category, price } = await c.req.json();

      if (!productName) {
        return bad(c, 'Product name is required');
      }

      // Simple template-based description for now
      // TODO: Integrate Cloudflare Workers AI when binding is configured
      const templates: Record<string, string> = {
        'Makanan': `${productName} adalah camilan lezat yang cocok untuk menemani hari Anda. Dijual dengan harga terjangkau Rp ${price.toLocaleString('id-ID')}.`,
        'Minuman': `Nikmati kesegaran ${productName} yang menyegarkan. Sempurna untuk menghilangkan dahaga dengan harga Rp ${price.toLocaleString('id-ID')}.`,
        'Snack': `${productName} adalah pilihan sempurna untuk camilan Anda. Harga hemat hanya Rp ${price.toLocaleString('id-ID')}.`,
        'default': `${productName} berkualitas dengan harga Rp ${price.toLocaleString('id-ID')}. Stok terbatas, segera pesan sekarang!`
      };

      const description = templates[category] || templates.default;

      return ok(c, { description });
    } catch (error: any) {
      console.error('AI description error:', error);
      return bad(c, 'Failed to generate description');
    }
  });

  // ==================== SETTINGS ====================

  // Get setting by key
  app.get('/api/settings/:key', async (c) => {
    const { key } = c.req.param();
    const repo = new D1Repository(c.env.DB);

    try {
      const result = await c.env.DB
        .prepare('SELECT value FROM settings WHERE key = ?')
        .bind(key)
        .first<{ value: string }>();

      if (!result) {
        // Return default value for initial_balance
        if (key === 'initial_balance') {
          return ok(c, { key, value: '0' });
        }
        return notFound(c, 'Setting not found');
      }

      return ok(c, { key, value: result.value });
    } catch (error: any) {
      console.error('Error fetching setting:', error);
      return bad(c, 'Failed to fetch setting');
    }
  });

  // Update or create setting
  app.put('/api/settings/:key', async (c) => {
    const { key } = c.req.param();
    const { value } = await c.req.json<{ value: string }>();

    if (value === undefined) {
      return bad(c, 'Value is required');
    }

    try {
      const now = Date.now();

      await c.env.DB
        .prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
        .bind(key, value, now)
        .run();

      return ok(c, { key, value, updated_at: now });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      return bad(c, 'Failed to update setting');
    }
  });

  app.post('/api/reset-all-data', async (c) => {
    try {
      const repo = new D1Repository(c.env.DB);
      await repo.resetAllData();
      return ok(c, { message: 'All data reset successfully' });
    } catch (error) {
      console.error('Reset error:', error);
      return bad(c, 'Failed to reset data');
    }
  });

  // ==================== RECONCILIATION (TERPADU) ====================

  // Get all reconciliations
  app.get('/api/reconciliations', async (c) => {
    const repo = new D1Repository(c.env.DB);
    try {
      const reconciliations = await repo.getReconciliations();
      return ok(c, reconciliations);
    } catch (error: any) {
      console.error('Error fetching reconciliations:', error);
      return bad(c, 'Failed to fetch reconciliations');
    }
  });

  // Get single reconciliation
  app.get('/api/reconciliations/:id', async (c) => {
    const { id } = c.req.param();
    const repo = new D1Repository(c.env.DB);
    try {
      const reconciliation = await repo.getReconciliation(id);
      if (!reconciliation) return notFound(c, 'Reconciliation not found');
      return ok(c, reconciliation);
    } catch (error: any) {
      console.error('Error fetching reconciliation:', error);
      return bad(c, 'Failed to fetch reconciliation');
    }
  });

  // Create reconciliation (terpadu)
  app.post('/api/reconciliations', async (c) => {
    try {
      const payload = await c.req.json<ReconciliationPayload>();
      const repo = new D1Repository(c.env.DB);

      // Get all products for reference
      const products = await repo.getProducts();
      const productMap = new Map(products.map(p => [p.id, p]));

      // Calculate current stock for each product
      const stockPromises = products.map(async (p) => {
        const stocks = await repo.getStockDetails(p.id);
        const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
        return { productId: p.id, totalStock };
      });
      const stockData = await Promise.all(stockPromises);
      const stockMap = new Map(stockData.map(s => [s.productId, s.totalStock]));

      // Get expected cash (from system - we use 0 as baseline for self-service)
      // In self-service mode, all QRIS payments go to bank, so expected cash drawer = 0
      const expectedCash = 0;

      // Process stock items
      const stockItems: ReconciliationStockItem[] = [];
      let totalStockValue = 0;
      let totalStockCost = 0;

      for (const item of payload.stockItems) {
        const product = productMap.get(item.productId);
        if (!product) continue;

        const systemStock = stockMap.get(item.productId) || 0;
        const physicalStock = item.physicalStock;
        const difference = physicalStock - systemStock; // negative = sold/missing

        if (difference !== 0) {
          // Get average cost from stock details
          const stocks = await repo.getStockDetails(item.productId);
          const totalQty = stocks.reduce((sum, s) => sum + s.quantity, 0);
          const totalCostValue = stocks.reduce((sum, s) => sum + (s.quantity * s.unitCost), 0);
          const avgCost = totalQty > 0 ? totalCostValue / totalQty : product.cost || (product.price * 0.7);

          const itemValue = Math.abs(difference) * product.price;
          const itemCost = Math.abs(difference) * avgCost;

          stockItems.push({
            productId: item.productId,
            productName: product.name,
            systemStock,
            physicalStock,
            difference,
            unitPrice: product.price,
            unitCost: avgCost,
            totalValue: itemValue
          });

          // Only count items where stock decreased (sold)
          if (difference < 0) {
            totalStockValue += itemValue;
            totalStockCost += itemCost;
          }
        }
      }

      const cashDifference = payload.actualCash - expectedCash;
      const unidentifiedAmount = cashDifference - totalStockValue;

      // Generate sales for items with negative difference (sold)
      const generatedSaleIds: string[] = [];
      const soldItems = stockItems.filter(item => item.difference < 0);

      if (soldItems.length > 0) {
        // Create a single sale with all sold items
        const saleItems = soldItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Math.abs(item.difference),
          price: item.unitPrice,
          cost: item.unitCost
        }));

        const total = saleItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const totalCost = saleItems.reduce((sum, i) => sum + (i.cost * i.quantity), 0);
        const profit = total - totalCost;

        const sale: Sale = {
          id: crypto.randomUUID(),
          items: saleItems,
          total,
          profit,
          saleType: 'retail', // Mark as cash reconciliation sale
          notes: `[REKON] Penjualan cash dari rekonsiliasi terpadu`,
          createdAt: Date.now()
        };

        // Update stock for each sold item
        for (const item of soldItems) {
          const product = productMap.get(item.productId);
          if (!product) continue;

          // Adjust stock to physical count
          await repo.adjustStock(item.productId, item.physicalStock, item.unitCost, false);
        }

        // Save the sale (without deducting stock again since we already adjusted)
        await repo.createSale(sale);
        generatedSaleIds.push(sale.id);
      }

      // Handle items with positive difference (stock gained - rare case)
      const gainedItems = stockItems.filter(item => item.difference > 0);
      for (const item of gainedItems) {
        // Just adjust stock to physical count
        await repo.adjustStock(item.productId, item.physicalStock, item.unitCost, false);
      }

      // Create reconciliation record
      const today = new Date().toISOString().split('T')[0];
      const reconciliation: Reconciliation = {
        id: crypto.randomUUID(),
        date: today,
        expectedCash,
        actualCash: payload.actualCash,
        cashDifference,
        stockItems,
        totalStockValue,
        totalStockCost,
        unidentifiedAmount,
        generatedSaleIds,
        notes: payload.notes,
        createdAt: Date.now(),
        status: Math.abs(unidentifiedAmount) > 1000 ? 'has_discrepancy' : 'completed'
      };

      await repo.createReconciliation(reconciliation);

      return ok(c, reconciliation);
    } catch (error: any) {
      console.error('Failed to create reconciliation:', error);
      return bad(c, error.message || 'Failed to create reconciliation');
    }
  });

  // Delete reconciliation
  app.delete('/api/reconciliations/:id', async (c) => {
    const { id } = c.req.param();
    const repo = new D1Repository(c.env.DB);
    try {
      const deleted = await repo.deleteReconciliation(id);
      if (!deleted) return notFound(c, 'Reconciliation not found');
      return ok(c, { id });
    } catch (error: any) {
      console.error('Error deleting reconciliation:', error);
      return bad(c, 'Failed to delete reconciliation');
    }
  });
}