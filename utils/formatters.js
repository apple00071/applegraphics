/**
 * Utility functions for formatting values in the application
 */

/**
 * Format a number as Indian Rupees (INR)
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted INR string
 */
const formatINR = (amount, decimals = 2) => {
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
 * @param {string|Date} date - Date string or Date object
 * @param {boolean} includeTime - Whether to include time in the output
 * @returns {string} Formatted date string in IST
 */
const formatDateToIST = (date, includeTime = false) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Options for date formatting
  const options = {
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

/**
 * Get current date and time in IST
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Current date/time in IST
 */
const getCurrentDateTimeIST = (includeTime = true) => {
  return formatDateToIST(new Date(), includeTime);
};

module.exports = {
  formatINR,
  formatDateToIST,
  getCurrentDateTimeIST
}; 