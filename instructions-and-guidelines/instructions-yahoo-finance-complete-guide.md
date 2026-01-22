# Complete Yahoo Finance API Guide

## Quick Start

Yahoo Finance's unofficial API requires no registration or API key. You can query it directly via HTTP requests.

---

## Step 1: Format Your Stock Symbol

Add the appropriate exchange suffix to your ticker symbol:

| Exchange | Suffix | Example |
|----------|--------|---------|
| NYSE/NASDAQ | None | `AAPL` |
| TSX (Toronto Stock Exchange) | `.TO` | `SHOP.TO` |
| TSXV (TSX Venture Exchange) | `.V` | `CRUZ.V` |
| CSE (Canadian Securities Exchange) | `.CN` | `TAAT.CN` |

**Note for TSXV:** Some symbols use `.V` while others use `.CN`. If `.V` returns no data, try `.CN`.

---

## Step 2: Choose Your Interval and Range

### Available Intervals

| Interval | Description | Max History | Best For |
|----------|-------------|-------------|----------|
| `1m` | Every 1 minute | 7 days | Last hour tracking |
| `5m` | Every 5 minutes | 60 days | Intraday momentum |
| `15m` | Every 15 minutes | 60 days | Short-term moves |
| `1h` | Every hour | 730 days | Hourly tracking |
| `1d` | Daily (end of day) | Max available | Daily/weekly/monthly |
| `1wk` | Weekly | Max available | Long-term trends |
| `1mo` | Monthly | Max available | Historical analysis |

### Available Ranges

| Range | Description |
|-------|-------------|
| `1h` | Last hour |
| `1d` | Last day (24 hours) |
| `5d` | Last 5 trading days |
| `1mo` | Last month |
| `3mo` | Last 3 months |
| `6mo` | Last 6 months |
| `1y` | Last year |
| `2y` | Last 2 years |
| `5y` | Last 5 years |
| `max` | All available history |

---

## Step 3: Construct the API URL

### Basic Format
```
https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval={INTERVAL}&range={RANGE}
```

### Example URLs

**Last hour (1-minute intervals):**
```
https://query1.finance.yahoo.com/v8/finance/chart/CRUZ.V?interval=1m&range=1h
```

**Last 24 hours (5-minute intervals):**
```
https://query1.finance.yahoo.com/v8/finance/chart/CRUZ.V?interval=5m&range=1d
```

**Last week (hourly intervals):**
```
https://query1.finance.yahoo.com/v8/finance/chart/CRUZ.V?interval=1h&range=5d
```

**Last month (daily intervals):**
```
https://query1.finance.yahoo.com/v8/finance/chart/SHOP.TO?interval=1d&range=1mo
```

**Last year (daily intervals):**
```
https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1y
```

### Using Specific Date Ranges (Unix Timestamps)
```
https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?period1={START_TIMESTAMP}&period2={END_TIMESTAMP}&interval=1d
```

---

## Step 4: Make the API Request

### JavaScript/Node.js Implementation

```javascript
async function getHistoricalData(symbol, interval = '1d', range = '1mo') {
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
    
    return data;
    
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    throw error;
  }
}

// Usage
const data = await getHistoricalData('CRUZ.V', '1d', '1mo');
```

---

## Step 5: Understand the Response Structure

### Successful Response

```json
{
  "chart": {
    "result": [{
      "meta": {
        "symbol": "CRUZ.V",
        "currency": "CAD",
        "regularMarketPrice": 0.15,
        "previousClose": 0.14,
        "exchangeName": "VAN",
        "instrumentType": "EQUITY"
      },
      "timestamp": [1640000000, 1640086400, 1640172800],
      "indicators": {
        "quote": [{
          "open": [0.14, 0.15, 0.14],
          "high": [0.15, 0.16, 0.15],
          "low": [0.13, 0.14, 0.13],
          "close": [0.15, 0.15, 0.14],
          "volume": [125000, 98000, 156000]
        }]
      }
    }],
    "error": null
  }
}
```

### Error Response

```json
{
  "chart": {
    "result": null,
    "error": {
      "code": "Not Found",
      "description": "No data found for this symbol"
    }
  }
}
```

### Response Fields Explained

| Field | Description |
|-------|-------------|
| `meta.symbol` | The stock symbol |
| `meta.currency` | Currency (e.g., USD, CAD) |
| `meta.regularMarketPrice` | Current price |
| `meta.previousClose` | Previous closing price |
| `timestamp` | Unix timestamps (seconds) |
| `indicators.quote[0].open` | Opening prices |
| `indicators.quote[0].high` | High prices |
| `indicators.quote[0].low` | Low prices |
| `indicators.quote[0].close` | Closing prices |
| `indicators.quote[0].volume` | Trading volumes |

---

## Step 6: Parse the Response Data

```javascript
function parseHistoricalData(apiResponse) {
  const result = apiResponse.chart.result[0];
  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  
  // Combine timestamps with OHLCV data
  const historicalData = timestamps.map((timestamp, index) => ({
    timestamp,
    date: new Date(timestamp * 1000).toISOString(),
    open: quotes.open[index],
    high: quotes.high[index],
    low: quotes.low[index],
    close: quotes.close[index],
    volume: quotes.volume[index]
  }));
  
  return {
    symbol: result.meta.symbol,
    currency: result.meta.currency,
    currentPrice: result.meta.regularMarketPrice,
    data: historicalData
  };
}

// Usage
const raw = await getHistoricalData('CRUZ.V', '1d', '1mo');
const parsed = parseHistoricalData(raw);
console.log(parsed);
```

