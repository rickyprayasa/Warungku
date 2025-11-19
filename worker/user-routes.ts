import { Hono } from "hono";
import type { Env } from './core-utils';
import { ProductEntity, SaleEntity, PurchaseEntity, SupplierEntity, JajananRequestEntity, StockDetailEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { Product, Sale, SaleFormValues, Purchase, PurchaseFormValues, Supplier, JajananRequest, JajananRequestFormValues, StockDetail } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Ensure seed data is created on first load
  app.get('/api/init', async (c) => {
    await ProductEntity.ensureSeed(c.env);
    await SupplierEntity.ensureSeed(c.env);
    return ok(c, { seeded: true });
  });
  // PRODUCTS
  app.get('/api/products', async (c) => {
    await ProductEntity.ensureSeed(c.env);
    const page = await ProductEntity.list(c.env);
    // Calculate total stock for each product from stock details
    const productsWithStock = await Promise.all(page.items.map(async (product) => {
      const stockPage = await StockDetailEntity.list(c.env);
      const productStocks = stockPage.items.filter(s => s.productId === product.id);
      const totalStock = productStocks.reduce((sum, s) => sum + s.quantity, 0);
      return { ...product, totalStock };
    }));
    return ok(c, productsWithStock);
  });
  app.post('/api/products', async (c) => {
    const { name, price, cost, category, imageUrl } = (await c.req.json()) as Partial<Product>;
    if (!name || price === undefined || !category || !imageUrl) {
      return bad(c, 'Missing required product fields.');
    }
    const productData: Product = {
      id: crypto.randomUUID(),
      name,
      price,
      cost: cost || 0, // Default to 0 if not provided, will be calculated from purchases
      category,
      imageUrl
    };
    const newProduct = await ProductEntity.create(c.env, productData);
    return ok(c, newProduct);
  });
  app.put('/api/products/:id', async (c) => {
    const { id } = c.req.param();
    const { name, price, cost, category, imageUrl } = (await c.req.json()) as Partial<Product>;
    const product = new ProductEntity(c.env, id);
    if (!(await product.exists())) return notFound(c, 'Product not found.');
    await product.patch({ name, price, cost, category, imageUrl });
    return ok(c, await product.getState());
  });
  app.delete('/api/products/:id', async (c) => {
    const { id } = c.req.param();
    const existed = await ProductEntity.delete(c.env, id);
    if (!existed) return notFound(c, 'Product not found.');
    return ok(c, { id });
  });
  // SALES
  app.get('/api/sales', async (c) => {
    const page = await SaleEntity.list(c.env);
    return ok(c, page.items.sort((a, b) => b.createdAt - a.createdAt));
  });
  app.post('/api/sales', async (c) => {
    const body = (await c.req.json()) as SaleFormValues & { saleType?: 'retail' | 'display' };
    const { items } = body;
    // Process each sale item with FIFO
    try {
      const saleItemsWithCost = await Promise.all(items.map(async (item) => {
        const stockPage = await StockDetailEntity.list(c.env);
        // Get stock details for this product, sorted by createdAt (FIFO - oldest first)
        const productStocks = stockPage.items
          .filter(s => s.productId === item.productId && s.quantity > 0)
          .sort((a, b) => a.createdAt - b.createdAt);

        let remainingQty = item.quantity;
        let totalCost = 0;
        const stocksToUpdate: { stock: StockDetail; qtyUsed: number }[] = [];

        // Calculate FIFO cost and determine which stocks to update
        for (const stock of productStocks) {
          if (remainingQty <= 0) break;
          const qtyFromThisBatch = Math.min(remainingQty, stock.quantity);
          totalCost += qtyFromThisBatch * stock.unitCost;
          stocksToUpdate.push({ stock, qtyUsed: qtyFromThisBatch });
          remainingQty -= qtyFromThisBatch;
        }

        // Check if we have enough stock
        if (remainingQty > 0) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${item.quantity - remainingQty}, Requested: ${item.quantity}`);
        }

        // Update stock quantities
        for (const { stock, qtyUsed } of stocksToUpdate) {
          const newQty = stock.quantity - qtyUsed;
          const stockEntity = new StockDetailEntity(c.env, stock.id);
          if (newQty > 0) {
            await stockEntity.patch({ quantity: newQty });
          } else {
            // Delete stock detail if depleted
            await StockDetailEntity.delete(c.env, stock.id);
          }
        }

        const avgCost = totalCost / item.quantity;
        return { ...item, cost: avgCost };
      }));

      const total = saleItemsWithCost.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalCost = saleItemsWithCost.reduce((sum, item) => sum + item.cost * item.quantity, 0);
      const profit = total - totalCost;

      const saleData: Sale = {
        id: crypto.randomUUID(),
        items: saleItemsWithCost,
        total,
        profit,
        saleType: body.saleType || 'retail',
        createdAt: Date.now()
      };
      const newSale = await SaleEntity.create(c.env, saleData);
      return ok(c, newSale);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process sale';
      return bad(c, errorMessage);
    }
  });
  // PURCHASES
  app.get('/api/purchases', async (c) => {
    const page = await PurchaseEntity.list(c.env);
    return ok(c, page.items.sort((a, b) => b.createdAt - a.createdAt));
  });
  app.post('/api/purchases', async (c) => {
    const body = (await c.req.json()) as PurchaseFormValues;
    const { productId, packQuantity, unitsPerPack, supplier } = body;
    let { quantity, unitCost } = body;

    const product = new ProductEntity(c.env, productId);
    if (!(await product.exists())) return notFound(c, 'Product not found.');
    const productState = await product.getState();

    // If pack purchase: calculate total quantity and unit cost
    if (packQuantity && unitsPerPack && packQuantity > 0 && unitsPerPack > 0) {
      quantity = packQuantity * unitsPerPack;
      // unitCost in this case is cost per pack, so we need to divide by unitsPerPack
      unitCost = unitCost / unitsPerPack;
    }

    const totalCost = unitCost * quantity;
    const purchaseId = crypto.randomUUID();
    const purchaseData: Purchase = {
      id: purchaseId,
      productId,
      productName: productState.name,
      quantity,
      packQuantity,
      unitsPerPack,
      unitCost,
      totalCost,
      supplier: supplier || 'N/A',
      createdAt: Date.now()
    };
    const newPurchase = await PurchaseEntity.create(c.env, purchaseData);
    // Create stock detail for FIFO tracking
    const stockDetailData: StockDetail = {
      id: crypto.randomUUID(),
      productId,
      productName: productState.name,
      purchaseId,
      quantity,
      unitCost,
      createdAt: Date.now()
    };
    await StockDetailEntity.create(c.env, stockDetailData);
    return ok(c, newPurchase);
  });
  // SUPPLIERS
  app.get('/api/suppliers', async (c) => {
    await SupplierEntity.ensureSeed(c.env);
    const page = await SupplierEntity.list(c.env);
    return ok(c, page.items);
  });
  app.post('/api/suppliers', async (c) => {
    const { name, contactPerson, phone } = (await c.req.json()) as Partial<Supplier>;
    if (!name || !contactPerson || !phone) return bad(c, 'Missing required supplier fields.');
    const supplierData: Supplier = { id: crypto.randomUUID(), name, contactPerson, phone };
    const newSupplier = await SupplierEntity.create(c.env, supplierData);
    return ok(c, newSupplier);
  });
  app.put('/api/suppliers/:id', async (c) => {
    const { id } = c.req.param();
    const { name, contactPerson, phone } = (await c.req.json()) as Partial<Supplier>;
    const supplier = new SupplierEntity(c.env, id);
    if (!(await supplier.exists())) return notFound(c, 'Supplier not found.');
    await supplier.patch({ name, contactPerson, phone });
    return ok(c, await supplier.getState());
  });
  app.delete('/api/suppliers/:id', async (c) => {
    const { id } = c.req.param();
    const existed = await SupplierEntity.delete(c.env, id);
    if (!existed) return notFound(c, 'Supplier not found.');
    return ok(c, { id });
  });
  // JAJANAN REQUESTS
  app.get('/api/jajanan-requests', async (c) => {
    const page = await JajananRequestEntity.list(c.env);
    return ok(c, page.items.sort((a, b) => b.createdAt - a.createdAt));
  });
  app.post('/api/jajanan-requests', async (c) => {
    const { name, notes } = (await c.req.json()) as JajananRequestFormValues;
    if (!name) return bad(c, 'Missing required field: name');
    const requestData: JajananRequest = {
      id: crypto.randomUUID(),
      name,
      notes,
      status: 'pending',
      createdAt: Date.now(),
    };
    const newRequest = await JajananRequestEntity.create(c.env, requestData);
    return ok(c, newRequest);
  });
  app.put('/api/jajanan-requests/:id', async (c) => {
    const { id } = c.req.param();
    const { status } = (await c.req.json()) as { status: JajananRequest['status'] };
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return bad(c, 'Invalid status value.');
    }
    const request = new JajananRequestEntity(c.env, id);
    if (!(await request.exists())) return notFound(c, 'Request not found.');
    await request.patch({ status, updatedAt: Date.now() });
    return ok(c, await request.getState());
  });
  // STOCK DETAILS
  app.get('/api/stock-details/:productId', async (c) => {
    const { productId } = c.req.param();
    const page = await StockDetailEntity.list(c.env);
    const productStocks = page.items
      .filter(s => s.productId === productId)
      .sort((a, b) => a.createdAt - b.createdAt); // FIFO order
    return ok(c, productStocks);
  });

  // SETTINGS - Reset All Data
  app.post('/api/reset-all-data', async (c) => {
    try {
      // Get all entities and delete them
      const products = await ProductEntity.list(c.env);
      const sales = await SaleEntity.list(c.env);
      const purchases = await PurchaseEntity.list(c.env);
      const suppliers = await SupplierEntity.list(c.env);
      const jajananRequests = await JajananRequestEntity.list(c.env);
      const stockDetails = await StockDetailEntity.list(c.env);

      // Delete all entities
      await Promise.all([
        ...products.items.map(p => ProductEntity.delete(c.env, p.id)),
        ...sales.items.map(s => SaleEntity.delete(c.env, s.id)),
        ...purchases.items.map(p => PurchaseEntity.delete(c.env, p.id)),
        ...suppliers.items.map(s => SupplierEntity.delete(c.env, s.id)),
        ...jajananRequests.items.map(j => JajananRequestEntity.delete(c.env, j.id)),
        ...stockDetails.items.map(s => StockDetailEntity.delete(c.env, s.id)),
      ]);

      return ok(c, { message: 'All data reset successfully' });
    } catch (error) {
      console.error('Reset error:', error);
      return bad(c, 'Failed to reset data');
    }
  });
}