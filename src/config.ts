// API configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Application settings
export const APP_NAME = 'PrintPress Inventory';
export const COMPANY_NAME = 'Your Printing Company';

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 10;

// Stock threshold percentage for warnings (e.g., 20% means warn when stock is at 20% of reorder level)
export const LOW_STOCK_WARNING_THRESHOLD = 20; 