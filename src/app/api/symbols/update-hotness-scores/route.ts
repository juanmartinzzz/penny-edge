import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, SYMBOLS_TABLE } from '@/lib/supabase';
import { calculateHotnessScore, HotnessScoreParams, DEFAULT_HOTNESS_PARAMS } from '@/lib/price-service';

// POST /api/symbols/update-hotness-scores
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      batchSize = 100,
      params = DEFAULT_HOTNESS_PARAMS,
      continueFromId
    }: {
      batchSize?: number;
      params?: HotnessScoreParams;
      continueFromId?: string;
    } = body;

    // Validate batchSize
    if (batchSize < 1 || batchSize > 1000) {
      return NextResponse.json(
        { error: 'batchSize must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Build query to get symbols with recent_prices
    let query = supabaseAdmin
      .from(SYMBOLS_TABLE)
      .select('id, code, exchange, recent_prices')
      .not('recent_prices', 'is', null)
      .is('deleted_at', null)
      .order('id')
      .limit(batchSize);

    // If continuing from a specific ID, start after that
    if (continueFromId) {
      query = query.gt('id', continueFromId);
    }

    const { data: symbols, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching symbols:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch symbols' },
        { status: 500 }
      );
    }

    if (!symbols || symbols.length === 0) {
      return NextResponse.json({
        message: 'No symbols found to process',
        processed: 0,
        totalProcessed: 0
      });
    }

    // Process symbols and calculate hotness scores
    const updates = [];
    let processedCount = 0;

    for (const symbol of symbols) {
      try {
        if (!symbol.recent_prices?.periods || symbol.recent_prices.periods.length < 2) {
          console.warn(`Symbol ${symbol.code}: Insufficient price data`);
          continue;
        }

        // Extract average prices from most recent to oldest
        const averagePrices = symbol.recent_prices.periods
          .slice() // Create a copy
          .reverse() // Most recent first
          .map(period => period.averagePrice);

        // Calculate hotness score
        const hotnessScore = calculateHotnessScore(averagePrices, params);

        updates.push({
          id: symbol.id,
          hotness_score: Math.round(hotnessScore),
          last_updated_hotness_score: new Date().toISOString()
        });

        processedCount++;
      } catch (error) {
        console.error(`Error calculating hotness score for ${symbol.code}:`, error);
        // Continue processing other symbols
      }
    }

    // Update each symbol individually with their new hotness scores
    const updateErrors = [];
    for (const update of updates) {
      const { error: updateError } = await supabaseAdmin
        .from(SYMBOLS_TABLE)
        .update({
          hotness_score: update.hotness_score,
          last_updated_hotness_score: update.last_updated_hotness_score
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating hotness score for symbol ${update.id}:`, updateError);
        updateErrors.push(updateError);
      }
    }

    // If any updates failed, return error
    if (updateErrors.length > 0) {
      return NextResponse.json(
        { error: 'Failed to update some hotness scores', errors: updateErrors },
        { status: 500 }
      );
    }

    // Get the last processed symbol ID for continuation
    const lastProcessedId = symbols[symbols.length - 1]?.id;
    const hasMore = symbols.length === batchSize;

    return NextResponse.json({
      message: `Successfully processed ${processedCount} symbols`,
      processed: processedCount,
      totalProcessed: processedCount,
      batchSize,
      hasMore,
      lastProcessedId: hasMore ? lastProcessedId : null,
      paramsUsed: params
    });

  } catch (error) {
    console.error('Error in update-hotness-scores API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}