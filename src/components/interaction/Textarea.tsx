import { forwardRef, useEffect, useRef, useState } from 'react';
import { TextareaProps } from './types';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  placeholder,
  value,
  onChange,
  error,
  label,
  required = false,
  disabled = false,
  rows = 3,
  autoResize = true,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [currentValue, autoResize]);

  const sizeClasses = {
    xs: 'px-3 py-2 text-xs',
    sm: 'px-3.5 py-2.5 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4.5 py-3.5 text-lg',
    xl: 'px-5 py-4 text-xl'
  };

  const baseClasses = 'w-full border rounded-md transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed resize-none';
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
      <textarea
        ref={(node) => {
          textareaRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        placeholder={placeholder}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        rows={rows}
        className={`${baseClasses} ${sizeClasses[size]} ${borderClasses} ${textClasses}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;