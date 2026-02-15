# External API Endpoints

This document lists all external API endpoints used in the Penny Edge project, along with brief descriptions of the data being requested from each.

## Yahoo Finance API

### Authentication Endpoints

#### Session Cookies
**URL:** `https://fc.yahoo.com`
**Method:** GET
**Purpose:** Establishes session and retrieves required cookies for API access.

#### Crumb Token
**URL:** `https://query1.finance.yahoo.com/v1/test/getcrumb`
**Method:** GET
**Purpose:** Retrieves authentication token required for subsequent API calls.
**Headers:** Requires session cookies from previous request.

### Data Endpoints

#### Chart Data Endpoint
**URL Pattern:** `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={range}`

**Used in:**
- `src/lib/price-service.ts` (getAveragePrices function)
- `src/app/api/price-changes/route.ts` (getPriceChange function)

**Purpose:** Retrieves historical stock price data for charting and analysis.

**Data Requested:**
- Historical price data (open, high, low, close prices)
- Trading timestamps
- Volume data (when available)
- Chart metadata and error information

**Parameters:**
- `symbol`: Stock symbol (formatted for exchange, e.g., "AAPL", "ABC.TO", "DEF.V")
- `interval`: Time interval between data points (e.g., "1d" for daily, "1h" for hourly)
- `range`: Time range for data (e.g., "5d", "1mo", "1y")

**Response Format:** JSON with chart result containing indicators, timestamps, and quote data

**Usage in Project:**
- Price change calculations (percentage and absolute changes over time periods)
- Average price calculations for multiple time periods
- Hotness score calculations based on price volatility and trends
- Stock performance analysis and visualization

#### Quote Data Endpoint
**URL Pattern:** `https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbols}&crumb={crumb}`
**Method:** GET

**Used in:**
- `src/app/api/market-snapshot/update-warm-symbols/route.ts` (batch quote fetching)

**Purpose:** Retrieves current quote data for multiple stock symbols in a single request.

**Data Requested:**
- Current price information
- Trading volume and market data
- Company symbols and identifiers

**Parameters:**
- `symbols`: Comma-separated list of stock symbols
- `crumb`: Authentication token from crumb endpoint

**Response Format:** JSON with quote data for each requested symbol

**Usage in Project:**
- Batch retrieval of current market data
- Symbol validation and market cap information
- Real-time price updates for multiple stocks

#### Screener API Endpoint
**URL Pattern:** `https://query1.finance.yahoo.com/v1/finance/screener?crumb={crumb}`
**Method:** POST

**Used in:**
- `src/app/api/market-snapshot/route.ts` (market snapshot queries)
- `src/app/api/market-snapshot/update-warm-symbols/route.ts` (symbol discovery)

**Purpose:** Queries Yahoo Finance screener for stocks matching specific criteria.

**Data Requested:**
- Stock listings filtered by exchange, market cap, and other criteria
- Company information and trading data
- Market snapshot data for specific exchanges

**Parameters:**
- `crumb`: Authentication token from crumb endpoint
- Request Body: JSON with query parameters (size, offset, sortField, sortType, quoteType, query filters)

**Response Format:** JSON with finance result containing array of stock quotes

**Usage in Project:**
- Market snapshot generation for specific exchanges
- Symbol discovery and market scanning
- Stock screening based on exchange and market criteria