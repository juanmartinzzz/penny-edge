'use client';

import { useState, useEffect } from 'react';
import { Search, Newspaper, TrendingUp } from 'lucide-react';
import PillList from '@/components/interaction/PillList';
import Button from '@/components/interaction/Button';
import { Drawer } from '@/components/ui/Drawer';
import { SkeletonCard } from '@/components/ui/Loading';
import { Symbol } from '@/types/symbol';


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

interface SymbolPriceData {
  [symbol: string]: {
    [period: string]: PriceChangeData | null;
  };
}

// Function to load price changes for multiple symbols using the API route
async function loadPriceChangesForSymbols(
  symbols: string[],
  periods: Array<{ interval: string; range: string; label: string }>,
  onProgress: (symbol: string, period: string, data: PriceChangeData) => void
) {
  // Process each symbol individually
  for (const symbol of symbols) {
    try {
      const response = await fetch('/api/price-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, periods }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Process the results for this symbol
      Object.entries(data.results).forEach(([period, periodData]: [string, PriceChangeData]) => {
        onProgress(symbol, period, periodData);
      });

    } catch (error) {
      console.error(`Error loading price changes for ${symbol}:`, error);

      // If API fails for this symbol, set error state for all periods
      periods.forEach(period => {
        onProgress(symbol, period.label, {
          symbol,
          period: period.label,
          latestPrice: '0',
          earliestPrice: '0',
          changePercent: '0',
          changeAbsolute: '0',
          direction: 'down',
          error: 'Failed to load data'
        });
      });
    }
  }
}

// Interface for symbol categories from API
interface SymbolCategories {
  [category: string]: {
    tsx: string[];
    tsxv: string[];
  };
}

export default function StocksPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<SymbolPriceData>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [symbolCategories, setSymbolCategories] = useState<SymbolCategories>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedSymbolData, setSelectedSymbolData] = useState<Symbol | null>(null);
  const [isLoadingSymbolData, setIsLoadingSymbolData] = useState(false);

  // Fetch symbols from API on component mount
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await fetch('/api/symbols');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setSymbolCategories(data.categories);
      } catch (error) {
        console.error('Error fetching symbols:', error);
        // Set empty categories on error to prevent crashes
        setSymbolCategories({});
      }
    };

    fetchSymbols();
  }, []);

  // Fetch symbol details when selectedSymbol changes
  useEffect(() => {
    if (selectedSymbol) {
      setIsLoadingSymbolData(true);
      getSymbolData(selectedSymbol).then(symbolData => {
        setSelectedSymbolData(symbolData);
        setIsLoadingSymbolData(false);
      });
    } else {
      setSelectedSymbolData(null);
      setIsLoadingSymbolData(false);
    }
  }, [selectedSymbol]);

  const getFilteredSymbols = () => {
    if (selectedCategories.length === 0) {
      return symbolCategories;
    }

    const filtered: Partial<SymbolCategories> = {};
    selectedCategories.forEach(category => {
      if (symbolCategories[category]) {
        filtered[category] = symbolCategories[category];
      }
    });
    return filtered;
  };

  const filteredSymbols = getFilteredSymbols();

  // State for symbol details
  const [symbolDetails, setSymbolDetails] = useState<Record<string, Symbol | null>>({});

  // Get symbol data by code (fetch from API if not cached)
  const getSymbolData = async (symbolCode: string): Promise<Symbol | null> => {
    if (symbolDetails[symbolCode] !== undefined) {
      return symbolDetails[symbolCode];
    }

    try {
      const response = await fetch(`/api/symbols/${encodeURIComponent(symbolCode)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const symbol = data.symbol || null;

      setSymbolDetails(prev => ({
        ...prev,
        [symbolCode]: symbol
      }));

      return symbol;
    } catch (error) {
      console.error(`Error fetching symbol details for ${symbolCode}:`, error);
      setSymbolDetails(prev => ({
        ...prev,
        [symbolCode]: null
      }));
      return null;
    }
  };

  // Get all symbols currently displayed
  const getDisplayedSymbols = () => {
    const symbols: string[] = [];
    Object.values(filteredSymbols).forEach(exchanges => {
      symbols.push(...exchanges.tsx, ...exchanges.tsxv);
    });
    return symbols;
  };

  // Handle loading price changes for all displayed symbols
  const handleLoadPriceChanges = async () => {
    const symbols = getDisplayedSymbols();
    if (symbols.length === 0) return;

    setIsLoadingPrices(true);
    setLoadingSymbols(new Set(symbols));

    const periods = [
      { interval: '5m', range: '1d', label: '1d' },
      { interval: '1h', range: '5d', label: '5d' },
      { interval: '1d', range: '1mo', label: '1mo' }
    ];

    try {
      await loadPriceChangesForSymbols(symbols, periods, (symbol, period, data) => {
        setPriceData(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            [period]: data
          }
        }));
      });

      // All data loaded successfully
      setLoadingSymbols(new Set());

    } catch (error) {
      console.error('Error loading price changes:', error);
      setLoadingSymbols(new Set());
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Handle loading price changes for a single symbol
  const handleLoadPriceChangesForSymbol = async (symbol: string) => {
    if (loadingSymbols.has(symbol)) return; // Already loading

    // Set the selected symbol to show details
    setSelectedSymbol(symbol);
    setLoadingSymbols(prev => new Set(prev).add(symbol));

    const periods = [
      { interval: '5m', range: '1d', label: '1d' },
      { interval: '1h', range: '5d', label: '5d' },
      { interval: '1d', range: '1mo', label: '1mo' }
    ];

    try {
      const response = await fetch('/api/price-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, periods }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Process the results for this symbol
      Object.entries(data.results).forEach(([period, periodData]: [string, PriceChangeData]) => {
        setPriceData(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            [period]: periodData
          }
        }));
      });
    } catch (error) {
      console.error(`Error loading price changes for ${symbol}:`, error);

      // Set error state for all periods
      periods.forEach(period => {
        setPriceData(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            [period.label]: {
              symbol,
              period: period.label,
              latestPrice: '0',
              earliestPrice: '0',
              changePercent: '0',
              changeAbsolute: '0',
              direction: 'down',
              error: 'Failed to load data'
            }
          }
        }));
      });
    } finally {
      setLoadingSymbols(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  };

  const renderSymbolList = (symbols: string[], exchange: string) => {
    if (symbols.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          {exchange}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {symbols.map(symbol => {
            const symbolData = priceData[symbol] || {};
            const isLoading = loadingSymbols.has(symbol);
            const hasPriceData = Object.keys(symbolData).length > 0;

            return (
              <div key={symbol} className="relative group">
                <Button
                  variant="secondary"
                  size="sm"
                  className={`w-full font-mono text-sm transition-all duration-150 ${
                    selectedSymbol === symbol ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleLoadPriceChangesForSymbol(symbol)}
                >
                  {symbol}
                  {isLoading && <span className="ml-2 animate-spin">⏳</span>}
                </Button>

                {/* Price data displayed below button when loaded */}
                {hasPriceData && (
                  <div className="mt-2 space-y-1 bg-white border border-gray-200 rounded-md p-2 shadow-sm">
                    {['1d', '5d', '1mo'].map(period => {
                      const periodData = symbolData[period];
                      if (!periodData) return null;

                      const isPositive = periodData.direction === 'up';
                      const hasError = periodData.error;

                      return (
                        <div key={period} className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-medium">{period}:</span>
                          {hasError ? (
                            <span className="text-red-500" title={periodData.error}>
                              {periodData.error?.includes('404') ? 'Not found' : 'Error'}
                            </span>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? '+' : ''}{periodData.changePercent}%
                              </span>
                              <span className="text-gray-600">
                                ${periodData.latestPrice}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              TSX & TSXV Penny Stocks
            </h1>
            <p className="text-gray-600">
              Browse penny stocks from Toronto Stock Exchange (TSX) and TSX Venture Exchange (TSXV)
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Filter by Category
            </h2>
            <PillList
              options={Object.keys(symbolCategories)}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              variant="multiple"
            />
            {selectedCategories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedCategories([])}
              >
                Clear all filters
              </Button>
            )}
          </div>

          <div className="mb-6">
            <Button
              variant="primary"
              size="md"
              onClick={handleLoadPriceChanges}
              disabled={isLoadingPrices || getDisplayedSymbols().length === 0}
              className="mr-4"
            >
              {isLoadingPrices ? 'Loading Price Changes...' : 'Load Price Changes'}
            </Button>
            {isLoadingPrices && (
              <span className="text-sm text-gray-600">
                This may take a few minutes due to API rate limiting (1 second between requests)
              </span>
            )}
            {!isLoadingPrices && (
              <p className="text-sm text-gray-500 mt-2">
                Note: Some penny stocks may not have historical price data available due to low trading volume.
                &quot;Not found&quot; indicates the symbol doesn&apos;t exist or has no data.
              </p>
            )}
          </div>

          <div className="space-y-8">
            {Object.entries(filteredSymbols).map(([category, exchanges]) => (
              <div key={category} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {category}
                </h3>

                <div className="space-y-6">
                  {renderSymbolList(exchanges.tsx, 'TSX')}
                  {renderSymbolList(exchanges.tsxv, 'TSXV')}
                </div>
              </div>
            ))}
          </div>

          {Object.keys(filteredSymbols).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories match your current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Symbol Details Drawer */}
      <Drawer
        isOpen={selectedSymbol !== null}
        onClose={() => setSelectedSymbol(null)}
        position="right"
        shouldOpenWithBackdrop={true}
      >
        {selectedSymbol && (() => {
          const priceInfo = priceData[selectedSymbol] || {};

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedSymbol}
                </h2>
                {isLoadingSymbolData ? (
                  <div className="text-gray-500">Loading symbol details...</div>
                ) : selectedSymbolData ? (
                  <>
                    <p className="text-lg text-gray-700 mb-4">
                      {selectedSymbolData.name}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                      <div>
                        <span className="font-medium">Exchange:</span> {selectedSymbolData.exchange === 'TO' ? 'TSX' : 'TSXV'}
                      </div>
                      <div>
                        <span className="font-medium">Country:</span> {selectedSymbolData.country}
                      </div>
                      <div>
                        <span className="font-medium">Currency:</span> {selectedSymbolData.currency}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {selectedSymbolData.type}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-red-500">Failed to load symbol details</div>
                )}
              </div>

              {/* Price Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Price Changes
                </h3>
                <div className="space-y-2">
                  {loadingSymbols.has(selectedSymbol!) ? (
                    // Show loading skeletons when data is being fetched
                    <>
                      <SkeletonCard />
                      <SkeletonCard />
                      <SkeletonCard />
                    </>
                  ) : (
                    // Show actual data when loaded
                    ['1d', '5d', '1mo'].map(period => {
                      const periodData = priceInfo[period];
                      if (!periodData) return null;

                      const isPositive = periodData.direction === 'up';
                      const hasError = periodData.error;

                      return (
                        <div key={period} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                          <span className="text-sm font-medium text-gray-700">{period.toUpperCase()}:</span>
                          {hasError ? (
                            <span className="text-red-500 text-xs">
                              {periodData.error?.includes('404') ? 'Not found' : 'Error'}
                            </span>
                          ) : (
                            <div className="text-right">
                              <div className={`font-semibold text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? '+' : ''}{periodData.changePercent}%
                              </div>
                              <div className="text-xs text-gray-600">
                                ${periodData.latestPrice}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Useful Links */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Useful Links
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(selectedSymbol)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 text-xs text-[#373f51] hover:bg-[#f1f5f9] rounded-md transition-colors text-center"
                  >
                    <Search size={14} />
                    <span>Google Search</span>
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(selectedSymbol)}&tbm=nws`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 text-xs text-[#373f51] hover:bg-[#f1f5f9] rounded-md transition-colors text-center"
                  >
                    <Newspaper size={14} />
                    <span>Google News</span>
                  </a>
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(`${selectedSymbolData ? (selectedSymbolData.exchange === 'TO' ? 'TSX' : 'TSXV') : 'TSX'}:${selectedSymbol.split('.')[0]}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 text-xs text-[#373f51] hover:bg-[#f1f5f9] rounded-md transition-colors text-center"
                  >
                    <TrendingUp size={14} />
                    <span>TradingView</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })()}
      </Drawer>
    </main>
  );
}