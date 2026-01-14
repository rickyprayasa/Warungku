import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Store, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWarungStore } from '@/lib/store';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated } = useAuth();
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validatePassword = () => {
    if (password.length < 6) {
      setPasswordError('Password minimal 6 karakter');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('Password tidak sama');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPasswordError('');

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password, storeName);
      if (result.error) {
        setError(result.error);
      } else if ((result as any).success) {
        // Registration successful - navigate to dashboard
        // Email verification banner will be shown there if needed
        navigate('/dashboard');
      } else {
        // Fallback - navigate to dashboard anyway
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message?.includes('email') || err.message?.includes('confirmation')) {
        setError('Terjadi kesalahan. Silakan coba lagi atau hubungi support.');
      } else {
        setError(err.message || 'Gagal mendaftar akun baru');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40 py-12 px-4">
      <div className="w-full max-w-md mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4">
            <Store className="w-8 h-8 text-brand-black" />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-black">Daftar Akun Baru</h1>
          <p className="font-mono text-muted-foreground text-sm mt-2">
            Gratis! Dapatkan akun dengan fitur terbatas
          </p>
        </div>

        <div className="p-3 bg-yellow-50 border-2 border-yellow-200 mb-6">
          <p className="text-xs font-mono text-yellow-800">
            <strong>Mode Free - Fitur Terbatas:</strong><br />
            • Maksimal 50 produk<br />
            • Dasbor dengan analytics sederhana<br />
            • Tanpa fitur analitik lanjutan<br />
            • Tanpa custom branding
          </p>
        </div>

        {success && (
          <Alert className="mb-6 border-2 border-green-500 bg-green-50">
            <AlertDescription className="text-sm font-mono text-green-800">
              ✅ {success}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-2 border-red-500 bg-red-50">
            <AlertDescription className="text-sm font-mono text-red-800">
              {error}
              {error.toLowerCase().includes('email') && (
                <>
                  <br /><br />
                  <strong>Solusi:</strong> Hubungi admin untuk konfigurasi email server di Supabase Dashboard atau disable email confirmation.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {passwordError && (
          <Alert className="mb-6 border-2 border-yellow-500 bg-yellow-50">
            <AlertDescription className="text-sm font-mono text-yellow-800">
              {passwordError}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="storeName" className="font-mono font-bold text-sm">Nama Toko</Label>
            <Input
              id="storeName"
              type="text"
              placeholder="Toko Saya"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono font-bold text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-mono font-bold text-sm">Password</Label>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (confirmPassword) setPasswordError('');
                }}
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-mono font-bold text-sm">Konfirmasi Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                required
                disabled={isLoading}
                className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mendaftar...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Daftar Akun Gratis
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/login')}
            className="w-full border-2 border-brand-black rounded-none font-mono font-bold uppercase text-sm hover:bg-gray-100 h-12"
          >
            Sudah punya akun? Masuk
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full text-brand-orange hover:bg-gray-50 font-mono text-sm h-10"
          >
            Kembali ke Menu
          </Button>
        </form>
      </div>
    </div>
  );
}
