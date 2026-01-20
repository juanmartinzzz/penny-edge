# Style Guide

## Overview
This style guide is inspired by a clean, professional aesthetic. It emphasizes clarity, minimalism, and strong visual hierarchy while maintaining responsive design principles.

## Typography

### Font Families
- **Headlines**: Bold geometric sans-serif (similar to Inter or similar modern geometric fonts)
- **Body Text**: Clean, neutral sans-serif for optimal readability
- **Code**: Monospace font for technical content

### Hierarchy & Scale
- **H1**: 32-48px, bold, used for main headings
- **H2**: 24-32px, bold, for section headings
- **H3**: 20-24px, medium weight, for subsection headings
- **Body**: 16-18px, regular weight, line-height: 1.6
- **Small Text**: 14px, for captions and secondary information

### Text Styling Rules
- Use sentence case for most text, ALL CAPS sparingly for emphasis
- Maintain generous line spacing (leading) for readability
- Ensure text contrast ratios meet WCAG AA standards (4.5:1 minimum)

## Color Palette

### Primary Colors
- **Primary Text**: Very dark gray (#14171f) - near black for maximum contrast
- **Accent**: Dark blue-gray (#222834) for CTAs and primary buttons
- **Secondary Accent**: Medium gray (#373f51) for secondary elements

### Neutral Colors
- **Background**: Pure white (#ffffff) or very light gray (#f9fafb)
- **Surface**: Light gray (#f9fafb) for cards and sections
- **Border**: Subtle gray (#d0d4dc) for dividers and outlines
- **Text Secondary**: Medium gray (#373f51) for secondary text

### Semantic Colors
- **Success**: Green (#10b981) for positive actions/states
- **Warning**: Orange (#f59e0b) for caution states
- **Error**: Red (#ef4444) for errors and destructive actions

## Layout & Spacing

### Grid System
- Use 8px base unit for spacing (8, 16, 24, 32, 48, 64px)
- Multi-column layouts: 2-3 columns on desktop, single column on mobile
- Maximum content width: ~1200px, centered with side margins

### Spacing Scale
- **xs**: 8px (small gaps, padding)
- **sm**: 16px (component padding, small sections)
- **md**: 24px (card padding, medium sections)
- **lg**: 32px (large sections, component spacing)
- **xl**: 48px (major section breaks)
- **2xl**: 64px (hero sections, page margins)

### Responsive Breakpoints
- **Mobile**: < 640px (single column, stacked layout)
- **Tablet**: 640px - 1024px (2 columns, adjusted spacing)
- **Desktop**: > 1024px (multi-column, full spacing)

## Interactive Elements

### Buttons

#### Primary Buttons
- **Background**: Dark blue-gray (#222834)
- **Text**: White (#ffffff)
- **Border Radius**: 24px (fully rounded)
- **Padding**: 12px 24px
- **Font**: 16px, 500 weight
- **Height**: 48px minimum
- **Hover**: Subtle shadow elevation
- **Active**: Scale down to 95%
- **Focus**: 2px outline in dark gray
- **Disabled**: 60% opacity, not-allowed cursor

#### Secondary Buttons
- **Background**: White (#ffffff)
- **Border**: 1px solid light gray (#d0d4dc)
- **Text**: Medium gray (#373f51)
- **Hover**: Subtle background tint
- **Active**: Scale down to 95%

#### Ghost Buttons
- **Background**: Transparent
- **Text**: Primary text color
- **Hover**: Light gray background (#f1f5f9)

### Form Elements

#### Input Fields
- **Border**: 1px solid light gray (#e2e8f0)
- **Border Radius**: 6px
- **Padding**: 12px 16px
- **Focus**: 2px accent color outline
- **Error**: Red border and background tint
- **Disabled**: Light gray background, reduced opacity

#### Pill Lists
- **Single Selection**: Only one pill can be active at a time
- **Multiple Selection**: Multiple pills can be selected simultaneously
- **Pill Styling**: Rounded background, padding: 8px 16px, border-radius: 20px
- **Default State**: Light gray background (#f9fafb), dark gray text (#14171f)
- **Active/Selected**: Dark blue-gray background (#222834), white text
- **Hover**: Subtle background color change, pointer cursor
- **Focus**: 2px accent outline for keyboard navigation
- **Disabled**: Reduced opacity, not-allowed cursor

#### Usage Guidelines: Pill Lists vs Dropdowns
- **Use Pill Lists Instead Of Dropdowns When**:
  - Options are few (3-7 items maximum)
  - All options need to be visible at once
  - Selection is a primary action (not buried in a menu)
  - Mobile experience is important (pills are touch-friendly)
  - Visual hierarchy matters (selected items are clearly visible)
- **Single Selection Pills**: For mutually exclusive choices like status filters, categories
- **Multiple Selection Pills**: For filters, tags, or preference settings
- **Implementation**: Use toggle buttons styled as pills, not `<select>` elements
- **Accessibility**: Ensure keyboard navigation with Tab/Enter/Space, screen reader support

### Links
- **Default**: Dark blue-gray (#222834), no underline
- **Hover**: Darker shade, underline appears
- **Focus**: 2px outline in dark gray
- **Visited**: Slightly muted dark blue-gray

### Cards & Containers
- **Background**: White or light gray surface
- **Border Radius**: 8px
- **Shadow**: Subtle shadow on hover (0 4px 12px rgba(0,0,0,0.1))
- **Padding**: 24px
- **Border**: Optional 1px light border

## Animations & Transitions

### Transition Timing
- **Fast**: 100-150ms for immediate feedback (buttons, toggles)
- **Medium**: 200-300ms for smooth state changes
- **Slow**: 400-600ms for page transitions or major animations

### Animation Types
- **Hover Effects**: Color changes, subtle scale (1.02x), shadow elevation
- **Active States**: Scale down (0.98x), color intensification
- **Page Transitions**: Slide/fade effects using Framer Motion
- **Loading States**: Skeleton screens or smooth spinners

### Micro-interactions
- Button press feedback
- Form validation feedback
- Tab switching animations
- Modal open/close transitions

## Component Guidelines

### Navigation
- Clean, minimal navigation bar
- Logo on left, user actions on right
- Mobile: Hamburger menu with slide-out drawer
- Active page indication with accent color

### Tables & Lists
- Clear headers with medium weight
- Alternating row colors for readability
- Hover states on interactive rows
- Responsive: Horizontal scroll on mobile

### Modals & Drawers
- Backdrop: Semi-transparent dark overlay
- Content: Rounded corners, appropriate max-width
- Close button: Clear X icon in top-right
- Animation: Smooth slide-in from appropriate direction

## Implementation Notes

### CSS Architecture
- Use Tailwind CSS utility classes
- Custom properties for design tokens
- Component-specific classes for complex interactions
- Responsive utilities for mobile-first design

### Icon Usage
- Lucide icons for consistency
- 16px or 24px standard sizes
- Semantic color usage (accent for actions, gray for decorative)
