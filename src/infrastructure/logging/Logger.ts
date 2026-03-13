/**
 * Structured Logger with pluggable transports.
 *
 * Usage:
 *   import { Logger } from '@/infrastructure/logging/Logger';
 *   const logger = Logger.create('AuthContext');
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Failed to fetch session', { error });
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    data?: Record<string, unknown>;
    error?: {
        message: string;
        stack?: string;
        name?: string;
    };
}

/**
 * A transport receives log entries and decides what to do with them
 * (e.g., write to console, send to Sentry, post to API).
 */
export interface LogTransport {
    name: string;
    /** Minimum level this transport handles */
    minLevel: LogLevel;
    /** Process a log entry */
    log(entry: LogEntry): void;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

const LEVEL_STYLES: Record<LogLevel, string> = {
    debug: 'color: #6b7280',         // gray
    info: 'color: #3b82f6',          // blue
    warn: 'color: #f59e0b',          // amber
    error: 'color: #ef4444',         // red
    fatal: 'color: #fff; background: #dc2626; padding: 2px 6px; border-radius: 2px', // white on red bg
};

const LEVEL_EMOJI: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    fatal: '💀',
};

// ─── Transports ─────────────────────────────────────────────────────

/**
 * Console transport — pretty-prints structured logs in the browser console.
 * Active in development by default.
 */
export class ConsoleTransport implements LogTransport {
    name = 'console';
    minLevel: LogLevel;

    constructor(minLevel: LogLevel = 'debug') {
        this.minLevel = minLevel;
    }

    log(entry: LogEntry): void {
        const { level, context, message, data, error } = entry;
        const emoji = LEVEL_EMOJI[level];
        const style = LEVEL_STYLES[level];
        const tag = `[${context}]`;

        // Use the matching console method
        const consoleFn =
            level === 'fatal' || level === 'error'
                ? console.error
                : level === 'warn'
                    ? console.warn
                    : level === 'debug'
                        ? console.debug
                        : console.log;

        // Build args
        const args: unknown[] = [`%c${emoji} ${tag}`, style, message];
        if (data && Object.keys(data).length > 0) args.push(data);
        if (error) args.push(error);

        consoleFn(...args);
    }
}

/**
 * ErrorReporter transport — forwards errors/fatals to the existing
 * errorReporter system (which handles deduplication, queuing, etc.).
 */
export class ErrorReporterTransport implements LogTransport {
    name = 'errorReporter';
    minLevel: LogLevel = 'error';

    log(entry: LogEntry): void {
        // Lazy import to avoid circular dependency at module load time
        import('@/lib/errorReporter').then(({ errorReporter }) => {
            errorReporter.report({
                message: `[${entry.context}] ${entry.message}`,
                stack: entry.error?.stack,
                url: typeof window !== 'undefined' ? window.location.href : '',
                timestamp: entry.timestamp,
                level: entry.level === 'fatal' ? 'error' : entry.level === 'warn' ? 'warning' : entry.level as 'error' | 'warning' | 'info',
                category: 'javascript',
            });
        }).catch(() => {
            // Fail silently if errorReporter import fails
        });
    }
}

// ─── Logger ─────────────────────────────────────────────────────────

/**
 * Registry of global transports, shared across all Logger instances.
 */
const globalTransports: LogTransport[] = [];
let globalMinLevel: LogLevel = 'debug';

export class Logger {
    private context: string;

    private constructor(context: string) {
        this.context = context;
    }

    // ── Factory ──

    /** Create a logger for a named context (module/component). */
    static create(context: string): Logger {
        return new Logger(context);
    }

    // ── Transport management ──

    /** Register a transport globally. */
    static addTransport(transport: LogTransport): void {
        // Prevent duplicate transport names
        const idx = globalTransports.findIndex((t) => t.name === transport.name);
        if (idx >= 0) {
            globalTransports[idx] = transport;
        } else {
            globalTransports.push(transport);
        }
    }

    /** Remove a transport by name. */
    static removeTransport(name: string): void {
        const idx = globalTransports.findIndex((t) => t.name === name);
        if (idx >= 0) globalTransports.splice(idx, 1);
    }

    /** Set the global minimum log level. */
    static setLevel(level: LogLevel): void {
        globalMinLevel = level;
    }

    /** Get currently registered transport names (useful for debugging). */
    static getTransports(): string[] {
        return globalTransports.map((t) => t.name);
    }

    // ── Log methods ──

    debug(message: string, data?: Record<string, unknown>, error?: unknown): void {
        this.write('debug', message, data, error);
    }

    info(message: string, data?: Record<string, unknown>, error?: unknown): void {
        this.write('info', message, data, error);
    }

    warn(message: string, data?: Record<string, unknown>, error?: unknown): void {
        this.write('warn', message, data, error);
    }

    error(message: string, data?: Record<string, unknown>, error?: unknown): void {
        this.write('error', message, data, error);
    }

    fatal(message: string, data?: Record<string, unknown>, error?: unknown): void {
        this.write('fatal', message, data, error);
    }

    // ── Internal ──

    private write(
        level: LogLevel,
        message: string,
        data?: Record<string, unknown>,
        err?: unknown,
    ): void {
        // Check global level gate
        if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[globalMinLevel]) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            data,
            error: err ? this.serializeError(err) : undefined,
        };

        // Dispatch to all eligible transports
        for (const transport of globalTransports) {
            if (LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[transport.minLevel]) {
                try {
                    transport.log(entry);
                } catch {
                    // Never let a broken transport crash the app
                }
            }
        }
    }

    private serializeError(err: unknown): LogEntry['error'] {
        if (err instanceof Error) {
            return {
                message: err.message,
                stack: err.stack,
                name: err.name,
            };
        }
        if (typeof err === 'string') {
            return { message: err };
        }
        return { message: String(err) };
    }
}
