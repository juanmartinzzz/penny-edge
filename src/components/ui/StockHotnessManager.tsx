'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import Button from '@/components/interaction/Button';
import Input from '@/components/interaction/Input';
import { Loading } from './Loading';
import { HotnessScoreParams, DEFAULT_HOTNESS_PARAMS, RECOMMENDED_HOTNESS_PARAMS } from '@/lib/price-service';

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

  // Hotness score parameters
  const [params, setParams] = useState<HotnessScoreParams>(DEFAULT_HOTNESS_PARAMS);

  const updateParam = (key: keyof HotnessScoreParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setParams(DEFAULT_HOTNESS_PARAMS);
  };

  const applyRecommended = () => {
    setParams(RECOMMENDED_HOTNESS_PARAMS);
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
          params,
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
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                className="text-xs"
              >
                Reset to Defaults
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={applyRecommended}
                className="text-xs"
              >
                Apply Trader Settings
              </Button>
            </div>
          </div>

          {/* Drop Settings */}
          <div className="border rounded-md p-3 bg-gray-50">
            <h4 className="text-sm font-medium text-[#14171f] mb-3">Drop Settings (Criterion 1)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Drop Sensitivity"
                type="number"
                value={params.dropSensitivity.toString()}
                onChange={(value) => updateParam('dropSensitivity', parseFloat(value) || 0)}
                size="sm"
              />
              <Input
                label="Max Drop Score"
                type="number"
                value={params.dropMaxScore.toString()}
                onChange={(value) => updateParam('dropMaxScore', parseInt(value) || 0)}
                size="sm"
              />
            </div>
          </div>

          {/* Volatility Settings */}
          <div className="border rounded-md p-3 bg-gray-50">
            <h4 className="text-sm font-medium text-[#14171f] mb-3">Volatility Settings (Criterion 2)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Volatility Threshold %"
                type="number"
                value={params.volatilityThreshold.toString()}
                onChange={(value) => updateParam('volatilityThreshold', parseFloat(value) || 0)}
                size="sm"
              />
              <Input
                label="Max Volatility Bonus"
                type="number"
                value={params.volatilityMaxBonus.toString()}
                onChange={(value) => updateParam('volatilityMaxBonus', parseInt(value) || 0)}
                size="sm"
              />
            </div>
          </div>

          {/* Trend Multipliers */}
          <div className="border rounded-md p-3 bg-gray-50">
            <h4 className="text-sm font-medium text-[#14171f] mb-3">Trend Multipliers</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Downtrend Penalty"
                type="number"
                value={params.downtrendPenalty.toString()}
                onChange={(value) => updateParam('downtrendPenalty', parseFloat(value) || 0)}
                size="sm"
              />
              <Input
                label="Stable Multiplier"
                type="number"
                value={params.stableMultiplier.toString()}
                onChange={(value) => updateParam('stableMultiplier', parseFloat(value) || 0)}
                size="sm"
              />
              <Input
                label="Uptrend Multiplier"
                type="number"
                value={params.uptrendMultiplier.toString()}
                onChange={(value) => updateParam('uptrendMultiplier', parseFloat(value) || 0)}
                size="sm"
              />
              <Input
                label="Trend Boundary %"
                type="number"
                value={params.trendBoundary.toString()}
                onChange={(value) => updateParam('trendBoundary', parseFloat(value) || 0)}
                size="sm"
              />
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            <p><strong>Tip:</strong> Higher drop sensitivity catches smaller price drops. Higher volatility threshold only rewards truly volatile stocks.</p>
          </div>
        </div>
      )}
    </div>
  );
}