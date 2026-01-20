'use client';

import { Search, Newspaper, TrendingUp } from 'lucide-react';
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

interface SymbolPriceData {
  [symbol: string]: {
    [period: string]: PriceChangeData | null;
  };
}

interface SymbolDetailsDrawerProps {
  selectedSymbol: string | null;
  selectedSymbolData: Symbol | null;
  isLoadingSymbolData: boolean;
  priceData: SymbolPriceData;
  loadingSymbols: Set<string>;
  averagePriceData: AveragePriceData | null;
  isLoadingAveragePrices: boolean;
  onClose: () => void;
}

export function SymbolDetailsDrawer({
  selectedSymbol,
  selectedSymbolData,
  isLoadingSymbolData,
  priceData,
  loadingSymbols,
  averagePriceData,
  isLoadingAveragePrices,
  onClose,
}: SymbolDetailsDrawerProps) {
  return (
    <Drawer
      isOpen={selectedSymbol !== null}
      onClose={onClose}
      position="right"
      shouldOpenWithBackdrop={true}
    >
      {selectedSymbol && (() => {
        const priceInfo = priceData[selectedSymbol] || {};

        return (
          <div className="space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
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

            {/* Recent Prices */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recent Prices
              </h3>
              <div className="space-y-2">
                {isLoadingAveragePrices ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : averagePriceData ? (
                  averagePriceData.periods.map((period, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                      <div className="text-sm font-medium text-gray-700 mb-1">{period.name}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Avg: </span>
                          <span className="font-bold text-gray-900">${period.averagePrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">High: </span>
                          <span className="font-semibold text-green-600">${period.highestPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Low: </span>
                          <span className="font-semibold text-red-600">${period.lowestPrice.toFixed(2)}</span>
                        </div>
                        {period.changePercent !== undefined && (
                          <div>
                            <span className="text-gray-600">Change: </span>
                            <span className={`font-semibold ${period.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                              {period.direction === 'up' ? '+' : ''}{period.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No recent price data available</div>
                )}
              </div>
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

            {/* Scroll indicator */}
            <div className="sticky bottom-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none -mb-6" />
          </div>
        );
      })()}
    </Drawer>
  );
}