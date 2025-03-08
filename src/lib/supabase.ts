import { createClient } from '@supabase/supabase-js';

// Get config from window object if available (for production)
const runtimeConfig = (window as any).REACT_APP_SUPABASE_CONFIG;

// Use runtime config if available, otherwise fall back to environment variables
const supabaseUrl = runtimeConfig?.url || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = runtimeConfig?.anonKey || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type RealtimePayload<T> = {
  new: T;
  old: T;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}; 