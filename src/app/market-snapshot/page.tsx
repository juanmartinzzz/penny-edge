'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/interaction/Button';
import NumericInput from '@/components/interaction/NumericInput';
import PillList from '@/components/interaction/PillList';
import Pill from '@/components/interaction/Pill';
import { SymbolDetailsDrawerV2 } from '@/components/SymbolDetailsDrawerV2';


const EXCHANGE_OPTIONS = [
  'TOR - TSX (Toronto)',
  'CNQ - TSXV (Venture)',
  'NYQ - NYSE',
  'NMS - NASDAQ',
  'ASE - AMEX',
  'PCX - Pacific Exchange'
];

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
  created_at: string;
  updated_at: string;
}

export default function MarketSnapshotPage() {

  // Warm Symbol Filters state
  const [warmExchange, setWarmExchange] = useState<string>('TOR - TSX (Toronto)');
  const [minAvgVolume10d, setMinAvgVolume10d] = useState<string>('500000');
  const [minAvgVolume3m, setMinAvgVolume3m] = useState<string>('800000');
  const [minComputationValue, setMinComputationValue] = useState<string>('1500000');
  const [isWarming, setIsWarming] = useState(false);
  const [warmFiltersResult, setWarmFiltersResult] = useState<{
    totalSymbols: number;
    warmSymbols: number;
    created: number;
    updated: number;
    filterBreakdown: {
      minAvgVolume10d: {
        threshold: number;
        passed: number;
        filtered: number;
        percentageFiltered: number;
      } | null;
      minAvgVolume3m: {
        threshold: number;
        passed: number;
        filtered: number;
        percentageFiltered: number;
      } | null;
      minComputationValue: {
        threshold: number;
        passed: number;
        filtered: number;
        percentageFiltered: number;
      } | null;
    };
  } | null>(null);

  // Warm Symbols state
  const [warmSymbols, setWarmSymbols] = useState<WarmSymbol[]>([]);
  const [isLoadingWarmSymbols, setIsLoadingWarmSymbols] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Extract actual values from display strings
  const getExchangeCode = (display: string) => display.split(' - ')[0];

  // Helper function to format numbers
  const formatNumber = (num: number) => num.toLocaleString();

  const handleWarmSymbolFilters = async () => {
    setIsWarming(true);
    setWarmFiltersResult(null);

    try {
      const response = await fetch('/api/market-snapshot/update-warm-symbols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchange: getExchangeCode(warmExchange),
          minAvgVolume10d: minAvgVolume10d ? parseFloat(minAvgVolume10d) : null,
          minAvgVolume3m: minAvgVolume3m ? parseFloat(minAvgVolume3m) : null,
          minComputationValue: minComputationValue ? parseFloat(minComputationValue) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setWarmFiltersResult(result);
      // Refresh warm symbols after updating filters
      await loadWarmSymbols();
    } catch (error: unknown) {
      console.error('Error warming symbol filters:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to warm symbol filters';
      // For now, keep the old message format for errors
      setWarmFiltersResult(null);
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsWarming(false);
    }
  };

  const loadWarmSymbols = async () => {
    setIsLoadingWarmSymbols(true);
    try {
      const response = await fetch('/api/market-snapshot/warm-symbols');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setWarmSymbols(result.warmSymbols || []);
    } catch (error) {
      console.error('Error loading warm symbols:', error);
      setWarmSymbols([]);
    } finally {
      setIsLoadingWarmSymbols(false);
    }
  };

  // Load warm symbols on component mount
  useEffect(() => {
    loadWarmSymbols();
  }, []);

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const handleCloseDrawer = () => {
    setSelectedSymbol(null);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Market Snapshot
            </h1>
            <p className="text-gray-600">
              Get real-time market data for stocks from any exchange using Yahoo Finance
            </p>
          </div>

          {/* Warm Symbol Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Warm Symbol Filters
            </h2>
            <div className="space-y-6 mb-6">
              {/* Row 1: Exchange Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange
                </label>
                <PillList
                  options={EXCHANGE_OPTIONS}
                  selected={[warmExchange]}
                  onChange={(selected) => setWarmExchange(selected[0] || 'TOR - TSX (Toronto)')}
                  variant="single"
                  size="xs"
                />
              </div>

              {/* Row 2: Other Fields */}
              <div className="flex flex-wrap gap-6">
                {/* Min Avg Volume (10d) */}
                <div className="flex-1 min-w-0 text-center">
                  <NumericInput
                    label="Min Avg Volume (10d)"
                    min={0}
                    value={minAvgVolume10d}
                    onChange={setMinAvgVolume10d}
                    placeholder="200K"
                    formatAsKMB={true}
                    center={true}
                  />
                  {warmFiltersResult?.filterBreakdown.minAvgVolume10d && (
                    <div className="text-lg text-gray-700 mt-2 text-center">
                      <div className="font-bold text-xl">{warmFiltersResult.filterBreakdown.minAvgVolume10d.percentageFiltered}%</div>
                      <div className="text-sm text-gray-600">{formatNumber(warmFiltersResult.filterBreakdown.minAvgVolume10d.passed)} passed</div>
                    </div>
                  )}
                </div>

                {/* Min Avg Volume (3M) */}
                <div className="flex-1 min-w-0">
                  <NumericInput
                    label="Min Avg Volume (3M)"
                    min={0}
                    value={minAvgVolume3m}
                    onChange={setMinAvgVolume3m}
                    placeholder="500K"
                    formatAsKMB={true}
                    center={true}
                  />
                  {warmFiltersResult?.filterBreakdown.minAvgVolume3m && (
                    <div className="text-lg text-gray-700 mt-2 text-center">
                      <div className="font-bold text-xl">{warmFiltersResult.filterBreakdown.minAvgVolume3m.percentageFiltered}%</div>
                      <div className="text-sm text-gray-600">{formatNumber(warmFiltersResult.filterBreakdown.minAvgVolume3m.passed)} passed</div>
                    </div>
                  )}
                </div>

                {/* Min Aprox Daily Value Traded */}
                <div className="flex-1 min-w-0">
                  <NumericInput
                    label={
                      <span>
                        Min Aprox Daily Value Traded{' '}
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 bg-gray-200 text-gray-600 rounded-full text-xs font-medium cursor-help"
                          title="AvgVol(3M) × 50D Avg / 90"
                        >
                          ?
                        </span>
                      </span>
                    }
                    min={0}
                    value={minComputationValue}
                    onChange={setMinComputationValue}
                    placeholder="2M"
                    formatAsKMB={true}
                    center={true}
                  />
                  {warmFiltersResult?.filterBreakdown.minComputationValue && (
                    <div className="text-lg text-gray-700 mt-2 text-center">
                      <div className="font-bold text-xl">{warmFiltersResult.filterBreakdown.minComputationValue.percentageFiltered}%</div>
                      <div className="text-sm text-gray-600">{formatNumber(warmFiltersResult.filterBreakdown.minComputationValue.passed)} passed</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="secondary"
                size="md"
                onClick={handleWarmSymbolFilters}
                disabled={isWarming}
                className="w-full md:w-auto"
              >
                {isWarming ? 'Finding Warm Symbols...' : 'Find Warm Symbols'}
              </Button>

              {warmFiltersResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Total symbols in market:</span> {warmFiltersResult.totalSymbols.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Warm symbols found:</span> {warmFiltersResult.warmSymbols.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Database updates:</span> {warmFiltersResult.created} created, {warmFiltersResult.updated} updated
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warm Symbols Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Warm Symbols ({warmSymbols.length})
              </h2>
              {isLoadingWarmSymbols && (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
            </div>

            {warmSymbols.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {warmSymbols.map((symbol) => (
                  <Pill
                    key={symbol.id}
                    label={symbol.symbol}
                    size="xs"
                    onClick={() => handleSymbolClick(symbol.symbol)}
                    className="cursor-pointer"
                  />
                ))}
              </div>
            ) : (
              !isLoadingWarmSymbols && (
                <div className="text-center py-8 text-gray-500">
                  <p>No warm symbols found. Run the warm symbol filters to populate this section.</p>
                </div>
              )
            )}
          </div>

        </div>
      </div>

      {/* Symbol Details Drawer */}
      <SymbolDetailsDrawerV2
        selectedSymbol={selectedSymbol}
        selectedSymbolData={selectedSymbol ? warmSymbols.find(s => s.symbol === selectedSymbol) || null : null}
        onClose={handleCloseDrawer}
      />
    </main>
  );
}