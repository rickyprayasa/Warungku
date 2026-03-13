/**
 * Logging configuration — initializes transports based on environment.
 *
 * Call `initLogging()` once at app startup (e.g., in main.tsx).
 */
import {
    Logger,
    ConsoleTransport,
    ErrorReporterTransport,
} from './Logger';

let initialized = false;

/**
 * Initialise the logging system. Safe to call multiple times; only the
 * first call takes effect.
 */
export function initLogging(): void {
    if (initialized) return;
    initialized = true;

    const isDev = import.meta.env.DEV;

    // ── Console transport (always, but level differs) ──
    Logger.addTransport(
        new ConsoleTransport(isDev ? 'debug' : 'warn'),
    );

    // ── ErrorReporter transport (production only — sends errors to /api/client-errors) ──
    if (!isDev) {
        Logger.addTransport(new ErrorReporterTransport());
    }

    // ── Global log level ──
    Logger.setLevel(isDev ? 'debug' : 'info');

    // ── Future: Sentry transport ──
    // if (import.meta.env.VITE_SENTRY_DSN) {
    //   Logger.addTransport(new SentryTransport(import.meta.env.VITE_SENTRY_DSN));
    // }

    // ── Future: LogRocket transport ──
    // if (import.meta.env.VITE_LOGROCKET_APP_ID) {
    //   Logger.addTransport(new LogRocketTransport(import.meta.env.VITE_LOGROCKET_APP_ID));
    // }
}
