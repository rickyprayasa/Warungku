import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWarungStore } from '@/lib/store';
import { useAdmin } from '@/contexts/AdminContext';
import { Loader2, CheckCircle2, Store, KeyRound, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { checkAdminAccess } = useAdmin();
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const [status, setStatus] = useState<'loading' | 'success' | 'needs_store' | 'error' | 'email_sent'>('loading');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [storeNameSaved, setStoreNameSaved] = useState('');

  useEffect(() => {
    // Check if we have state from RegisterPage
    const state = location.state as any;
    if (state?.needsConfirmation) {
      setStatus('email_sent');
      setEmail(state.email);
      setStoreName(state.storeName);
      return;
    }

    const handleAuthCallback = async () => {
      try {
        // Check if we have hash params from email confirmation
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          console.error('[AuthCallback] Error:', error, errorDescription);
          toast.error(errorDescription || 'Authentication failed');
          setStatus('error');
          return;
        }

        // If access token exists, we have a fresh login from email confirmation
        if (accessToken) {
          console.log('[AuthCallback] Processing email confirmation...');

          // Get current user with their metadata
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            toast.error('User not found');
            setStatus('error');
            return;
          }

          console.log('[AuthCallback] User:', user.id, 'email_confirmed:', user.email_confirmed_at);

          // Check if user has store
          const { data: storeData, error: storeError } = await (supabase
            .from('store_members') as any)
            .select('store_id')
            .eq('user_id', user.id)
            .single();

          if (storeError) {
            console.log('[AuthCallback] User has no store yet, needs to create one');
            setStatus('needs_store');
            // Get store name from user metadata
            if (user.user_metadata?.store_name) {
              setStoreNameSaved(user.user_metadata.store_name);
              setStoreName(user.user_metadata.store_name);
            }
          } else if (storeData?.store_id) {
            console.log('[AuthCallback] User has store:', storeData.store_id);
            // Fetch store details
            const { data: store } = await (supabase
              .from('stores') as any)
              .select('*')
              .eq('id', storeData.store_id)
              .single();

            if (store) {
              setCurrentStoreId(store.id);
              toast.success('Email berhasil dikonfirmasi!');
              setStatus('success');
              // Check if user is super admin before redirecting
              const isAdminUser = await checkAdminAccess();
              console.log('[AuthCallback] Is Admin result:', isAdminUser);
              setTimeout(() => {
                if (isAdminUser) {
                  console.log('[AuthCallback] Redirecting to /admin');
                  navigate('/admin');
                } else {
                  console.log('[AuthCallback] Redirecting to /dashboard');
                  navigate('/dashboard');
                }
              }, 2000);
            }
          }
        } else if (isAuthenticated) {
          // Already logged in, check admin status before redirect
          const isAdminUser = await checkAdminAccess();
          console.log('[AuthCallback] Already authenticated, is admin:', isAdminUser);
          if (isAdminUser) {
            console.log('[AuthCallback] Redirecting to /admin');
            navigate('/admin');
          } else {
            console.log('[AuthCallback] Redirecting to /dashboard');
            navigate('/dashboard');
          }
        } else {
          // No access token and not authenticated
          navigate('/login');
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        toast.error('Failed to process email confirmation');
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, [isAuthenticated, navigate, setCurrentStoreId, location.state, checkAdminAccess]);

  const handleCreateStore = async () => {
    if (!storeName || isCreating) return;

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // CRITICAL FIX: Check if user already has a store to prevent duplicates
      const { data: existingMember } = await (supabase
        .from('store_members') as any)
        .select('store_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (existingMember?.store_id) {
        console.log('[AuthCallback] User already has store, redirecting:', existingMember.store_id);
        setCurrentStoreId(existingMember.store_id);
        toast.success('Toko Anda sudah tersedia!');
        // Check if user is super admin before redirecting
        const isAdminUser = await checkAdminAccess();
        console.log('[AuthCallback] Is admin during store creation:', isAdminUser);
        if (isAdminUser) {
          console.log('[AuthCallback] Redirecting to /admin');
          navigate('/admin');
        } else {
          console.log('[AuthCallback] Redirecting to /dashboard');
          navigate('/dashboard');
        }
        return;
      }

      // Create store
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
        console.error('[AuthCallback] Store error:', storeError);
        toast.error(storeError.message || 'Gagal membuat toko');
        return;
      }

      console.log('[AuthCallback] Store created:', storeData.id);

      // Add user as owner
      const { error: memberError } = await (supabase
        .from('store_members') as any)
        .insert({
          store_id: storeData.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('[AuthCallback] Member error:', memberError);
        toast.error(memberError.message || 'Gagal menambahkan owner');
        return;
      }

      setCurrentStoreId(storeData.id);
      toast.success('Toko berhasil dibuat! Selamat datang!');
      // Check if user is super admin before redirecting
      const isAdminUser = await checkAdminAccess();
      console.log('[AuthCallback] Is admin after store creation:', isAdminUser);
      if (isAdminUser) {
        console.log('[AuthCallback] Redirecting to /admin');
        navigate('/admin');
      } else {
        console.log('[AuthCallback] Redirecting to /dashboard');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('[AuthCallback] Error creating store:', error);
      toast.error(error.message || 'Gagal membuat toko');
    } finally {
      setIsCreating(false);
    }
  };

  if (status === 'email_sent') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40 py-12 px-4">
        <div className="w-full max-w-md mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4">
              <MailCheck className="w-8 h-8 text-brand-black" />
            </div>
            <h1 className="text-3xl font-display font-bold text-brand-black mb-2">
              Cek Email Anda!
            </h1>
            <p className="font-mono text-muted-foreground text-sm">
              Kami telah mengirim link konfirmasi ke:
            </p>
            <p className="font-mono text-brand-black font-bold bg-yellow-50 border-2 border-yellow-200 p-2 rounded-none mt-2">
              {email}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-sm font-mono text-gray-600">
              Klik link di email untuk mengaktifkan akun Anda.
              Setelah dikonfirmasi, Anda akan otomatis diarahkan untuk membuat toko Anda.
            </p>
            <p className="text-xs font-mono text-gray-500">
              <strong>Tips:</strong><br />
              • Cek folder spam/junk<br />
              • Link email akan berlaku selama 1 jam
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-brand-black text-brand-white border-2 border-brand-black rounded-none font-bold uppercase"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Ke Halaman Login
            </Button>
            <Button
              onClick={() => {
                window.location.hash = '';
                window.location.reload();
              }}
              variant="outline"
              className="w-full border-2 border-brand-black rounded-none font-mono font-bold uppercase"
            >
              Sudah klik link email?
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="text-center p-8">
          <Loader2 className="w-16 h-16 mx-auto animate-spin text-brand-orange mb-6" />
          <h2 className="text-2xl font-display font-bold text-brand-black mb-2">
            Memproses Konfirmasi...
          </h2>
          <p className="font-mono text-muted-foreground">
            Mohon tunggu sebentar
          </p>
        </div>
      </div>
    );
  }

  if (status === 'needs_store') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40 py-12 px-4">
        <div className="w-full max-w-md mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 border-2 border-brand-black mb-4">
              <CheckCircle2 className="w-8 h-8 text-brand-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-brand-black mb-2">
              Email Terverifikasi!
            </h1>
            <p className="font-mono text-muted-foreground text-sm">
              Silakan lengkapi pembuatan toko Anda
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleCreateStore(); }} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="font-mono font-bold text-sm">Nama Toko</Label>
              <Input
                id="storeName"
                type="text"
                placeholder="Toko Saya"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                disabled={isCreating}
                className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
              />
              {storeNameSaved && storeName !== storeNameSaved && (
                <p className="text-xs text-gray-500 font-mono">
                  Sebelumnya: {storeNameSaved}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isCreating || !storeName}
              className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat Toko...
                </>
              ) : (
                <>
                  <Store className="w-4 h-4 mr-2" />
                  Buat Toko Sekarang
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40">
        <div className="text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 border-2 border-brand-black mb-4">
            <CheckCircle2 className="w-8 h-8 text-brand-white" />
          </div>
          <h2 className="text-2xl font-display font-bold text-brand-black mb-2">
            Email Berhasil Dikonfirmasi!
          </h2>
          <p className="font-mono text-muted-foreground mb-6">
            Mengalihkan ke dashboard...
          </p>
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-brand-orange" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40">
        <div className="text-center p-8 max-w-md">
          <KeyRound className="w-16 h-16 mx-auto text-red-500 mb-6" />
          <h2 className="text-2xl font-display font-bold text-brand-black mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="font-mono text-muted-foreground mb-6">
            Gagal memproses konfirmasi email. Silakan coba lagi atau hubungi support.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Ke Halaman Login
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full border-2 border-brand-black rounded-none font-mono font-bold uppercase"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
