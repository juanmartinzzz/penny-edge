'use client';

import { useState } from 'react';
import FutureFeaturesManager from '@/components/ui/FutureFeaturesManager';

export default function FutureFeaturesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Future Features Management
            </h1>
            <p className="text-gray-600">
              Plan and track future features for the application
            </p>
          </div>

          <FutureFeaturesManager />
        </div>
      </div>
    </main>
  );
}