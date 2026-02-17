export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface BaseProps {
  className?: string;
  disabled?: boolean;
}

export interface ButtonProps extends BaseProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  label?: React.ReactNode;
  required?: boolean;
  size?: ComponentSize;
  min?: string;
  max?: string;
}

export interface NumericInputProps extends BaseProps {
  value?: string;
  onChange?: (value: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  error?: string;
  label?: React.ReactNode;
  required?: boolean;
  size?: ComponentSize;
  formatAsKMB?: boolean;
  center?: boolean;
}

export interface TextareaProps extends BaseProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  label?: React.ReactNode;
  required?: boolean;
  rows?: number;
  autoResize?: boolean;
  size?: ComponentSize;
}

export interface PillProps extends BaseProps {
  label?: string;
  children?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  variant?: 'single' | 'multiple';
  size?: ComponentSize;
}