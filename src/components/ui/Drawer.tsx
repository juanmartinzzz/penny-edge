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