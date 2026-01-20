# Drawer Component Implementation Guide

This guide provides step-by-step instructions for creating a reusable Drawer component that slides in from the left, right, or bottom of the screen with backdrop support and accessibility features.

## Overview

The Drawer component will be a slide-out panel that can be positioned on any edge of the screen. Key features include:
- **Multiple positions**: Left, right, or bottom positioning
- **Backdrop overlay**: Optional dark overlay with click-to-close
- **Keyboard navigation**: Escape key support
- **Accessibility**: Proper ARIA attributes and focus management
- **Portal rendering**: Renders outside the normal DOM hierarchy
- **Body scroll prevention**: Prevents background scrolling when open

## Prerequisites

Before implementing the Drawer component, ensure you have:
1. React project with TypeScript
2. Tailwind CSS configured
3. Lucide React icons installed (`npm install lucide-react`)
4. Project structure with a `components/ui/` directory for components

## Project Structure Setup

### Step 1: Create UI Directory Structure
```bash
mkdir -p src/components/ui
```

## Step 2: Implement the Drawer Component

Create `src/components/ui/Drawer.tsx`:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  shouldOpenWithBackdrop?: boolean;
  widthClass?: string;
  children: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  position = 'right',
  shouldOpenWithBackdrop = false,
  widthClass = 'min-w-[450px]',
  children,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Handle body scroll prevention
  useEffect(() => {
    if (isOpen && shouldOpenWithBackdrop) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, shouldOpenWithBackdrop]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return `left-0 top-0 h-full ${widthClass} transform -translate-x-full data-[open=true]:translate-x-0`;
      case 'right':
        return `right-0 top-0 h-full ${widthClass} transform translate-x-full data-[open=true]:translate-x-0`;
      case 'bottom':
        return `bottom-0 left-0 right-0 ${widthClass} max-h-[80vh] transform translate-y-full data-[open=true]:translate-y-0`;
      default:
        return '';
    }
  };

  const drawer = (
    <>
      {/* Backdrop */}
      {shouldOpenWithBackdrop && (
        <div
          className="fixed inset-0 z-99 bg-black/50 transition-opacity duration-660 ease-in-out"
          onClick={handleBackdropClick}
          data-open={isOpen}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed z-100 bg-white shadow-lg transition-transform duration-660 ease-in-out ${getPositionClasses()}`}
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close drawer"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-6 pt-12">
          {children}
        </div>
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}
```

## Step 3: Create Index File for Easy Imports

Create `src/components/ui/index.ts` to export the Drawer component:

```typescript
export { Drawer } from './Drawer';
```

## Component Explanation

### Props Interface
- `isOpen`: Controls drawer visibility
- `onClose`: Callback function when drawer should close
- `position`: Drawer slide direction ('left' | 'right' | 'bottom')
- `shouldOpenWithBackdrop`: Enables dark overlay background
- `widthClass`: Tailwind width classes (for left/right) or height classes (for bottom)
- `children`: Content to render inside the drawer

### Key Features Implementation

#### Portal Rendering
The component uses `createPortal` to render the drawer outside the normal component hierarchy, directly to `document.body`. This prevents z-index and overflow issues.

#### Positioning Logic
The `getPositionClasses()` function returns appropriate Tailwind classes based on the position prop:
- **Left**: Slides from left edge with negative X translation
- **Right**: Slides from right edge with positive X translation
- **Bottom**: Slides from bottom edge with positive Y translation

#### Keyboard Navigation
- Escape key closes the drawer when pressed
- Event listener is properly cleaned up when component unmounts or closes

#### Backdrop Behavior
- Optional dark overlay with 50% black opacity
- Click anywhere on backdrop closes the drawer
- Prevents body scrolling when backdrop is enabled

#### Accessibility
- `role="dialog"` and `aria-modal="true"` for screen readers
- Close button has proper `aria-label`
- Focus management could be enhanced in future iterations

#### Animations
- Smooth 660ms transitions using Tailwind's ease-in-out timing
- Transform-based animations for better performance
- `data-open` attributes control animation states

## Step 4: Usage Examples

### Basic Usage
```tsx
import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';

function MyComponent() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsDrawerOpen(true)}>
        Open Drawer
      </button>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        <h2>Drawer Content</h2>
        <p>This is the drawer content.</p>
      </Drawer>
    </>
  );
}
```

### With Backdrop and Custom Position
```tsx
<Drawer
  isOpen={isDrawerOpen}
  onClose={() => setIsDrawerOpen(false)}
  position="left"
  shouldOpenWithBackdrop={true}
  widthClass="w-80"
>
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Navigation</h3>
    <nav className="space-y-2">
      <a href="#" className="block p-2 rounded hover:bg-gray-100">Home</a>
      <a href="#" className="block p-2 rounded hover:bg-gray-100">About</a>
      <a href="#" className="block p-2 rounded hover:bg-gray-100">Contact</a>
    </nav>
  </div>
</Drawer>
```

### Bottom Drawer Example
```tsx
<Drawer
  isOpen={isDrawerOpen}
  onClose={() => setIsDrawerOpen(false)}
  position="bottom"
  shouldOpenWithBackdrop={true}
  widthClass="h-96"
>
  <div className="text-center">
    <h3 className="text-xl font-bold mb-4">Bottom Sheet</h3>
    <p>Content goes here...</p>
  </div>
</Drawer>
```

## Step 5: Testing the Component

### Basic Functionality Test
```typescript
// In your test file (e.g., Drawer.test.tsx)
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer } from '@/components/ui/Drawer';

test('drawer opens and closes', () => {
  const mockOnClose = jest.fn();
  render(
    <Drawer isOpen={true} onClose={mockOnClose}>
      Test Content
    </Drawer>
  );

  expect(screen.getByText('Test Content')).toBeInTheDocument();

  const closeButton = screen.getByRole('button', { name: /close/i });
  fireEvent.click(closeButton);
  expect(mockOnClose).toHaveBeenCalled();
});
```

### Keyboard Navigation Test
```typescript
test('closes on escape key', () => {
  const mockOnClose = jest.fn();
  render(
    <Drawer isOpen={true} onClose={mockOnClose}>
      Test Content
    </Drawer>
  );

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(mockOnClose).toHaveBeenCalled();
});
```

## Customization Options

### Custom Styling
The component can be extended with custom styling by modifying the Tailwind classes:

```typescript
// Custom drawer with different colors
<div className="fixed z-100 bg-blue-50 shadow-xl border-l border-blue-200 transition-transform duration-300 ease-out ...">
```

### Additional Props
Consider adding these optional props for enhanced functionality:
- `size`: Predefined sizes ('sm', 'md', 'lg')
- `closeOnOutsideClick`: Control backdrop click behavior
- `preventClose`: Disable closing mechanisms
- `customCloseButton`: Custom close button component

## Common Issues and Solutions

### Issue: Drawer appears behind other elements
**Solution**: Ensure the z-index values (z-99 for backdrop, z-100 for drawer) are higher than other components.

### Issue: Animation not smooth on mobile
**Solution**: Add `will-change: transform` to the drawer element for better performance.

### Issue: Focus management not working properly
**Solution**: Implement focus trapping using libraries like `focus-trap-react` or manually manage focus.

## Next Steps

After implementing the basic Drawer component, consider these enhancements:
1. Focus trap implementation
2. Swipe gestures for mobile
3. Nested drawer support
4. Animation variants (slide, fade, scale)
5. Size presets and responsive behavior

This implementation provides a solid foundation for a production-ready drawer component that follows modern React patterns and accessibility standards.