// Real authentication service using Supabase and bcryptjs
import supabase from '../supabaseClient';
import bcrypt from 'bcryptjs';

// User interface
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

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
 * Login with email/username and password
 * @param identifier - User email or username
 * @param password - User password 
 * @returns Auth result
 */
export const login = async (identifier: string, password: string): Promise<AuthResponse> => {
  try {
    // 1. Fetch user by email OR username
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .limit(1);

    if (error) {
      console.error("DB Error:", error);
      throw new Error('Authentication failed');
    }

    if (!users || users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const userRecord = users[0];

    // 2. Verify Password
    const passwordMatch = await bcrypt.compare(password, userRecord.password);

    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // 3. Create Session Token (matches previous app logic)
    const tokenData = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      role: userRecord.role,
      exp: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
    };

    const token = objectToBase64(tokenData);

    return {
      token,
      user: {
        id: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        role: userRecord.role
      }
    };

  } catch (err: any) {
    throw err;
  }
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