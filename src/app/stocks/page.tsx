'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PillList from '@/components/interaction/PillList';
import Button from '@/components/interaction/Button';
import { SymbolDetailsDrawer } from '@/components/SymbolDetailsDrawer';
import { SymbolUpdateStatus } from '@/components/ui/SymbolUpdateStatus';
import { SymbolAutoManager } from '@/components/ui/SymbolAutoManager';
import { StockHotnessManager } from '@/components/ui/StockHotnessManager';
import { Symbol } from '@/types/symbol';
import { ChevronDown, ChevronUp } from 'lucide-react';


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

// Interface for database symbol data with hotness
interface DatabaseSymbol {
  code: string;
  exchange: string;
  hotness_score?: number;
}

export default function StocksPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<SymbolPriceData>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [symbolCategories, setSymbolCategories] = useState<SymbolCategories>({});
  const [databaseSymbols, setDatabaseSymbols] = useState<DatabaseSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedSymbolData, setSelectedSymbolData] = useState<Symbol | null>(null);
  const [isLoadingSymbolData, setIsLoadingSymbolData] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch symbols from API on component mount
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await fetch('/api/symbols/symbols-from-static-file');
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

  // Fetch database symbols with hotness data on component mount
  useEffect(() => {
    const fetchDatabaseSymbols = async () => {
      try {
        const response = await fetch('/api/symbols/hotness-data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setDatabaseSymbols(data.symbols);
      } catch (error) {
        console.error('Error fetching database symbols:', error);
        setDatabaseSymbols([]);
      }
    };

    fetchDatabaseSymbols();
  }, []);

  // Fetch symbol details when selectedSymbol changes
  useEffect(() => {
    if (selectedSymbol) {
      setIsLoadingSymbolData(true);

      // Load symbol data
      getSymbolData(selectedSymbol).then((symbolData) => {
        setSelectedSymbolData(symbolData);
        setIsLoadingSymbolData(false);
      });
    } else {
      setSelectedSymbolData(null);
      setIsLoadingSymbolData(false);
    }
  }, [selectedSymbol]);

  // Create a map for quick lookup of hotness scores by symbol code
  const hotnessMap = useMemo(() => {
    const map = new Map<string, number>();
    databaseSymbols.forEach(symbol => {
      if (symbol.hotness_score !== undefined) {
        // Convert database format (code + exchange) to static file format (code.exchange_suffix)
        let fullSymbolCode = symbol.code;
        if (symbol.exchange === 'TO') {
          fullSymbolCode = `${symbol.code}.TO`;
        } else if (symbol.exchange === 'V') {
          fullSymbolCode = `${symbol.code}.V`;
        }
        map.set(fullSymbolCode, symbol.hotness_score);
      }
    });
    return map;
  }, [databaseSymbols]);

  // Sort symbols by hotness score (highest first, then by name)
  const sortSymbolsByHotness = (symbols: string[]): string[] => {
    return [...symbols].sort((a, b) => {
      const aHotness = hotnessMap.get(a) ?? -1; // Symbols without hotness score go to the end
      const bHotness = hotnessMap.get(b) ?? -1;

      // Sort by hotness score descending (higher scores first)
      if (aHotness !== bHotness) {
        return bHotness - aHotness;
      }

      // If hotness scores are equal, sort alphabetically by symbol code
      return a.localeCompare(b);
    });
  };

  const getFilteredSymbols = () => {
    let categories = symbolCategories;

    // Apply category filter if needed
    if (selectedCategories.length > 0) {
      const filtered: Partial<SymbolCategories> = {};
      selectedCategories.forEach(category => {
        if (symbolCategories[category]) {
          filtered[category] = symbolCategories[category];
        }
      });
      categories = filtered as SymbolCategories;
    }

    // Sort symbols in each category by hotness score
    const sortedCategories: SymbolCategories = {};
    Object.entries(categories).forEach(([category, exchanges]) => {
      sortedCategories[category] = {
        tsx: sortSymbolsByHotness(exchanges.tsx),
        tsxv: sortSymbolsByHotness(exchanges.tsxv),
      };
    });

    return sortedCategories;
  };

  const filteredSymbols = getFilteredSymbols();

  // State for symbol details
  const [symbolDetails, setSymbolDetails] = useState<Record<string, Symbol | null>>({});

  // Get symbol data by code (lookup from static file)
  const getSymbolData = useCallback(async (symbolCode: string): Promise<Symbol | null> => {
    if (symbolDetails[symbolCode] !== undefined) {
      return symbolDetails[symbolCode];
    }

    try {
      // Import ALL_SYMBOLS dynamically to avoid large bundle
      const { ALL_SYMBOLS } = await import('@/lib/symbols');

      // Find the symbol in the static data
      const symbol = ALL_SYMBOLS.find(s => `${s.code}.${s.exchange}` === symbolCode) || null;

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
  }, [symbolDetails]);

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

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
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
            const hotnessScore = hotnessMap.get(symbol);

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
                {hotnessScore !== undefined && (
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-medium ml-1 ${
                    hotnessScore >= 80 ? 'bg-red-50 text-red-700 border border-red-200' :
                    hotnessScore >= 60 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                    hotnessScore >= 40 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                    hotnessScore >= 20 ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {Math.round(hotnessScore)}
                  </span>
                )}
                  <div className="flex flex-col items-center relative">
                    <span className="font-mono text-sm">{symbol}</span>
                    {isLoading && <span className="mt-1 animate-spin text-xs text-gray-400">⟳</span>}
                  </div>
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
              Analyze penny stocks from Toronto Stock Exchange (TSX) and TSX Venture Exchange (TSXV)
            </p>
          </div>

          <SymbolAutoManager
            title="Symbol Auto Manager"
            showTitle={true}
            className="mb-8"
          />

          <StockHotnessManager
            title="Stock Hotness Calculator"
            showTitle={true}
            className="mb-8"
          />

          <SymbolUpdateStatus
            title="Market Data Status"
            showTitle={true}
            className="mb-8"
          />

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
            {Object.entries(filteredSymbols).map(([category, exchanges]) => {
              const isExpanded = expandedCategories.has(category);
              const totalSymbols = exchanges.tsx.length + exchanges.tsxv.length;

              return (
                <div key={category} className="bg-white rounded-lg shadow-sm p-6">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
                  >
                    <h3 className="text-xl font-semibold text-gray-900">
                      {category}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {totalSymbols} symbols
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-6">
                      {renderSymbolList(exchanges.tsx, 'TSX')}
                      {renderSymbolList(exchanges.tsxv, 'TSXV')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {Object.keys(filteredSymbols).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No categories match your current filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Symbol Details Drawer */}
      <SymbolDetailsDrawer
        selectedSymbol={selectedSymbol}
        selectedSymbolData={selectedSymbolData}
        isLoadingSymbolData={isLoadingSymbolData}
        priceData={priceData}
        loadingSymbols={loadingSymbols}
        onClose={() => setSelectedSymbol(null)}
      />
    </main>
  );
}