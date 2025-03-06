/**
 * Utility functions for formatting values in the application
 */

/**
 * Format a number as Indian Rupees (INR)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted INR string
 */
export const formatINR = (amount: number, decimals: number = 2): string => {
  // Using Indian number system (lakhs, crores)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return formatter.format(amount);
};

/**
 * Format a date string or date object to IST (Indian Standard Time)
 * @param date - Date string or Date object
 * @param includeTime - Whether to include time in the output
 * @returns Formatted date string in IST
 */
export const formatDateToIST = (date: string | Date, includeTime: boolean = false): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Options for date formatting
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata', // IST timezone
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  
  // Add time options if includeTime is true
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return new Intl.DateTimeFormat('en-IN', options).format(dateObj);
}; 