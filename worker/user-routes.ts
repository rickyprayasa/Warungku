import { Hono } from "hono";
import type { Env } from './core-utils';
import { ProductEntity, SaleEntity, PurchaseEntity, SupplierEntity, JajananRequestEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { Product, Sale, SaleFormValues, Purchase, PurchaseFormValues, Supplier, JajananRequest, JajananRequestFormValues } from "@shared/types";
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
    return ok(c, page.items);
  });
  app.post('/api/products', async (c) => {
    const { name, price, cost, category, imageUrl } = (await c.req.json()) as Partial<Product>;
    if (!name || price === undefined || cost === undefined || !category || !imageUrl) {
      return bad(c, 'Missing required product fields.');
    }
    const productData: Product = { id: crypto.randomUUID(), name, price, cost, category, imageUrl };
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
    const { items } = (await c.req.json()) as SaleFormValues;
    const saleItemsWithCost = await Promise.all(items.map(async (item) => {
        const product = new ProductEntity(c.env, item.productId);
        const productState = await product.getState();
        return { ...item, cost: productState.cost || 0 };
    }));
    const total = saleItemsWithCost.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const saleData: Sale = { id: crypto.randomUUID(), items: saleItemsWithCost, total, createdAt: Date.now() };
    const newSale = await SaleEntity.create(c.env, saleData);
    return ok(c, newSale);
  });
  // PURCHASES
  app.get('/api/purchases', async (c) => {
    const page = await PurchaseEntity.list(c.env);
    return ok(c, page.items.sort((a, b) => b.createdAt - a.createdAt));
  });
  app.post('/api/purchases', async (c) => {
    const { productId, quantity, unitCost, supplier } = (await c.req.json()) as PurchaseFormValues;
    const product = new ProductEntity(c.env, productId);
    if (!(await product.exists())) return notFound(c, 'Product not found.');
    const productState = await product.getState();
    const totalCost = unitCost * quantity;
    const purchaseData: Purchase = {
      id: crypto.randomUUID(),
      productId,
      productName: productState.name,
      quantity,
      unitCost,
      totalCost,
      supplier: supplier || 'N/A',
      createdAt: Date.now()
    };
    const newPurchase = await PurchaseEntity.create(c.env, purchaseData);
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
}