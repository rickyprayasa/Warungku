import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useWarungStore } from '@/lib/store';
import type { User, Session } from '@supabase/supabase-js';
import type { Store } from '@/types/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  store: Store | null;
  storeId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, storeName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshStore: () => Promise<void>;
  updateStorePlan: (newPlan: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserStore = useCallback(async (userId: string): Promise<Store | null> => {
    try {
      console.warn('[AuthContext] Fetching store for user:', userId);

      // Skip fetching user store if we are in public store mode
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/store/')) {
        console.log('[AuthContext] Skipping user store fetch in public mode');
        return null;
      }

      // Helper to add timeout to promises
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), ms)
          )
        ]);
      };

      const { data: memberData, error: memberError } = await withTimeout(
        supabase
          .from('store_members')
          .select('store_id, role')
          .eq('user_id', userId)
          .single(),
        10000 // 10s timeout
      );

      console.warn('[AuthContext] Store member query result:', JSON.stringify({ memberData, memberError }));

      if (memberError) {
        console.error('[AuthContext] Error fetching store member:', memberError);
        return null;
      }

      if (!memberData?.store_id) {
        console.warn('[AuthContext] No store_id found in member data');
        return null;
      }

      const { data: storeData, error: storeError } = await withTimeout(
        supabase
          .from('stores')
          .select('*')
          .eq('id', memberData.store_id)
          .single(),
        10000 // 10s timeout
      );

      console.warn('[AuthContext] Store query result:', JSON.stringify({ storeData: storeData?.id, storeError }));

      if (storeError) {
        console.error('[AuthContext] Error fetching store:', storeError);
        return null;
      }

      if (storeData) {
        console.warn('[AuthContext] Setting store:', storeData.name);
        setStore(storeData as Store);
        return storeData as Store;
      }

      return null;
    } catch (err) {
      console.error('[AuthContext] Failed to fetch user store:', err);
      return null;
    }
  }, []);

  const refreshStore = useCallback(async () => {
    if (user?.id) {
      await fetchUserStore(user.id);
    }
  }, [user?.id, fetchUserStore]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] Initial session check:', !!session, 'for user:', session?.user?.id);
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          await fetchUserStore(session.user.id);
        } catch (err) {
          console.error('Error in initial store fetch:', err);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state change event:', event, 'session:', !!session, 'user:', session?.user?.id);
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await fetchUserStore(session.user.id);
          } catch (err) {
            console.error('Error fetching store on sign in:', err);
          }
        } else if (event === 'SIGNED_OUT') {
          setStore(null);
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Make sure store is still associated with user
          if (session?.user) {
            try {
              await fetchUserStore(session.user.id);
            } catch (err) {
              console.error('Error refetching store on token refresh:', err);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserStore]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        try {
          await fetchUserStore(data.user.id);
        } catch (err) {
          console.error('Error fetching store after sign in:', err);
        }
      }

      setLoading(false);
      return {};
    } catch (err: any) {
      console.error('SignIn error:', err);
      setLoading(false);
      return { error: err.message || 'Login failed' };
    }
  };

  const signUp = async (email: string, password: string, storeName: string) => {
    try {
      // 1. Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: 'Failed to create user' };
      }

      // 2. Create store
      const slug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: storeName,
          slug: `${slug}-${Date.now().toString(36)}`,
        })
        .select()
        .single();

      if (storeError) {
        return { error: storeError.message };
      }

      // 3. Add user as owner
      const { error: memberError } = await supabase
        .from('store_members')
        .insert({
          store_id: storeData.id,
          user_id: authData.user.id,
          role: 'owner',
        });

      if (memberError) {
        return { error: memberError.message };
      }

      setStore(storeData as Store);
      return {};
    } catch (err: any) {
      return { error: err.message || 'Signup failed' };
    }
  };

  const updateStorePlan = async (newPlan: string) => {
    if (!store?.id) {
      console.error('No store available to update plan');
      return;
    }

    try {
      // Update the plan in the database
      const { error } = await supabase
        .from('stores')
        .update({ plan: newPlan })
        .eq('id', store.id);

      if (error) {
        console.error('Error updating store plan:', error);
        throw error;
      }

      // Update the local store state with the new plan
      setStore(prev => prev ? { ...prev, plan: newPlan } : null);
      console.log(`Store plan updated to ${newPlan}`);
    } catch (error) {
      console.error('Failed to update store plan:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out from Supabase:', error);
    } finally {
      // Always clear local state
      useWarungStore.getState().resetStore();
      setUser(null);
      setSession(null);
      setStore(null);
    }
  };

  // For general auth status, we just check if user exists (not store)
  // This prevents public store pages from affecting the auth status
  const generalIsAuthenticated = !!user && !!session;
  // For store-specific auth status, we check if user has a store
  const storeIsAuthenticated = !!user && !!store;

  // Log for debugging auth state
  console.log('[AuthContext] Current auth state - user:', !!user, 'session:', !!session, 'store:', !!store, 'generalIsAuthenticated:', generalIsAuthenticated, 'storeIsAuthenticated:', storeIsAuthenticated, 'loading:', loading);

  const value: AuthContextType = {
    user,
    session,
    store,
    storeId: store?.id ?? null,
    loading,
    isAuthenticated: generalIsAuthenticated, // Use general auth status
    signIn,
    signUp,
    signOut,
    refreshStore,
    updateStorePlan,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}