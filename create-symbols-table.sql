-- DROP TABLE IF EXISTS penny_edge_symbols;

-- Create symbols table
CREATE TABLE IF NOT EXISTS penny_edge_symbols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  exchange TEXT,
  recent_prices JSONB,
  last_updated_recent_prices TIMESTAMP WITH TIME ZONE,

  -- Represents how much interest an asset has in a scale from 0 to 100
  hotness_score INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create unique index on code to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_penny_edge_symbols_code ON penny_edge_symbols(code) WHERE deleted_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_penny_edge_symbols_exchange ON penny_edge_symbols(exchange) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_penny_edge_symbols_created_at ON penny_edge_symbols(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_penny_edge_symbols_updated_at ON penny_edge_symbols(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_penny_edge_symbols_hotness_score ON penny_edge_symbols(hotness_score DESC) WHERE deleted_at IS NULL;


-- Add global function for updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for created_at, updated_at
CREATE TRIGGER update_timestamp_trigger BEFORE UPDATE ON penny_edge_symbols FOR EACH ROW EXECUTE FUNCTION update_timestamp();