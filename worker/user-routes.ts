import { Hono } from "hono";
import type { Env } from './core-utils';
import { ProductEntity, TransactionEntity } from "./entities";
import { ok, bad } from './core-utils';
import type { TransactionItem } from "@shared/types";
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
  // TRANSACTIONS
  app.post('/api/transactions', async (c) => {
    const { items, total } = (await c.req.json()) as { items?: TransactionItem[], total?: number };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return bad(c, 'Transaction must include items.');
    }
    if (typeof total !== 'number' || total <= 0) {
      return bad(c, 'Invalid total amount.');
    }
    const transactionData = {
      id: crypto.randomUUID(),
      items,
      total,
      createdAt: Date.now(),
    };
    const transaction = await TransactionEntity.create(c.env, transactionData);
    return ok(c, transaction);
  });
}