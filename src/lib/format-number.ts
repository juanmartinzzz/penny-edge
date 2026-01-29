/**
 * Formats a number into a human-readable string with appropriate suffixes
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places to show (default: 1)
 * @returns Formatted string with K, M, B suffixes or plain number if < 1000
 */
export function formatNumber(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);

  if (absValue >= 1000000000) {
    // Billions
    return `${(value / 1000000000).toFixed(decimals)}B`;
  } else if (absValue >= 1000000) {
    // Millions
    return `${(value / 1000000).toFixed(decimals)}M`;
  } else if (absValue >= 1000) {
    // Thousands
    return `${(value / 1000).toFixed(decimals)}K`;
  } else if (absValue >= 1) {
    // Whole numbers
    return value.toFixed(decimals);
  } else {
    // Very small numbers, show as-is with decimals
    return value.toFixed(decimals);
  }
}

/**
 * Formats a currency value into a human-readable string
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places to show (default: 1)
 * @returns Formatted currency string with $ prefix and appropriate suffixes, or just the number if < 1000
 */
export function formatCurrency(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);

  if (absValue >= 1000000000) {
    // Billions
    return `$${(value / 1000000000).toFixed(decimals)}B`;
  } else if (absValue >= 1000000) {
    // Millions
    return `$${(value / 1000000).toFixed(decimals)}M`;
  } else if (absValue >= 1000) {
    // Thousands
    return `$${(value / 1000).toFixed(decimals)}K`;
  } else {
    // Small values, don't show $ prefix
    return value.toFixed(decimals);
  }
}