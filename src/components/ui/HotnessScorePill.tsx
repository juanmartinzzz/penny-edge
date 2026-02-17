import { forwardRef } from 'react';

interface HotnessScorePillProps {
  score: number | null;
  size?: 'xs' | 'sm';
  className?: string;
}

const HotnessScorePill = forwardRef<HTMLSpanElement, HotnessScorePillProps>(({
  score,
  size = 'xs',
  className = '',
}, ref) => {
  if (score === null) return null;

  // Color coding based on hotness score (0-100)
  const getColorClasses = (score: number) => {
    if (score < 25) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score < 50) return 'bg-green-100 text-green-800 border-green-200';
    if (score < 75) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-sm',
  };

  const baseClasses = 'inline-flex items-center rounded-full font-medium border transition-all duration-150';

  return (
    <span
      ref={ref}
      className={`${baseClasses} ${sizeClasses[size]} ${getColorClasses(score)} ${className}`}
    >
      {score}
    </span>
  );
});

HotnessScorePill.displayName = 'HotnessScorePill';

export default HotnessScorePill;