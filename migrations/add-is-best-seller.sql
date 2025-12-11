-- Migration: Add isBestSeller column to products table
ALTER TABLE products ADD COLUMN isBestSeller INTEGER DEFAULT 0;
