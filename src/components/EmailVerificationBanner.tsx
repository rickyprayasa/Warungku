import { useState, useEffect } from 'react';
import { AlertTriangle, Mail, X, Loader2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function EmailVerificationBanner() {
    const { user } = useAuth();
    const [isResending, setIsResending] = useState(false);
    const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isDismissed, setIsDismissed] = useState(() => {
        // Check localStorage for persistent dismissal (per user)
        if (typeof window !== 'undefined' && user?.id) {
            return localStorage.getItem(`email_banner_dismissed_${user.id}`) === 'true';
        }
        return false;
    });

    // Debug log
    useEffect(() => {
        console.log('[EmailVerificationBanner] State:', {
            hasUser: !!user,
            userId: user?.id,
            email: user?.email,
            emailConfirmedAt: user?.email_confirmed_at,
            isDismissed
        });
    }, [user, isDismissed]);

    const handleDismiss = () => {
        setIsDismissed(true);
        if (user?.id) {
            localStorage.setItem(`email_banner_dismissed_${user.id}`, 'true');
        }
    };

    // Don't show if user is not logged in or email is already confirmed
    if (!user || user.email_confirmed_at || isDismissed) {
        return null;
    }

    const handleResendVerification = async () => {
        if (!user.email) return;

        setIsResending(true);
        setResendStatus('idle');

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                console.error('Error resending verification email:', error);
                setResendStatus('error');
            } else {
                setResendStatus('success');
            }
        } catch (err) {
            console.error('Error resending verification email:', err);
            setResendStatus('error');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <Alert className="mb-4 border-2 border-yellow-500 bg-yellow-50 relative">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <AlertDescription className="text-sm font-mono text-yellow-800">
                        <strong>Email belum terverifikasi</strong>
                        <p className="mt-1">
                            Silakan verifikasi email Anda ({user.email}) untuk keamanan akun.
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleResendVerification}
                                disabled={isResending || resendStatus === 'success'}
                                className="border-yellow-600 text-yellow-800 hover:bg-yellow-100"
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Mengirim...
                                    </>
                                ) : resendStatus === 'success' ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Email terkirim!
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Kirim ulang email verifikasi
                                    </>
                                )}
                            </Button>

                            {resendStatus === 'error' && (
                                <span className="text-xs text-red-600">
                                    Gagal mengirim. Coba lagi nanti.
                                </span>
                            )}

                            {resendStatus === 'success' && (
                                <span className="text-xs text-green-600">
                                    Cek inbox atau folder spam Anda.
                                </span>
                            )}
                        </div>
                    </AlertDescription>
                </div>

                <button
                    onClick={handleDismiss}
                    className="text-yellow-600 hover:text-yellow-800 p-1 flex-shrink-0"
                    aria-label="Tutup"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </Alert>
    );
}
