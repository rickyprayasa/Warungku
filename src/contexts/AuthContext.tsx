import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useWarungStore } from '@/lib/store';
import type { User, Session } from '@supabase/supabase-js';
import type { Store } from '@/types/supabase';
import { permissionService } from '@/core/services/auth/PermissionService';
import { UserRole } from '@/core/domain/entities/Role';
import { Logger } from '@/infrastructure/logging/Logger';

const logger = Logger.create('Auth');

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
  const storeCreationAttemptedFor = useRef<Record<string, boolean>>({});
  const storeRef = useRef<Store | null>(null);
  const isFetchingStoreRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const fetchUserStoreRef = useRef<typeof fetchUserStore>(null as any);

  // Keep user ref in sync
  useEffect(() => { userRef.current = user; }, [user]);

  // Wrapper: always keep storeRef in sync with state
  const updateStore = useCallback((value: Store | null | ((prev: Store | null) => Store | null)) => {
    if (typeof value === 'function') {
      updateStore(prev => {
        const next = value(prev);
        storeRef.current = next;
        return next;
      });
    } else {
      storeRef.current = value;
      setStore(value);
    }
  }, []);

  // Auto-create store for users who don't have one
  const createStoreForUser = useCallback(async (userId: string, userEmail?: string, userMetadata?: any): Promise<Store | null> => {
    try {
      logger.debug('Creating store for user', { userId });

      // Check if user is admin using PermissionService - admins don't need stores
      const userRole = await permissionService.getUserRole(userId);
      const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

      if (isSuperAdmin) {
        logger.debug('User is super admin, skipping store creation');
        return null;
      }

      // Check if user is a platform admin in the database (legacy support)
      const { data: adminData } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (adminData) {
        logger.debug('User is platform admin, skipping store creation');
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
        logger.debug('User already has a store, fetching it instead of creating new', { storeId: existingMember.store_id });
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
        logger.error('Failed to create store', { storeError });
        return null;
      }

      logger.debug('Store created', { storeId: storeData.id });

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
        logger.error('Failed to add user as owner', { memberError });
        // Cleanup: delete the store if we can't add the owner
        await supabase.from('stores').delete().eq('id', storeData.id);
        return null;
      }

      logger.debug('User added as store owner');

      // Start 14-day trial for Free plan stores
      try {
        const { data: trialData, error: trialError } = await supabase.rpc('start_trial_period', {
          store_id: storeData.id,
        });

        if (trialError) {
          logger.error('Failed to start trial period', { trialError });
          // Don't fail store creation if trial fails, just log the error
        } else {
          logger.debug('Trial period started for store', { storeId: storeData.id, trialData });
        }
      } catch (trialErr) {
        logger.error('Exception starting trial period', { trialErr });
      }

      return storeData as Store;
    } catch (err) {
      logger.error('Failed to create store for user', { err });
      return null;
    }
  }, []);

  const fetchUserStore = useCallback(async (userId: string, userEmail?: string): Promise<Store | null> => {
    try {
      logger.debug('Fetching store for user', { userId, email: userEmail });

      // Check if user is admin using PermissionService - admins don't need stores
      const userRole = await permissionService.getUserRole(userId);
      const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

      if (isSuperAdmin) {
        logger.debug('User is super admin, skipping store fetch');
        updateStore(null);
        return null;
      }

      // Skip fetching user store if we are in public store mode
      if (typeof window !== 'undefined') {
        const internalRoutes = ['/pos', '/dashboard', '/opname', '/login', '/checkout', '/upgrade', '/forgot-password', '/update-password', '/auth/callback', '/onboarding'];
        const isInternalRoute = internalRoutes.some(route => window.location.pathname.startsWith(route)) || window.location.pathname.startsWith('/admin') || window.location.pathname === '/';
        if (!isInternalRoute && window.location.pathname !== '/') {
          logger.debug('Skipping user store fetch in public mode');
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
          logger.warn('Store fetch timeout - will retry on next auth check');
          return null;
        }
        throw timeoutErr;
      }

      logger.warn('Store member+store query result', { memberData, memberError });

      if (memberError) {
        logger.error('Error fetching store member', { memberError });
        if (memberError.code === 'PGRST116') {
          logger.debug('User has no store, auto-creating store...');

          if (storeCreationAttemptedFor.current[userId]) {
            logger.warn('Store creation already attempted for this user, preventing infinite loop.');
            updateStore(null);
            useWarungStore.getState().setCurrentStoreId(null);
            return null;
          }
          storeCreationAttemptedFor.current[userId] = true;

          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const newStore = await createStoreForUser(userId, userEmail, currentUser?.user_metadata);
          if (newStore) {
            updateStore(newStore);
            useWarungStore.getState().setCurrentStoreId(newStore.id);
            setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
            return newStore;
          }
          // If auto-create returned null (e.g. they are an admin), resolve gracefully
          updateStore(null);
          useWarungStore.getState().setCurrentStoreId(null);
          setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
          return null;
        }
        return null;
      }

      if (!memberData?.store_id) {
        logger.warn('No store_id found in member data, auto-creating store...');

        if (storeCreationAttemptedFor.current[userId]) {
          logger.warn('Store creation already attempted for this user, preventing infinite loop.');
          updateStore(null);
          useWarungStore.getState().setCurrentStoreId(null);
          return null;
        }
        storeCreationAttemptedFor.current[userId] = true;

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const newStore = await createStoreForUser(userId, userEmail, currentUser?.user_metadata);
        if (newStore) {
          updateStore(newStore);
          useWarungStore.getState().setCurrentStoreId(newStore.id);
          setMustChangePassword(currentUser?.user_metadata?.must_change_password || false);
          return newStore;
        }
        // If auto-create returned null (e.g. they are an admin), resolve gracefully
        updateStore(null);
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
        logger.warn('Setting store from JOIN', { storeName: storeData.name });
        updateStore(storeData as Store);
        storeRef.current = storeData as Store;
        useWarungStore.getState().setCurrentStoreId(storeData.id);
        return storeData as Store;
      }

      // Fallback: If JOIN didn't return store data (e.g., RLS issue on relation),
      // try fetching stores directly
      logger.warn('JOIN did not return store data, trying direct fetch...');
      let directStoreData, directStoreError;
      try {
        const storeResult = await withTimeout(
          (supabase
            .from('stores') as any)
            .select('*')
            .eq('id', memberData.store_id)
            .single(),
          10000
        ) as any;
        directStoreData = storeResult.data;
        directStoreError = storeResult.error;
      } catch (timeoutErr: any) {
        if (timeoutErr.message === 'Request timeout') {
          logger.warn('Store data fetch timeout');
          return null;
        }
        throw timeoutErr;
      }

      if (directStoreError) {
        logger.error('Direct store fetch also failed', { directStoreError });
        return null;
      }

      if (directStoreData) {
        logger.warn('Setting store from direct fetch', { storeName: directStoreData.name });
        updateStore(directStoreData as Store);
        storeRef.current = directStoreData as Store;
        useWarungStore.getState().setCurrentStoreId(directStoreData.id);
        return directStoreData as Store;
      }

      return null;
    } catch (err: any) {
      // CRITICAL FIX: Don't throw error - just log and return null
      // This prevents errorReporter from trying to log to a non-existent endpoint
      if (err.message === 'Request timeout') {
        logger.warn('Store fetch timeout handled gracefully');
        return null;
      }
      logger.error('Failed to fetch user store', { err });
      return null;
    }
  }, [createStoreForUser]);

  // Keep fetchUserStore ref in sync (declared after fetchUserStore)
  useEffect(() => { fetchUserStoreRef.current = fetchUserStore; }, [fetchUserStore]);

  const refreshStore = useCallback(async () => {
    if (user?.id) {
      await fetchUserStore(user.id, user.email);
    }
  }, [user?.id, user?.email, fetchUserStore]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      logger.debug('Initial session check', { hasSession: !!session, userId: session?.user?.id });
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Clear permission cache on initial session load to ensure fresh role data
        logger.debug('Initial session - clearing permission service cache');
        permissionService.clearCache();
        if (!isFetchingStoreRef.current) {
          isFetchingStoreRef.current = true;
          try {
            await fetchUserStoreRef.current(session.user.id, session.user.email);
          } catch (err) {
            logger.error('Error in initial store fetch', { err });
          } finally {
            isFetchingStoreRef.current = false;
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state change event', { event, hasSession: !!session, userId: session?.user?.id });
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          // Clear permission cache on sign in to ensure fresh role data
          logger.debug('SIGNED_IN - clearing permission service cache');
          permissionService.clearCache();
          try {
            await fetchUserStoreRef.current(session.user.id, session.user.email);
            // After store is loaded, fetch products and other data
            const storeState = useWarungStore.getState();
            if (storeState.currentStoreId) {
              logger.debug('SIGNED_IN: Fetching products for store', { storeId: storeState.currentStoreId });
              await Promise.all([
                storeState.fetchProducts(),
                storeState.fetchStoreProfile(),
              ]);
            }
          } catch (err) {
            logger.error('Error fetching store on sign in', { err });
          }
        } else if (event === 'SIGNED_OUT') {
          updateStore(null);
          useWarungStore.getState().setCurrentStoreId(null);
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Make sure store is still associated with user
          if (session?.user) {
            try {
              // Use ref to check store state — avoids re-render dependency
              const currentStoreId = useWarungStore.getState().currentStoreId;
              const hasStore = storeRef.current !== null && currentStoreId !== null;

              if (!hasStore && !isFetchingStoreRef.current) {
                logger.debug('TOKEN_REFRESHED: No store, fetching...');
                isFetchingStoreRef.current = true;
                try {
                  await fetchUserStoreRef.current(session.user.id, session.user.email);
                } finally {
                  isFetchingStoreRef.current = false;
                }
              } else {
                logger.debug('TOKEN_REFRESHED: Store already loaded, skipping fetch');
              }

              // After store is loaded, fetch products and other data if needed
              const storeState = useWarungStore.getState();
              if (storeState.currentStoreId && storeState.products.length === 0) {
                logger.debug('TOKEN_REFRESHED: Products empty, refetching for store', { storeId: storeState.currentStoreId });
                await Promise.all([
                  storeState.fetchProducts(),
                  storeState.fetchStoreProfile(),
                ]);
              }
            } catch (err) {
              logger.error('Error refetching store on token refresh', { err });
            }
          }
        }
      }
    );

    // Handle tab visibility change - when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const storeId = useWarungStore.getState().currentStoreId;
        if (userRef.current && storeId) {
          logger.debug('Tab became visible', { storeId });
          const storeState = useWarungStore.getState();
          if (storeState.products.length === 0) {
            logger.debug('Refetching data after tab switch');
            Promise.all([
              storeState.fetchProducts(),
              storeState.fetchStoreProfile(),
            ]).catch(err => {
              logger.error('Error refetching data', { err });
            });
          }
        }
      }
    };

    // Handle window focus
    const handleFocus = () => {
      const storeId = useWarungStore.getState().currentStoreId;
      if (userRef.current && storeId) {
        logger.debug('Window focused', { storeId });
        const storeState = useWarungStore.getState();
        if (storeState.products.length === 0) {
          logger.debug('Refetching data after window focus');
          Promise.all([
            storeState.fetchProducts(),
            storeState.fetchStoreProfile(),
          ]).catch(err => {
            logger.error('Error refetching data', { err });
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
    // CRITICAL: Empty deps — this effect must run ONLY ONCE on mount.
    // All state is accessed via refs (storeRef, userRef, fetchUserStoreRef).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      // CRITICAL: Clear all previous user data immediately to prevent data leakage
      logger.debug('signIn - clearing previous user data');
      useWarungStore.getState().resetStore();
      useWarungStore.getState().setCurrentStoreId(null);
      updateStore(null);

      // Implement rate limiting client-side by tracking failed attempts
      const failedAttempts = parseInt(localStorage.getItem('login_failed_attempts') || '0');
      const lastAttempt = parseInt(localStorage.getItem('login_last_attempt') || '0');
      const now = Date.now();

      // If more than 5 failed attempts in the last 15 minutes, block for 15 minutes
      if (failedAttempts >= 5 && now - lastAttempt < 15 * 60 * 1000) {
        setLoading(false);
        return { error: 'Too many failed attempts. Please try again later.' };
      }

      // DEADLOCK PROTECTION: Wrap signIn in a 10-second timeout
      // Supabase's internal LockManager can deadlock indefinitely on corrupt cached sessions
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT_DEADLOCK')), 10000);
      });

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

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
        // Clear permission cache on sign in to ensure fresh role data
        logger.debug('Clearing permission service cache on sign in');
        permissionService.clearCache();
        try {
          await fetchUserStoreRef.current(data.user.id, data.user.email);
        } catch (err) {
          logger.error('Error fetching store after sign in', { err });
        }
      }

      setLoading(false);
      return {};
    } catch (err: any) {
      logger.error('SignIn error', {}, err);
      setLoading(false);

      // If we caught the deadlock timeout, forcefully clear storage and tell user
      if (err.message === 'TIMEOUT_DEADLOCK') {
        logger.warn('DEADLOCK DETECTED during signIn! Clearing corrupt auth tokens...');
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) { /* ignore */ }
        return { error: 'Sesi cache nyangkut. Data error sudah dihapus otomatis, silakan klik Masuk sekali lagi.' };
      }

      return { error: err.message || 'Login failed' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // CRITICAL: Clear all previous user data immediately to prevent data leakage
      logger.debug('signInWithGoogle - clearing previous user data');
      useWarungStore.getState().resetStore();
      useWarungStore.getState().setCurrentStoreId(null);
      updateStore(null);

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
      logger.error('Google SignIn error', {}, err);
      setLoading(false);
      return { error: err.message || 'Google login failed' };
    }
  };

  const signUp = async (email: string, password: string, storeName: string) => {
    try {
      logger.debug('Starting signup for', { email });

      // Note: PermissionService requires a user ID which we don't have yet during signup
      // We'll check for existing super admin emails directly in the database instead
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', email)
        .maybeSingle();

      if (existingUser?.role === 'super_admin') {
        logger.debug('Super admin email detected, blocking normal registration');
        return { error: 'Email ini digunakan untuk super admin. Silakan login langsung.' };
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

      logger.debug('SignUp response:', {
        user: authData?.user?.id,
        session: !!authData?.session,
        identities: authData?.user?.identities?.length,
        confirmed: authData?.user?.email_confirmed_at,
        error: authError
      });

      if (authError) {
        logger.error('Auth error', { authError });

        // Handle specific error cases
        if (authError.message.includes('already registered')) {
          return { error: 'Email sudah terdaftar. Silakan login atau gunakan email lain.' };
        }
        // Don't block on email sending errors - we'll handle verification later
        if (authError.message.includes('SMTP') || authError.message.includes('email')) {
          logger.warn('Email sending failed, but continuing with signup');
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
        logger.debug('User already exists (empty identities)');
        return { error: 'Email sudah terdaftar. Silakan cek email untuk konfirmasi atau login.' };
      }

      logger.debug('User created', { userId: authData.user.id, confirmed: authData.user.email_confirmed_at });

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
        logger.error('Store error', { storeError });
        return { error: storeError.message };
      }

      logger.debug('Store created', { storeId: storeData.id });

      // 3. Add user as owner
      const { error: memberError } = await (supabase
        .from('store_members') as any)
        .insert({
          store_id: storeData.id,
          user_id: authData.user.id,
          role: 'owner',
        });

      if (memberError) {
        logger.error('Member error', { memberError });
        return { error: memberError.message };
      }

      updateStore(storeData as Store);
      useWarungStore.getState().setCurrentStoreId(storeData.id);

      // Return success - email verification will be handled in dashboard
      return {
        success: true,
        needsEmailVerification: !authData.user.email_confirmed_at
      };
    } catch (err: any) {
      logger.error('Signup error', { err });
      return { error: err.message || 'Signup failed' };
    }
  };

  const updateStorePlan = async (newPlan: string) => {
    if (!store?.id) {
      logger.error('No store available to update plan');
      return;
    }

    try {
      // Update the plan in the database
      const { error } = await supabase
        .from('stores')
        .update({ plan: newPlan })
        .eq('id', store.id);

      if (error) {
        logger.error('Error updating store plan', { error });
        throw error;
      }

      // Update the local store state with the new plan
      updateStore(prev => prev ? { ...prev, plan: newPlan } : null);
      logger.debug(`Store plan updated to ${newPlan}`);
    } catch (error) {
      logger.error('Failed to update store plan', {}, error);
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
        logger.error('Error updating store slug', { error });
        throw error;
      }

      // Update the local store state with the new slug
      updateStore(prev => prev ? { ...prev, slug: finalSlug } : null);
      logger.debug(`Store slug updated to ${finalSlug}`);
      return finalSlug;
    } catch (error) {
      logger.error('Failed to update store slug', {}, error);
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
          logger.debug('Demo mode: Loaded demo store by ID', { storeName: storeData.name });
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
          logger.debug('Demo mode: Loaded demo store by slug', { storeName: storeData.name });
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
        logger.debug('Demo mode: Loaded store by email slug', { storeName: storeBySlug.name });
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
        logger.debug('Demo mode: Loaded omzetin store', { storeName: omzetinStore.name });
        return omzetinStore as Store;
      }

      logger.error('Demo mode: Could not find any demo store');
      logger.error('Tried demo store IDs', { demoStoreId: DEMO_STORE_ID, demoStoreSlug: DEMO_STORE_SLUG, emailSlug });
      return null;
    } catch (error) {
      logger.error('Failed to fetch store by email', { error });
      return null;
    }
  };

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.error('Error signing out from Supabase', { error });
    } finally {
      // Always clear local state
      useWarungStore.getState().resetStore();
      useWarungStore.getState().setCurrentStoreId(null);
      setUser(null);
      setSession(null);
      updateStore(null);
      setMustChangePassword(false);

      // Clear ALL storage to prevent data leakage, BUT preserve tour history and UI settings
      const keysToPreserve = Object.keys(localStorage).filter(key =>
        key.startsWith('has-seen-') ||
        key === 'onboarding-tours-disabled' ||
        key === 'vite-ui-theme' ||
        key === 'omzetin-theme'
      );
      const preservedData = keysToPreserve.map(key => ({ key, value: localStorage.getItem(key) }));

      localStorage.clear();
      sessionStorage.clear();

      // Restore preserved data
      preservedData.forEach(({ key, value }) => {
        if (value !== null) localStorage.setItem(key, value);
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
  }, []);

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
        logger.debug('Session expired due to inactivity');
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
  logger.debug('Current auth state', { user: !!user, session: !!session, store: !!store, generalIsAuthenticated, storeIsAuthenticated, loading });

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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}