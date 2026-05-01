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
import { generateTradingViewUrl } from '@/utils/trading-view';
import { DEFAULT_HOTNESS_PARAMS, normalizeV2HotnessParams } from '@/lib/price-service';


const EXCHANGE_OPTIONS = [
  'TOR - TSX (Toronto)',
  'VAN - TSXV (Venture)',
  'NYQ - NYSE',
  'NMS - NASDAQ',
  'ASE - AMEX',
  'PCX - Pacific Exchange'
];

const WARM_FILTER_PRESETS_STORAGE_KEY = 'market-snapshot:warm-filter-presets';
const EXCHANGE_EXPANDED_STATE_STORAGE_KEY = 'market-snapshot:exchange-expanded-state';

type WarmSymbolFilterPreset = {
  minAvgVolume10d: string;
  minAvgVolume3m: string;
  minComputationValue: string;
};

const DEFAULT_WARM_SYMBOL_FILTER_PRESET: WarmSymbolFilterPreset = {
  minAvgVolume10d: '7777',
  minAvgVolume3m: '7777',
  minComputationValue: '7777',
};

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

type WarmSymbolFilterSummary = {
  threshold: number;
  passed: number;
  filtered: number;
  percentageFiltered: number;
};

interface WarmSymbolFilterBreakdown {
  minAvgVolume10d: WarmSymbolFilterSummary | null;
  minAvgVolume3m: WarmSymbolFilterSummary | null;
  minComputationValue: WarmSymbolFilterSummary | null;
}

interface WarmSymbolScanResult {
  totalSymbols: number;
  warmSymbols: number;
  filterBreakdown: WarmSymbolFilterBreakdown;
}

interface WarmSymbolUpdateResult extends WarmSymbolScanResult {
  created: number;
  updated: number;
}

interface HotnessRefreshProgress {
  processed: number;
  total: number;
  currentSymbol: string;
  errors: string[];
}

interface HotnessExchangeConfig {
  numberOfDaysInPeriod: string;
  amountOfPeriods: string;
  dropMaxScore: string;
  volatilityMaxBonus: string;
  staleAfterMinutes: string;
  showAdvancedSettings: boolean;
}

