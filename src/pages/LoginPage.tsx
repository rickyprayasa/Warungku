import { useWarungStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api-client';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useWarungStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      login(); // Set authenticated state in store
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-[calc(100vh-168px)] bg-muted/40">
      <div className="w-full max-w-sm mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4">
            <KeyRound className="w-8 h-8 text-brand-black" />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-black">Akses Admin</h1>
          <p className="font-mono text-muted-foreground">Masukkan kredensial untuk mengelola Warungku.</p>
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
              placeholder="admin@warungku.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-mono font-bold text-sm">Kata Sandi</Label>
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
        </form>
      </div>
    </div>
  );
}