import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useWarungStore } from '@/lib/store';
import type { User, Session } from '@supabase/supabase-js';
import type { Store } from '@/types/supabase';

// Admin email whitelist - sync with AdminContext
const ADMIN_EMAILS = ['admin@rsquareidea.my.id'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  store: Store | null;
  storeId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  mustChangePassword?: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUp: (email: string, password: string, storeName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshStore: () => Promise<void>;
  updateStorePlan: (newPlan: string) => Promise<void>;
  updateStoreSlug: (storeName: string, storeId: string) => Promise<string>;
  fetchStoreByEmail: (email: string) => Promise<Store | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Auto-create store for users who don't have one
  const createStoreForUser = useCallback(async (userId: string, userEmail?: string, userMetadata?: any): Promise<Store | null> => {
    try {
      console.log('[AuthContext] Creating store for user:', userId);

      // Check if user is admin - admins don't need stores
      if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
        console.log('[AuthContext] User is admin, skipping store creation');
        return null;
      }

      // Check if user is a platform admin in the database
      const { data: adminData } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (adminData) {
        console.log('[AuthContext] User is platform admin, skipping store creation');
        return null;
      }

      // CRITICAL FIX: Check if user ALREADY has a store to prevent duplicates
      const { data: existingMember } = await supabase
        .from('store_members')
        .select('store_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (existingMember?.store_id) {
        console.log('[AuthContext] User already has a store, fetching it instead of creating new:', existingMember.store_id);
        const { data: existingStore } = await supabase
          .from('stores')
          .select('*')
          .eq('id', existingMember.store_id)
          .single();

        if (existingStore) {
          return existingStore as Store;
        }
      }

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
          settings: { onboarded: false },
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
          must_change_password: userMetadata?.must_change_password || false
        });

      if (memberError) {
        console.error('[AuthContext] Failed to add user as owner:', memberError);
        // Cleanup: delete the store if we can't add the owner
        await supabase.from('stores').delete().eq('id', storeData.id);
        return null;
      }

      console.log('[AuthContext] User added as store owner');

      // Start 14-day trial for Free plan stores
      try {
        const { data: trialData, error: trialError } = await supabase.rpc('start_trial_period', {
          store_id: storeData.id,
        });

        if (trialError) {
          console.error('[AuthContext] Failed to start trial period:', trialError);
          // Don't fail store creation if trial fails, just log the error
        } else {
          console.log('[AuthContext] Trial period started for store:', storeData.id, trialData);
        }
      } catch (trialErr) {
        console.error('[AuthContext] Exception starting trial period:', trialErr);
      }

      return storeData as Store;
    } catch (err) {
      console.error('[AuthContext] Failed to create store for user:', err);
      return null;
    }
  }, []);

  const fetchUserStore = useCallback(async (userId: string, userEmail?: string): Promise<Store | null> => {
    try {
      console.log('[AuthContext] Fetching store for user:', userId, 'email:', userEmail);

      // Check if user is admin - admins don't need stores
      if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
        console.log('[AuthContext] User is admin, skipping store fetch');
        setStore(null);
        return null;
      }

      // Skip fetching user store if we are in public store mode
      if (typeof window !== 'undefined') {
        const internalRoutes = ['/pos', '/dashboard', '/opname', '/login', '/checkout', '/upgrade', '/forgot-password', '/update-password', '/auth/callback', '/onboarding'];
        const isInternalRoute = internalRoutes.some(route => window.location.pathname.startsWith(route)) || window.location.pathname.startsWith('/admin') || window.location.pathname === '/';
        if (!isInternalRoute && window.location.pathname !== '/') {
          console.log('[AuthContext] Skipping user store fetch in public mode');
          return null;
        }
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

      // CRITICAL FIX: Fetch store_members WITH stores data in a single JOIN query
      // This ensures staff can access store data even if direct stores table RLS blocks them
      let memberData: any, memberError: any;
      try {
        const result = await withTimeout(
          (supabase
            .from('store_members') as any)
            .select('store_id, role, must_change_password, stores(id, name, slug, plan, logo_url, address, phone, settings, created_at, updated_at)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          5000 // 5s timeout
        ) as any;
        memberData = result.data;
        memberError = result.error;
      } catch (timeoutErr: any) {
        if (timeoutErr.message === 'Request timeout') {
          console.warn('[AuthContext] Store fetch timeout - will retry on next auth check');
          return null;
        }
        throw timeoutErr;
      }

      console.warn('[AuthContext] Store member+store query result:', JSON.stringify({ memberData, memberError }));

      if (memberError) {
        console.error('[AuthContext] Error fetching store member:', memberError);
        if (memberError.code === 'PGRST116') {
          console.log('[AuthContext] User has no store, auto-creating store...');
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const newStore = await createStoreForUser(userId, userEmail, currentUser?.user_metadata);
          if (newStore) {
            setStore(newStore);
            useWarungStore.getState().setCurrentStoreId(newStore.id);
            setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
            return newStore;
          }
          // If auto-create returned null (e.g. they are an admin), resolve gracefully
          setStore(null);
          useWarungStore.getState().setCurrentStoreId(null);
          setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
          return null;
        }
        return null;
      }

      if (!memberData?.store_id) {
        console.warn('[AuthContext] No store_id found in member data, auto-creating store...');
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const newStore = await createStoreForUser(userId, userEmail, currentUser?.user_metadata);
        if (newStore) {
          setStore(newStore);
          useWarungStore.getState().setCurrentStoreId(newStore.id);
          setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
          return newStore;
        }
        // If auto-create returned null (e.g. they are an admin), resolve gracefully
        setStore(null);
        useWarungStore.getState().setCurrentStoreId(null);
        setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
        return null;
      }

      if (memberData?.must_change_password !== undefined) {
        setMustChangePassword(memberData.must_change_password);
      } else {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
      }

      // Extract store data from the JOIN result
      const storeData = memberData.stores;

      if (storeData) {
        console.warn('[AuthContext] Setting store from JOIN:', storeData.name);
        setStore(storeData as Store);
        useWarungStore.getState().setCurrentStoreId(storeData.id);
        return storeData as Store;
      }

      // Fallback: If JOIN didn't return store data (e.g., RLS issue on relation),
      // try fetching stores directly
      console.warn('[AuthContext] JOIN did not return store data, trying direct fetch...');
      let directStoreData, directStoreError;
      try {
        const storeResult = await withTimeout(
          supabase
            .from('stores')
            .select('*')
            .eq('id', memberData.store_id)
            .single(),
          10000
        ) as any;
        directStoreData = storeResult.data;
        directStoreError = storeResult.error;
      } catch (timeoutErr: any) {
        if (timeoutErr.message === 'Request timeout') {
          console.warn('[AuthContext] Store data fetch timeout');
          return null;
        }
        throw timeoutErr;
      }

      if (directStoreError) {
        console.error('[AuthContext] Direct store fetch also failed:', directStoreError);
        return null;
      }

      if (directStoreData) {
        console.warn('[AuthContext] Setting store from direct fetch:', directStoreData.name);
        setStore(directStoreData as Store);
        useWarungStore.getState().setCurrentStoreId(directStoreData.id);
        return directStoreData as Store;
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
            // After store is loaded, fetch products and other data
            const storeState = useWarungStore.getState();
            if (storeState.currentStoreId) {
              console.log('[AuthContext] SIGNED_IN: Fetching products for store:', storeState.currentStoreId);
              await Promise.all([
                storeState.fetchProducts(),
                storeState.fetchStoreProfile(),
              ]);
            }
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
              // Only fetch store if we don't have one or if the user ID changed
              const currentStoreId = useWarungStore.getState().currentStoreId;
              const hasStore = store !== null && currentStoreId !== null;

              if (!hasStore) {
                console.log('[AuthContext] TOKEN_REFRESHED: No store, fetching...');
                await fetchUserStore(session.user.id, session.user.email);
              } else {
                console.log('[AuthContext] TOKEN_REFRESHED: Store already loaded, skipping fetch');
              }

              // After store is loaded, fetch products and other data if needed
              const storeState = useWarungStore.getState();
              if (storeState.currentStoreId && storeState.products.length === 0) {
                console.log('[AuthContext] TOKEN_REFRESHED: Products empty, refetching for store:', storeState.currentStoreId);
                await Promise.all([
                  storeState.fetchProducts(),
                  storeState.fetchStoreProfile(),
                ]);
              }
            } catch (err) {
              console.error('Error refetching store on token refresh:', err);
            }
          }
        }
      }
    );

    // Handle tab visibility change - when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Get latest state
        const currentUser = user; // Use closure value but check if user exists
        const storeId = useWarungStore.getState().currentStoreId;

        if (currentUser && storeId) {
          console.log('[AuthContext] Tab became visible, currentStoreId:', storeId);
          // Refetch data when user returns to the tab
          const storeState = useWarungStore.getState();
          if (storeState.products.length === 0) {
            console.log('[AuthContext] Refetching data after tab switch');
            Promise.all([
              storeState.fetchProducts(),
              storeState.fetchStoreProfile(),
            ]).catch(err => {
              console.error('[AuthContext] Error refetching data:', err);
            });
          }
        }
      }
    };

    // Handle window focus
    const handleFocus = () => {
      // Get latest state
      const currentUser = user; // Use closure value but check if user exists
      const storeId = useWarungStore.getState().currentStoreId;

      if (currentUser && storeId) {
        console.log('[AuthContext] Window focused, currentStoreId:', storeId);
        const storeState = useWarungStore.getState();
        if (storeState.products.length === 0) {
          console.log('[AuthContext] Refetching data after window focus');
          Promise.all([
            storeState.fetchProducts(),
            storeState.fetchStoreProfile(),
          ]).catch(err => {
            console.error('[AuthContext] Error refetching data:', err);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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

      // Check if email is in admin whitelist - admins should not register normally
      if (ADMIN_EMAILS.includes(email)) {
        console.log('[AuthContext] Admin email detected, blocking normal registration');
        return { error: 'Email ini digunakan untuk admin. Silakan login langsung.' };
      }

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

  const updateStoreSlug = async (storeName: string, storeId: string) => {
    try {
      // Generate slug from store name
      const baseSlug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug already exists
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id, slug')
        .eq('slug', baseSlug)
        .neq('id', storeId)
        .single();

      let finalSlug = baseSlug;
      if (existingStore) {
        // If slug exists, append timestamp to make it unique
        finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
      }

      // Update the slug in the database
      const { error } = await supabase
        .from('stores')
        .update({ slug: finalSlug })
        .eq('id', storeId);

      if (error) {
        console.error('Error updating store slug:', error);
        throw error;
      }

      // Update the local store state with the new slug
      setStore(prev => prev ? { ...prev, slug: finalSlug } : null);
      console.log(`Store slug updated to ${finalSlug}`);
      return finalSlug;
    } catch (error) {
      console.error('Failed to update store slug:', error);
      throw error;
    }
  };

  const fetchStoreByEmail = async (email: string): Promise<Store | null> => {
    try {
      // For demo mode, use a direct approach with known store slug or ID
      // Priority:
      // 1. Use environment variable VITE_DEMO_STORE_ID if set
      // 2. Use VITE_DEMO_STORE_SLUG if set
      // 3. Try to find by slug pattern from email
      // 4. Fall back to looking for any store with 'omzetin' in the name

      const DEMO_STORE_ID = import.meta.env.VITE_DEMO_STORE_ID || '';
      const DEMO_STORE_SLUG = import.meta.env.VITE_DEMO_STORE_SLUG || '';

      // Method 1: Use demo store ID from env
      if (DEMO_STORE_ID) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', DEMO_STORE_ID)
          .single();

        if (!storeError && storeData) {
          console.log('[AuthContext] Demo mode: Loaded demo store by ID', storeData.name);
          return storeData as Store;
        }
      }

      // Method 2: Use demo store slug from env
      if (DEMO_STORE_SLUG) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', DEMO_STORE_SLUG)
          .single();

        if (!storeError && storeData) {
          console.log('[AuthContext] Demo mode: Loaded demo store by slug', storeData.name);
          return storeData as Store;
        }
      }

      // Method 3: Try slug pattern from email (ricky.yusar -> ricky-yusar)
      const emailSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { data: storeBySlug, error: slugError } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', emailSlug)
        .maybeSingle();

      if (!slugError && storeBySlug) {
        console.log('[AuthContext] Demo mode: Loaded store by email slug', storeBySlug.name);
        return storeBySlug as Store;
      }

      // Method 4: Try to find store with 'omzetin' in the name or slug
      const { data: omzetinStore, error: omzetinError } = await supabase
        .from('stores')
        .select('*')
        .or('slug.eq.omzetin,name.ilike.%omzetin%')
        .limit(1)
        .maybeSingle();

      if (!omzetinError && omzetinStore) {
        console.log('[AuthContext] Demo mode: Loaded omzetin store', omzetinStore.name);
        return omzetinStore as Store;
      }

      console.error('[AuthContext] Demo mode: Could not find any demo store');
      console.error('[AuthContext] Tried: ID="' + DEMO_STORE_ID + '", Slug="' + DEMO_STORE_SLUG + '", Email Slug="' + emailSlug + '"');
      return null;
    } catch (error) {
      console.error('[AuthContext] Failed to fetch store by email:', error);
      return null;
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
      setMustChangePassword(false);

      // Clear ALL storage to prevent data leakage, BUT preserve tour history
      const tourKeys = Object.keys(localStorage).filter(key => key.startsWith('has-seen-'));
      const tourData = tourKeys.map(key => ({ key, value: localStorage.getItem(key) }));

      localStorage.clear();
      sessionStorage.clear();

      // Restore tour history
      tourData.forEach(({ key, value }) => {
        if (value) localStorage.setItem(key, value);
      });

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
    mustChangePassword,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    refreshStore,
    updateStorePlan,
    updateStoreSlug,
    fetchStoreByEmail,
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