-- Cleanup old tables from previous schema
-- Run this BEFORE applying new schema

-- Drop old tables (from screenshot)
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS purchase;
DROP TABLE IF EXISTS purchase_item;
DROP TABLE IF EXISTS snack_request;
DROP TABLE IF EXISTS stock_movement;
DROP TABLE IF EXISTS test_table;

-- Also drop any other tables that might exist
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS stock_details;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS snack_requests;
