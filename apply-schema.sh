#!/bin/bash
# Script to apply D1 schema to remote database

echo "Applying schema to warungku_db..."

# Create products table
npx wrangler d1 execute warungku_db --remote --command "CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, cost REAL DEFAULT 0, imageUrl TEXT DEFAULT '', category TEXT DEFAULT '', totalStock INTEGER DEFAULT 0, createdAt INTEGER NOT NULL);"

# Create sales table
npx wrangler d1 execute warungku_db --remote --command "CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, total REAL NOT NULL, profit REAL NOT NULL, saleType TEXT DEFAULT 'retail', createdAt INTEGER NOT NULL);"

# Create sale_items table
npx wrangler d1 execute warungku_db --remote --command "CREATE TABLE IF NOT EXISTS sale_items (id TEXT PRIMARY KEY, saleId TEXT NOT NULL, productId TEXT NOT NULL, productName TEXT NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL, cost REAL NOT NULL, FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE);"

# Create purchases table
npx wrangler d1 execute warungku_db --remote --command "CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, productId TEXT NOT NULL, productName TEXT NOT NULL, quantity INTEGER NOT NULL, unitCost REAL NOT NULL, packQuantity INTEGER, unitsPerPack INTEGER, supplierId TEXT, createdAt INTEGER NOT NULL, FOREIGN KEY (productId) REFERENCES products(id));"

# Create stock_details table
npx wrangler d1 execute warungku_db --remote --command "CREATE TABLE IF NOT EXISTS stock_details (id TEXT PRIMARY KEY, productId TEXT NOT NULL, quantity INTEGER NOT NULL, unitCost REAL NOT NULL, purchaseId TEXT NOT NULL, createdAt INTEGER NOT NULL, FOREIGN KEY (productId) REFERENCES products(id), FOREIGN KEY (purchaseId) REFERENCES purchases(id));"

# Create suppliers table
npx wrangler d1 execute warungku_db --remote --command "CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, contactPerson TEXT DEFAULT '', phone TEXT DEFAULT '', address TEXT DEFAULT '', createdAt INTEGER NOT NULL);"

# Create snack_requests table
npx wrangler d1 execute warungku_db --remote --command "CREATE TABLE IF NOT EXISTS snack_requests (id TEXT PRIMARY KEY, requesterName TEXT NOT NULL, snackName TEXT NOT NULL, quantity INTEGER NOT NULL, notes TEXT DEFAULT '', status TEXT DEFAULT 'pending', createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);"

# Create indexes
echo "Creating indexes..."
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_sale_items_saleId ON sale_items(saleId);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_sale_items_productId ON sale_items(productId);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_stock_details_productId ON stock_details(productId);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_stock_details_createdAt ON stock_details(productId, createdAt);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_purchases_productId ON purchases(productId);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_purchases_createdAt ON purchases(createdAt);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_sales_createdAt ON sales(createdAt);"
npx wrangler d1 execute warungku_db --remote --command "CREATE INDEX IF NOT EXISTS idx_sales_saleType ON sales(saleType);"

echo "✅ Schema applied successfully!"
