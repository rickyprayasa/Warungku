/**
 * Global session event emitter.
 * Allows non-React code (e.g. Zustand store) to signal session expiry
 * so that React components (SessionProvider) can show the re-login modal.
 */

type SessionEventHandler = () => void;

const listeners: Set<SessionEventHandler> = new Set();
let lastEmitTime = 0;
const DEBOUNCE_MS = 3000; // Don't fire more than once per 3 seconds

export const sessionEvents = {
    /** Subscribe to session expired events */
    onSessionExpired(handler: SessionEventHandler): () => void {
        listeners.add(handler);
        return () => listeners.delete(handler);
    },

    /** Emit session expired event (debounced) */
    emitSessionExpired() {
        const now = Date.now();
        if (now - lastEmitTime < DEBOUNCE_MS) return;
        lastEmitTime = now;

        console.warn('[sessionEvents] Session expired event emitted');
        listeners.forEach(fn => {
            try { fn(); } catch (e) { console.error('[sessionEvents] Handler error:', e); }
        });
    },

    /** Check if an error looks like an auth/session error */
    isAuthError(error: any): boolean {
        if (!error) return false;
        const msg = (error.message || error.msg || '').toLowerCase();
        const code = error.code || '';
        return (
            msg.includes('jwt') ||
            msg.includes('token') ||
            msg.includes('session expired') ||
            msg.includes('refresh_token') ||
            msg.includes('invalid claim') ||
            msg.includes('not authenticated') ||
            msg.includes('unauthorized') ||
            code === 'PGRST301' ||
            code === '401' ||
            error.status === 401 ||
            error.status === 403
        );
    }
};
