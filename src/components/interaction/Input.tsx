import { forwardRef, useState } from 'react';
import { InputProps } from './types';

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  label,
  required = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState('');

  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const baseClasses = 'w-full px-4 py-3 border rounded-md transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const borderClasses = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
    : 'border-[#e2e8f0] focus:border-[#222834] focus:ring-[#222834]/20';
  const textClasses = disabled ? 'text-gray-400 bg-gray-50' : 'text-[#14171f] bg-white';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[#14171f]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={`${baseClasses} ${borderClasses} ${textClasses}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;