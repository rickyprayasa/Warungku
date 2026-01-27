import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LogIn, RefreshCw, AlertTriangle } from 'lucide-react';

interface SessionContextType {
    showReLoginModal: () => void;
    isSessionValid: boolean;
    lastActivity: number;
    refreshSession: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [isSessionValid, setIsSessionValid] = useState(true);

    // Update last activity on user interaction
    const updateActivity = useCallback(() => {
        setLastActivity(Date.now());
    }, []);

    // Listen for user activity
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity);
            });
        };
    }, [updateActivity]);

    // Check session validity periodically
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Only show modal if user was previously authenticated and is on a protected route
                const isProtectedRoute = !window.location.pathname.startsWith('/') ||
                    ['/dashboard', '/pos', '/opname'].some(route => window.location.pathname.startsWith(route));

                if (isProtectedRoute && !isModalOpen) {
                    setIsSessionValid(false);
                    setIsModalOpen(true);
                }
            } else {
                setIsSessionValid(true);

                // Check if session is about to expire (within 5 minutes)
                const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
                const timeUntilExpiry = expiresAt - Date.now();

                if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
                    // Try to refresh token
                    const { error } = await supabase.auth.refreshSession();
                    if (error) {
                        console.warn('[Session] Failed to refresh session:', error);
                    } else {
                        console.log('[Session] Session refreshed successfully');
                    }
                }
            }
        };

        // Check on mount
        checkSession();

        // Check periodically
        const interval = setInterval(checkSession, ACTIVITY_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [isModalOpen]);

    // Auto refresh session when user is active
    useEffect(() => {
        const refreshIfActive = async () => {
            const timeSinceActivity = Date.now() - lastActivity;

            // If user was active in the last hour, keep session alive
            if (timeSinceActivity < SESSION_TIMEOUT_MS) {
                try {
                    await supabase.auth.refreshSession();
                } catch (err) {
                    console.warn('[Session] Auto-refresh failed:', err);
                }
            }
        };

        const interval = setInterval(refreshIfActive, 30 * 60 * 1000); // Refresh every 30 minutes
        return () => clearInterval(interval);
    }, [lastActivity]);

    const showReLoginModal = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    const refreshSession = useCallback(async (): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
                setIsSessionValid(false);
                setIsModalOpen(true);
                return false;
            }
            setIsSessionValid(true);
            return true;
        } catch (err) {
            setIsSessionValid(false);
            setIsModalOpen(true);
            return false;
        }
    }, []);

    const handleReLogin = async () => {
        if (!email.trim() || !password.trim()) {
            toast.error('Email dan password harus diisi');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim(),
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            toast.success('Berhasil login kembali!');
            setIsSessionValid(true);
            setIsModalOpen(false);
            setEmail('');
            setPassword('');

            // Refresh the page data
            window.location.reload();
        } catch (err) {
            toast.error('Gagal login. Coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshSession = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
                toast.error('Session tidak dapat diperpanjang. Silakan login kembali.');
                return;
            }

            toast.success('Session berhasil diperpanjang!');
            setIsSessionValid(true);
            setIsModalOpen(false);
        } catch (err) {
            toast.error('Gagal memperpanjang session.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SessionContext.Provider value={{ showReLoginModal, isSessionValid, lastActivity, refreshSession }}>
            {children}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md rounded-none border-4 border-brand-black bg-brand-white">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Session Berakhir
                        </DialogTitle>
                        <DialogDescription className="font-mono text-sm">
                            Session Anda telah berakhir. Silakan login kembali untuk melanjutkan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="relogin-email" className="font-mono text-sm font-bold">Email</Label>
                            <Input
                                id="relogin-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="rounded-none border-2 border-brand-black font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && handleReLogin()}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="relogin-password" className="font-mono text-sm font-bold">Password</Label>
                            <Input
                                id="relogin-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="rounded-none border-2 border-brand-black font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && handleReLogin()}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={handleRefreshSession}
                                variant="outline"
                                disabled={isLoading}
                                className="flex-1 rounded-none border-2 border-brand-black font-mono font-bold"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Coba Refresh
                            </Button>
                            <Button
                                onClick={handleReLogin}
                                disabled={isLoading}
                                className="flex-1 rounded-none bg-brand-orange text-brand-black border-2 border-brand-black font-mono font-bold shadow-hard hover:shadow-hard-sm"
                            >
                                <LogIn className="w-4 h-4 mr-2" />
                                Login
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}

// Helper hook to wrap API calls with session check
export function useSessionProtectedAction() {
    const { refreshSession, showReLoginModal } = useSession();

    const protectedAction = useCallback(
        async function <T>(action: () => Promise<T>): Promise<T | null> {
            try {
                return await action();
            } catch (error: any) {
                // Check if error is auth-related
                if (
                    error?.message?.includes('JWT') ||
                    error?.message?.includes('token') ||
                    error?.message?.includes('session') ||
                    error?.message?.includes('401') ||
                    error?.message?.includes('unauthorized') ||
                    error?.code === 'PGRST301'
                ) {
                    const refreshed = await refreshSession();
                    if (refreshed) {
                        // Retry the action
                        return await action();
                    } else {
                        showReLoginModal();
                        return null;
                    }
                }
                throw error;
            }
        },
        [refreshSession, showReLoginModal]
    );

    return protectedAction;
}
