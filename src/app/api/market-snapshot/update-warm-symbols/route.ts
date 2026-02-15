import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { URL } from 'url';
import { supabaseAdmin, SYMBOLS_V2_TABLE, CONFIG_TABLE } from '@/lib/supabase';

interface UpdateWarmSymbolsRequest {
  exchange: string;
  minAvgVolume10d?: number | null;
  minAvgVolume3m?: number | null;
  minComputationValue?: number | null;
}

interface YahooFinanceAuth {
  cookie: string;
  crumb: string;
  timestamp: string;
  stale_after_minutes: number;
}

interface QuoteData {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  regularMarketVolume?: number;
  averageDailyVolume10Day?: number;
  averageDailyVolume3Month?: number;
  fiftyDayAverage?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
  exchange?: string;
  quoteType?: string;
  [key: string]: unknown;
}

class YahooFinanceBatchFetcher {
  private cookies: string[] = [];
  private crumb: string | null = null;

  constructor(private auth: YahooFinanceAuth, private exchange: string) {
    this.cookies = [auth.cookie];
    this.crumb = auth.crumb;
  }

  private async makeScreenerRequest(symbols: string[]): Promise<QuoteData[]> {
    return new Promise<QuoteData[]>((resolve, reject) => {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&crumb=${this.crumb}`;
      const parsedUrl = new URL(url);

      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.cookies.join('; ')
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.quoteResponse?.result) {
              resolve(response.quoteResponse.result);
            } else {
              resolve([]);
            }
          } catch (error) {
            console.error('Error parsing Yahoo quote response:', error);
            resolve([]);
          }
        });
      });

      req.on('error', (error: Error) => {
        console.error('Error making screener API request:', error);
        reject(new Error(`Screener API request failed: ${error.message}`));
      });

      req.end();
    });
  }

  async fetchAllMarketSymbols(batchSize: number = 100): Promise<QuoteData[]> {
    const allSymbols: QuoteData[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      try {
        // First get screener data to find symbols
        const screenerData = await this.getScreenerData(offset, batchSize);

        if (!screenerData.finance?.result?.[0]?.quotes) {
          hasMore = false;
          break;
        }

        const quotes = screenerData.finance.result[0].quotes;
        const symbols = quotes.map((q: QuoteData) => q.symbol).filter(Boolean);

        console.log(`Processing batch ${Math.floor(offset / batchSize) + 1}: offset=${offset}, size=${batchSize}, found ${symbols.length} symbols`);

        if (symbols.length === 0) {
          hasMore = false;
          break;
        }


        // Get detailed data for this batch of symbols
        const detailedQuotes = await this.makeScreenerRequest(symbols);
        allSymbols.push(...detailedQuotes);

        // Check if we got all symbols we requested
        if (symbols.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error in batch ${Math.floor(offset / batchSize) + 1}:`, error);
        hasMore = false;
      }
    }

