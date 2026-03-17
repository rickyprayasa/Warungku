/**
 * Supabase client configuration
 * Updated with better error handling and debugging
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { Logger } from '@/infrastructure/logging/Logger';
const logger = Logger.create('Supabase');

// Log environment variables for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  logger.debug('Environment variables check');
  logger.debug('VITE_SUPABASE_URL exists', { exists: !!import.meta.env.VITE_SUPABASE_URL });
  logger.debug('VITE_SUPABASE_ANON_KEY exists', { exists: !!import.meta.env.VITE_SUPABASE_ANON_KEY });

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    logger.fatal('Missing required Supabase environment variables');

  } else {
    logger.info('Supabase environment variables are loaded');
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    logger.warn('Supabase credentials not configured');
  }
}

// Use memory storage to prevent persisting session across tabs for specific clients
const memoryStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => { },
  removeItem: (key: string) => { },
};

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
          logger.debug('Supabase request', { url });
        }
        return fetch(url, {
          ...options,
          // Increase timeout for slower connections
          signal: (options as any).signal || ('AbortSignal' in window && 'timeout' in (AbortSignal as any) ? (AbortSignal as any).timeout(30000) : undefined)
        });
      }
    },
    db: {
      schema: 'public'
    }
  }
);

// A dedicated, unauthenticated client for public store queries to bypass LockManager deadlocks
export const supabasePublic = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage,
    },
    global: {
      headers: { 'X-Client-Info': 'omzetin-public' },
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
      logger.error('Sign up error:', {}, error);
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
      logger.error('Sign in error:', {}, error);
      throw error;
    }
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out error:', {}, error);
      throw error;
    }
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('Get session error:', {}, error);
      throw error;
    }
    return data.session;
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      logger.error('Get user error:', {}, error);
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
      logger.error('Supabase connection failed', { errorMessage: error.message });
      return { success: false, error: error.message };
    } else {
      logger.info('Supabase connection successful!');
      return { success: true };
    }
  } catch (err) {
    logger.error('Supabase connection test failed', {}, err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};
