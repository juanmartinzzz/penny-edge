interface LoadingProps {
  className?: string;
  variant?: 'skeleton' | 'spinner';
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ className = '', variant = 'skeleton', size = 'md' }: LoadingProps) {
  if (variant === 'spinner') {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8'
    };

    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className={`animate-spin rounded-full border-2 border-gray-300 border-t-[#222834] ${sizeClasses[size]}`}
        />
      </div>
    );
  }

  // Default skeleton variant
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// Skeleton components for specific use cases
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded ${
            i === lines - 1 ? 'w-3/4' : i === lines - 2 ? 'w-1/2' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-50 p-3 rounded-md ${className}`}>
      <div className="flex justify-between items-center">
        <div className="h-4 bg-gray-200 rounded w-12"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  );
}