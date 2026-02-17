import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, SYMBOLS_V2_TABLE } from '@/lib/supabase';
import { AveragePriceData } from '@/types/symbol';

interface BaseWarmSymbol {
  id: string;
  symbol: string;
  short_name: string | null;
  long_name: string | null;
  exchange: string | null;
  currency: string | null;
  quote_type: string | null;
  regular_market_price: number | null;
  regular_market_change: number | null;
  regular_market_change_percent: number | null;
  market_cap: number | null;
  regular_market_volume: number | null;
  average_daily_volume_10day: number | null;
  average_daily_volume_3month: number | null;
  fifty_day_average: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  is_currently_warm: boolean;
  created_at: string;
  updated_at: string;
}

interface WarmSymbol extends BaseWarmSymbol {
  hotness_score?: number | null;
  recent_prices?: AveragePriceData | null;
  last_updated_hotness_score?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Determine which fields to select
    const selectFields = 'id, symbol, short_name, long_name, exchange, currency, quote_type, regular_market_price, regular_market_change, regular_market_change_percent, market_cap, regular_market_volume, average_daily_volume_10day, average_daily_volume_3month, fifty_day_average, fifty_two_week_high, fifty_two_week_low, is_currently_warm, hotness_score, recent_prices, last_updated_hotness_score, created_at, updated_at';

    // Fetch all warm symbols from the database
    const { data: warmSymbols, error } = await supabaseAdmin
      .from(SYMBOLS_V2_TABLE)
      .select(selectFields)
      .eq('is_currently_warm', true)
      .is('deleted_at', null)
      .order('hotness_score', { ascending: false, nullsFirst: false })
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error fetching warm symbols:', error);
      return NextResponse.json(
        { error: 'Failed to fetch warm symbols from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      warmSymbols: (warmSymbols as any) || [],
      count: warmSymbols?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in warm-symbols API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}