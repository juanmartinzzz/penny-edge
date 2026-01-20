import { forwardRef } from 'react';
import { ButtonProps } from './types';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  onClick,
  children,
  type = 'button',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-[#222834] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:ring-[#222834] rounded-full',
    secondary: 'bg-white border border-[#d0d4dc] text-[#373f51] hover:bg-gray-50 active:scale-[0.98] focus:ring-[#222834] rounded-full',
    ghost: 'bg-transparent text-[#14171f] hover:bg-[#f1f5f9] active:scale-[0.98] focus:ring-[#222834] rounded-full'
  };

  const sizeClasses = {
    xs: 'px-3 py-2 text-xs h-8',
    sm: 'px-4 py-2 text-sm h-9',
    md: 'px-5 py-3 text-base h-11',
    lg: 'px-6 py-3 text-lg h-13',
    xl: 'px-7 py-4 text-xl h-15'
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;