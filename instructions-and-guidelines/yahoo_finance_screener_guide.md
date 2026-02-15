# Yahoo Finance Screener - Vercel Endpoint Guide

This guide provides step-by-step instructions for creating a Vercel API endpoint that filters TSX stocks by dollar volume (price × average volume).

---

## Endpoint Overview

The endpoint should:
1. Accept a `minDollarVolume` query parameter (default: 1,000,000)
2. Accept an `exchange` query parameter (default: "TOR" for TSX)
3. Return a filtered list of symbols that meet the dollar volume threshold

---

## Step-by-Step Process

### Step 1: Establish Session and Get Cookies

Make a GET request to Yahoo Finance to establish a session and capture cookies.

**Request:**
```
GET https://fc.yahoo.com
Header: User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

**What to capture:** Store the cookies from the response (Set-Cookie headers) for use in subsequent requests.

---

### Step 2: Get Crumb Token

Using the cookies from Step 1, fetch the crumb token required for authentication. If a valid crumb is cached (less than 6 hours old), it will be reused automatically.

**Request:**
```
GET https://query1.finance.yahoo.com/v1/test/getcrumb
Header: User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Header: Cookie: [cookies from Step 1]
```

**Response:** A plain text string like `FqHG7VkqHXL`

**What to capture:** Store this crumb value for the next request. Crumbs are automatically cached for 6 hours.

---

### Step 3: Query Yahoo Finance Screener

Use the cookies and crumb to query the screener API for all stocks on the specified exchange.

**Request:**
```
POST https://query1.finance.yahoo.com/v1/finance/screener?crumb=[CRUMB_FROM_STEP_2]
Header: Content-Type: application/json
Header: User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Header: Cookie: [cookies from Step 1]

Body:
{
  "size": 250,
  "offset": 0,
  "sortField": "intradaymarketcap",
  "sortType": "DESC",
  "quoteType": "EQUITY",
  "query": {
    "operator": "eq",
    "operands": ["exchange", "TOR"]
  }
}
```

**Response structure:**
```json
{
  "finance": {
    "result": [{
      "quotes": [
        {
          "symbol": "SHOP.TO",
          "regularMarketPrice": 95.42,
          "averageDailyVolume10Day": 2500000,
          "marketCap": 123456789,
          "shortName": "Shopify Inc"
        },
        ...
      ]
    }]
  }
}
```

**What to extract:** From each item in `finance.result[0].quotes[]`, get:
- `symbol`
- `regularMarketPrice`
- `averageDailyVolume10Day`
- `marketCap` (optional)
- `shortName` (optional)

---

### Step 4: Calculate Dollar Volume and Filter

For each stock from Step 3:

1. Calculate: `dollarVolume = regularMarketPrice × averageDailyVolume10Day`
2. Filter: Keep only stocks where `dollarVolume >= minDollarVolume` (from query parameter)
3. Sort: Order results by `dollarVolume` descending

**Output format:**
```json
{
  "count": 45,
  "minDollarVolume": 1000000,
  "exchange": "TOR",
  "symbols": [
    {
      "symbol": "SHOP.TO",
      "price": 95.42,
      "avgVolume10Day": 2500000,
      "dollarVolume": 238550000,
      "marketCap": 123456789,
      "shortName": "Shopify Inc"
    },
    ...
  ]
}
```

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `minDollarVolume` | number | 1000000 | Minimum dollar volume threshold |
| `exchange` | string | "TOR" | Exchange code (TOR=TSX, CNQ=TSXV) |

---

## Important Notes

### Session Management
- Cookies must be obtained fresh for each request to the screener
- Crumbs are automatically cached for 6 hours to avoid rate limiting (both in scripts and manual curl commands)
- Use the same cookie jar (session) for Steps 1-3
- Cached crumbs are stored in `yahoo-crumb-cache.json`

### Error Handling
- If Step 2 returns empty or "Too Many Requests", crumb fetch failed (try again later)
- If Step 3 returns `{"error": "Invalid Crumb"}`, cookies/crumb are stale (delete yahoo-crumb-cache.json to force refresh)
- If Step 3 returns no quotes, the exchange code might be wrong

### Exchange Codes
- TSX (Toronto Stock Exchange): `TOR`
- TSXV (TSX Venture Exchange): `CNQ`

---

## Example Endpoint Usage

```
GET /api/screener?minDollarVolume=5000000&exchange=TOR
```

Returns all TSX stocks with at least $5M in daily dollar volume.
