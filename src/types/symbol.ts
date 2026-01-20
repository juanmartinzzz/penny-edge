// Types for average price data (matches average-prices endpoint structure)
export interface AveragePricePeriod {
  name: string;
  startDaysAgo: number;
  endDaysAgo: number;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  changePercent?: number;
  changeAbsolute?: number;
  direction?: 'up' | 'down';
}

export interface AveragePriceData {
  symbol: string;
  periods: AveragePricePeriod[];
}

// Original Symbol interface for CSV data
export interface Symbol {
  code: string;
  name: string;
  country: string;
  exchange: string;
  currency: string;
  type: string;
  isin?: string;
}

// Database Symbol entity interface
export interface SymbolEntity {
  id: string;
  code: string;
  exchange: string;
  recent_prices?: AveragePriceData;
  last_updated_recent_prices?: string; // ISO timestamp string
  created_at: string; // ISO timestamp string (Supabase standard)
  updated_at: string;
  deleted_at?: string; // For soft-delete support (ISO timestamp)
}

// Input types for operations
export interface CreateSymbolInput {
  code: string;
  exchange: string;
  recent_prices?: AveragePriceData;
}

export interface UpdateSymbolInput {
  code?: string;
  exchange?: string;
  recent_prices?: AveragePriceData;
}