# Build Interaction Components

## Overview
This guide provides step-by-step instructions to create reusable interaction components following the design system established in `guideline-1-style.md`. We'll build essential form and interaction components with proper TypeScript types, accessibility, and responsive design.

## Prerequisites
- Next.js project setup (see `instructions-1-setup.md`)
- Tailwind CSS configured
- Lucide icons installed

## Project Structure Setup

### Step 1: Create Components Directory Structure
```bash
mkdir -p src/components/interaction
mkdir -p src/components/ui
```

### Step 2: Create Type Definitions
Create `src/components/interaction/types.ts`:

```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseProps {
  className?: string;
  disabled?: boolean;
}

export interface ButtonProps extends BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export interface TextareaProps extends BaseProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  rows?: number;
  autoResize?: boolean;
}

export interface PillProps extends BaseProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  variant?: 'single' | 'multiple';
}
```

## Component Implementations

### Step 3: Create Button Component
Create `src/components/interaction/Button.tsx`:

```typescript
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
    sm: 'px-4 py-2 text-sm h-9',
    md: 'px-6 py-3 text-base h-12',
    lg: 'px-8 py-4 text-lg h-14'
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
```

### Step 4: Create Input Component
Create `src/components/interaction/Input.tsx`:

```typescript
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
```

### Step 5: Create Textarea Component (Auto-Resize)
Create `src/components/interaction/Textarea.tsx`:

```typescript
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

  const baseClasses = 'w-full px-4 py-3 border rounded-md transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed resize-none';
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
        className={`${baseClasses} ${borderClasses} ${textClasses}`}
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
```

### Step 6: Create Pill Component
Create `src/components/interaction/Pill.tsx`:

```typescript
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
```

### Step 7: Create PillList Component
Create `src/components/interaction/PillList.tsx`:

```typescript
import { useState } from 'react';
import Pill from './Pill';

interface PillListProps {
  options: string[];
  selected?: string[];
  onChange?: (selected: string[]) => void;
  variant?: 'single' | 'multiple';
  className?: string;
  disabled?: boolean;
}

const PillList: React.FC<PillListProps> = ({
  options,
  selected = [],
  onChange,
  variant = 'single',
  className = '',
  disabled = false
}) => {
  const [internalSelected, setInternalSelected] = useState<string[]>(selected);

  const currentSelected = selected !== undefined ? selected : internalSelected;

  const handlePillClick = (option: string) => {
    if (disabled) return;

    let newSelected: string[];

    if (variant === 'single') {
      newSelected = currentSelected.includes(option) ? [] : [option];
    } else {
      newSelected = currentSelected.includes(option)
        ? currentSelected.filter(item => item !== option)
        : [...currentSelected, option];
    }

    if (selected === undefined) {
      setInternalSelected(newSelected);
    }
    onChange?.(newSelected);
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => (
        <Pill
          key={option}
          label={option}
          selected={currentSelected.includes(option)}
          onClick={() => handlePillClick(option)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default PillList;
```

### Step 8: Create Index File for Easy Imports
Create `src/components/interaction/index.ts`:

```typescript
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Textarea } from './Textarea';
export { default as Pill } from './Pill';
export { default as PillList } from './PillList';
export type { ButtonProps, InputProps, TextareaProps, PillProps } from './types';
```

## Usage Examples

### Step 9: Create Example Usage Component
Create `src/components/ui/ComponentExamples.tsx`:

```typescript
import {
  Button,
  Input,
  Textarea,
  PillList,
  ButtonProps,
  InputProps,
  TextareaProps
} from '../interaction';

const ComponentExamples: React.FC = () => {
  const handleButtonClick = () => {
    console.log('Button clicked!');
  };

  const handleInputChange = (value: string) => {
    console.log('Input value:', value);
  };

  const handleTextareaChange = (value: string) => {
    console.log('Textarea value:', value);
  };

  const handlePillChange = (selected: string[]) => {
    console.log('Selected pills:', selected);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <h1 className="text-3xl font-bold text-[#14171f] mb-8">Component Examples</h1>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-[#14171f]">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" onClick={handleButtonClick}>
            Primary Button
          </Button>
          <Button variant="secondary" onClick={handleButtonClick}>
            Secondary Button
          </Button>
          <Button variant="ghost" onClick={handleButtonClick}>
            Ghost Button
          </Button>
          <Button variant="primary" disabled>
            Disabled Button
          </Button>
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-[#14171f]">Form Elements</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              onChange={handleInputChange}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              onChange={handleInputChange}
              error="Password must be at least 8 characters"
            />
          </div>
          <div className="space-y-4">
            <Textarea
              label="Message"
              placeholder="Enter your message..."
              onChange={handleTextareaChange}
              autoResize
            />
          </div>
        </div>
      </section>

      {/* Pill Lists */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-[#14171f]">Pill Lists</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#14171f]">Single Selection</h3>
          <PillList
            options={['Option 1', 'Option 2', 'Option 3']}
            variant="single"
            onChange={handlePillChange}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#14171f]">Multiple Selection</h3>
          <PillList
            options={['React', 'TypeScript', 'Next.js', 'Tailwind']}
            variant="multiple"
            onChange={handlePillChange}
          />
        </div>
      </section>
    </div>
  );
};

export default ComponentExamples;
```

## Testing Components

### Step 10: Test Components with TypeScript
Run TypeScript check to ensure no type errors:

```bash
npx tsc --noEmit --skipLibCheck
```

### Step 11: Add Components to a Page
Create or update a page to display the components:

```typescript
// pages/components.tsx or app/components/page.tsx
import ComponentExamples from '../src/components/ui/ComponentExamples';

export default function ComponentsPage() {
  return <ComponentExamples />;
}
```

## Component Features Summary

- **Button**: Three variants (primary, secondary, ghost) with hover/active states
- **Input**: Form input with error states, labels, and accessibility features
- **Textarea**: Auto-resizing textarea that adjusts height based on content
- **Pill**: Individual pill component for selection states
- **PillList**: Manages single or multiple pill selections

All components follow the design system colors, spacing, and interaction patterns defined in the style guide.