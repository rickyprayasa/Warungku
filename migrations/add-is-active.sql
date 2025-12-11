-- Migration: Add isActive column to products table
ALTER TABLE products ADD COLUMN isActive INTEGER DEFAULT 1;
