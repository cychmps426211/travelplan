import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';

interface PickerPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    triggerRef: RefObject<HTMLElement | null>;
    title?: string;
    desktopWidthPx?: number;
    estimatedHeightPx?: number;
    children: ReactNode;
    panelClassName?: string;
}

interface DesktopPosition {
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
}

/**
 * Shared overlay shell for custom selects, time pickers, and date pickers.
 * - Mobile (< 640px): bottom sheet with swipe-down handle and safe-area padding
 * - Desktop (>= 640px): portal-mounted floating popover with click-absorbing backdrop
 */
export default function PickerPopover({
    isOpen,
    onClose,
    triggerRef,
    title,
    desktopWidthPx,
    estimatedHeightPx = 280,
    children,
    panelClassName = '',
}: PickerPopoverProps) {
    const desktopPanelRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 640 : false
    );
    const [desktopPos, setDesktopPos] = useState<DesktopPosition | null>(null);

    const { backdropRef: mobileBackdropRef, panelRef: mobilePanelRef, handleRef } =
        useBottomSheetDrag({
            isOpen,
            onClose,
            enabled: isMobile,
        });

    const updateLayout = useCallback(() => {
        const mobile = window.innerWidth < 640;
        setIsMobile(mobile);
        if (mobile || !triggerRef.current) {
            setDesktopPos(null);
            return;
        }

        const rect = triggerRef.current.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const margin = 12;
        const gap = 6;
        const width = Math.min(
            desktopWidthPx ?? Math.max(rect.width, 220),
            viewportW - margin * 2
        );
        const left = Math.max(margin, Math.min(rect.left, viewportW - width - margin));

        const spaceBelow = viewportH - rect.bottom - margin - gap;
        const spaceAbove = rect.top - margin - gap;

        if (spaceBelow >= estimatedHeightPx || spaceBelow >= spaceAbove) {
            setDesktopPos({
                left,
                width,
                top: rect.bottom + gap,
                maxHeight: Math.max(180, spaceBelow),
            });
        } else {
            setDesktopPos({
                left,
                width,
                bottom: viewportH - rect.top + gap,
                maxHeight: Math.max(180, spaceAbove),
            });
        }
    }, [triggerRef, desktopWidthPx, estimatedHeightPx]);

    useEffect(() => {
        if (!isOpen) return;

        const rafId = requestAnimationFrame(updateLayout);

        // Intercept Escape in capture phase so outer Modal stays open
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                onClose();
            }
        };

        const handleViewportChange = (e: Event) => {
            if (e.type === 'scroll' && desktopPanelRef.current?.contains(e.target as Node)) {
                return;
            }
            updateLayout();
        };

        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [isOpen, onClose, updateLayout]);

    if (!isOpen) return null;

    if (isMobile) {
        return createPortal(
            <div
                className="fixed inset-0 z-[70] flex items-end justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    ref={mobileBackdropRef}
                    className="modal-backdrop absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                />
                <div
                    ref={mobilePanelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={title || '選擇選項'}
                    onClick={(e) => e.stopPropagation()}
                    className={`modal-panel relative z-10 w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t border-zinc-200/80 dark:border-zinc-800 rounded-t-3xl shadow-2xl max-h-[82dvh] flex flex-col overflow-hidden pb-safe ${panelClassName}`}
                >
                    <div ref={handleRef} className="touch-none select-none shrink-0">
                        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                            <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        </div>
                        {title && (
                            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80">
                                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                                    {title}
                                </h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="關閉"
                                    className="p-1.5 -mr-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden overscroll-contain flex-1">
                        {children}
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    if (!desktopPos) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[70]"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                ref={desktopPanelRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'fixed',
                    left: `${desktopPos.left}px`,
                    width: `${desktopPos.width}px`,
                    ...(desktopPos.top !== undefined ? { top: `${desktopPos.top}px` } : {}),
                    ...(desktopPos.bottom !== undefined ? { bottom: `${desktopPos.bottom}px` } : {}),
                    maxHeight: `${desktopPos.maxHeight}px`,
                }}
                className={`expand-panel bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-y-auto overflow-x-hidden overscroll-contain ${panelClassName}`}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}
