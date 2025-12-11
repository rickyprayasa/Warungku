-- Migration: Add description, productId, requestType, isRead fields
-- Date: 2025-11-20

-- Add description to products
ALTER TABLE products ADD COLUMN description TEXT DEFAULT '';

-- Add new fields to snack_requests
ALTER TABLE snack_requests ADD COLUMN productId TEXT DEFAULT '';
ALTER TABLE snack_requests ADD COLUMN requestType TEXT DEFAULT 'stock_request';
ALTER TABLE snack_requests ADD COLUMN isRead INTEGER DEFAULT 0;
