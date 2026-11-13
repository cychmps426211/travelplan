import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    headerLeading?: ReactNode;
    maxWidthClass?: string;
    footer?: ReactNode;
    children: ReactNode;
    bodyClassName?: string;
    panelClassName?: string;
    zIndexClass?: string;
}

/**
 * Unified responsive modal shell:
 * - Bottom sheet ergonomics on mobile (thumb-friendly, safe-area padded)
 * - Centered crisp dialog on desktop
 * - Escape key closing & background scroll lock
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    headerLeading,
    maxWidthClass = 'max-w-lg',
    footer,
    children,
    bodyClassName = 'p-5 sm:p-6',
    panelClassName = '',
    zIndexClass = 'z-50',
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title || '對話視窗'}
            className={`modal-backdrop fixed inset-0 ${zIndexClass} flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm`}
            onClick={onClose}
        >
            <div
                className={`modal-panel w-full ${maxWidthClass} bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden ${panelClassName}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile drag handle indicator */}
                <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 shrink-0">
                    <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>

                {title !== undefined && (
                    <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            {headerLeading}
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight truncate">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="關閉視窗"
                            className="p-2 -mr-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div className={`overflow-y-auto flex-1 overscroll-contain ${bodyClassName}`}>
                    {children}
                </div>

                {footer && (
                    <div className="px-5 py-3.5 sm:px-6 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/95 pb-safe sm:pb-3.5 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
