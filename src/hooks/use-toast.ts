import { useState, useCallback } from 'react';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

let toastCounter = 0;
const listeners: Set<(toasts: Toast[]) => void> = new Set();
let memoryToasts: Toast[] = [];

function dispatch(toasts: Toast[]) {
    memoryToasts = toasts;
    listeners.forEach((listener) => listener(toasts));
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

    useState(() => {
        listeners.add(setToasts);
        return () => {
            listeners.delete(setToasts);
        };
    });

    const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
        const id = (toastCounter++).toString();
        const newToast: Toast = { id, title, description, variant };

        dispatch([...memoryToasts, newToast]);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            dismiss(id);
        }, 5000);

        return { id };
    }, []);

    const dismiss = useCallback((toastId: string) => {
        dispatch(memoryToasts.filter((t) => t.id !== toastId));
    }, []);

    return {
        toast,
        toasts,
        dismiss,
    };
}
