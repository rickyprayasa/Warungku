-- Add settings table for storing configuration like initial balance
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Insert default initial balance
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('initial_balance', '0', strftime('%s', 'now') * 1000);