---

## Step 7: Calculate Price Changes

### Basic Price Change Calculation

```javascript
function calculatePriceChange(historicalData) {
  // Filter out null values (market closures)
  const validCloses = historicalData.data
    .map(d => d.close)
    .filter(close => close !== null && close !== undefined);
  
  if (validCloses.length < 2) {
    return null; // Not enough data
  }
  
  const latestPrice = validCloses[validCloses.length - 1];
  const earliestPrice = validCloses[0];
  
  const changeAbsolute = latestPrice - earliestPrice;
  const changePercent = ((latestPrice - earliestPrice) / earliestPrice) * 100;
  
  return {
    latestPrice: latestPrice.toFixed(4),
    earliestPrice: earliestPrice.toFixed(4),
    changeAbsolute: changeAbsolute.toFixed(4),
    changePercent: changePercent.toFixed(2),
    direction: changePercent >= 0 ? 'up' : 'down'
  };
}
```

### Complete Function: Fetch + Calculate

```javascript
async function getPriceChange(symbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    
    // Filter out null closes
    const validCloses = quotes.close.filter(c => c !== null);
    
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
      direction: changePercent >= 0 ? '📈' : '📉'
    };
    
  } catch (error) {
    console.error(`Error calculating price change for ${symbol}:`, error.message);
    throw error;
  }
}

// Usage Examples
const hourChange = await getPriceChange('CRUZ.V', '1m', '1h');
console.log(`Last Hour: ${hourChange.changePercent}%`);

const dayChange = await getPriceChange('CRUZ.V', '5m', '1d');
console.log(`Last 24h: ${dayChange.changePercent}%`);

const monthChange = await getPriceChange('CRUZ.V', '1d', '1mo');
console.log(`Last Month: ${monthChange.changePercent}%`);
```

---

## Step 8: Handle Errors

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 404 / "Not Found" | Invalid symbol or delisted | Verify symbol format and exchange suffix |
| Empty data / null result | No trading in period or wrong date range | Check if stock traded during this period |
| Rate limiting | Too many requests | Implement caching and delay between requests |
| Market closed data | Querying current day before close | Use previous day's data or check market hours |

### Error Handling Implementation

```javascript
async function safeGetPriceChange(symbol, interval, range) {
  try {
    return await getPriceChange(symbol, interval, range);
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return { error: 'Symbol not found or delisted' };
    }
    if (error.message.includes('Insufficient data')) {
      return { error: 'Not enough trading data available' };
    }
    return { error: 'Failed to fetch price data', details: error.message };
  }
}
```

### Handling TSXV Symbol Variations

```javascript
async function getPriceChangeWithFallback(symbol, interval, range) {
  // Try with .V suffix first
  try {
    return await getPriceChange(`${symbol}.V`, interval, range);
  } catch (error) {
    // If .V fails, try .CN suffix
    try {
      return await getPriceChange(`${symbol}.CN`, interval, range);
    } catch (secondError) {
      throw new Error(`Symbol not found with .V or .CN suffix`);
    }
  }
}
```

---

## Best Practices

### Rate Limits
- **No official rate limit**, but avoid hammering the API
- Recommended: Max 2000 requests/hour
- Implement caching for frequently accessed data
- Add delays between requests (100-200ms minimum)

### Caching Strategy
```javascript
// Cache key pattern
const cacheKey = `price:${symbol}:${interval}:${range}`;

// TTL recommendations
const cacheTTL = {
  '1m': 60,        // 1 minute
  '5m': 300,       // 5 minutes
  '15m': 900,      // 15 minutes
  '1h': 3600,      // 1 hour
  '1d': 86400      // 24 hours
};
```

### Market Hours (TSX/TSXV)
- **Regular hours:** 9:30 AM - 4:00 PM ET
- **Pre-market:** 8:00 AM - 9:30 AM ET (limited)
- **After-hours:** 4:00 PM - 5:00 PM ET (limited)

### Headers
Always include a User-Agent header to appear as a browser:
```javascript
headers: {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}
```

---

## Complete Example: Monitoring Multiple Stocks

```javascript
async function monitorPortfolio(symbols) {
  const results = [];
  
  for (const symbol of symbols) {
    try {
      // Get 24h change
      const dayChange = await getPriceChange(symbol, '5m', '1d');
      
      // Get 1-month change
      const monthChange = await getPriceChange(symbol, '1d', '1mo');
      
      results.push({
        symbol,
        day: dayChange,
        month: monthChange
      });
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      results.push({
        symbol,
        error: error.message
      });
    }
  }
  
  return results;
}

// Usage
const portfolio = ['CRUZ.V', 'SHOP.TO', 'AAPL'];
const monitoring = await monitorPortfolio(portfolio);
console.log(monitoring);
```

---

## Documentation Note

Yahoo Finance doesn't have official API documentation since they shut down their official API in 2017. The current endpoints are unofficial and accessed through reverse-engineering. The best way to verify which suffix a specific TSXV symbol uses is to search for it on https://ca.finance.yahoo.com/lookup/ or check if it exists with `.V` first, then try `.CN` if that fails.

---

## Quick Reference: Common Use Cases

| Use Case | Interval | Range | Example |
|----------|----------|-------|---------|
| Real-time monitoring | `1m` | `1h` | Track last hour |
| Intraday trading | `5m` | `1d` | 24-hour view |
| Daily summary | `1d` | `1mo` | Month overview |
| Long-term analysis | `1d` | `5y` | 5-year history |
| Weekly trends | `1d` | `3mo` | Quarter view |