'use client';

import { Search, Newspaper, TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, Calendar } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { generateTradingViewUrl } from '@/utils/trading-view';
import Pill from '@/components/interaction/Pill';
import { formatHumanDate } from '@/utils/date';
import { AveragePriceData } from '@/types/symbol';

interface WarmSymbol {
  id: string;
  symbol: string;
  short_name: string | null;
  long_name: string | null;
  exchange: string | null;
  currency: string | null;
  quote_type: string | null;
  regular_market_price: number | null;
  regular_market_change: number | null;
  regular_market_change_percent: number | null;
  market_cap: number | null;
  regular_market_volume: number | null;
  average_daily_volume_10day: number | null;
  average_daily_volume_3month: number | null;
  fifty_day_average: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  is_currently_warm: boolean;
  hotness_score: number | null;
  recent_prices: AveragePriceData | null;
  created_at: string;
  updated_at: string;
}

interface SymbolDetailsDrawerV2Props {
  selectedSymbol: string | null;
  selectedSymbolData: WarmSymbol | null;
  onClose: () => void;
}

export function SymbolDetailsDrawerV2({
  selectedSymbol,
  selectedSymbolData,
  onClose,
}: SymbolDetailsDrawerV2Props) {
  const formatCurrency = (value: number | null, currency: string = 'CAD') => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number | null) => {
    if (value === null) return 'N/A';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const formatMarketCap = (value: number | null, currency: string = 'CAD') => {
    if (value === null) return 'N/A';

    const units = [
      { threshold: 1e12, suffix: 'T' },
      { threshold: 1e9, suffix: 'G' },
      { threshold: 1e6, suffix: 'M' },
      { threshold: 1e3, suffix: 'K' },
    ];

    for (const unit of units) {
      if (value >= unit.threshold) {
        const formatted = (value / unit.threshold).toFixed(1);
        return `${currency === 'USD' ? '$' : currency === 'CAD' ? 'C$' : '$'}${formatted}${unit.suffix}`;
      }
    }

    return `${currency === 'USD' ? '$' : currency === 'CAD' ? 'C$' : '$'}${value.toLocaleString()}`;
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };


  const getChangeIcon = (change: number | null) => {
    if (change === null) return <Minus size={16} className="text-gray-400" />;
    if (change > 0) return <TrendingUp size={16} className="text-green-600" />;
    if (change < 0) return <TrendingDown size={16} className="text-red-600" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  const getChangeColor = (change: number | null) => {
    if (change === null) return 'text-gray-400';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  return (
    <Drawer
      isOpen={selectedSymbol !== null}
      onClose={onClose}
      position="right"
      shouldOpenWithBackdrop={true}
    >
      {selectedSymbol && selectedSymbolData && (
        <div className="space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedSymbol}
            </h2>
            <p className="text-lg text-gray-700 mb-4">
              {selectedSymbolData.long_name || selectedSymbolData.short_name || 'Unknown Symbol'}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Exchange:</span> {selectedSymbolData.exchange === 'TO' ? 'TSX' : selectedSymbolData.exchange || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Currency:</span> {selectedSymbolData.currency || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Type:</span> {selectedSymbolData.quote_type || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                  Warm
                </span>
              </div>
            </div>
          </div>

          {/* Current Price */}
          {selectedSymbolData.regular_market_price && (
            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign size={20} />
                Current Price
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(selectedSymbolData.regular_market_price, selectedSymbolData.currency || 'CAD')}
                </div>
                <div className="flex items-center gap-2">
                  {getChangeIcon(selectedSymbolData.regular_market_change)}
                  <span className={`text-sm font-medium ${getChangeColor(selectedSymbolData.regular_market_change)}`}>
                    {selectedSymbolData.regular_market_change !== null &&
                      formatCurrency(Math.abs(selectedSymbolData.regular_market_change), selectedSymbolData.currency || 'CAD')
                    }
                    ({formatPercent(selectedSymbolData.regular_market_change_percent)})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Market Data */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 size={20} />
              Market Data
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {selectedSymbolData.market_cap && (
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-sm text-gray-600">Market Cap</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatMarketCap(selectedSymbolData.market_cap, selectedSymbolData.currency || 'CAD')}
                  </div>
                </div>
              )}
              {selectedSymbolData.regular_market_volume && (
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-sm text-gray-600">Volume</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatNumber(selectedSymbolData.regular_market_volume)}
                  </div>
                </div>
              )}
              {selectedSymbolData.average_daily_volume_10day && (
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-sm text-gray-600">Avg Vol (10d)</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatNumber(selectedSymbolData.average_daily_volume_10day)}
                  </div>
                </div>
              )}
              {selectedSymbolData.average_daily_volume_3month && (
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-sm text-gray-600">Avg Vol (3M)</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatNumber(selectedSymbolData.average_daily_volume_3month)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Ranges */}
          {(selectedSymbolData.fifty_day_average || selectedSymbolData.fifty_two_week_high || selectedSymbolData.fifty_two_week_low) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp size={20} />
                Price Ranges
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedSymbolData.fifty_day_average && (
                  <Pill
                    label={`50D Avg: ${formatCurrency(selectedSymbolData.fifty_day_average, selectedSymbolData.currency || 'CAD')}`}
                    size="xs"
                    className="bg-gray-100 text-gray-800 hover:bg-gray-200"
                  />
                )}
                {selectedSymbolData.fifty_two_week_high && (
                  <Pill
                    label={`52W High: ${formatCurrency(selectedSymbolData.fifty_two_week_high, selectedSymbolData.currency || 'CAD')}`}
                    size="xs"
                    className="bg-green-100 text-green-800 hover:bg-green-200"
                  />
                )}
                {selectedSymbolData.fifty_two_week_low && (
                  <Pill
                    label={`52W Low: ${formatCurrency(selectedSymbolData.fifty_two_week_low, selectedSymbolData.currency || 'CAD')}`}
                    size="xs"
                    className="bg-red-100 text-red-800 hover:bg-red-200"
                  />
                )}
              </div>
            </div>
          )}

          {/* Useful Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Useful Links
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={generateTradingViewUrl({
                  symbol: selectedSymbol,
                  exchange: selectedSymbolData.exchange
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 text-xs text-[#373f51] hover:bg-[#f1f5f9] rounded-md transition-colors text-center"
              >
                <TrendingUp size={14} />
                <span>TradingView</span>
              </a>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`${selectedSymbol} ${selectedSymbolData.long_name || selectedSymbolData.short_name || ''}`.trim())}&tbm=nws`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 text-xs text-[#373f51] hover:bg-[#f1f5f9] rounded-md transition-colors text-center"
              >
                <Newspaper size={14} />
                <span>Google News</span>
              </a>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(selectedSymbol)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 text-xs text-[#373f51] hover:bg-[#f1f5f9] rounded-md transition-colors text-center"
              >
                <Search size={14} />
                <span>Google Search</span>
              </a>
            </div>
          </div>

          {/* Recent Prices */}
          {selectedSymbolData.recent_prices?.periods && Array.isArray(selectedSymbolData.recent_prices.periods) && selectedSymbolData.recent_prices.periods.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp size={20} />
                Recent Price Periods
              </h3>
              <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto">
                <div className="space-y-3">
                  {selectedSymbolData.recent_prices.periods.slice(0, 8).map((period: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 pb-2 last:border-b-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {period.name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          period.direction === 'up' ? 'bg-green-100 text-green-800' :
                          period.direction === 'down' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {period.changePercent !== undefined ? `${period.changePercent >= 0 ? '+' : ''}${period.changePercent.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-700">Avg Price:</span>
                          <span className="font-medium text-gray-900 ml-1">{formatCurrency(period.averagePrice, selectedSymbolData.currency || 'CAD')}</span>
                        </div>
                        <div>
                          <span className="text-gray-700">Avg Volume:</span>
                          <span className="font-medium text-gray-900 ml-1">{formatNumber(period.averageVolume)}</span>
                        </div>
                        <div>
                          <span className="text-gray-700">High:</span>
                          <span className="font-medium text-gray-900 ml-1">{formatCurrency(period.highestPrice, selectedSymbolData.currency || 'CAD')}</span>
                        </div>
                        <div>
                          <span className="text-gray-700">Low:</span>
                          <span className="font-medium text-gray-900 ml-1">{formatCurrency(period.lowestPrice, selectedSymbolData.currency || 'CAD')}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-700">Avg Traded Value:</span>
                          <span className="font-medium text-gray-900 ml-1">{formatCurrency(period.averageTradedValue, selectedSymbolData.currency || 'CAD')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedSymbolData.recent_prices.periods.length > 8 && (
                    <div className="text-xs text-gray-500 text-center pt-2 border-t">
                      Showing first 8 of {selectedSymbolData.recent_prices.periods.length} periods
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={20} />
              Metadata
            </h3>
            <div className="flex flex-wrap gap-2">
              <Pill
                label={`Created: ${formatHumanDate(selectedSymbolData.created_at)}`}
                size="xs"
                className="bg-blue-100 text-blue-800 hover:bg-blue-200"
              />
              <Pill
                label={`Updated: ${formatHumanDate(selectedSymbolData.updated_at)}`}
                size="xs"
                className="bg-purple-100 text-purple-800 hover:bg-purple-200"
              />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="sticky bottom-0 h-6 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none -mb-6" />
        </div>
      )}
    </Drawer>
  );
}