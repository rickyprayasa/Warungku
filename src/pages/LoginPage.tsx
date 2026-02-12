import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { KeyRound, Loader2, UserPlus, Eye, EyeOff, ShieldAlert, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWarungStore } from '@/lib/store';

import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, isAuthenticated, store } = useAuth();
  const { checkAdminAccess } = useAdmin();
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Staff warning modal state
  const [showStaffWarning, setShowStaffWarning] = useState(false);
  const [staffStoreName, setStaffStoreName] = useState('');
  const [staffStoreSlug, setStaffStoreSlug] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    const checkAndRedirect = async () => {
      console.log('[LoginPage] Auth check - isAuthenticated:', isAuthenticated, 'store:', !!store);

      if (isAuthenticated) {
        console.log('[LoginPage] User authenticated, checking admin access...');

        try {
          // Check admin status explicitly
          const isAdminUser = await checkAdminAccess();
          console.log('[LoginPage] Is Admin result:', isAdminUser);

          if (isAdminUser) {
            console.log('[LoginPage] Redirecting to /admin');
            navigate('/admin');
            return;
          }

          // Redirect logic based on role
          console.log('[LoginPage] Redirecting logic...');

          // 1. If Owner (has store in auth context), go to dashboard
          if (store) {
            console.log('[LoginPage] Owner logged in, redirecting to dashboard');
            setCurrentStoreId(store.id);
            navigate('/dashboard');
            return;
          }

          // 2. If not Owner, check if Member
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            const { data: membership } = await supabase
              .from('store_members')
              .select('store_id, role, stores(slug, name)')
              .eq('user_id', user.id)
              .limit(1)
              .maybeSingle();

            // Check if they are actually the OWNER
            const isOwner = membership?.role === 'owner';

            if (isOwner && membership) {
              console.log('[LoginPage] User is owner (direct check), allowing access');
              setCurrentStoreId(membership.store_id);
              navigate('/dashboard');
              return;
            }

            if (membership) {
              console.log('[LoginPage] User is staff, blocking access to main login');
              // Is Staff. Block access.
              await supabase.auth.signOut();

              // @ts-ignore
              const storeName = membership.stores?.name || 'Toko Anda';
              // @ts-ignore
              const storeSlug = membership.stores?.slug || '';

              // Show modal dialog instead of error text
              setStaffStoreName(storeName);
              setStaffStoreSlug(storeSlug);
              setShowStaffWarning(true);
              return;
            }
          }

          // 3. New User (No store, no membership) -> Dashboard (Onboarding)
          console.log('[LoginPage] New user/No store, redirecting to dashboard');
          navigate('/dashboard');
        } catch (e) {
          console.error('[LoginPage] Error checking admin access:', e);
        }
      }
    };

    // Check for error hash in URL (e.g. from expired reset link)
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1)); // remove #
      const errorDescription = params.get('error_description');
      const errorCode = params.get('error_code');

      if (errorDescription) {
        // Translate common errors
        let message = errorDescription.replace(/\+/g, ' ');
        if (errorCode === 'otp_expired') {
          message = 'Link reset password sudah kadaluarsa atau sudah digunakan. Silakan minta link baru.';
        }
        setError(message);
        // Clear hash to prevent showing error on refresh
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // Delay the redirect check to prevent race conditions with auth state initialization
    const timer = setTimeout(() => {
      checkAndRedirect();
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, store, navigate, setCurrentStoreId, checkAdminAccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      }
      // Navigation will happen via useEffect when isAuthenticated changes
    } catch (err: any) {
      setError(err.message || 'Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  const staffLoginUrl = staffStoreSlug ? `${window.location.origin}/${staffStoreSlug}/login` : '';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40 py-12 px-4">
      {/* Staff Warning Modal Dialog */}
      <Dialog open={showStaffWarning} onOpenChange={setShowStaffWarning}>
        <DialogContent className="sm:max-w-md border-4 border-brand-black bg-brand-white rounded-none shadow-hard p-0 overflow-hidden">
          <div className="bg-amber-500 p-4 border-b-4 border-brand-black">
            <DialogHeader>
              <DialogTitle className="font-display font-black text-xl text-brand-black uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-6 h-6" />
                Akses Ditolak
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="font-mono text-sm text-brand-black">
              Akun ini terdaftar sebagai <strong className="text-red-600">Staff / Kasir</strong> di toko <strong className="text-brand-orange">{staffStoreName}</strong>.
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              Halaman ini khusus untuk <strong>Pemilik Toko</strong>. Silakan login melalui link khusus toko Anda:
            </p>
            {staffStoreSlug && (
              <div className="bg-gray-100 border-2 border-brand-black p-3">
                <p className="font-mono text-xs text-muted-foreground mb-1">Link Login Toko:</p>
                <p className="font-mono text-sm font-bold text-brand-black break-all">{staffLoginUrl}</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 pt-0 flex flex-col gap-2 sm:flex-col">
            {staffStoreSlug && (
              <Button
                onClick={() => navigate(`/${staffStoreSlug}/login`)}
                className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-mono font-bold uppercase hover:bg-brand-black hover:text-brand-white transition-all h-11"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Login ke {staffStoreName}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowStaffWarning(false)}
              className="w-full border-2 border-brand-black rounded-none font-mono font-bold uppercase hover:bg-gray-100 transition-all h-11"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-sm mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4">
            <KeyRound className="w-8 h-8 text-brand-black" />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-black">Akses Admin</h1>
          <p className="font-mono text-muted-foreground">Masukkan kredensial untuk mengelola Omzetin.</p>
        </div>

        {error && (
          <Alert className="mb-6 border-2 border-red-500 bg-red-50">
            <AlertDescription className="text-sm font-mono text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono font-bold text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@omzetin.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-mono font-bold text-sm">Kata Sandi</Label>
              <Button
                variant="link"
                className="p-0 h-auto font-mono text-xs text-brand-orange hover:text-brand-black"
                onClick={() => navigate('/forgot-password')}
                type="button"
              >
                Lupa Password?
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                'Masuk'
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-brand-white px-2 text-muted-foreground font-mono">
                  Atau masuk dengan
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true);
                await signInWithGoogle();
                // Redirect happens via OAuth callback
              }}
              className="w-full border-2 border-brand-black rounded-none font-bold text-sm hover:bg-gray-50 h-12 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>

            <Button
              type="button"
              disabled={isLoading}
              onClick={() => navigate('/register')}
              className="w-full bg-brand-black text-brand-white border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-orange hover:text-brand-black hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Daftar Akun Baru
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full border-2 border-brand-black rounded-none font-mono font-bold uppercase text-sm hover:bg-gray-100 h-12"
            >
              Kembali ke Menu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}