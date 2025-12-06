-- Migration: Add promo fields to products
-- Date: 2025-11-20

ALTER TABLE products ADD COLUMN isPromo INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN promoPrice REAL DEFAULT 0;
