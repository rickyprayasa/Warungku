/**
 * Supabase client configuration
 * Updated with better error handling and debugging
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Log environment variables for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('Environment variables check:');
  console.log('- VITE_SUPABASE_URL exists:', !!import.meta.env.VITE_SUPABASE_URL);
  console.log('- VITE_SUPABASE_ANON_KEY exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Missing required Supabase environment variables!');
    console.error('Make sure your .env.local file contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  } else {
    console.log('✅ Supabase environment variables are loaded');
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn('⚠️ Supabase credentials not configured. Some features may not work.');
  }
}

// Initialize Supabase client with additional configuration to handle potential connection issues
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'omzetin-app'
      },
      fetch: (url, options = {}) => {
        // Add debugging for network requests
        if (import.meta.env.DEV) {
          console.log('Supabase request to:', url);
        }
        return fetch(url, {
          ...options,
          // Increase timeout for slower connections
          signal: options.signal || AbortSignal.timeout(30000)
        });
      }
    },
    db: {
      schema: 'public'
    }
  }
);

// Enhanced auth object with error handling
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      console.error('Sign up error:', error);
      throw error;
    }
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Get session error:', error);
      throw error;
    }
    return data.session;
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get user error:', error);
      throw error;
    }
    return data.user;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Add a test connection function to debug connection issues
export const testConnection = async () => {
  try {
    // Simple ping to check if we can reach Supabase
    const { error } = await supabase.from('stores').select('count').limit(1);

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return { success: false, error: error.message };
    } else {
      console.log('✅ Supabase connection successful!');
      return { success: true };
    }
  } catch (err) {
    console.error('❌ Supabase connection test failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
