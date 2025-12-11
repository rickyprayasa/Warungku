-- Migration: Add reconciliations table for terpadu mode
-- This stores the history of cash + stock reconciliations

CREATE TABLE IF NOT EXISTS reconciliations (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    expectedCash REAL DEFAULT 0,
    actualCash REAL DEFAULT 0,
    cashDifference REAL DEFAULT 0,
    stockItems TEXT DEFAULT '[]',
    totalStockValue REAL DEFAULT 0,
    totalStockCost REAL DEFAULT 0,
    unidentifiedAmount REAL DEFAULT 0,
    generatedSaleIds TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    status TEXT DEFAULT 'completed'
);

-- Index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_reconciliations_date ON reconciliations(date);
CREATE INDEX IF NOT EXISTS idx_reconciliations_createdAt ON reconciliations(createdAt);
