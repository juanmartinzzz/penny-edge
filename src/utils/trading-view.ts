/**
 * Utility functions for generating TradingView links
 */

export interface TradingViewSymbol {
  symbol: string;
  exchange: string | null;
}

/**
 * Generates a proper TradingView chart URL for a symbol
 * Handles different exchange formats and symbol notations
 */
export function generateTradingViewUrl(symbolData: TradingViewSymbol): string {
  const { symbol, exchange } = symbolData;

  // Extract base symbol (remove exchange suffix if present)
  let baseSymbol = symbol;
  if (symbol.includes('.')) {
    baseSymbol = symbol.split('.')[0];
  }

  // Determine TradingView exchange format
  let tvExchange = 'TSX'; // default to TSX for TSX

  if (exchange) {
    switch (exchange.toUpperCase()) {
      case 'TO':
        tvExchange = 'TSX'; // Confirmed working format for TSX
        break;
      case 'TOR':
        tvExchange = 'TSX'; // Database stores TOR for TSX, map to TSX
        break;
      case 'V':
        tvExchange = 'TSXV';
        break;
      case 'VAN':
        tvExchange = 'TSXV'; // TSX Venture
        break;
      case 'CNQ':
        tvExchange = 'TSXV'; // TSX Venture
        break;
      case 'NMS':
        tvExchange = 'NASDAQ';
        break;
      case 'NYQ':
        tvExchange = 'NYSE';
        break;
      case 'ASE':
        tvExchange = 'AMEX';
        break;
      case 'PCX':
        tvExchange = 'NASDAQ'; // Pacific Exchange maps to NASDAQ
        break;
      default:
        // For other exchanges, try to use the exchange code directly
        tvExchange = exchange.toUpperCase();
    }
  }

    // Construct the TradingView symbol format
    const tvSymbol = `${tvExchange}:${baseSymbol}`;

    return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
}

/**
 * Generates a TradingView URL from a symbol string and exchange string
 */
export function generateTradingViewUrlFromStrings(symbol: string, exchange: string | null): string {
  return generateTradingViewUrl({ symbol, exchange });
}