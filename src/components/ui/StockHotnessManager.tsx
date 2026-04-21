'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import Button from '@/components/interaction/Button';
import Input from '@/components/interaction/Input';
import { Loading } from './Loading';
import { DEFAULT_HOTNESS_PARAMS, normalizeV2HotnessParams } from '@/lib/price-service';

interface ProcessingStats {
  totalProcessed: number;
  currentBatch: number;
  hasMore: boolean;
  lastProcessedId: string | null;
}

export function StockHotnessManager({
  title = "Stock Hotness Manager",
  showTitle = true,
  className = "",
}: {
  title?: string;
  showTitle?: boolean;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('Ready to calculate hotness scores');
  const [stats, setStats] = useState<ProcessingStats>({
    totalProcessed: 0,
    currentBatch: 0,
    hasMore: false,
    lastProcessedId: null
  });
  const [error, setError] = useState<string | null>(null);

  const [dropMaxScore, setDropMaxScore] = useState<string>(String(DEFAULT_HOTNESS_PARAMS.dropMaxScore));
  const [volatilityMaxBonus, setVolatilityMaxBonus] = useState<string>(String(DEFAULT_HOTNESS_PARAMS.volatilityMaxBonus));

  const clampHotnessScore = (value: number) => Math.min(100, Math.max(0, value));

  const handleDropMaxScoreChange = (value: string) => {
    const parsedValue = parseFloat(value);
    const nextDropMaxScore = clampHotnessScore(Number.isFinite(parsedValue) ? parsedValue : DEFAULT_HOTNESS_PARAMS.dropMaxScore);
    const balancedParams = normalizeV2HotnessParams({ dropMaxScore: nextDropMaxScore });
    setDropMaxScore(String(nextDropMaxScore));
    setVolatilityMaxBonus(String(balancedParams.volatilityMaxBonus));
  };

  const handleVolatilityMaxBonusChange = (value: string) => {
    const parsedValue = parseFloat(value);
    const nextVolatilityMaxBonus = clampHotnessScore(Number.isFinite(parsedValue) ? parsedValue : DEFAULT_HOTNESS_PARAMS.volatilityMaxBonus);
    const balancedParams = normalizeV2HotnessParams({
      dropMaxScore: 100 - nextVolatilityMaxBonus,
      volatilityMaxBonus: nextVolatilityMaxBonus
    });
    setVolatilityMaxBonus(String(nextVolatilityMaxBonus));
    setDropMaxScore(String(balancedParams.dropMaxScore));
  };

  const resetToDefaults = () => {
    setDropMaxScore(String(DEFAULT_HOTNESS_PARAMS.dropMaxScore));
    setVolatilityMaxBonus(String(DEFAULT_HOTNESS_PARAMS.volatilityMaxBonus));
  };

  const processBatch = async (continueFromId?: string) => {
    try {
      setCurrentStatus('Processing batch of symbols...');
      setError(null);

      const response = await fetch('/api/symbols/update-hotness-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchSize: 100,
          params: normalizeV2HotnessParams({
            dropMaxScore: parseFloat(dropMaxScore),
            volatilityMaxBonus: parseFloat(volatilityMaxBonus)
          }),
          continueFromId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process batch');
      }

      const data = await response.json();

      setStats(prev => ({
        totalProcessed: prev.totalProcessed + data.processed,
        currentBatch: prev.currentBatch + 1,
        hasMore: data.hasMore,
        lastProcessedId: data.lastProcessedId
      }));

      setCurrentStatus(data.message);

      // If there are more symbols to process, continue
      if (data.hasMore && data.lastProcessedId) {
        // Small delay between batches to avoid overwhelming the server
        setTimeout(() => processBatch(data.lastProcessedId), 500);
      } else {
        setCurrentStatus(`Completed! Processed ${stats.totalProcessed + data.processed} symbols total.`);
        setIsProcessing(false);
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setCurrentStatus('Error occurred during processing');
      setIsProcessing(false);
    }
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setStats({
      totalProcessed: 0,
      currentBatch: 0,
      hasMore: false,
      lastProcessedId: null
    });

    await processBatch();
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    setCurrentStatus('Processing stopped by user');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#14171f]">{title}</h2>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${isProcessing ? 'text-[#10b981]' : 'text-[#373f51]'}`}>
              {currentStatus}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5"
            >
              <Settings size={16} className="mr-2" />
              Settings
              {isExpanded ? <ChevronDown size={16} className="ml-2" /> : <ChevronRight size={16} className="ml-2" />}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={isProcessing ? stopProcessing : startProcessing}
              disabled={false}
              className="px-4 py-1.5"
            >
              {isProcessing ? 'Stop' : 'Calculate Hotness'}
            </Button>
            {isProcessing && <Loading variant="spinner" size="sm" />}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-md p-3">
          <p className="text-[#dc2626] text-sm">Error: {error}</p>
        </div>
      )}

      {/* Statistics */}
      {(stats.totalProcessed > 0 || isProcessing) && (
        <div className="bg-white rounded-md border border-[#d0d4dc] p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-[#373f51] text-xs font-medium">Processed</span>
                <span className="text-lg font-bold text-[#222834]">{stats.totalProcessed.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[#373f51] text-xs font-medium">Batch</span>
                <span className="text-lg font-bold text-[#222834]">{stats.currentBatch}</span>
              </div>
              {stats.hasMore && (
                <div className="flex items-center space-x-2">
                  <span className="text-[#373f51] text-xs font-medium">Status</span>
                  <span className="text-sm font-medium text-[#f59e0b]">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Parameters Section */}
      {isExpanded && (
        <div className="bg-white rounded-md border border-[#d0d4dc] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-[#14171f]">Hotness Score Parameters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="text-xs"
            >
              Reset to Defaults
            </Button>
          </div>

          <div className="border rounded-md p-3 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#14171f]">Drop Max Score</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={dropMaxScore || '0'}
                    onChange={(event) => handleDropMaxScoreChange(event.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-24">
                    <Input
                      type="number"
                      value={dropMaxScore}
                      onChange={handleDropMaxScoreChange}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#14171f]">Volatility Bonus</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={volatilityMaxBonus || '0'}
                    onChange={(event) => handleVolatilityMaxBonusChange(event.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-24">
                    <Input
                      type="number"
                      value={volatilityMaxBonus}
                      onChange={handleVolatilityMaxBonusChange}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-600">
                  Kept linked automatically so total allocation is always <strong>100</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}