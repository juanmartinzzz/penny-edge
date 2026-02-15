import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, SYMBOLS_V2_TABLE } from '@/lib/supabase';

interface WarmSymbol {
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

export async function GET(request: NextRequest) {
  try {
    // Fetch all warm symbols from the database
    const { data: warmSymbols, error } = await supabaseAdmin
      .from(SYMBOLS_V2_TABLE)
      .select('*')
      .eq('is_currently_warm', true)
      .is('deleted_at', null)
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error fetching warm symbols:', error);
      return NextResponse.json(
        { error: 'Failed to fetch warm symbols from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      warmSymbols: warmSymbols as WarmSymbol[],
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