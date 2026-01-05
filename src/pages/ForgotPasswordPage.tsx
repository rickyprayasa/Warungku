import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Determine redirect URL
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const redirectUrl = isLocalhost
                ? `${window.location.origin}/update-password`
                : 'https://omzetin.web.id/update-password';

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            setIsSuccess(true);
            toast.success('Link reset password telah dikirim ke email Anda');
        } catch (err: any) {
            console.error('Error resetting password:', err);
            setError(err.message || 'Gagal mengirim link reset password');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-muted/40 py-12 px-4">
                <div className="w-full max-w-sm mx-auto p-8 bg-brand-white border-4 border-brand-black shadow-hard text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 border-2 border-brand-black mb-4 rounded-full">
                        <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-brand-black mb-2">Cek Email Anda</h1>
                    <p className="font-mono text-muted-foreground mb-6">
                        Kami telah mengirimkan link untuk mereset kata sandi ke <strong>{email}</strong>.
                        Silakan cek inbox atau folder spam Anda.
                    </p>
                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full bg-brand-black text-brand-white border-2 border-brand-black rounded-none font-bold uppercase shadow-hard hover:bg-brand-orange hover:text-brand-black hover:shadow-hard-sm transition-all h-12"
                    >
                        Kembali ke Login
                    </Button>
                </div>
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
                    <h1 className="text-3xl font-display font-bold text-brand-black">Lupa Password</h1>
                    <p className="font-mono text-muted-foreground">
                        Masukkan email Anda untuk menerima link reset password.
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
                        <Label htmlFor="email" className="font-mono font-bold text-sm">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="nama@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                                    Mengirim...
                                </>
                            ) : (
                                'Kirim Link Reset'
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => navigate('/login')}
                            className="w-full font-mono text-sm hover:bg-transparent hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali ke Login
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
