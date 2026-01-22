'use client';

import { useEffect, useState } from 'react';
import { Loading } from './Loading';

interface SymbolStatus {
  code: string;
  exchange: string;
  status: 'pending' | 'checking' | 'creating' | 'updating' | 'completed' | 'error';
  message?: string;
}

interface ProcessingStats {
  totalSymbols: number;
  processedSymbols: number;
  createdSymbols: number;
  updatedSymbols: number;
  errorSymbols: number;
  currentBatch: number;
  totalBatches: number;
}

interface SymbolAutoManagerProps {
  title?: string;
  showTitle?: boolean;
  className?: string;
  batchSize?: number;
  waitTimeSeconds?: number;
}

export function SymbolAutoManager({
  title = "Symbol Auto Manager",
  showTitle = true,
  className = "",
  batchSize = 10,
  waitTimeSeconds = 1
}: SymbolAutoManagerProps) {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('Ready to start');
  const [stats, setStats] = useState<ProcessingStats>({
    totalSymbols: 0,
    processedSymbols: 0,
    createdSymbols: 0,
    updatedSymbols: 0,
    errorSymbols: 0,
    currentBatch: 0,
    totalBatches: 0
  });
  const [currentSymbolStatus, setCurrentSymbolStatus] = useState<SymbolStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch symbols from static file and start processing
  const startProcessing = async () => {
    try {
      setIsActive(true);
      setIsProcessing(true);
      setError(null);
      setCurrentStatus('Fetching symbols from static file...');

      // Get all symbols from the static file
      const response = await fetch('/api/symbols/symbols-from-static-file');
      if (!response.ok) {
        throw new Error('Failed to fetch symbols from static file');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Flatten all symbols from categories
      const allSymbols: Array<{ code: string; exchange: string }> = [];
      Object.values(data.categories).forEach((category: { tsx: string[]; tsxv: string[] }) => {
        category.tsx.forEach((symbolCode: string) => {
          const [code, exchange] = symbolCode.split('.');
          allSymbols.push({ code, exchange });
        });
        category.tsxv.forEach((symbolCode: string) => {
          const [code, exchange] = symbolCode.split('.');
          allSymbols.push({ code, exchange });
        });
      });

      const totalSymbols = allSymbols.length;
      const totalBatches = Math.ceil(totalSymbols / batchSize);

      setStats(prev => ({
        ...prev,
        totalSymbols,
        totalBatches,
        processedSymbols: 0,
        createdSymbols: 0,
        updatedSymbols: 0,
        errorSymbols: 0,
        currentBatch: 0
      }));

      setCurrentStatus(`Processing ${totalSymbols} symbols in ${totalBatches} batches...`);

      // Process symbols in batches
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, totalSymbols);
        const batchSymbols = allSymbols.slice(batchStart, batchEnd);

        setStats(prev => ({
          ...prev,
          currentBatch: batchIndex + 1
        }));

        setCurrentStatus(`Processing batch ${batchIndex + 1}/${totalBatches} (${batchSymbols.length} symbols)`);

        // Process each symbol in the batch
        for (const symbol of batchSymbols) {
          await processSymbol(symbol);
        }
      }

      setCurrentStatus(`Completed processing all ${totalSymbols} symbols. Restarting cycle...`);

      // Continue the cycle
      if (isActive) {
        startProcessing();
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  // Process a single symbol
  const processSymbol = async (symbol: { code: string; exchange: string }) => {
    const symbolKey = `${symbol.code}.${symbol.exchange}`;

    // Update current symbol status
    setCurrentSymbolStatus(prev => [
      ...prev.filter(s => s.code !== symbol.code || s.exchange !== symbol.exchange),
      { code: symbol.code, exchange: symbol.exchange, status: 'checking', message: 'Checking database...' }
    ]);

    try {
      // Check if symbol exists in database
      const checkResponse = await fetch(`/api/symbols/${encodeURIComponent(symbol.code)}`);

      const symbolExists = checkResponse.ok;
      let symbolData = null;

      if (symbolExists) {
        symbolData = await checkResponse.json();
      }

      if (!symbolExists) {
        // Symbol doesn't exist, create it
        setCurrentSymbolStatus(prev => prev.map(s =>
          s.code === symbol.code && s.exchange === symbol.exchange
            ? { ...s, status: 'creating', message: 'Creating symbol...' }
            : s
        ));

        const createResponse = await fetch('/api/symbols', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: symbol.code,
            exchange: symbol.exchange
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create symbol');
        }

        symbolData = await createResponse.json();

        setStats(prev => ({
          ...prev,
          processedSymbols: prev.processedSymbols + 1,
          createdSymbols: prev.createdSymbols + 1
        }));

        setCurrentSymbolStatus(prev => prev.map(s =>
          s.code === symbol.code && s.exchange === symbol.exchange
            ? { ...s, status: 'completed', message: 'Symbol created successfully' }
            : s
        ));

      } else {
        // Symbol exists, check if recent_prices need updating
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const needsUpdate = !symbolData.last_updated_recent_prices ||
          new Date(symbolData.last_updated_recent_prices) < twentyFourHoursAgo;

        if (needsUpdate) {
          // Update recent prices
          setCurrentSymbolStatus(prev => prev.map(s =>
            s.code === symbol.code && s.exchange === symbol.exchange
              ? { ...s, status: 'updating', message: 'Updating recent prices...' }
              : s
          ));

          const updateResponse = await fetch('/api/symbols/update-recent-prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: symbol.code,
              exchange: symbol.exchange,
              numberOfDaysInPeriod: 1,
              amountOfPeriods: 7
            })
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.error || 'Failed to update recent prices');
          }

          const updateData = await updateResponse.json();

          setStats(prev => ({
            ...prev,
            processedSymbols: prev.processedSymbols + 1,
            updatedSymbols: prev.updatedSymbols + 1
          }));

          setCurrentSymbolStatus(prev => prev.map(s =>
            s.code === symbol.code && s.exchange === symbol.exchange
              ? { ...s, status: 'completed', message: updateData.message }
              : s
          ));

          // Wait to debounce API calls and avoid getting banned
          await wait(waitTimeSeconds * 1000);

        } else {
          // Symbol is up to date
          setStats(prev => ({
            ...prev,
            processedSymbols: prev.processedSymbols + 1
          }));

          setCurrentSymbolStatus(prev => prev.map(s =>
            s.code === symbol.code && s.exchange === symbol.exchange
              ? { ...s, status: 'completed', message: 'Symbol is up to date' }
              : s
          ));
        }
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`Error processing symbol ${symbolKey}:`, err);

      setStats(prev => ({
        ...prev,
        processedSymbols: prev.processedSymbols + 1,
        errorSymbols: prev.errorSymbols + 1
      }));

      setCurrentSymbolStatus(prev => prev.map(s =>
        s.code === symbol.code && s.exchange === symbol.exchange
          ? { ...s, status: 'error', message: errorMessage }
          : s
      ));
    }

    // Keep only recent symbol statuses (last 10)
    setCurrentSymbolStatus(prev => prev.slice(-10));
  };

  // Utility function to wait
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Stop processing
  const stopProcessing = () => {
    setIsActive(false);
    setIsProcessing(false);
    setCurrentStatus('Stopped');
  };

  // Auto-start processing when component mounts (optional, could be controlled by props)
  useEffect(() => {
    // Uncomment the line below if you want auto-start on mount
    // startProcessing();
  }, []);

  const getStatusColor = (status: SymbolStatus['status']) => {
    switch (status) {
      case 'checking': return 'text-[#222834]';
      case 'creating': return 'text-[#f59e0b]';
      case 'updating': return 'text-[#f59e0b]';
      case 'completed': return 'text-[#10b981]';
      case 'error': return 'text-[#ef4444]';
      default: return 'text-[#373f51]';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#14171f]">{title}</h2>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${isActive ? 'text-[#10b981]' : 'text-[#373f51]'}`}>
              {currentStatus}
            </span>
            <button
              onClick={isActive ? stopProcessing : startProcessing}
              disabled={isProcessing && !isActive}
              className={`px-3 py-1.5 rounded-[16px] font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#ef4444] text-white hover:bg-[#dc2626] hover:shadow-sm active:scale-95'
                  : 'bg-[#222834] text-white hover:bg-[#1a1f2e] hover:shadow-sm active:scale-95'
              } disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#222834] focus:ring-offset-1`}
            >
              {isActive ? 'Stop' : 'Start'}
            </button>
            {isProcessing && <Loading variant="spinner" size="sm" />}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-md p-2">
          <p className="text-[#dc2626] text-sm">Error: {error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-white rounded-md border border-[#d0d4dc] p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-[#373f51] text-xs font-medium">Total</span>
              <span className="text-lg font-bold text-[#14171f]">{stats.totalSymbols.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#373f51] text-xs font-medium">Processed</span>
              <span className="text-lg font-bold text-[#222834]">{stats.processedSymbols.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#373f51] text-xs font-medium">Created</span>
              <span className="text-lg font-bold text-[#10b981]">{stats.createdSymbols.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#373f51] text-xs font-medium">Updated</span>
              <span className="text-lg font-bold text-[#f59e0b]">{stats.updatedSymbols.toLocaleString()}</span>
            </div>
            {stats.errorSymbols > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-[#373f51] text-xs font-medium">Errors</span>
                <span className="text-lg font-bold text-[#ef4444]">{stats.errorSymbols.toLocaleString()}</span>
              </div>
            )}
          </div>
          {stats.totalSymbols > 0 && (
            <div className="text-right">
              <p className="text-[#373f51] text-xs font-medium mb-1">Progress</p>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-[#f9fafb] rounded-full h-1.5 border border-[#d0d4dc]">
                  <div
                    className="bg-[#222834] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(stats.processedSymbols / stats.totalSymbols) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-[#373f51] whitespace-nowrap">
                  {stats.processedSymbols}/{stats.totalSymbols}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Symbol Status */}
      {currentSymbolStatus.length > 0 && (
        <div className="bg-white rounded-md border border-[#d0d4dc] p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[#14171f]">Recent Activity</h3>
            {stats.totalBatches > 0 && (
              <span className="text-xs text-[#373f51]">Batch {stats.currentBatch}/{stats.totalBatches}</span>
            )}
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {currentSymbolStatus.slice().reverse().map((symbol, index) => (
              <div key={`${symbol.code}-${symbol.exchange}-${index}`} className="flex items-center justify-between text-xs py-1">
                <span className="font-mono text-[#14171f] font-medium">
                  {symbol.code}.{symbol.exchange}
                </span>
                <span className={`text-right font-medium ${getStatusColor(symbol.status)}`}>
                  {symbol.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}