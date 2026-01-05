import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2, UserCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWarungStore } from '@/lib/store';

import { useAdmin } from '@/contexts/AdminContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, store } = useAuth();
  const { checkAdminAccess } = useAdmin();
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

          // Only redirect to dashboard if store exists
          if (store) {
            console.log('[LoginPage] Redirecting to /dashboard');
            setCurrentStoreId(store.id);
            navigate('/dashboard');
          } else {
            console.log('[LoginPage] No store found, staying on login page (unless admin)');
          }
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

  const handleDemoLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('demo@omzetin.com', 'omzetindemo');
      if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan akun demo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40 py-12 px-4">
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
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
            />
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

            <Button
              type="button"
              disabled={isLoading}
              onClick={handleDemoLogin}
              className="w-full bg-brand-black text-brand-white border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-orange hover:text-brand-black hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Masuk dengan Akun Demo
                </>
              )}
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