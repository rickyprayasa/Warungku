import { useWarungStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
export function LoginPage() {
  const navigate = useNavigate();
  const login = useWarungStore((state) => state.login);
  const { t } = useTranslation();
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    navigate('/dashboard');
  };
  return (
    <div className="flex items-center justify-center h-[calc(100vh-168px)] bg-muted/40">
      <div className="w-full max-w-sm mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4">
            <KeyRound className="w-8 h-8 text-brand-black" />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-black">{t('loginPage.title')}</h1>
          <p className="font-mono text-muted-foreground">{t('loginPage.subtitle')}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono font-bold text-sm">{t('loginPage.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@warungos.com"
              defaultValue="admin@warungos.com"
              className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password"  className="font-mono font-bold text-sm">{t('loginPage.passwordLabel')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              defaultValue="password"
              className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
          >
            {t('loginPage.loginButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}