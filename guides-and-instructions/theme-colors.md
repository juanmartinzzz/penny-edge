# Theme Colors Configuration

This file contains the color palette for your Next.js application with Tailwind CSS, inspired by Contra.com's brand colors. The primary colors use Contra's signature purple/violet theme, with dark slate secondary colors and warm magenta accents. Edit the hex values below to customize your theme, then follow the instructions to apply them to your Tailwind configuration.

## Primary Colors
Primary colors are used for main buttons, links, and key interactive elements. Using Contra's signature purple/violet brand colors.

```
primary-50:  #faf5ff
primary-100: #f3e8ff
primary-200: #e9d5ff
primary-300: #d8b4fe
primary-400: #c084fc
primary-500: #a855f7
primary-600: #9333ea
primary-700: #7c3aed
primary-800: #6b21a8
primary-900: #581c87
primary-950: #3b0764
```

## Secondary Colors
Secondary colors complement the primary colors and are used for less prominent elements. Using Contra's dark slate palette.

```
secondary-50:  #f1f5f9
secondary-100: #e2e8f0
secondary-200: #cbd5e1
secondary-300: #94a3b8
secondary-400: #64748b
secondary-500: #475569
secondary-600: #334155
secondary-700: #1e293b
secondary-800: #0f172a
secondary-900: #020617
secondary-950: #000000
```

## Accent Colors
Accent colors are used for highlights, special elements, and to add visual interest. Using a warm magenta palette that complements Contra's purple theme.

```
accent-50:  #fdf4ff
accent-100: #fae8ff
accent-200: #f5d0fe
accent-300: #f0abfc
accent-400: #e879f9
accent-500: #d946ef
accent-600: #c026d3
accent-700: #a21caf
accent-800: #86198f
accent-900: #701a75
accent-950: #4a044e
```

## Status Colors
Status colors are used for notifications, alerts, and indicating different states.

### Success (Green)
```
success-50:  #f0fdf4
success-100: #dcfce7
success-200: #bbf7d0
success-300: #86efac
success-400: #4ade80
success-500: #22c55e
success-600: #16a34a
success-700: #15803d
success-800: #166534
success-900: #14532d
success-950: #052e16
```

### Error (Red)
```
error-50:  #fef2f2
error-100: #fee2e2
error-200: #fecaca
error-300: #fca5a5
error-400: #f87171
error-500: #ef4444
error-600: #dc2626
error-700: #b91c1c
error-800: #991b1b
error-900: #7f1d1d
error-950: #450a0a
```

### Warning (Amber/Yellow)
```
warning-50:  #fffbeb
warning-100: #fef3c7
warning-200: #fde68a
warning-300: #fcd34d
warning-400: #fbbf24
warning-500: #f59e0b
warning-600: #d97706
warning-700: #b45309
warning-800: #92400e
warning-900: #78350f
warning-950: #451a03
```

### Info (Blue)
```
info-50:  #eff6ff
info-100: #dbeafe
info-200: #bfdbfe
info-300: #93c5fd
info-400: #60a5fa
info-500: #3b82f6
info-600: #2563eb
info-700: #1d4ed8
info-800: #1e40af
info-900: #1e3a8a
info-950: #172554
```

## How to Apply These Colors to Tailwind CSS

1. **Update your `tailwind.config.js` file** with the custom color palette:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors (Contra purple)
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        // Secondary colors
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Accent colors (warm magenta)
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
        // Status colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
    },
  },
  plugins: [],
}
```

## Color Palette Generator

If you need to generate a new color palette, you can use tools like:
- [Tailwind Color Generator](https://tailwindcss.com/docs/customizing-colors)
- [Material Design Color Tool](https://material.io/design/color/)
- [Coolors](https://coolors.co/)