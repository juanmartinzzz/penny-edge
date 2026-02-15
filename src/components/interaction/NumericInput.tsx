import { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { NumericInputProps } from './types';
import { ChevronUp, ChevronDown } from 'lucide-react';

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(({
  value,
  onChange,
  min = 0,
  max,
  placeholder,
  error,
  label,
  required = false,
  disabled = false,
  size = 'md',
  className = '',
  formatAsKMB = false,
  center = false,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<HTMLDivElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const numericValue = parseFloat(currentValue) || 0;

  // Format number for display
  const formatDisplayValue = useCallback((num: number): string => {
    if (!formatAsKMB || isNaN(num)) return num.toString();

    if (num >= 1000000000000000000) {
      return `${(num / 1000000000000000000).toFixed(1)}P`;
    } else if (num >= 1000000000000000) {
      return `${(num / 1000000000000000).toFixed(1)}Q`;
    } else if (num >= 1000000000000) {
      return `${(num / 1000000000000).toFixed(1)}T`;
    } else if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}G`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }, [formatAsKMB]);

  // Parse display value to number
  const parseDisplayValue = useCallback((display: string): number => {
    if (!formatAsKMB) return parseFloat(display) || 0;

    const cleaned = display.replace(/,/g, '').toUpperCase();
    let num = parseFloat(cleaned);

    if (cleaned.includes('P')) {
      num *= 1000000000000000000;
    } else if (cleaned.includes('Q')) {
      num *= 1000000000000000;
    } else if (cleaned.includes('T')) {
      num *= 1000000000000;
    } else if (cleaned.includes('G')) {
      num *= 1000000000;
    } else if (cleaned.includes('M')) {
      num *= 1000000;
    } else if (cleaned.includes('K')) {
      num *= 1000;
    }

    return num;
  }, [formatAsKMB]);

  // Get appropriate step size based on current value
  // Algorithm: increase by 0.1 of current order of magnitude
  // 0-10: step by 1, 10-100: step by 10, 100-1000: step by 100, etc.
  const getStepSize = useCallback((currentVal: number): number => {
    if (currentVal <= 0) return 1;
    const orderOfMagnitude = Math.floor(Math.log10(currentVal));
    return Math.pow(10, orderOfMagnitude);
  }, []);

  const handleIncrement = () => {
    const stepSize = getStepSize(numericValue);
    const newValue = Math.max(min, numericValue + stepSize);
    const finalValue = max !== undefined ? Math.min(max, newValue) : newValue;
    handleValueChange(finalValue.toString());
  };

  const handleDecrement = () => {
    const stepSize = getStepSize(numericValue);
    const newValue = Math.max(min, numericValue - stepSize);
    handleValueChange(newValue.toString());
  };

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleInputChange = (e: React.FormEvent<HTMLDivElement>) => {
    const textContent = e.currentTarget.textContent || '';
    handleValueChange(textContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleFocus = () => {
    if (inputRef.current) {
      // Select all text on focus
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  // Update the hidden input for form submission
  useEffect(() => {
    if (ref && 'current' in ref && ref.current) {
      ref.current.value = currentValue;
    }
  }, [currentValue, ref]);

  const sizeClasses = {
    xs: 'h-8 px-3 py-2 text-xs',
    sm: 'h-9 px-3.5 py-2.5 text-sm',
    md: 'h-11 px-4 py-3 text-base',
    lg: 'h-13 px-4.5 py-3.5 text-lg',
    xl: 'h-15 px-5 py-4 text-xl'
  };

  const buttonSizeClasses = {
    xs: 'w-6 h-6 p-1 text-xs',
    sm: 'w-7 h-7 p-1.5 text-sm',
    md: 'w-8 h-8 p-2 text-base',
    lg: 'w-9 h-9 p-2 text-lg',
    xl: 'w-10 h-10 p-2 text-xl'
  };

  const iconSizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-4.5 h-4.5'
  };

  const baseInputClasses = 'border rounded-md transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed min-w-0 flex items-center';
  const borderClasses = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
    : 'border-[#e2e8f0] focus:border-[#222834] focus:ring-[#222834]/20';
  const textClasses = disabled ? 'text-gray-400 bg-gray-50' : 'text-[#14171f] bg-white';

  const buttonBaseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-full';

  const buttonVariantClasses = error
    ? 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] focus:ring-red-500'
    : 'bg-[#222834] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:ring-[#222834]';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`block text-sm font-medium text-[#14171f] ${center ? 'text-center' : ''}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={`flex items-center gap-2 ${center ? 'justify-center' : ''}`}>
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || numericValue <= min}
          className={`${buttonBaseClasses} ${buttonVariantClasses} ${buttonSizeClasses[size]}`}
        >
          <ChevronDown className={iconSizeClasses[size]} />
        </button>

        {/* Custom Input Field */}
        <div
          ref={inputRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          className={`${baseInputClasses} ${sizeClasses[size]} ${borderClasses} ${textClasses} w-auto min-w-16 max-w-32 text-center cursor-text select-text`}
          data-placeholder={placeholder}
        >
          {formatDisplayValue(numericValue) || (placeholder ? '' : '0')}
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && numericValue >= max)}
          className={`${buttonBaseClasses} ${buttonVariantClasses} ${buttonSizeClasses[size]}`}
        >
          <ChevronUp className={iconSizeClasses[size]} />
        </button>
      </div>

      {/* Hidden input for form submission */}
      <input
        ref={ref}
        type="hidden"
        value={currentValue}
        required={required}
        {...props}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

NumericInput.displayName = 'NumericInput';

export default NumericInput;