/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LogIn, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { offlineSync } from '@/lib/offline-sync';
import { useWarungStore } from '@/lib/store-supabase';
import { sessionEvents } from '@/lib/session-events';
import { Logger } from '@/infrastructure/logging/Logger';

const logger = Logger.create('Session');

interface SessionContextType {
    showReLoginModal: () => void;
    isSessionValid: boolean;
    isModalOpen: boolean;
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

    // Listen for global session expired events (from store-supabase.ts)
    useEffect(() => {
        const unsubscribe = sessionEvents.onSessionExpired(() => {
            logger.warn('Received session expired event from store');

            // Only show modal on explicitly protected routes
            const path = window.location.pathname;
            const isProtectedRoute = ['/dashboard', '/pos', '/admin', '/opname', '/upgrade'].some(route => path.startsWith(route));

            setIsSessionValid(false);

            if (isProtectedRoute) {
                setIsModalOpen(true);
            }
        });
        return unsubscribe;
    }, []);

    // Check session on tab visibility change (user returns after idle)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                logger.debug('Tab became visible, checking session...');
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                        // Try refresh before showing modal
                        const { data, error } = await supabase.auth.refreshSession();
                        if (error || !data.session) {
                            logger.warn('Session invalid on tab return');
                            const path = window.location.pathname;
                            const isProtectedRoute = ['/dashboard', '/pos', '/admin', '/opname', '/upgrade'].some(route => path.startsWith(route));
                            setIsSessionValid(false);
                            if (isProtectedRoute) {
                                setIsModalOpen(true);
                            }
                        } else {
                            setIsSessionValid(true);
                        }
                    } else {
                        // Check if about to expire
                        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
                        const timeUntilExpiry = expiresAt - Date.now();
                        if (timeUntilExpiry < 10 * 60 * 1000) { // Less than 10 minutes
                            await supabase.auth.refreshSession();
                        }
                        setIsSessionValid(true);
                    }
                } catch (err) {
                    logger.error('Error checking session on visibility', {}, err);
                    const path = window.location.pathname;
                    const isProtectedRoute = ['/dashboard', '/pos', '/admin', '/opname', '/upgrade'].some(route => path.startsWith(route));
                    setIsSessionValid(false);
                    if (isProtectedRoute) {
                        setIsModalOpen(true);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Check session validity periodically
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Only show modal if user was previously authenticated and is on a protected route
                const path = window.location.pathname;
                const isProtectedRoute = ['/dashboard', '/pos', '/admin', '/opname', '/upgrade'].some(route => path.startsWith(route));

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
                        logger.warn('Failed to refresh session', {}, error);
                    } else {
                        logger.info('Session refreshed successfully');
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
                    logger.warn('Auto-refresh failed', {}, err);
                }
            }
        };

        const interval = setInterval(refreshIfActive, 30 * 60 * 1000); // Refresh every 30 minutes
        return () => clearInterval(interval);
    }, [lastActivity]);

    // Offline Sync - Listen for online events and sync queue
    useEffect(() => {
        const handleOnline = async () => {
            logger.info('Online detected, checking for pending items...');
            const pendingCount = offlineSync.getPendingCount();

            if (pendingCount > 0) {
                toast.info(`Menemukan ${pendingCount} data offline. Menyinkronkan...`, {
                    icon: <Wifi className="w-4 h-4" />,
                    duration: 3000
                });

                try {
                    // Get the store and process the queue
                    const { processOfflineQueue } = useWarungStore.getState();
                    await processOfflineQueue();

                    toast.success('Sinkronisasi offline berhasil!', {
                        icon: <Wifi className="w-4 h-4" />,
                    });
                } catch (error) {
                    logger.error('Offline sync failed', {}, error);
                    toast.error('Gagal menyinkronkan data offline. Coba lagi nanti.');
                }
            }
        };

        const handleOffline = () => {
            logger.info('Offline detected');
            toast.warning('Anda sedang offline. Data akan disimpan secara lokal.', {
                icon: <WifiOff className="w-4 h-4" />,
                duration: 3000
            });
        };

        // Listen for online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for pending items on mount (for users returning to the app)
        const checkPendingOnMount = async () => {
            const pendingCount = offlineSync.getPendingCount();
            if (pendingCount > 0 && navigator.onLine) {
                logger.info('Found pending items on mount, syncing...');
                await handleOnline();
            }
        };

        checkPendingOnMount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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
        <SessionContext.Provider value={{ showReLoginModal, isSessionValid, isModalOpen, lastActivity, refreshSession }}>
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
