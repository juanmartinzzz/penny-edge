import { NextRequest, NextResponse } from 'next/server';
import { getAveragePrices } from '@/lib/price-service';
import { symbolService } from '@/lib/symbol-service';

interface UpdateRecentPricesRequest {
  symbol: string;
  exchange: string;
  numberOfDaysInPeriod: number;
  amountOfPeriods: number;
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, exchange, numberOfDaysInPeriod, amountOfPeriods }: UpdateRecentPricesRequest = await request.json();

    // Validate required parameters
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Symbol code string is required' }, { status: 400 });
    }

    if (!exchange || typeof exchange !== 'string') {
      return NextResponse.json({ error: 'Exchange string is required' }, { status: 400 });
    }

    if (!numberOfDaysInPeriod || typeof numberOfDaysInPeriod !== 'number' || numberOfDaysInPeriod <= 0) {
      return NextResponse.json({ error: 'numberOfDaysInPeriod must be a positive number' }, { status: 400 });
    }

    if (!amountOfPeriods || typeof amountOfPeriods !== 'number' || amountOfPeriods <= 0) {
      return NextResponse.json({ error: 'amountOfPeriods must be a positive number' }, { status: 400 });
    }

    if (amountOfPeriods > 10) {
      return NextResponse.json({ error: 'amountOfPeriods cannot exceed 10' }, { status: 400 });
    }

    // Step 1: Check if symbol exists in DB, create if not
    let existingSymbol = await symbolService.getSymbolByCode(symbol);
    if (!existingSymbol) {
      // Create the symbol
      existingSymbol = await symbolService.createSymbol({
        code: symbol,
        exchange: exchange,
      });
    }

    // Step 2: Check last_updated_recent_prices property - if it's older than 24 hours, update it
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const shouldUpdatePrices = !existingSymbol.last_updated_recent_prices ||
      new Date(existingSymbol.last_updated_recent_prices) < twentyFourHoursAgo;

    if (shouldUpdatePrices) {
      // Update recent prices using the extracted logic
      const priceData = await getAveragePrices(symbol, exchange, numberOfDaysInPeriod, amountOfPeriods);

      // Update the symbol with the new price data and nullify hotness score since it's now invalid
      await symbolService.updateSymbolByCode(symbol, {
        recent_prices: priceData,
        hotness_score: null,
        last_updated_hotness_score: null,
      });

      return NextResponse.json({
        message: 'Recent prices updated successfully',
        symbol: symbol,
        updated: true,
        data: priceData
      });
    } else {
      // Prices are recent, return existing data
      return NextResponse.json({
        message: 'Recent prices are already up to date',
        symbol: symbol,
        updated: false,
        data: existingSymbol.recent_prices
      });
    }

  } catch (error) {
    console.error('Error in update-recent-prices API:', error);

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