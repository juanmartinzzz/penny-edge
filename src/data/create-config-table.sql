-- DROP TABLE IF EXISTS penny_edge_config;

-- Create config table for storing generic JSONB configuration data
CREATE TABLE IF NOT EXISTS penny_edge_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,

  -- Metadata for cache management
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create unique index on config_key to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_penny_edge_config_key ON penny_edge_config(config_key) WHERE deleted_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_penny_edge_config_created_at ON penny_edge_config(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_penny_edge_config_updated_at ON penny_edge_config(updated_at DESC) WHERE deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_timestamp_trigger_config BEFORE UPDATE ON penny_edge_config FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Example usage for Yahoo Finance API credentials:
INSERT INTO penny_edge_config (config_key, config_value, description, expires_at) VALUES (
  'yahoo_finance_auth',
  '{
    "cookie": "your-cookie-value",
    "crumb": "your-crumb-value",
    "timestamp": "2024-01-01T12:00:00Z",
    "stale_after_minutes": 60
  }',
  'Yahoo Finance API authentication credentials',
  NOW() + INTERVAL '30 minutes'
);