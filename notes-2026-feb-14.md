# Trading System Notes

## Filter Requirements

### 1. Pre-filter by Dollar Volume and Traded Value
- e.g. higher than $10K, for N periods of M days each
  - param on UI
- These results take 24 hours to go stale, no need to re-compute more often as it will yield the same result.

### 2. Market Data Filtering
- For each symbol that passes Filter 1 (F1), request detailed market data — persist the timestamp to avoid fetching again in less than N minutes.
  - param on UI

### 3. Alerting System Implementation
- Implement simple alerting system w Telegram bot, with some batching mechanism to prevent spam, but single message per opportunity — include useful links like TradingView if it does not work on mobile strive to represent in app, mobile friendly.

## Future Filters to Add

**F2** could be a filter on the estimated asset volatility e.g. defined by a computation on hourly and/or daily min vs max values.