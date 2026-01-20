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
  signInWithGoogle: () => Promise<{ error?: string }>;
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

  // Auto-create store for users who don't have one
  const createStoreForUser = useCallback(async (userId: string, userEmail?: string): Promise<Store | null> => {
    try {
      console.log('[AuthContext] Creating store for user:', userId);

      // Generate store name from email or use default
      const storeName = userEmail?.split('@')[0] || 'Toko Saya';

      // Generate unique slug
      const slug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

      // Create store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: storeName.charAt(0).toUpperCase() + storeName.slice(1),
          slug: slug,
          plan: 'free',
        })
        .select()
        .single();

      if (storeError) {
        console.error('[AuthContext] Failed to create store:', storeError);
        return null;
      }

      console.log('[AuthContext] Store created:', storeData.id);

      // Add user as owner
      const { error: memberError } = await supabase
        .from('store_members')
        .insert({
          store_id: storeData.id,
          user_id: userId,
          role: 'owner',
        });

      if (memberError) {
        console.error('[AuthContext] Failed to add user as owner:', memberError);
        // Cleanup: delete the store if we can't add the owner
        await supabase.from('stores').delete().eq('id', storeData.id);
        return null;
      }

      console.log('[AuthContext] User added as store owner');
      return storeData as Store;
    } catch (err) {
      console.error('[AuthContext] Failed to create store for user:', err);
      return null;
    }
  }, []);

  const fetchUserStore = useCallback(async (userId: string, userEmail?: string): Promise<Store | null> => {
    try {
      console.log('[AuthContext] Fetching store for user:', userId, 'email:', userEmail);

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

      let memberData, memberError;
      try {
        const result = await withTimeout(
          supabase
            .from('store_members')
            .select('store_id, role')
            .eq('user_id', userId)
            .single(),
          30000 // 30s timeout - increased for slow connections
        );
        memberData = result.data;
        memberError = result.error;
      } catch (timeoutErr: any) {
        // CRITICAL FIX: Handle timeout gracefully - don't throw error
        if (timeoutErr.message === 'Request timeout') {
          console.warn('[AuthContext] Store fetch timeout - will retry on next auth check');
          // Return null but don't throw - this allows app to continue with cached data
          return null;
        }
        throw timeoutErr;
      }

      console.warn('[AuthContext] Store member query result:', JSON.stringify({ memberData, memberError }));

      if (memberError) {
        console.error('[AuthContext] Error fetching store member:', memberError);
        // If error is "Row not found", it means user has no store. Auto-create store for them.
        if (memberError.code === 'PGRST116') {
          console.log('[AuthContext] User has no store, auto-creating store...');
          const newStore = await createStoreForUser(userId, userEmail);
          if (newStore) {
            setStore(newStore);
            useWarungStore.getState().setCurrentStoreId(newStore.id);
            return newStore;
          }
          setStore(null);
          useWarungStore.getState().setCurrentStoreId(null);
        }
        return null;
      }

      if (!memberData?.store_id) {
        console.warn('[AuthContext] No store_id found in member data, auto-creating store...');
        const newStore = await createStoreForUser(userId, userEmail);
        if (newStore) {
          setStore(newStore);
          useWarungStore.getState().setCurrentStoreId(newStore.id);
          return newStore;
        }
        return null;
      }

      // SECURITY CHECK: Verify again that this user is a member of this store
      // This prevents any potential caching issues or race conditions
      if (userId) {
        const { data: verify, error: verifyError } = await supabase
          .from('store_members')
          .select('id')
          .eq('store_id', memberData.store_id)
          .eq('user_id', userId)
          .single();

        if (verifyError) {
          // CRITICAL FIX: Only deny access if it's truly a "not found" error
          // For other errors (timeout, network, etc.), log but continue
          if (verifyError.code === 'PGRST116') {
            // Row not found - user is NOT a member, deny access
            console.error('[SECURITY ALERT] User is not a member of this store!', { userId, storeId: memberData.store_id });
            setStore(null);
            useWarungStore.getState().setCurrentStoreId(null);
            return null;
          } else {
            // Other error (timeout, network, etc.) - log warning but continue with the store we found
            console.warn('[AuthContext] Verification query failed, but continuing with found store:', verifyError);
            // Continue to fetch and use the store
          }
        }
        if (!verify && !verifyError) {
          // Verification returned no data AND no error - user is not a member
          console.error('[SECURITY ALERT] User is not a member of the store found in store_members!', {
            userId,
            storeId: memberData.store_id,
            memberData
          });
          // Force clear store to prevent leakage
          setStore(null);
          useWarungStore.getState().setCurrentStoreId(null);
          return null;
        }
      }

      let storeData, storeError;
      try {
        const storeResult = await withTimeout(
          supabase
            .from('stores')
            .select('*')
            .eq('id', memberData.store_id)
            .single(),
          30000 // 30s timeout - increased for slow connections
        ) as any;
        storeData = storeResult.data;
        storeError = storeResult.error;
      } catch (timeoutErr: any) {
        // CRITICAL FIX: Handle timeout gracefully
        if (timeoutErr.message === 'Request timeout') {
          console.warn('[AuthContext] Store data fetch timeout - using cached data if available');
          // Return the store we already have from memberData
          // The next auth refresh will retry
          return null;
        }
        throw timeoutErr;
      }

      console.warn('[AuthContext] Store query result:', JSON.stringify({ storeData: storeData?.id, storeError }));

      if (storeError) {
        console.error('[AuthContext] Error fetching store:', storeError);
        return null;
      }

      if (storeData) {
        console.warn('[AuthContext] Setting store:', storeData.name);
        setStore(storeData as Store);
        // SYNC: Update global store state
        useWarungStore.getState().setCurrentStoreId(storeData.id);
        return storeData as Store;
      }

      return null;
    } catch (err: any) {
      // CRITICAL FIX: Don't throw error - just log and return null
      // This prevents errorReporter from trying to log to a non-existent endpoint
      if (err.message === 'Request timeout') {
        console.warn('[AuthContext] Store fetch timeout handled gracefully');
        return null;
      }
      console.error('[AuthContext] Failed to fetch user store:', err);
      return null;
    }
  }, [createStoreForUser]);

  const refreshStore = useCallback(async () => {
    if (user?.id) {
      await fetchUserStore(user.id, user.email);
    }
  }, [user?.id, user?.email, fetchUserStore]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] Initial session check:', !!session, 'for user:', session?.user?.id);
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          await fetchUserStore(session.user.id, session.user.email);
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
            await fetchUserStore(session.user.id, session.user.email);
          } catch (err) {
            console.error('Error fetching store on sign in:', err);
          }
        } else if (event === 'SIGNED_OUT') {
          setStore(null);
          useWarungStore.getState().setCurrentStoreId(null);
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Make sure store is still associated with user
          if (session?.user) {
            try {
              await fetchUserStore(session.user.id, session.user.email);
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

      // CRITICAL: Clear all previous user data immediately to prevent data leakage
      console.log('[AuthContext] signIn - clearing previous user data');
      useWarungStore.getState().resetStore();
      useWarungStore.getState().setCurrentStoreId(null);
      setStore(null);

      // Implement rate limiting client-side by tracking failed attempts
      const failedAttempts = parseInt(localStorage.getItem('login_failed_attempts') || '0');
      const lastAttempt = parseInt(localStorage.getItem('login_last_attempt') || '0');
      const now = Date.now();

      // If more than 5 failed attempts in the last 15 minutes, block for 15 minutes
      if (failedAttempts >= 5 && now - lastAttempt < 15 * 60 * 1000) {
        setLoading(false);
        return { error: 'Too many failed attempts. Please try again later.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Increment failed attempts
        const newFailedAttempts = failedAttempts + 1;
        localStorage.setItem('login_failed_attempts', newFailedAttempts.toString());
        localStorage.setItem('login_last_attempt', now.toString());

        setLoading(false);
        return { error: error.message };
      }

      // Reset failed attempts on successful login
      localStorage.removeItem('login_failed_attempts');
      localStorage.removeItem('login_last_attempt');

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        try {
          await fetchUserStore(data.user.id, data.user.email);
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

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // CRITICAL: Clear all previous user data immediately to prevent data leakage
      console.log('[AuthContext] signInWithGoogle - clearing previous user data');
      useWarungStore.getState().resetStore();
      useWarungStore.getState().setCurrentStoreId(null);
      setStore(null);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      console.error('Google SignIn error:', err);
      setLoading(false);
      return { error: err.message || 'Google login failed' };
    }
  };

  const signUp = async (email: string, password: string, storeName: string) => {
    try {
      console.log('[AuthContext] Starting signup for:', email);

      // 1. Create user (Supabase may send email confirmation if enabled)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            store_name: storeName,
          },
        },
      });

      console.log('[AuthContext] SignUp response:', {
        user: authData?.user?.id,
        session: !!authData?.session,
        identities: authData?.user?.identities?.length,
        confirmed: authData?.user?.email_confirmed_at,
        error: authError
      });

      if (authError) {
        console.error('[AuthContext] Auth error:', authError);

        // Handle specific error cases
        if (authError.message.includes('already registered')) {
          return { error: 'Email sudah terdaftar. Silakan login atau gunakan email lain.' };
        }
        // Don't block on email sending errors - we'll handle verification later
        if (authError.message.includes('SMTP') || authError.message.includes('email')) {
          console.warn('[AuthContext] Email sending failed, but continuing with signup');
          // Continue with signup even if email fails
        } else {
          return { error: authError.message };
        }
      }

      if (!authData?.user) {
        return { error: 'Gagal membuat akun. Silakan coba lagi.' };
      }

      // Check if user already exists (identities array will be empty for existing unconfirmed users)
      if (authData.user.identities && authData.user.identities.length === 0) {
        console.log('[AuthContext] User already exists (empty identities)');
        return { error: 'Email sudah terdaftar. Silakan cek email untuk konfirmasi atau login.' };
      }

      console.log('[AuthContext] User created:', authData.user.id, 'confirmed:', authData.user.email_confirmed_at);

      // 2. Create store immediately (regardless of email confirmation status)
      const slug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { data: storeData, error: storeError } = await (supabase
        .from('stores') as any)
        .insert({
          name: storeName,
          slug: `${slug}-${Date.now().toString(36)}`,
          plan: 'free',
        })
        .select()
        .single();

      if (storeError) {
        console.error('[AuthContext] Store error:', storeError);
        return { error: storeError.message };
      }

      console.log('[AuthContext] Store created:', storeData.id);

      // 3. Add user as owner
      const { error: memberError } = await (supabase
        .from('store_members') as any)
        .insert({
          store_id: storeData.id,
          user_id: authData.user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('[AuthContext] Member error:', memberError);
        return { error: memberError.message };
      }

      setStore(storeData as Store);
      useWarungStore.getState().setCurrentStoreId(storeData.id);

      // Return success - email verification will be handled in dashboard
      return {
        success: true,
        needsEmailVerification: !authData.user.email_confirmed_at
      };
    } catch (err: any) {
      console.error('[AuthContext] Signup error:', err);
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
      useWarungStore.getState().setCurrentStoreId(null);
      setUser(null);
      setSession(null);
      setStore(null);

      // Clear ALL storage to prevent data leakage
      localStorage.clear();
      sessionStorage.clear();

      // Clear specific keys just in case
      const keysToRemove = [
        'warung-storage-v2',
        'warung-storage-v3',
        'sb-access-token',
        'sb-refresh-token',
        'supabase.auth.token',
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Force reload to clear in-memory state and React Query cache
      window.location.href = '/login';
    }
  };

  // Session timeout functionality
  useEffect(() => {
    if (!session) return;

    const handleUserActivity = () => {
      localStorage.setItem('last_activity', Date.now().toString());
    };

    // Add event listeners for user activity
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    // Check for session timeout every minute
    const sessionCheckInterval = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem('last_activity') || '0');
      const now = Date.now();
      const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

      if (lastActivity && (now - lastActivity > maxInactiveTime)) {
        // Session expired due to inactivity
        console.log('[AuthContext] Session expired due to inactivity');
        signOut();
      }
    }, 60000); // Check every minute

    // Initialize last activity
    localStorage.setItem('last_activity', Date.now().toString());

    return () => {
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(sessionCheckInterval);
    };
  }, [session, signOut]);

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
    signInWithGoogle,
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