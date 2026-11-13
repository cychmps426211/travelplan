import { useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext, type ToastType } from '../hooks/useToast';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, type: ToastType = 'info') => {
            const id = Date.now() + Math.random();
            setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
            setTimeout(() => {
                removeToast(id);
            }, 3400);
        },
        [removeToast]
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                aria-live="polite"
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none pt-safe"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="status"
                        className={`expand-panel pointer-events-auto w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-lg backdrop-blur-xl text-sm font-medium ${
                            toast.type === 'success'
                                ? 'bg-white/95 dark:bg-zinc-900/95 border-emerald-200 dark:border-emerald-500/30 text-zinc-900 dark:text-zinc-100'
                                : toast.type === 'error'
                                ? 'bg-white/95 dark:bg-zinc-900/95 border-red-200 dark:border-red-500/30 text-zinc-900 dark:text-zinc-100'
                                : 'bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100'
                        }`}
                    >
                        {toast.type === 'success' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {toast.type === 'error' && (
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        {toast.type === 'info' && (
                            <Info className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                        <span className="flex-1 leading-snug">{toast.message}</span>
                        <button
                            type="button"
                            onClick={() => removeToast(toast.id)}
                            aria-label="關閉通知"
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