    return allSymbols;
  }

  private async getScreenerData(offset: number, size: number): Promise<{ finance: { result: Array<{ quotes: QuoteData[] }> } }> {
    return new Promise<{ finance: { result: Array<{ quotes: QuoteData[] }> } }>((resolve, reject) => {
      const url = `https://query1.finance.yahoo.com/v1/finance/screener?crumb=${this.crumb}`;
      const parsedUrl = new URL(url);

      const payload = {
        "size": size,
        "offset": offset,
        "sortField": "intradaymarketcap",
        "sortType": "DESC",
        "quoteType": "EQUITY",
        "query": {
          "operator": "eq",
          "operands": ["exchange", this.exchange]
        }
      };

      const postData = JSON.stringify(payload);

      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.cookies.join('; ')
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse screener response: ${error}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

function calculateIsWarmSymbol(
  quote: QuoteData,
  filters: { minAvgVolume10d?: number; minAvgVolume3m?: number; minComputationValue?: number }
): boolean {
  const { minAvgVolume10d, minAvgVolume3m, minComputationValue } = filters;

  // Check volume filters
  if (minAvgVolume10d) {
    const avgVol10d = quote.averageDailyVolume10Day || 0;
    if (avgVol10d < minAvgVolume10d) {
      return false;
    }
  }

  if (minAvgVolume3m) {
    const avgVol3m = quote.averageDailyVolume3Month || 0;
    if (avgVol3m < minAvgVolume3m) {
      return false;
    }
  }

  // Check computation value: AvgVol(3M) × 50D Avg / 90
  if (minComputationValue) {
    const avgVol3m = quote.averageDailyVolume3Month || 0;
    const fiftyDayAvg = quote.fiftyDayAverage || 0;
    const computationValue = (avgVol3m * fiftyDayAvg) / 90;

    if (computationValue < minComputationValue) {
      return false;
    }
  }

  return true;
}

async function resetAllSymbolsWarmStatus(): Promise<void> {
  const { error } = await supabaseAdmin
    .from(SYMBOLS_V2_TABLE)
    .update({ is_currently_warm: false })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all records

  if (error) {
    throw new Error(`Failed to reset warm status: ${error.message}`);
  }

  console.log('Reset is_currently_warm to FALSE for all symbols_v2 records');
}

async function getFreshSessionCookies(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = 'https://fc.yahoo.com';
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      const setCookieHeaders = res.headers['set-cookie'];
      if (setCookieHeaders) {
        const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]);
        resolve(cookies);
      } else {
        resolve([]);
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function getFreshCrumb(cookies: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = 'https://query1.finance.yahoo.com/v1/test/getcrumb';
    const parsedUrl = new URL(url);

    const cookieHeader = cookies.join('; ');

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Cookie': cookieHeader
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 && data.trim()) {
          resolve(data.trim());
        } else {
          reject(new Error(`Failed to get crumb token (status: ${res.statusCode}, data: ${data.trim()})`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function refreshYahooAuth(): Promise<YahooFinanceAuth> {
  console.log('Refreshing Yahoo Finance auth...');

  // Get fresh cookies
  const cookies = await getFreshSessionCookies();
  console.log(`Obtained ${cookies.length} fresh cookies`);

  // Get fresh crumb using the cookies
  const crumb = await getFreshCrumb(cookies);
  console.log(`Obtained fresh crumb: ${crumb}`);

  // Create fresh auth object
  const freshAuth: YahooFinanceAuth = {
    cookie: cookies.join('; '),
    crumb: crumb,
    timestamp: new Date().toISOString(),
    stale_after_minutes: 60
  };

  // Update config table with fresh auth
  // First check if record exists
  const { data: existingRecord } = await supabaseAdmin
    .from(CONFIG_TABLE)
    .select('id')
    .eq('config_key', 'yahoo_finance_auth')
    .is('deleted_at', null)
    .single();

  let error;

  if (existingRecord) {
    // Update existing record
    const { error: updateError } = await supabaseAdmin
      .from(CONFIG_TABLE)
      .update({
        config_value: freshAuth,
        description: 'Yahoo Finance API authentication credentials',
        updated_at: new Date().toISOString()
      })
      .eq('config_key', 'yahoo_finance_auth')
      .is('deleted_at', null);

    error = updateError;
  } else {
    // Insert new record
    const { error: insertError } = await supabaseAdmin
      .from(CONFIG_TABLE)
      .insert({
        config_key: 'yahoo_finance_auth',
        config_value: freshAuth,
        description: 'Yahoo Finance API authentication credentials'
      });

    error = insertError;
  }

  if (error) {
    throw new Error(`Failed to update Yahoo auth in config: ${error.message}`);
  }

  console.log('Successfully refreshed and stored Yahoo Finance auth in config');
  return freshAuth;
}

async function getYahooAuth(): Promise<YahooFinanceAuth> {
  const { data, error } = await supabaseAdmin
    .from(CONFIG_TABLE)
    .select('config_value')
    .eq('config_key', 'yahoo_finance_auth')
    .is('deleted_at', null)
    .single();

  if (error) {
    throw new Error(`Failed to fetch Yahoo auth: ${error.message}`);
  }

  let auth: YahooFinanceAuth;

  if (!data?.config_value) {
    console.log('Yahoo Finance auth not found in config, refreshing...');
    auth = await refreshYahooAuth();
  } else {
    auth = data.config_value as YahooFinanceAuth;

    // Check if auth is stale
    const authTimestamp = new Date(auth.timestamp);
    const now = new Date();
    const minutesDiff = (now.getTime() - authTimestamp.getTime()) / (1000 * 60);

    if (minutesDiff > auth.stale_after_minutes) {
      console.log(`Yahoo Finance auth is stale (age: ${Math.round(minutesDiff)} minutes, stale after: ${auth.stale_after_minutes} minutes), refreshing...`);
      auth = await refreshYahooAuth();
    }
  }

  // Log auth details
  console.log('Yahoo Finance Auth Details:');
  console.log(`  Cookie: ${auth.cookie}`);
  console.log(`  Crumb: ${auth.crumb}`);
  console.log(`  Timestamp: ${auth.timestamp}`);
  console.log(`  Stale After Minutes: ${auth.stale_after_minutes}`);
  console.log('  Status: Using fresh auth from config');

  return auth;
}

async function upsertWarmSymbols(warmSymbols: QuoteData[]): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const symbol of warmSymbols) {
    try {
      // Check if symbol exists
      const { data: existingSymbol, error: selectError } = await supabaseAdmin
        .from(SYMBOLS_V2_TABLE)
        .select('id')
        .eq('symbol', symbol.symbol)
        .is('deleted_at', null)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw new Error(`Failed to check symbol existence for ${symbol.symbol}: ${selectError.message}`);
      }

      const symbolData = {
        symbol: symbol.symbol,
        short_name: symbol.shortName || symbol.longName,
        long_name: symbol.longName,
        exchange: symbol.exchange,
        currency: symbol.currency,
        quote_type: symbol.quoteType,
        regular_market_price: symbol.regularMarketPrice,
        regular_market_change: symbol.regularMarketChange,
        regular_market_change_percent: symbol.regularMarketChangePercent,
        market_cap: symbol.marketCap,
        regular_market_volume: symbol.regularMarketVolume,
        average_daily_volume_10day: symbol.averageDailyVolume10Day,
        average_daily_volume_3month: symbol.averageDailyVolume3Month,
        fifty_day_average: symbol.fiftyDayAverage,
        fifty_two_week_high: symbol.fiftyTwoWeekHigh,
        fifty_two_week_low: symbol.fiftyTwoWeekLow,
        is_currently_warm: true,
        updated_at: new Date().toISOString()
      };

      if (existingSymbol) {
        // Update existing symbol
        const { error } = await supabaseAdmin
          .from(SYMBOLS_V2_TABLE)
          .update(symbolData)
          .eq('symbol', symbol.symbol)
          .is('deleted_at', null);

        if (error) {
          throw new Error(`Failed to update symbol ${symbol.symbol}: ${error.message}`);
        } else {
          updated++;
        }
      } else {
        // Create new symbol
        const { error } = await supabaseAdmin
          .from(SYMBOLS_V2_TABLE)
          .insert([{
            ...symbolData,
            created_at: new Date().toISOString()
          }]);

        if (error) {
          throw new Error(`Failed to create symbol ${symbol.symbol}: ${error.message}`);
        } else {
          created++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unknown error for symbol ${symbol.symbol}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }
  }

  // If any errors occurred, throw an error with all error details
  if (errors.length > 0) {
    throw new Error(`Failed to upsert ${errors.length} symbols: ${errors.join('; ')}`);
  }

  return { created, updated };
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateWarmSymbolsRequest = await request.json();

    // Validate required parameters
    if (!body.exchange) {
      return NextResponse.json({ error: 'Exchange parameter is required' }, { status: 400 });
    }

    // Validate exchange codes
    const validExchanges = ['TOR', 'CNQ', 'NYQ', 'NMS', 'ASE', 'PCX'];
    if (!validExchanges.includes(body.exchange)) {
      return NextResponse.json({
        error: `Invalid exchange. Valid exchanges are: ${validExchanges.join(', ')}`
      }, { status: 400 });
    }

    // Validate input parameters
    if (body.minAvgVolume10d !== null && body.minAvgVolume10d !== undefined && body.minAvgVolume10d < 0) {
      return NextResponse.json({ error: 'minAvgVolume10d must be non-negative' }, { status: 400 });
    }
    if (body.minAvgVolume3m !== null && body.minAvgVolume3m !== undefined && body.minAvgVolume3m < 0) {
      return NextResponse.json({ error: 'minAvgVolume3m must be non-negative' }, { status: 400 });
    }
    if (body.minComputationValue !== null && body.minComputationValue !== undefined && body.minComputationValue < 0) {
      return NextResponse.json({ error: 'minComputationValue must be non-negative' }, { status: 400 });
    }

    console.log('Starting warm symbols update process...');

    // Step 1: Reset all symbols to not warm
    await resetAllSymbolsWarmStatus();

    // Step 2: Get Yahoo Finance auth
    const yahooAuth = await getYahooAuth();

    // Step 3: Fetch all market symbols in batches
    const fetcher = new YahooFinanceBatchFetcher(yahooAuth, body.exchange);
    const allSymbols = await fetcher.fetchAllMarketSymbols();
    console.log(`Fetched ${allSymbols.length} symbols from Yahoo Finance for exchange ${body.exchange}`);

    // Step 4: Filter warm symbols based on criteria
    const filters = {
      minAvgVolume10d: body.minAvgVolume10d,
      minAvgVolume3m: body.minAvgVolume3m,
      minComputationValue: body.minComputationValue
    };

    // Count symbols that fail each individual criteria
    let failedMinAvgVolume10d = 0;
    let failedMinAvgVolume3m = 0;
    let failedMinComputationValue = 0;

    for (const symbol of allSymbols) {
      // Check each criteria individually and count failures
      if (filters.minAvgVolume10d && (!symbol.averageDailyVolume10Day || symbol.averageDailyVolume10Day < filters.minAvgVolume10d)) {
        failedMinAvgVolume10d++;
      }

      if (filters.minAvgVolume3m && (!symbol.averageDailyVolume3Month || symbol.averageDailyVolume3Month < filters.minAvgVolume3m)) {
        failedMinAvgVolume3m++;
      }

      if (filters.minComputationValue) {
        const avgVol3m = symbol.averageDailyVolume3Month || 0;
        const fiftyDayAvg = symbol.fiftyDayAverage || 0;
        const computationValue = (avgVol3m * fiftyDayAvg) / 90;

        if (computationValue < filters.minComputationValue) {
          failedMinComputationValue++;
        }
      }
    }

    const warmSymbols = allSymbols.filter(symbol => calculateIsWarmSymbol(symbol, filters));
    console.log(`Found ${warmSymbols.length} symbols that meet the warm criteria`);
    console.log(`Symbols failing criteria:`);
    console.log(`  Min Avg Volume (10d): ${failedMinAvgVolume10d}`);
    console.log(`  Min Avg Volume (3M): ${failedMinAvgVolume3m}`);
    console.log(`  Min Computation Value: ${failedMinComputationValue}`);

    // Step 5: Upsert warm symbols to database
    const { created, updated } = await upsertWarmSymbols(warmSymbols);
    console.log(`Created ${created} new symbols, updated ${updated} existing symbols`);

    // Calculate filter breakdown with percentages
    const filterBreakdown = {
      minAvgVolume10d: filters.minAvgVolume10d !== null && filters.minAvgVolume10d !== undefined ? {
        threshold: filters.minAvgVolume10d,
        passed: allSymbols.length - failedMinAvgVolume10d,
        filtered: failedMinAvgVolume10d,
        percentageFiltered: allSymbols.length > 0 ? Math.round((failedMinAvgVolume10d / allSymbols.length) * 100) : 0
      } : null,
      minAvgVolume3m: filters.minAvgVolume3m !== null && filters.minAvgVolume3m !== undefined ? {
        threshold: filters.minAvgVolume3m,
        passed: allSymbols.length - failedMinAvgVolume3m,
        filtered: failedMinAvgVolume3m,
        percentageFiltered: allSymbols.length > 0 ? Math.round((failedMinAvgVolume3m / allSymbols.length) * 100) : 0
      } : null,
      minComputationValue: filters.minComputationValue !== null && filters.minComputationValue !== undefined ? {
        threshold: filters.minComputationValue,
        passed: allSymbols.length - failedMinComputationValue,
        filtered: failedMinComputationValue,
        percentageFiltered: allSymbols.length > 0 ? Math.round((failedMinComputationValue / allSymbols.length) * 100) : 0
      } : null
    };

    console.log('Warm symbols update process completed successfully');

    return NextResponse.json({
      totalSymbols: allSymbols.length,
      warmSymbols: warmSymbols.length,
      created,
      updated,
      filterBreakdown
    });

  } catch (error: unknown) {
    console.error('Error in update warm symbols API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update warm symbols';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}