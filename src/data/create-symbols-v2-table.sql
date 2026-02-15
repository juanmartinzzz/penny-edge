-- DROP TABLE IF EXISTS penny_edge_symbols_v2;

-- Create symbols_v2 table for comprehensive market snapshot data
CREATE TABLE IF NOT EXISTS penny_edge_symbols_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_currently_warm BOOLEAN DEFAULT FALSE,

  -- Basic symbol information
  symbol TEXT NOT NULL,
  short_name TEXT,
  long_name TEXT,
  exchange TEXT,
  currency TEXT,
  quote_type TEXT,

  -- Price data
  regular_market_price DECIMAL(15,4),
  regular_market_change DECIMAL(15,4),
  regular_market_change_percent DECIMAL(10,4),

  -- Market data
  market_cap BIGINT,
  regular_market_volume BIGINT,
  average_daily_volume_10day BIGINT,
  average_daily_volume_3month BIGINT,
  fifty_day_average DECIMAL(15,4),

  -- Price ranges
  fifty_two_week_high DECIMAL(15,4),
  fifty_two_week_low DECIMAL(15,4),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create unique index on symbol to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_penny_edge_symbols_v2_symbol ON penny_edge_symbols_v2(symbol) WHERE deleted_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_penny_edge_symbols_v2_exchange ON penny_edge_symbols_v2(exchange) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_penny_edge_symbols_v2_updated_at ON penny_edge_symbols_v2(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_penny_edge_symbols_v2_is_currently_warm ON penny_edge_symbols_v2(is_currently_warm) WHERE deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_timestamp_trigger_v2 BEFORE UPDATE ON penny_edge_symbols_v2 FOR EACH ROW EXECUTE FUNCTION update_timestamp();