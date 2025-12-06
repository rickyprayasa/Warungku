-- Add notes fields to sales and purchases tables
-- Generated: 2025-11-21

-- Add notes to sales table
ALTER TABLE sales ADD COLUMN notes TEXT DEFAULT '';

-- Add notes and totalCost to purchases table  
ALTER TABLE purchases ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE purchases ADD COLUMN totalCost REAL DEFAULT 0;

-- Update existing purchases with calculated totalCost
UPDATE purchases SET totalCost = quantity * unitCost WHERE totalCost = 0;
