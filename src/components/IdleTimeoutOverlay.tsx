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
 * 
 * Uses real timestamps (Date.now()) instead of setTimeout to
 * avoid issues with browser throttling timers in background tabs.
 */
export function IdleTimeoutOverlay() {
    const { isAuthenticated, signOut } = useAuth();
    const [isIdle, setIsIdle] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);

    // Use refs for real timestamps instead of relying on setTimeout
    const lastActivityRef = useRef(Date.now());
    const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Record user activity with throttling
    const recordActivity = useCallback(() => {
        lastActivityRef.current = Date.now();

        // If warning is showing and user interacts, dismiss it
        if (showWarning) {
            setShowWarning(false);
            setCountdown(60);
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
        }
    }, [showWarning]);

    // Activity event listeners
    useEffect(() => {
        if (!isAuthenticated) {
            setIsIdle(false);
            setShowWarning(false);
            return;
        }

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

        // Throttle to max once per 3 seconds to avoid perf issues
        let lastRecorded = 0;
        const throttledRecord = () => {
            const now = Date.now();
            if (now - lastRecorded > 3000) {
                lastRecorded = now;
                recordActivity();
            }
        };

        // Also record activity on mousemove but with heavier throttle (10s)
        let lastMouseMove = 0;
        const throttledMouseMove = () => {
            const now = Date.now();
            if (now - lastMouseMove > 10000) {
                lastMouseMove = now;
                recordActivity();
            }
        };

        events.forEach(event => {
            window.addEventListener(event, throttledRecord, { passive: true });
        });
        window.addEventListener('mousemove', throttledMouseMove, { passive: true });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, throttledRecord);
            });
            window.removeEventListener('mousemove', throttledMouseMove);
        };
    }, [isAuthenticated, recordActivity]);

    // Check idle status using real timestamps (runs every 15 seconds)
    // This approach is immune to browser timer throttling in background tabs
    useEffect(() => {
        if (!isAuthenticated || isIdle) {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            return;
        }

        checkIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;

            if (elapsed >= IDLE_TIMEOUT_MS) {
                // Full timeout reached
                setIsIdle(true);
                setShowWarning(false);
                if (countdownRef.current) clearInterval(countdownRef.current);
                if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            } else if (elapsed >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS && !showWarning) {
                // Warning threshold reached
                setShowWarning(true);
                const remaining = Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000);
                setCountdown(remaining);

                // Start countdown based on real time
                if (countdownRef.current) clearInterval(countdownRef.current);
                countdownRef.current = setInterval(() => {
                    const nowElapsed = Date.now() - lastActivityRef.current;
                    const timeLeft = Math.ceil((IDLE_TIMEOUT_MS - nowElapsed) / 1000);
                    if (timeLeft <= 0) {
                        setIsIdle(true);
                        setShowWarning(false);
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
                    } else {
                        setCountdown(timeLeft);
                    }
                }, 1000);
            }
        }, 15000); // Check every 15 seconds

        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [isAuthenticated, isIdle, showWarning]);

    // Also check on tab visibility change (user returns to tab)
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleVisibility = () => {
            if (document.visibilityState !== 'visible') return;

            const elapsed = Date.now() - lastActivityRef.current;
            if (elapsed >= IDLE_TIMEOUT_MS) {
                setIsIdle(true);
                setShowWarning(false);
            }
            // Do NOT show warning just because the tab became visible.
            // The regular interval check handles that.
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isAuthenticated]);

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
        lastActivityRef.current = Date.now();
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
                                    recordActivity();
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
