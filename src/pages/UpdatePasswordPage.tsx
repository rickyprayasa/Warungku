import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function UpdatePasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSessionCheckLoading, setIsSessionCheckLoading] = useState(true);

    useEffect(() => {
        // Check if we have a valid session (recovery link logs user in automatically)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, maybe the link is invalid or expired
                setError('Link reset password tidak valid atau sudah kadaluarsa.');
            }
            setIsSessionCheckLoading(false);
        };

        checkSession();

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // This event is fired when user clicks the recovery link
                setIsSessionCheckLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Konfirmasi kata sandi tidak cocok');
            return;
        }

        if (password.length < 6) {
            setError('Kata sandi minimal 6 karakter');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success('Kata sandi berhasil diperbarui');

            // Redirect to login or dashboard
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err: any) {
            console.error('Error updating password:', err);
            setError(err.message || 'Gagal memperbarui kata sandi');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSessionCheckLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40 py-12 px-4">
            <div className="w-full max-w-sm mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4">
                        <KeyRound className="w-8 h-8 text-brand-black" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-brand-black">Password Baru</h1>
                    <p className="font-mono text-muted-foreground">
                        Masukkan kata sandi baru Anda.
                    </p>
                </div>

                {error && (
                    <Alert className="mb-6 border-2 border-red-500 bg-red-50">
                        <AlertDescription className="text-sm font-mono text-red-800">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="font-mono font-bold text-sm">Kata Sandi Baru</Label>
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

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="font-mono font-bold text-sm">Konfirmasi Kata Sandi</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                                Menyimpan...
                            </>
                        ) : (
                            'Simpan Password Baru'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
