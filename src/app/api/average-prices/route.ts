import { NextRequest, NextResponse } from 'next/server';

// Types for average price data
interface AveragePricePeriod {
  name: string;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  changePercent?: number;
  changeAbsolute?: number;
  direction?: 'up' | 'down';
}

interface AveragePriceData {
  symbol: string;
  periods: AveragePricePeriod[];
}

// API function to fetch average price data for multiple periods
async function getAveragePrices(
  symbol: string,
  numberOfDaysInPeriod: number,
  amountOfPeriods: number
): Promise<AveragePriceData> {
  const totalDays = numberOfDaysInPeriod * amountOfPeriods;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${totalDays}d`;

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
    const timestamps = result.timestamp;

    if (!quotes || !quotes.close || !timestamps) {
      throw new Error('No price data available for this symbol');
    }

    // Get valid data points (filter out nulls)
    const validData: { timestamp: number; close: number }[] = [];
    quotes.close.forEach((close: number | null, index: number) => {
      if (close !== null && timestamps[index]) {
        validData.push({
          timestamp: timestamps[index],
          close: close
        });
      }
    });

    if (validData.length < numberOfDaysInPeriod) {
      throw new Error('Insufficient data for calculation');
    }

    // Sort data by timestamp (oldest first)
    validData.sort((a, b) => a.timestamp - b.timestamp);

    const periods: AveragePricePeriod[] = [];
    const now = Date.now() / 1000; // Convert to seconds

    // Calculate periods from most recent to oldest
    for (let i = 0; i < amountOfPeriods; i++) {
      const periodStartDays = i * numberOfDaysInPeriod;
      const periodEndDays = (i + 1) * numberOfDaysInPeriod;

      // Find data points within this period
      const periodData = validData.filter(point => {
        const daysAgo = (now - point.timestamp) / (24 * 60 * 60);
        return daysAgo >= periodStartDays && daysAgo < periodEndDays;
      });

      if (periodData.length === 0) continue;

      const prices = periodData.map(p => p.close);
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const highestPrice = Math.max(...prices);
      const lowestPrice = Math.min(...prices);

      // Determine period name
      let periodName: string;
      if (i === 0) {
        periodName = `${numberOfDaysInPeriod} days ago to today`;
      } else {
        const startDays = periodStartDays;
        const endDays = periodEndDays;
        periodName = `${endDays} days ago to ${startDays} days ago`;
      }

      const period: AveragePricePeriod = {
        name: periodName,
        averagePrice: Number(averagePrice.toFixed(2)),
        highestPrice: Number(highestPrice.toFixed(2)),
        lowestPrice: Number(lowestPrice.toFixed(2))
      };

      periods.push(period);
    }

    // Calculate changes between periods (compare each period to the previous one)
    for (let i = periods.length - 1; i > 0; i--) {
      const currentPeriod = periods[i];
      const previousPeriod = periods[i - 1];

      const changeAbsolute = currentPeriod.averagePrice - previousPeriod.averagePrice;
      const changePercent = (changeAbsolute / previousPeriod.averagePrice) * 100;

      periods[i].changePercent = Number(changePercent.toFixed(4));
      periods[i].changeAbsolute = Number(changeAbsolute.toFixed(4));
      periods[i].direction = changePercent >= 0 ? 'up' : 'down';
    }

    // Reverse to show most recent first
    periods.reverse();

    return {
      symbol,
      periods
    };

  } catch (error) {
    console.error(`Error calculating average prices for ${symbol}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, numberOfDaysInPeriod, amountOfPeriods } = await request.json();

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Symbol string is required' }, { status: 400 });
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

    const data = await getAveragePrices(symbol, numberOfDaysInPeriod, amountOfPeriods);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in average-prices API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}