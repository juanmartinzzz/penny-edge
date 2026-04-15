import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, SYMBOLS_V2_TABLE } from '@/lib/supabase';
import { getAveragePrices, calculateHotnessScore, calculateHotnessScoreV2, DEFAULT_HOTNESS_PARAMS } from '@/lib/price-service';

interface UpdatePricesAndHotnessRequest {
  numberOfDaysInPeriod?: number;
  amountOfPeriods?: number;
  hotnessVersion?: 'v1' | 'v2';
  hotnessParams?: typeof DEFAULT_HOTNESS_PARAMS;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID parameter
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Symbol ID is required' }, { status: 400 });
    }

    // Parse request body
    const body: UpdatePricesAndHotnessRequest = await request.json();
    const {
      numberOfDaysInPeriod = 7,
      amountOfPeriods = 8,
      hotnessVersion = 'v1',
      hotnessParams = DEFAULT_HOTNESS_PARAMS
    } = body;

    // Validate parameters
    if (numberOfDaysInPeriod < 1 || numberOfDaysInPeriod > 30) {
      return NextResponse.json({
        error: 'numberOfDaysInPeriod must be between 1 and 30'
      }, { status: 400 });
    }

    if (amountOfPeriods < 2 || amountOfPeriods > 20) {
      return NextResponse.json({
        error: 'amountOfPeriods must be between 2 and 20'
      }, { status: 400 });
    }

    // Step 1: Get symbol data from database
    const { data: symbolData, error: fetchError } = await supabaseAdmin
      .from(SYMBOLS_V2_TABLE)
      .select('id, symbol, exchange, recent_prices, hotness_score, last_updated_recent_prices, last_updated_hotness_score')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
      }
      console.error('Error fetching symbol:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch symbol' }, { status: 500 });
    }

    if (!symbolData) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }

    console.log(`Processing symbol: ${symbolData.symbol} (${symbolData.exchange})`);

    // Step 2: Fetch recent prices from Yahoo Finance API
    let priceData;
    try {
      priceData = await getAveragePrices(symbolData.symbol, symbolData.exchange, numberOfDaysInPeriod, amountOfPeriods);
      console.log(`Fetched price data with ${priceData.periods.length} periods`);
    } catch (error) {
      console.error(`Error fetching prices for ${symbolData.symbol}:`, error);
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Failed to fetch price data'
      }, { status: 502 });
    }

    // Step 3: Calculate hotness score
    let hotnessScore = null;
    if (priceData.periods.length >= 2) {
      try {
        // getAveragePrices returns periods in most-recent-first order
        const periods = priceData.periods.slice();
        const calculationFunction = hotnessVersion === 'v2' ? calculateHotnessScoreV2 : calculateHotnessScore;
        hotnessScore = Math.round(calculationFunction(periods, hotnessParams));
        console.log(`Calculated hotness score (v${hotnessVersion}): ${hotnessScore}`);
      } catch (error) {
        console.error(`Error calculating hotness score for ${symbolData.symbol}:`, error);
        // Continue without hotness score rather than failing
        hotnessScore = null;
      }
    } else {
      console.warn(`Insufficient price data for hotness calculation: ${priceData.periods.length} periods`);
    }

    // Step 4: Update the symbol in database
    const now = new Date().toISOString();
    const updateData: any = {
      recent_prices: priceData,
      last_updated_recent_prices: now,
      updated_at: now
    };

    // Only update hotness score if we calculated one
    if (hotnessScore !== null) {
      updateData.hotness_score = hotnessScore;
      updateData.last_updated_hotness_score = now;
    }

    const { error: updateError } = await supabaseAdmin
      .from(SYMBOLS_V2_TABLE)
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null);

    if (updateError) {
      console.error('Error updating symbol:', updateError);
      return NextResponse.json({ error: 'Failed to update symbol data' }, { status: 500 });
    }

    // Step 5: Fetch updated symbol data to return
    const { data: updatedSymbolData, error: refetchError } = await supabaseAdmin
      .from(SYMBOLS_V2_TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (refetchError) {
      console.error('Error refetching updated symbol:', refetchError);
      return NextResponse.json({ error: 'Failed to retrieve updated symbol data' }, { status: 500 });
    }

    console.log(`Successfully updated symbol ${symbolData.symbol} with fresh price data and hotness score`);

    return NextResponse.json({
      message: 'Symbol prices and hotness score updated successfully',
      symbol: updatedSymbolData,
      priceData: {
        periodsCount: priceData.periods.length,
        parameters: {
          numberOfDaysInPeriod,
          amountOfPeriods
        }
      },
      hotnessScore: {
        score: hotnessScore,
        version: hotnessVersion,
        parameters: hotnessParams
      }
    });

  } catch (error) {
    console.error('Error in update-prices-and-hotness API:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Symbol code already exists')) {
        return NextResponse.json({ error: 'Symbol code already exists' }, { status: 409 });
      }
      if (error.message.includes('No price data available')) {
        return NextResponse.json({ error: 'No price data available for this symbol' }, { status: 404 });
      }
      if (error.message.includes('Insufficient data')) {
        return NextResponse.json({ error: 'Insufficient data for calculation' }, { status: 422 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}