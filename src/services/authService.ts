// Local authentication service
// This simulates an API but runs entirely in the browser

// User interface
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

// Test user accounts
const USERS = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@printpress.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    id: '2',
    username: 'user',
    email: 'user@printpress.com',
    password: 'user123',
    role: 'user'
  }
];

// Auth response interface
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Convert object to base64 string (browser-compatible)
 */
const objectToBase64 = (obj: any): string => {
  const jsonStr = JSON.stringify(obj);
  return btoa(encodeURIComponent(jsonStr));
};

/**
 * Convert base64 string to object (browser-compatible)
 */
const base64ToObject = (base64Str: string): any => {
  const jsonStr = decodeURIComponent(atob(base64Str));
  return JSON.parse(jsonStr);
};

/**
 * Login with email and password
 * @param email - User email
 * @param password - User password 
 * @returns Auth result
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find matching user
  const user = USERS.find(u => 
    (u.email === email || u.username === email) && 
    u.password === password
  );
  
  // Handle authentication result
  if (user) {
    // Create token with user data
    const tokenData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      exp: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };
    
    // Encode token to base64 (browser-compatible)
    const token = objectToBase64(tokenData);
    
    // Return success with user data
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };
  }
  
  // Return error for invalid credentials
  throw new Error('Invalid credentials');
};

/**
 * Check if token is valid
 * @param token - JWT token 
 * @returns User data or null if invalid
 */
export const validateToken = (token: string): User | null => {
  try {
    // Decode token
    const decoded = base64ToObject(token);
    
    // Check if token is expired
    if (decoded.exp && decoded.exp > Date.now()) {
      return {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
    }
  } catch (error) {
    console.error('Token validation error:', error);
  }
  
  return null;
};

export default {
  login,
  validateToken
}; 