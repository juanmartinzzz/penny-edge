import { forwardRef } from 'react';
import { PillProps } from './types';

const Pill = forwardRef<HTMLButtonElement, PillProps>(({
  label,
  selected = false,
  onClick,
  variant = 'single',
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const stateClasses = selected
    ? 'bg-[#222834] text-white hover:bg-[#1a1f2a] focus:ring-[#222834]'
    : 'bg-[#f9fafb] text-[#14171f] hover:bg-[#f1f5f9] focus:ring-[#222834]';

  const interactionClasses = onClick && !disabled
    ? 'cursor-pointer'
    : 'cursor-default';

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${baseClasses} ${stateClasses} ${interactionClasses} ${className}`}
      {...props}
    >
      {label}
    </button>
  );
});

Pill.displayName = 'Pill';

export default Pill;