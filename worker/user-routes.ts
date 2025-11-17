import { Hono } from "hono";
import type { Env } from './core-utils';
import { ProductEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { Product } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Ensure seed data is created on first load
  app.get('/api/init', async (c) => {
    await ProductEntity.ensureSeed(c.env);
    return ok(c, { seeded: true });
  });
  // PRODUCTS
  app.get('/api/products', async (c) => {
    await ProductEntity.ensureSeed(c.env);
    const page = await ProductEntity.list(c.env);
    return ok(c, page.items);
  });
  app.post('/api/products', async (c) => {
    const { name, price, category, imageUrl } = (await c.req.json()) as Partial<Product>;
    if (!name || price === undefined || !category || !imageUrl) {
      return bad(c, 'Missing required product fields.');
    }
    const productData: Product = {
      id: crypto.randomUUID(),
      name,
      price,
      category,
      imageUrl,
    };
    const newProduct = await ProductEntity.create(c.env, productData);
    return ok(c, newProduct);
  });
  app.put('/api/products/:id', async (c) => {
    const { id } = c.req.param();
    const { name, price, category, imageUrl } = (await c.req.json()) as Partial<Product>;
    const product = new ProductEntity(c.env, id);
    if (!(await product.exists())) {
      return notFound(c, 'Product not found.');
    }
    await product.patch({ name, price, category, imageUrl });
    return ok(c, await product.getState());
  });
  app.delete('/api/products/:id', async (c) => {
    const { id } = c.req.param();
    const existed = await ProductEntity.delete(c.env, id);
    if (!existed) {
      return notFound(c, 'Product not found.');
    }
    return ok(c, { id });
  });
}