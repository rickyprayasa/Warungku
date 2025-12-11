import { Hono } from 'hono';
import type { Env } from '../types';

const settingsRouter = new Hono<{ Bindings: Env }>();

// Get setting by key
settingsRouter.get('/:key', async (c) => {
    const key = c.req.param('key');
    const db = c.env.DB;

    try {
        const result = await db
            .prepare('SELECT value FROM settings WHERE key = ?')
            .bind(key)
            .first<{ value: string }>();

        if (!result) {
            return c.json({ error: 'Setting not found' }, 404);
        }

        return c.json({ key, value: result.value });
    } catch (error) {
        console.error('Error fetching setting:', error);
        return c.json({ error: 'Failed to fetch setting' }, 500);
    }
});

// Update or create setting
settingsRouter.put('/:key', async (c) => {
    const key = c.req.param('key');
    const { value } = await c.req.json<{ value: string }>();
    const db = c.env.DB;

    if (value === undefined) {
        return c.json({ error: 'Value is required' }, 400);
    }

    try {
        const now = Date.now();

        await db
            .prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
            .bind(key, value, now)
            .run();

        return c.json({ key, value, updated_at: now });
    } catch (error) {
        console.error('Error updating setting:', error);
        return c.json({ error: 'Failed to update setting' }, 500);
    }
});

export default settingsRouter;