export default function MarketSnapshotPage() {
  const getExchangeCode = (display: string) => display.split(' - ')[0];

  const getDefaultHotnessConfig = (): HotnessExchangeConfig => ({
    numberOfDaysInPeriod: '3',
    amountOfPeriods: '10',
    dropMaxScore: String(DEFAULT_HOTNESS_PARAMS.dropMaxScore),
    volatilityMaxBonus: String(DEFAULT_HOTNESS_PARAMS.volatilityMaxBonus),
    staleAfterMinutes: '30',
    showAdvancedSettings: false,
  });

  const initializeHotnessConfig = (): Record<string, HotnessExchangeConfig> => EXCHANGE_OPTIONS.reduce<Record<string, HotnessExchangeConfig>>((acc, exchangeDisplay) => {
    acc[getExchangeCode(exchangeDisplay)] = getDefaultHotnessConfig();
    return acc;
  }, {});

  const initializeHotnessRefreshingState = (): Record<string, boolean> => EXCHANGE_OPTIONS.reduce<Record<string, boolean>>((acc, exchangeDisplay) => {
    acc[getExchangeCode(exchangeDisplay)] = false;
    return acc;
  }, {});

  const getDefaultExpandedExchanges = (): Record<string, boolean> => {
    const defaults = EXCHANGE_OPTIONS.reduce<Record<string, boolean>>((acc, exchangeDisplay) => {
      acc[getExchangeCode(exchangeDisplay)] = true;
      return acc;
    }, {});

    return defaults;
  };

  const initializeExpandedExchanges = (): Record<string, boolean> => {
    if (typeof window === 'undefined') {
      return getDefaultExpandedExchanges();
    }

    try {
      const stored = localStorage.getItem(EXCHANGE_EXPANDED_STATE_STORAGE_KEY);
      if (!stored) {
        return getDefaultExpandedExchanges();
      }

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return getDefaultExpandedExchanges();
      }

      return EXCHANGE_OPTIONS.reduce<Record<string, boolean>>((acc, exchangeDisplay) => {
        const exchangeCode = getExchangeCode(exchangeDisplay);
        const value = parsed[exchangeCode];

        acc[exchangeCode] = typeof value === 'boolean' ? value : true;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error loading expanded exchange state:', error);
      return getDefaultExpandedExchanges();
    }
  };

  const getHotnessConfig = (exchangeCode: string): HotnessExchangeConfig => (
    hotnessSettingsByExchange[exchangeCode] || getDefaultHotnessConfig()
  );

  const setHotnessConfig = (exchangeCode: string, nextConfig: Partial<HotnessExchangeConfig>) => {
    setHotnessSettingsByExchange((prev) => ({
      ...prev,
      [exchangeCode]: {
        ...(prev[exchangeCode] || getDefaultHotnessConfig()),
        ...nextConfig,
      },
    }));
  };

  // Warm Symbol Filters state
  const [warmExchange, setWarmExchange] = useState<string>('TOR - TSX (Toronto)');
  const [minAvgVolume10d, setMinAvgVolume10d] = useState<string>(DEFAULT_WARM_SYMBOL_FILTER_PRESET.minAvgVolume10d);
  const [minAvgVolume3m, setMinAvgVolume3m] = useState<string>(DEFAULT_WARM_SYMBOL_FILTER_PRESET.minAvgVolume3m);
  const [minComputationValue, setMinComputationValue] = useState<string>(DEFAULT_WARM_SYMBOL_FILTER_PRESET.minComputationValue);
  const [warmFilterPresets, setWarmFilterPresets] = useState<Record<string, WarmSymbolFilterPreset>>({});
  const [isWarmFilterPresetsHydrated, setIsWarmFilterPresetsHydrated] = useState(false);
  const [isScanningWarmSymbols, setIsScanningWarmSymbols] = useState(false);
  const [isUpdatingWarmSymbols, setIsUpdatingWarmSymbols] = useState(false);
  const [showWarmFilters, setShowWarmFilters] = useState(true);
  const [warmScanResult, setWarmScanResult] = useState<WarmSymbolScanResult | null>(null);
  const [warmUpdateResult, setWarmUpdateResult] = useState<WarmSymbolUpdateResult | null>(null);

  // Warm Symbols state
  const [warmSymbols, setWarmSymbols] = useState<WarmSymbol[]>([]);
  const [isLoadingWarmSymbols, setIsLoadingWarmSymbols] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Hotness Score Calculation state (per exchange)
  const [hotnessSettingsByExchange, setHotnessSettingsByExchange] = useState<Record<string, HotnessExchangeConfig>>(() => initializeHotnessConfig());
  const [isRefreshingHotnessByExchange, setIsRefreshingHotnessByExchange] = useState<Record<string, boolean>>(() => initializeHotnessRefreshingState());
  const [hotnessRefreshProgressByExchange, setHotnessRefreshProgressByExchange] = useState<Record<string, HotnessRefreshProgress | null>>({});
  const [expandedExchanges, setExpandedExchanges] = useState<Record<string, boolean>>(() => getDefaultExpandedExchanges());

  useEffect(() => {
    setExpandedExchanges(initializeExpandedExchanges());
  }, []);

  const clampHotnessScore = (value: number) => Math.min(100, Math.max(0, value));

  const toggleExchange = (code: string) => {
    setExpandedExchanges((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(EXCHANGE_EXPANDED_STATE_STORAGE_KEY, JSON.stringify(expandedExchanges));
    } catch (error) {
      console.error('Error saving expanded exchange state:', error);
    }
  }, [expandedExchanges]);

  const getExchangeSymbols = (exchangeCode: string) => {
    return warmSymbols
      .filter((symbol) => {
        const symEx = symbol.exchange || '';
        // Flexible matching for exchange codes from DB vs our codes
        return symEx === exchangeCode || 
               symEx.includes(exchangeCode) || 
               exchangeCode.includes(symEx) ||
               getExchangeCode(exchangeCode) === symEx;
      })
      .sort((a, b) => (b.hotness_score || 0) - (a.hotness_score || 0));
  };

  const handleDropMaxScoreChange = (exchangeCode: string, value: string) => {
    const parsedValue = parseFloat(value);
    const dropMaxScore = clampHotnessScore(Number.isFinite(parsedValue) ? parsedValue : DEFAULT_HOTNESS_PARAMS.dropMaxScore);
    const balancedParams = normalizeV2HotnessParams({ dropMaxScore });
    setHotnessConfig(exchangeCode, {
      dropMaxScore: String(dropMaxScore),
      volatilityMaxBonus: String(balancedParams.volatilityMaxBonus),
    });
  };

  const handleVolatilityMaxBonusChange = (exchangeCode: string, value: string) => {
    const parsedValue = parseFloat(value);
    const volatilityMaxBonus = clampHotnessScore(
      Number.isFinite(parsedValue) ? parsedValue : DEFAULT_HOTNESS_PARAMS.volatilityMaxBonus
    );
    const balancedParams = normalizeV2HotnessParams({ volatilityMaxBonus, dropMaxScore: 100 - volatilityMaxBonus });
    setHotnessConfig(exchangeCode, {
      volatilityMaxBonus: String(volatilityMaxBonus),
      dropMaxScore: String(balancedParams.dropMaxScore),
    });
  };

  const handleHotnessConfigFieldChange = (exchangeCode: string, field: keyof HotnessExchangeConfig, value: string) => {
    setHotnessConfig(exchangeCode, { [field]: value });
  };

  const toggleHotnessAdvancedSettings = (exchangeCode: string) => {
    setHotnessConfig(exchangeCode, {
      showAdvancedSettings: !getHotnessConfig(exchangeCode).showAdvancedSettings,
    });
  };

  // Extract actual values from display strings

  // Helper function to format numbers
  const formatNumber = (num: number) => num.toLocaleString();
  const parseWarmSymbolValue = (value: string): number | null => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeWarmSymbolFilterPreset = (value: unknown): WarmSymbolFilterPreset => {
    const preset = (value ?? {}) as Partial<Record<keyof WarmSymbolFilterPreset, unknown>>;

    const asPresetString = (input: unknown): string | undefined => {
      if (input === undefined || input === null) return undefined;
      return `${input}`;
    };

    return {
      minAvgVolume10d: asPresetString(preset.minAvgVolume10d) ?? DEFAULT_WARM_SYMBOL_FILTER_PRESET.minAvgVolume10d,
      minAvgVolume3m: asPresetString(preset.minAvgVolume3m) ?? DEFAULT_WARM_SYMBOL_FILTER_PRESET.minAvgVolume3m,
      minComputationValue: asPresetString(preset.minComputationValue) ?? DEFAULT_WARM_SYMBOL_FILTER_PRESET.minComputationValue,
    };
  };

  const isSameWarmFilterPreset = (a: WarmSymbolFilterPreset, b: WarmSymbolFilterPreset) => (
    a.minAvgVolume10d === b.minAvgVolume10d &&
    a.minAvgVolume3m === b.minAvgVolume3m &&
    a.minComputationValue === b.minComputationValue
  );

  const applyWarmFilterPresetForExchange = (exchangeDisplay: string, presets?: Record<string, WarmSymbolFilterPreset>) => {
    const exchangeCode = getExchangeCode(exchangeDisplay);
    const presetSource = presets || warmFilterPresets;
    const preset = normalizeWarmSymbolFilterPreset(presetSource[exchangeCode]);

    setMinAvgVolume10d(preset.minAvgVolume10d);
    setMinAvgVolume3m(preset.minAvgVolume3m);
    setMinComputationValue(preset.minComputationValue);
  };

  const handleWarmExchangeChange = (selected: string[]) => {
    const nextExchange = selected[0] || 'TOR - TSX (Toronto)';
    setWarmExchange(nextExchange);
    applyWarmFilterPresetForExchange(nextExchange);
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WARM_FILTER_PRESETS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      const loadedPresets: Record<string, WarmSymbolFilterPreset> = {};

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([exchangeCode, preset]) => {
          loadedPresets[exchangeCode] = normalizeWarmSymbolFilterPreset(preset);
        });
      }

      setWarmFilterPresets(loadedPresets);
      applyWarmFilterPresetForExchange(warmExchange, loadedPresets);
    } catch (error) {
      console.error('Error loading warm symbol filter presets:', error);
      setWarmFilterPresets({});
      applyWarmFilterPresetForExchange(warmExchange, {});
    } finally {
      setIsWarmFilterPresetsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isWarmFilterPresetsHydrated) return;

    const exchangeCode = getExchangeCode(warmExchange);
    const updatedPreset = normalizeWarmSymbolFilterPreset({
      minAvgVolume10d,
      minAvgVolume3m,
      minComputationValue,
    });

    setWarmFilterPresets(prev => {
      const currentPreset = prev[exchangeCode];
      if (currentPreset && isSameWarmFilterPreset(currentPreset, updatedPreset)) {
        return prev;
      }

      const nextPresets = {
        ...prev,
        [exchangeCode]: updatedPreset,
      };

      localStorage.setItem(WARM_FILTER_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
      return nextPresets;
    });
  }, [isWarmFilterPresetsHydrated, warmExchange, minAvgVolume10d, minAvgVolume3m, minComputationValue]);

  const getWarmSymbolRequestBody = () => ({
    exchange: getExchangeCode(warmExchange),
    minAvgVolume10d: minAvgVolume10d.trim() === '' ? null : parseWarmSymbolValue(minAvgVolume10d),
    minAvgVolume3m: minAvgVolume3m.trim() === '' ? null : parseWarmSymbolValue(minAvgVolume3m),
    minComputationValue: minComputationValue.trim() === '' ? null : parseWarmSymbolValue(minComputationValue)
  });

  const handleScanWarmSymbols = async () => {
    setIsScanningWarmSymbols(true);
    setWarmScanResult(null);
    setWarmUpdateResult(null);

    try {
      const requestBody = getWarmSymbolRequestBody();

      const response = await fetch('/api/market-snapshot/scan-warm-symbols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setWarmScanResult(result);
    } catch (error: unknown) {
      console.error('Error scanning warm symbols:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to warm symbol filters';
      setWarmScanResult(null);
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsScanningWarmSymbols(false);
    }
  };

  const handleUpdateWarmSymbols = async () => {
    const requestBody = getWarmSymbolRequestBody();

    setIsUpdatingWarmSymbols(true);
    setWarmUpdateResult(null);

    try {
      const response = await fetch('/api/market-snapshot/update-warm-symbols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setWarmUpdateResult(result);
      await loadWarmSymbols();
    } catch (error: unknown) {
      console.error('Error updating warm symbols:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update warm symbols';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsUpdatingWarmSymbols(false);
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

  const handleSymbolClick = (symbol: WarmSymbol) => {
    const tradingViewUrl = generateTradingViewUrl({
      symbol: symbol.symbol,
      exchange: symbol.exchange
    });
    window.open(tradingViewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCloseDrawer = () => {
    setSelectedSymbol(null);
  };

  const handleRefreshHotnessScores = async (targetExchangeCode: string) => {
    const targetConfig = getHotnessConfig(targetExchangeCode);
    const staleAfterMinutes = parseInt(targetConfig.staleAfterMinutes, 10) || 30;
    const numberOfDaysInPeriod = parseInt(targetConfig.numberOfDaysInPeriod, 10) || 3;
    const amountOfPeriods = parseInt(targetConfig.amountOfPeriods, 10) || 10;
    const normalizedHotnessParams = normalizeV2HotnessParams({
      dropMaxScore: parseFloat(targetConfig.dropMaxScore),
      volatilityMaxBonus: parseFloat(targetConfig.volatilityMaxBonus),
    });

    setIsRefreshingHotnessByExchange((prev) => ({
      ...prev,
      [targetExchangeCode]: true,
    }));
    setHotnessRefreshProgressByExchange((prev) => ({
      ...prev,
      [targetExchangeCode]: { processed: 0, total: 0, currentSymbol: '', errors: [] },
    }));

    try {
      // Get current warm symbols
      const response = await fetch('/api/market-snapshot/warm-symbols');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      let allWarmSymbols = result.warmSymbols || [];
      allWarmSymbols = allWarmSymbols.filter((symbol: WarmSymbol) => {
        const symEx = symbol.exchange || '';
        return symEx === targetExchangeCode || symEx.includes(targetExchangeCode) || targetExchangeCode.includes(symEx);
      });

      // Filter symbols that need refreshing based on staleness
      const now = new Date();
      const symbolsToRefresh = allWarmSymbols.filter((symbol: WarmSymbol) => {
        if (!symbol.last_updated_hotness_score) return true; // Never updated

        const lastUpdated = new Date(symbol.last_updated_hotness_score);
        const minutesDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

        return minutesDiff > staleAfterMinutes;
      });

      setHotnessRefreshProgressByExchange((prev) => ({
        ...prev,
        [targetExchangeCode]: {
          ...(prev[targetExchangeCode] || {
            processed: 0,
            total: 0,
            currentSymbol: '',
            errors: [],
          }),
          total: symbolsToRefresh.length,
          currentSymbol: '',
          processed: 0,
        },
      }));

      const errors: string[] = [];

      for (let i = 0; i < symbolsToRefresh.length; i++) {
        const symbol = symbolsToRefresh[i];
        setHotnessRefreshProgressByExchange((prev) => ({
          ...prev,
          [targetExchangeCode]: {
            ...(prev[targetExchangeCode] || {
              processed: 0,
              total: 0,
              currentSymbol: '',
              errors: [],
            }),
            currentSymbol: symbol.symbol,
            processed: i,
          },
        }));

        try {
          const refreshResponse = await fetch(`/api/symbols-v2/update-prices-and-hotness/${symbol.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              numberOfDaysInPeriod,
              amountOfPeriods,
              hotnessParams: normalizedHotnessParams,
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

      setHotnessRefreshProgressByExchange((prev) => ({
        ...prev,
        [targetExchangeCode]: {
          ...(prev[targetExchangeCode] || {
            processed: 0,
            total: 0,
            currentSymbol: '',
            errors: [],
          }),
          processed: symbolsToRefresh.length,
          errors,
        },
      }));

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
      setIsRefreshingHotnessByExchange((prev) => ({
        ...prev,
        [targetExchangeCode]: false,
      }));
      // Clear progress after a delay
      setTimeout(() => {
        setHotnessRefreshProgressByExchange((prev) => ({
          ...prev,
          [targetExchangeCode]: null,
        }));
      }, 3000);
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

          {/* Per-Exchange Warm Sections (replaces old single Warm Filters + global symbols) */}
          <div className="space-y-6">
            {EXCHANGE_OPTIONS.map((exchangeDisplay) => {
              const code = getExchangeCode(exchangeDisplay);
              const symbolsForExchange = getExchangeSymbols(code);
              const isExpanded = expandedExchanges[code] !== false;
              const hotnessConfig = getHotnessConfig(code);
              const hotnessProgress = hotnessRefreshProgressByExchange[code];
              const isRefreshingCurrentExchange = isRefreshingHotnessByExchange[code] || false;

              return (
                <div key={code} className="bg-white rounded-lg shadow-sm p-6">
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-6"
                    onClick={() => {
                      toggleExchange(code);
                      // Switch active exchange and load its preset when opening
                      if (!isExpanded) {
                        setWarmExchange(exchangeDisplay);
                        applyWarmFilterPresetForExchange(exchangeDisplay);
                      }
                    }}
                  >
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                        {exchangeDisplay}
                        <span className="px-3 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                          {symbolsForExchange.length} warm
                        </span>
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">Warm Detection, Hotness Config, and Symbols scoped to this exchange</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="p-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-8">
                      {/* Warm Detection Config Card */}
                      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">Warm Detection Config</h3>
                          <div className="text-xs text-emerald-600 font-medium">for {code}</div>
                        </div>

                        <div className="space-y-6">
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
                              {warmScanResult?.filterBreakdown.minAvgVolume10d && (
                                <div className="text-lg text-gray-700 mt-2 text-center">
                                  <div className="font-bold text-xl">{warmScanResult.filterBreakdown.minAvgVolume10d.percentageFiltered}%</div>
                                  <div className="text-sm text-gray-600">{formatNumber(warmScanResult.filterBreakdown.minAvgVolume10d.passed)} passed</div>
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
                              {warmScanResult?.filterBreakdown.minAvgVolume3m && (
                                <div className="text-lg text-gray-700 mt-2 text-center">
                                  <div className="font-bold text-xl">{warmScanResult.filterBreakdown.minAvgVolume3m.percentageFiltered}%</div>
                                  <div className="text-sm text-gray-600">{formatNumber(warmScanResult.filterBreakdown.minAvgVolume3m.passed)} passed</div>
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
                              {warmScanResult?.filterBreakdown.minComputationValue && (
                                <div className="text-lg text-gray-700 mt-2 text-center">
                                  <div className="font-bold text-xl">{warmScanResult.filterBreakdown.minComputationValue.percentageFiltered}%</div>
                                  <div className="text-sm text-gray-600">{formatNumber(warmScanResult.filterBreakdown.minComputationValue.passed)} passed</div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 pt-4 border-t">
                            <Button
                              variant="secondary"
                              size="md"
                              onClick={handleScanWarmSymbols}
                              disabled={isScanningWarmSymbols}
                              className="w-full md:w-auto"
                            >
                              {isScanningWarmSymbols ? 'Scanning...' : 'Scan Warm Symbols'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="md"
                              onClick={handleUpdateWarmSymbols}
                          disabled={isUpdatingWarmSymbols}
                              className="w-full md:w-auto"
                            >
                              {isUpdatingWarmSymbols ? 'Updating...' : 'Update Warm Symbols'}
                            </Button>
                          </div>

                          {warmScanResult && (
                            <div className="p-4 bg-white rounded-md border">
                              <div className="text-sm text-gray-700 mb-2">
                                <span className="font-medium">Total symbols:</span> {warmScanResult.totalSymbols.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-700 mb-2">
                                <span className="font-medium">Warm found:</span> {warmScanResult.warmSymbols.toLocaleString()}
                              </div>
                              {warmUpdateResult && (
                                <div className="text-sm text-gray-700 mt-3">
                                  <span className="font-medium">Updates:</span> {warmUpdateResult.created} created, {warmUpdateResult.updated} updated
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hotness Score Config Card */}
                      <div className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Hotness Score Config</h3>
                          <div className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded">
                            {isRefreshingCurrentExchange ? 'refreshing...' : `applies to ${code} symbols`}
                          </div>
                        </div>

                        <div className="space-y-6 mb-6">
                          <div className="flex flex-wrap gap-6">
                            <div className="flex-1 min-w-0">
                              <NumericInput
                                label="Number of Days in Period"
                                min={1}
                                max={30}
                                value={hotnessConfig.numberOfDaysInPeriod}
                                onChange={(value) => handleHotnessConfigFieldChange(code, 'numberOfDaysInPeriod', value)}
                                placeholder="3"
                                center={true}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <NumericInput
                                label="Amount of Periods"
                                min={2}
                                max={20}
                                value={hotnessConfig.amountOfPeriods}
                                onChange={(value) => handleHotnessConfigFieldChange(code, 'amountOfPeriods', value)}
                                placeholder="10"
                                center={true}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <NumericInput
                                label="Stale After Minutes"
                                min={1}
                                max={1440}
                                value={hotnessConfig.staleAfterMinutes}
                                onChange={(value) => handleHotnessConfigFieldChange(code, 'staleAfterMinutes', value)}
                                placeholder="30"
                                center={true}
                              />
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-4">
                            <button
                              onClick={() => toggleHotnessAdvancedSettings(code)}
                              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                              {hotnessConfig.showAdvancedSettings ? (
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

                            {hotnessConfig.showAdvancedSettings && (
                              <div className="mt-4 border border-gray-200 rounded-md p-4 bg-gray-50">
                                <h3 className="text-sm font-medium text-[#14171f] mb-4">
                                  Hotness Allocation (kept at 100 total)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-[#14171f]">
                                      Drop Max Score (points reserved for recent drop)
                                    </label>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <NumericInput
                                        value={hotnessConfig.dropMaxScore}
                                        onChange={(value) => handleDropMaxScoreChange(code, value)}
                                        min={0}
                                        max={100}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-[#14171f]">
                                      Volatility Bonus (points reserved for momentum premium)
                                    </label>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <NumericInput
                                        value={hotnessConfig.volatilityMaxBonus}
                                        onChange={(value) => handleVolatilityMaxBonusChange(code, value)}
                                        min={0}
                                        max={100}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-gray-500">
                                      Drop Max Score + Volatility Bonus is always clamped to <strong>100</strong>.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => handleRefreshHotnessScores(code)}
                          disabled={isRefreshingCurrentExchange || symbolsForExchange.length === 0}
                          className="w-full md:w-auto"
                        >
                          {isRefreshingCurrentExchange ? 'Refreshing...' : `Refresh Hotness for ${code}`}
                        </Button>

                        {hotnessProgress && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-md">
                            <div className="text-sm text-gray-700 mb-2">
                              <span className="font-medium">Progress:</span> {hotnessProgress.processed} / {hotnessProgress.total} symbols
                            </div>
                            {hotnessProgress.currentSymbol && (
                              <div className="text-sm text-gray-700 mb-2">
                                <span className="font-medium">Current:</span> {hotnessProgress.currentSymbol}
                              </div>
                            )}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${hotnessProgress.total > 0 ? (hotnessProgress.processed / hotnessProgress.total) * 100 : 0}%` }}
                              ></div>
                            </div>
                            {hotnessProgress.errors.length > 0 && (
                              <div className="text-sm text-red-600 mt-2">
                                <span className="font-medium">Errors:</span> {hotnessProgress.errors.length}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Symbols Grid for this Exchange */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                          Symbols Grid 
                          <span className="text-xs text-gray-500">({symbolsForExchange.length})</span>
                        </h4>
                        {symbolsForExchange.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {symbolsForExchange.map((symbol) => (
                              <Pill
                                key={symbol.id}
                                size="xs"
                                onClick={() => handleSymbolClick(symbol)}
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
                          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg">
                            No warm symbols yet for this exchange. Configure and run Scan/Update above.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Symbol Details Drawer (temporarily not opened from symbol chips).
          Kept for future reuse when needed. */}
      <SymbolDetailsDrawerV2
        selectedSymbol={selectedSymbol}
        selectedSymbolData={selectedSymbol ? warmSymbols.find(s => s.symbol === selectedSymbol) || null : null}
        onClose={handleCloseDrawer}
      />
    </main>
  );
}