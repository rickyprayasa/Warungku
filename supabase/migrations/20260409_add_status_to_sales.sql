-- Migration: Add status column to sales table
-- Allows tracking of 'pending' (piutang), 'completed', and 'cancelled' sales.

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'completed';

-- Optional comment explaining the column
COMMENT ON COLUMN sales.status IS 'Payment status: pending (piutang), completed, or cancelled';
