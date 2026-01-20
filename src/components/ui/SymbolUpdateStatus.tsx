'use client';

import { useEffect, useState } from 'react';
import { Loading } from './Loading';

interface SymbolUpdateStats {
  totalSymbols: number;
  outdatedSymbols: number;
  recentSymbols: number;
}

interface SymbolUpdateStatusProps {
  title?: string;
  showTitle?: boolean;
  className?: string;
}

export function SymbolUpdateStatus({ title = "Symbol Update Status", showTitle = true, className = "" }: SymbolUpdateStatusProps) {
  const [stats, setStats] = useState<SymbolUpdateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/symbols/update-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {showTitle && <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-md border p-3">
              <Loading variant="skeleton" className="h-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        {showTitle && <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>}
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Error loading dashboard: {error}</p>
          <button
            onClick={fetchDashboardStats}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const successRate = stats.totalSymbols > 0 ? (stats.recentSymbols / stats.totalSymbols) * 100 : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {showTitle && <h2 className="text-base font-bold text-gray-900 mb-1">{title}</h2>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Total Symbols Card */}
        <div className="bg-white rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Symbols</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSymbols.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Recent Updates Card (Success) */}
        <div className="bg-white rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recently Updated (&lt;24h)</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.recentSymbols.toLocaleString()} <span className="text-sm text-gray-500">({successRate.toFixed(1)}%)</span>
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Outdated Symbols Card (Needs Attention) */}
        <div className="bg-white rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outdated (≥24h or null)</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.outdatedSymbols.toLocaleString()} <span className="text-sm text-gray-500">({((stats.outdatedSymbols / stats.totalSymbols) * 100).toFixed(1)}%)</span>
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}