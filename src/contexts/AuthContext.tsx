import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserStore = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('store_members')
        .select(`
          store_id,
          role,
          stores (*)
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching store:', error);
        return null;
      }

      if (data?.stores) {
        const storeData = data.stores as unknown as Store;
        setStore(storeData);
        return storeData;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch user store:', err);
      return null;
    }
  }, []);

  const refreshStore = useCallback(async () => {
    if (user?.id) {
      await fetchUserStore(user.id);
    }
  }, [user?.id, fetchUserStore]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserStore(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserStore(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setStore(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserStore]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        await fetchUserStore(data.user.id);
      }

      return {};
    } catch (err: any) {
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setStore(null);
  };

  const value: AuthContextType = {
    user,
    session,
    store,
    storeId: store?.id ?? null,
    loading,
    isAuthenticated: !!user && !!store,
    signIn,
    signUp,
    signOut,
    refreshStore,
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
