import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Clock, RefreshCw } from 'lucide-react';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_MS = 60 * 1000;     // Show warning 1 minute before timeout

/**
 * IdleTimeoutOverlay
 * 
 * Monitors user activity (mouse, keyboard, touch, scroll).
 * After 10 minutes of inactivity, shows a full-screen overlay
 * prompting the user to re-login, preventing the app from
 * silently hanging due to expired/deadlocked sessions.
 */
export function IdleTimeoutOverlay() {
    const { isAuthenticated, signOut } = useAuth();
    const [isIdle, setIsIdle] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearAllTimers = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        idleTimerRef.current = null;
        warningTimerRef.current = null;
        countdownRef.current = null;
    }, []);

    const resetTimer = useCallback(() => {
        // Don't reset if already timed out
        if (isIdle) return;

        clearAllTimers();
        setShowWarning(false);
        setCountdown(60);

        // Set warning timer (fires 1 min before idle timeout)
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setCountdown(60);

            // Start countdown
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

        // Set idle timeout
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
            setShowWarning(false);
            clearAllTimers();
        }, IDLE_TIMEOUT_MS);
    }, [isIdle, clearAllTimers]);

    // Activity event listener
    useEffect(() => {
        if (!isAuthenticated) {
            clearAllTimers();
            setIsIdle(false);
            setShowWarning(false);
            return;
        }

        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];

        // Throttled reset - don't fire on every pixel of mouse movement
        let lastReset = Date.now();
        const throttledReset = () => {
            const now = Date.now();
            if (now - lastReset > 5000) { // Max once per 5 seconds
                lastReset = now;
                resetTimer();
            }
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, throttledReset, { passive: true });
        });

        // Start initial timer
        resetTimer();

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, throttledReset);
            });
            clearAllTimers();
        };
    }, [isAuthenticated, resetTimer, clearAllTimers]);

    const handleRelogin = async () => {
        try {
            // Clear all Supabase auth tokens
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    localStorage.removeItem(key);
                }
            }
            await signOut();
        } catch {
            // Force redirect even if signOut fails
        }
        window.location.href = '/login';
    };

    const handleContinue = () => {
        setIsIdle(false);
        setShowWarning(false);
        setCountdown(60);
        // Try refreshing the page to get a fresh session
        window.location.reload();
    };

    // Warning toast (1 minute before timeout)
    if (showWarning && isAuthenticated && !isIdle) {
        return (
            <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="bg-yellow-50 border-4 border-yellow-500 shadow-hard p-4 max-w-sm">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-display font-bold text-sm text-yellow-800">
                                Sesi Akan Berakhir
                            </p>
                            <p className="font-mono text-xs text-yellow-700 mt-1">
                                Anda tidak aktif selama beberapa menit. Sesi akan ditutup dalam <span className="font-bold text-yellow-900">{countdown} detik</span>.
                            </p>
                            <button
                                onClick={() => {
                                    setShowWarning(false);
                                    setIsIdle(false);
                                    resetTimer();
                                }}
                                className="mt-2 px-3 py-1.5 bg-yellow-500 text-brand-black border-2 border-yellow-700 font-mono font-bold text-xs hover:bg-yellow-400 transition-colors"
                            >
                                Saya Masih Di Sini
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Full-screen idle overlay
    if (isIdle && isAuthenticated) {
        return (
            <div className="fixed inset-0 z-[9999] bg-brand-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-brand-white border-4 border-brand-black shadow-hard p-8 max-w-sm w-full text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4">
                        <Clock className="w-8 h-8 text-brand-black" />
                    </div>

                    <h2 className="text-2xl font-display font-bold text-brand-black mb-2">
                        Sesi Tidak Aktif
                    </h2>
                    <p className="font-mono text-sm text-muted-foreground mb-6">
                        Anda tidak aktif selama 10 menit. Demi keamanan, silakan login ulang atau refresh halaman.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleRelogin}
                            className="w-full flex items-center justify-center gap-2 bg-brand-orange text-brand-black border-2 border-brand-black font-bold uppercase py-3 px-6 shadow-hard hover:bg-brand-black hover:text-brand-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                        >
                            <LogIn className="w-4 h-4" />
                            Login Ulang
                        </button>

                        <button
                            onClick={handleContinue}
                            className="w-full flex items-center justify-center gap-2 bg-white text-brand-black border-2 border-brand-black font-bold uppercase py-3 px-6 hover:bg-gray-100 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh & Lanjutkan
                        </button>
                    </div>

                    <p className="font-mono text-[10px] text-muted-foreground mt-4">
                        Fitur ini melindungi akun Anda dari sesi yang tidak aktif.
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
