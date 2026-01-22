import { AveragePricePeriod, AveragePriceData } from '@/types/symbol';

// Hotness score calculation parameters
export interface HotnessScoreParams {
  dropSensitivity: number; // 10-25, default 15
  dropMaxScore: number; // 60-80, default 70
  volatilityThreshold: number; // 1.0-5.0, default 2.0
  volatilityMaxBonus: number; // 20-40, default 30
  downtrendPenalty: number; // 0.3-0.7, default 0.5
  stableMultiplier: number; // 0.5-0.8, default 0.7
  uptrendMultiplier: number; // 0.8-1.2, default 1.0
  trendBoundary: number; // 2.0-5.0, default 3.0
}

// Default hotness score parameters
export const DEFAULT_HOTNESS_PARAMS: HotnessScoreParams = {
  dropSensitivity: 15,
  dropMaxScore: 70,
  volatilityThreshold: 2.0,
  volatilityMaxBonus: 30,
  downtrendPenalty: 0.5,
  stableMultiplier: 0.7,
  uptrendMultiplier: 1.0,
  trendBoundary: 3.0,
};

// Recommended trader settings
export const RECOMMENDED_HOTNESS_PARAMS: HotnessScoreParams = {
  dropSensitivity: 18,
  dropMaxScore: 70,
  volatilityThreshold: 2.5,
  volatilityMaxBonus: 30,
  downtrendPenalty: 0.4,
  stableMultiplier: 0.7,
  uptrendMultiplier: 1.0,
  trendBoundary: 3.0,
};

// Helper function to format symbol for Yahoo Finance API
function formatSymbolForYahooFinance(symbol: string, exchange: string): string {
  // Canadian stocks require exchange-specific suffixes
  if (exchange === 'TO') {
    // Toronto Stock Exchange - add .TO suffix
    return `${symbol}.TO`;
  } else if (exchange === 'V') {
    // TSX Venture Exchange - add .V suffix
    return `${symbol}.V`;
  } else {
    // US stocks and others - use symbol as-is
    return symbol;
  }
}

// API function to fetch average price data for multiple periods
export async function getAveragePrices(
  symbol: string,
  exchange: string,
  numberOfDaysInPeriod: number,
  amountOfPeriods: number
): Promise<AveragePriceData> {
  const totalDays = numberOfDaysInPeriod * amountOfPeriods;
  const formattedSymbol = formatSymbolForYahooFinance(symbol, exchange);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=${totalDays}d`;

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

    // Calculate one extra period to ensure all returned periods have change data
    const periodsToCalculate = amountOfPeriods + 1;

    // Calculate periods from most recent to oldest
    for (let i = 0; i < periodsToCalculate; i++) {
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
        startDaysAgo: periodStartDays,
        endDaysAgo: periodEndDays,
        averagePrice: Number(averagePrice.toFixed(2)),
        highestPrice: Number(highestPrice.toFixed(2)),
        lowestPrice: Number(lowestPrice.toFixed(2))
      };

      periods.push(period);
    }

    // Calculate changes between periods (compare each period to the next newer period)
    for (let i = 0; i < periods.length - 1; i++) {
      const currentPeriod = periods[i];
      const nextPeriod = periods[i + 1];

      const changeAbsolute = currentPeriod.averagePrice - nextPeriod.averagePrice;
      const changePercent = (changeAbsolute / nextPeriod.averagePrice) * 100;

      periods[i].changePercent = Number(changePercent.toFixed(4));
      periods[i].changeAbsolute = Number(changeAbsolute.toFixed(4));
      periods[i].direction = changePercent >= 0 ? 'up' : 'down';
    }

    // Reverse to show most recent first
    periods.reverse();

    // Return only the requested number of periods (the most recent ones that have change data)
    // Since we calculated one extra period, we take the last 'amountOfPeriods' from the reversed array
    const periodsToReturn = periods.slice(-amountOfPeriods).reverse();

    return {
      symbol,
      periods: periodsToReturn
    };

  } catch (error) {
    console.error(`Error calculating average prices for ${symbol}:`, error);
    throw error;
  }
}

// Calculate hotness score from average price data
export function calculateHotnessScore(
  averagePrices: number[],
  params: HotnessScoreParams = DEFAULT_HOTNESS_PARAMS
): number {
  // Input validation
  if (!Array.isArray(averagePrices) || averagePrices.length < 2) {
    throw new Error('Average prices array must contain at least 2 values');
  }

  // Ensure all values are valid numbers
  const validPrices = averagePrices.filter(price => typeof price === 'number' && !isNaN(price));
  if (validPrices.length < 2) {
    throw new Error('At least 2 valid price values required');
  }

  const N = validPrices.length;

  // Step 1: Calculate Historical Average (exclude most recent price)
  const historicalAvg = validPrices.slice(1).reduce((sum, price) => sum + price, 0) / (N - 1);

  // Step 2: Calculate Drop Percentage
  const mostRecentPrice = validPrices[0];
  const dropPercentage = ((historicalAvg - mostRecentPrice) / historicalAvg) * 100;

  // Early return for no drop case
  if (dropPercentage <= 0) {
    return 0;
  }

  // Step 3: Calculate Base Drop Score (Criterion 1)
  const dropScore = Math.min(params.dropMaxScore, dropPercentage * params.dropSensitivity);

  // Step 4: Calculate Volatility
  const meanPrice = validPrices.reduce((sum, price) => sum + price, 0) / N;
  const variance = validPrices.reduce((sum, price) => sum + Math.pow(price - meanPrice, 2), 0) / N;
  const stdDev = Math.sqrt(variance);
  const volatilityPercentage = (stdDev / meanPrice) * 100;

  // Step 5: Calculate Trend
  const oldestPrice = validPrices[N - 1];
  const trendPercentage = ((mostRecentPrice - oldestPrice) / oldestPrice) * 100;

  // Step 6: Calculate Volatility Modifier (Criterion 2)
  let volatilityScore = 0;

  if (volatilityPercentage >= params.volatilityThreshold) {
    // Normalize volatility (cap at 10% for scoring purposes)
    const normalizedVolatility = Math.min(1.0, volatilityPercentage / 10);

    // Apply multiplier based on trend
    let multiplier: number;
    if (trendPercentage < -params.trendBoundary) {
      // Downtrend: risky, small bonus
      multiplier = params.downtrendPenalty;
    } else if (trendPercentage > params.trendBoundary) {
      // Uptrend: best case, full bonus
      multiplier = params.uptrendMultiplier;
    } else {
      // Stable: moderate bonus
      multiplier = params.stableMultiplier;
    }

    volatilityScore = normalizedVolatility * params.volatilityMaxBonus * multiplier;
  }

  // Step 7: Calculate Final Hotness Score
  const hotnessScore = Math.min(100, dropScore + volatilityScore);

  return Math.round(hotnessScore * 100) / 100; // Round to 2 decimal places
}