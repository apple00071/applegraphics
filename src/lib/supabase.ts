import { createClient } from '@supabase/supabase-js';

// Get config from window object if available (for production)
const runtimeConfig = (window as any).REACT_APP_SUPABASE_CONFIG;

// Use runtime config if available, otherwise fall back to environment variables
// Use runtime config if available, otherwise fall back to environment variables
const supabaseUrl = runtimeConfig?.url || process.env.REACT_APP_SUPABASE_URL || 'https://ucgmfqxtwfqbsphmmgrn.supabase.co';
const supabaseAnonKey = runtimeConfig?.anonKey || process.env.REACT_APP_SUPABASE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables in lib/supabase.ts');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type RealtimePayload<T> = {
  new: T;
  old: T;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}; 