import { NextRequest, NextResponse } from 'next/server';

// Types for price change data
interface PriceChangeData {
  symbol: string;
  period: string;
  latestPrice: string;
  earliestPrice: string;
  changePercent: string;
  changeAbsolute: string;
  direction: 'up' | 'down';
  error?: string;
}

// API function to fetch price change data
async function getPriceChange(symbol: string, interval: string, range: string): Promise<PriceChangeData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const result = data.chart.result[0];
    const quotes = result.indicators?.quote?.[0];

    if (!quotes || !quotes.close) {
      throw new Error('No price data available for this symbol');
    }

    // Filter out null closes
    const validCloses = quotes.close.filter((c: number | null) => c !== null);

    if (validCloses.length < 2) {
      throw new Error('Insufficient data for calculation');
    }

    const latestPrice = validCloses[validCloses.length - 1];
    const earliestPrice = validCloses[0];
    const changePercent = ((latestPrice - earliestPrice) / earliestPrice) * 100;
    const changeAbsolute = latestPrice - earliestPrice;

    return {
      symbol,
      period: range,
      latestPrice: latestPrice.toFixed(4),
      earliestPrice: earliestPrice.toFixed(4),
      changePercent: changePercent.toFixed(2),
      changeAbsolute: changeAbsolute.toFixed(4),
      direction: changePercent >= 0 ? 'up' : 'down'
    };

  } catch (error) {
    console.error(`Error calculating price change for ${symbol}:`, error);
    return {
      symbol,
      period: range,
      latestPrice: '0',
      earliestPrice: '0',
      changePercent: '0',
      changeAbsolute: '0',
      direction: 'down',
      error: error instanceof Error ? error.message : 'Failed to fetch price data'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, periods } = await request.json();

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Symbol string is required' }, { status: 400 });
    }

    if (!periods || !Array.isArray(periods) || periods.length === 0) {
      return NextResponse.json({ error: 'Periods array is required' }, { status: 400 });
    }

    const results: { [period: string]: PriceChangeData } = {};

    // Process each period for the symbol
    for (const period of periods) {
      try {
        const data = await getPriceChange(symbol, period.interval, period.range);
        results[period.label] = data;

        // Wait 1 second between API calls to avoid overloading
        if (periods.indexOf(period) < periods.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Failed to load ${period.label} data for ${symbol}:`, error);
        results[period.label] = {
          symbol,
          period: period.label,
          latestPrice: '0',
          earliestPrice: '0',
          changePercent: '0',
          changeAbsolute: '0',
          direction: 'down',
          error: 'Failed to load data'
        };
      }
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Error in price-changes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}