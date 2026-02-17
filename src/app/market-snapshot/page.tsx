'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/interaction/Button';
import NumericInput from '@/components/interaction/NumericInput';
import PillList from '@/components/interaction/PillList';
import Pill from '@/components/interaction/Pill';
import HotnessScorePill from '@/components/ui/HotnessScorePill';
import { SymbolDetailsDrawerV2 } from '@/components/SymbolDetailsDrawerV2';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AveragePriceData } from '@/types/symbol';


const EXCHANGE_OPTIONS = [
  'TOR - TSX (Toronto)',
  'VAN - TSXV (Venture)',
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
  hotness_score: number | null;
  recent_prices: AveragePriceData | null;
  last_updated_hotness_score?: string | null;
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

  // Hotness Score Calculation state
  const [hotnessNumberOfDaysInPeriod, setHotnessNumberOfDaysInPeriod] = useState<string>('5');
  const [hotnessAmountOfPeriods, setHotnessAmountOfPeriods] = useState<string>('6');
  const [hotnessDropSensitivity, setHotnessDropSensitivity] = useState<string>('15');
  const [hotnessDropMaxScore, setHotnessDropMaxScore] = useState<string>('70');
  const [hotnessVolatilityThreshold, setHotnessVolatilityThreshold] = useState<string>('2.0');
  const [hotnessVolatilityMaxBonus, setHotnessVolatilityMaxBonus] = useState<string>('30');
  const [hotnessDowntrendPenalty, setHotnessDowntrendPenalty] = useState<string>('0.5');
  const [hotnessStableMultiplier, setHotnessStableMultiplier] = useState<string>('0.7');
  const [hotnessUptrendMultiplier, setHotnessUptrendMultiplier] = useState<string>('1.0');
  const [hotnessTrendBoundary, setHotnessTrendBoundary] = useState<string>('3.0');
  const [hotnessAverageTradedValueThreshold, setHotnessAverageTradedValueThreshold] = useState<string>('10000');
  const [hotnessStaleAfterMinutes, setHotnessStaleAfterMinutes] = useState<string>('30');
  const [hotnessVersion, setHotnessVersion] = useState<'v1' | 'v2'>('v2');
  const [isRefreshingHotness, setIsRefreshingHotness] = useState(false);
  const [hotnessRefreshProgress, setHotnessRefreshProgress] = useState<{
    processed: number;
    total: number;
    currentSymbol: string;
    errors: string[];
  } | null>(null);
  const [showAdvancedHotnessSettings, setShowAdvancedHotnessSettings] = useState(false);

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

  const handleRefreshHotnessScores = async () => {
    setIsRefreshingHotness(true);
    setHotnessRefreshProgress({ processed: 0, total: 0, currentSymbol: '', errors: [] });

    try {
      // Get current warm symbols
      const response = await fetch('/api/market-snapshot/warm-symbols');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const allWarmSymbols = result.warmSymbols || [];

      // Filter symbols that need refreshing based on staleness
      const now = new Date();
      const staleAfterMinutes = parseInt(hotnessStaleAfterMinutes) || 30;
      const symbolsToRefresh = allWarmSymbols.filter((symbol) => {
        if (!symbol.last_updated_hotness_score) return true; // Never updated

        const lastUpdated = new Date(symbol.last_updated_hotness_score);
        const minutesDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

        return minutesDiff > staleAfterMinutes;
      });

      setHotnessRefreshProgress(prev => prev ? { ...prev, total: symbolsToRefresh.length } : null);

      const errors: string[] = [];

      for (let i = 0; i < symbolsToRefresh.length; i++) {
        const symbol = symbolsToRefresh[i];
        setHotnessRefreshProgress(prev => prev ? {
          ...prev,
          currentSymbol: symbol.symbol,
          processed: i
        } : null);

        try {
          const hotnessParams = {
            dropSensitivity: parseFloat(hotnessDropSensitivity),
            dropMaxScore: parseFloat(hotnessDropMaxScore),
            volatilityThreshold: parseFloat(hotnessVolatilityThreshold),
            volatilityMaxBonus: parseFloat(hotnessVolatilityMaxBonus),
            downtrendPenalty: parseFloat(hotnessDowntrendPenalty),
            stableMultiplier: parseFloat(hotnessStableMultiplier),
            uptrendMultiplier: parseFloat(hotnessUptrendMultiplier),
            trendBoundary: parseFloat(hotnessTrendBoundary),
            averageTradedValueThreshold: parseFloat(hotnessAverageTradedValueThreshold),
          };

          const refreshResponse = await fetch(`/api/symbols-v2/update-prices-and-hotness/${symbol.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              numberOfDaysInPeriod: parseInt(hotnessNumberOfDaysInPeriod),
              amountOfPeriods: parseInt(hotnessAmountOfPeriods),
              hotnessVersion,
              hotnessParams,
            }),
          });

          if (!refreshResponse.ok) {
            const errorData = await refreshResponse.json();
            throw new Error(`Failed to refresh ${symbol.symbol}: ${errorData.error || refreshResponse.statusText}`);
          }

          // Wait 1 second before next call
          if (i < symbolsToRefresh.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : `Unknown error for ${symbol.symbol}`;
          console.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      setHotnessRefreshProgress(prev => prev ? { ...prev, processed: symbolsToRefresh.length, errors } : null);

      // Refresh warm symbols list after completion
      await loadWarmSymbols();

      if (errors.length > 0) {
        alert(`Hotness score refresh completed with ${errors.length} errors. Check console for details.`);
      } else {
        alert(`Successfully refreshed hotness scores for ${symbolsToRefresh.length} symbols.`);
      }
    } catch (error) {
      console.error('Error refreshing hotness scores:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh hotness scores';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsRefreshingHotness(false);
      // Clear progress after a delay
      setTimeout(() => setHotnessRefreshProgress(null), 3000);
    }
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

          {/* Calculate Hotness Score Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Calculate Hotness Score
              </h2>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Total warm symbols:</span> {warmSymbols.length.toLocaleString()}
              </div>
            </div>

            {/* Configuration Section */}
            <div className="space-y-6 mb-6">
              {/* Basic Parameters */}
              <div className="flex flex-wrap gap-6">
                <div className="flex-1 min-w-0">
                  <NumericInput
                    label="Number of Days in Period"
                    min={1}
                    max={30}
                    value={hotnessNumberOfDaysInPeriod}
                    onChange={setHotnessNumberOfDaysInPeriod}
                    placeholder="5"
                    center={true}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <NumericInput
                    label="Amount of Periods"
                    min={2}
                    max={20}
                    value={hotnessAmountOfPeriods}
                    onChange={setHotnessAmountOfPeriods}
                    placeholder="6"
                    center={true}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <NumericInput
                    label="Stale After Minutes"
                    min={1}
                    max={1440}
                    value={hotnessStaleAfterMinutes}
                    onChange={setHotnessStaleAfterMinutes}
                    placeholder="30"
                    center={true}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hotness Algorithm Version
                  </label>
                  <PillList
                    options={['V1', 'V2']}
                    selected={hotnessVersion === 'v1' ? ['V1'] : ['V2']}
                    onChange={(selected) => {
                      if (selected.includes('V1')) {
                        setHotnessVersion('v1');
                      } else if (selected.includes('V2')) {
                        setHotnessVersion('v2');
                      }
                    }}
                    variant="single"
                    size="sm"
                  />
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => setShowAdvancedHotnessSettings(!showAdvancedHotnessSettings)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {showAdvancedHotnessSettings ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Advanced Settings
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show Advanced Settings
                    </>
                  )}
                </button>

                {/* Advanced Settings */}
                {showAdvancedHotnessSettings && (
                  <div className="mt-4 space-y-6">
                    {/* Row 1: Drop Parameters */}
                    <div className="flex flex-wrap gap-6">
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Drop Sensitivity"
                          min={1}
                          max={50}
                          value={hotnessDropSensitivity}
                          onChange={setHotnessDropSensitivity}
                          placeholder="15"
                          center={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Drop Max Score"
                          min={10}
                          max={100}
                          value={hotnessDropMaxScore}
                          onChange={setHotnessDropMaxScore}
                          placeholder="70"
                          center={true}
                        />
                      </div>
                    </div>

                    {/* Row 2: Volatility Parameters */}
                    <div className="flex flex-wrap gap-6">
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Volatility Threshold"
                          min={0.1}
                          max={10.0}
                          value={hotnessVolatilityThreshold}
                          onChange={setHotnessVolatilityThreshold}
                          placeholder="2.0"
                          center={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Volatility Max Bonus"
                          min={5}
                          max={50}
                          value={hotnessVolatilityMaxBonus}
                          onChange={setHotnessVolatilityMaxBonus}
                          placeholder="30"
                          center={true}
                        />
                      </div>
                    </div>

                    {/* Row 3: Trend Parameters */}
                    <div className="flex flex-wrap gap-6">
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Downtrend Penalty"
                          min={0.1}
                          max={1.0}
                          value={hotnessDowntrendPenalty}
                          onChange={setHotnessDowntrendPenalty}
                          placeholder="0.5"
                          center={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Stable Multiplier"
                          min={0.1}
                          max={1.0}
                          value={hotnessStableMultiplier}
                          onChange={setHotnessStableMultiplier}
                          placeholder="0.7"
                          center={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Uptrend Multiplier"
                          min={0.1}
                          max={2.0}
                          value={hotnessUptrendMultiplier}
                          onChange={setHotnessUptrendMultiplier}
                          placeholder="1.0"
                          center={true}
                        />
                      </div>
                    </div>

                    {/* Row 4: Boundary Parameters */}
                    <div className="flex flex-wrap gap-6">
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Trend Boundary"
                          min={1.0}
                          max={10.0}
                          value={hotnessTrendBoundary}
                          onChange={setHotnessTrendBoundary}
                          placeholder="3.0"
                          center={true}
                        />
                      </div>
                    </div>

                    {/* Row 5: Trading Value Threshold */}
                    <div className="flex flex-wrap gap-6">
                      <div className="flex-1 min-w-0">
                        <NumericInput
                          label="Avg Traded Value Threshold"
                          min={0}
                          value={hotnessAverageTradedValueThreshold}
                          onChange={setHotnessAverageTradedValueThreshold}
                          placeholder="10000"
                          formatAsKMB={true}
                          center={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button and Progress */}
            <div className="mt-6">
              <Button
                variant="secondary"
                size="md"
                onClick={handleRefreshHotnessScores}
                disabled={isRefreshingHotness || warmSymbols.length === 0}
                className="w-full md:w-auto"
              >
                {isRefreshingHotness ? 'Refreshing Hotness Scores...' : 'Refresh Hotness Scores'}
              </Button>

              {hotnessRefreshProgress && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Progress:</span> {hotnessRefreshProgress.processed} / {hotnessRefreshProgress.total} symbols
                  </div>
                  {hotnessRefreshProgress.currentSymbol && (
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Current:</span> {hotnessRefreshProgress.currentSymbol}
                    </div>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${hotnessRefreshProgress.total > 0 ? (hotnessRefreshProgress.processed / hotnessRefreshProgress.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  {hotnessRefreshProgress.errors.length > 0 && (
                    <div className="text-sm text-red-600 mt-2">
                      <span className="font-medium">Errors:</span> {hotnessRefreshProgress.errors.length}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warm Symbols Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Warm Symbols
              </h2>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Total warm symbols:</span> 96
              </div>
              {isLoadingWarmSymbols && (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
            </div>

            {warmSymbols.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {warmSymbols.map((symbol) => (
                  <Pill
                    key={symbol.id}
                    size="xs"
                    onClick={() => handleSymbolClick(symbol.symbol)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <span>{symbol.symbol}</span>
                      <HotnessScorePill score={symbol.hotness_score} size="xs" />
                    </div>
                  </Pill>
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