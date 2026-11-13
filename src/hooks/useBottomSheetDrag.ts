import { useEffect, useRef } from 'react';

interface UseBottomSheetDragOptions {
    isOpen: boolean;
    onClose: () => void;
    enabled?: boolean;
}

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [data-no-drag="true"]';

/**
 * Enables native-like mobile swipe-down-to-dismiss on bottom sheet grabbers/headers.
 * Manipulates transform/opacity directly during active gestures for 60fps+ smoothness.
 */
export function useBottomSheetDrag({
    isOpen,
    onClose,
    enabled = true,
}: UseBottomSheetDragOptions) {
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen || !enabled) return;

        const handleEl = handleRef.current;
        const panelEl = panelRef.current;
        if (!handleEl || !panelEl) return;

        const clearInlineStyles = () => {
            if (panelRef.current) {
                panelRef.current.style.transition = '';
                panelRef.current.style.transform = '';
                panelRef.current.style.opacity = '';
            }
            if (backdropRef.current) {
                backdropRef.current.style.transition = '';
                backdropRef.current.style.opacity = '';
            }
        };

        clearInlineStyles();

        let startY = 0;
        let startX = 0;
        let startTime = 0;
        let currentDy = 0;
        let dragging = false;
        let activeMode: 'touch' | 'mouse' | null = null;
        let lastTouchTimestamp = 0;
        let animTimer: number | null = null;

        const isInteractiveTarget = (target: EventTarget | null) => {
            return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
        };

        const beginTrack = (clientX: number, clientY: number, mode: 'touch' | 'mouse') => {
            if (animTimer !== null) {
                window.clearTimeout(animTimer);
                animTimer = null;
            }
            startX = clientX;
            startY = clientY;
            startTime = performance.now();
            currentDy = 0;
            dragging = false;
            activeMode = mode;
        };

        const moveTrack = (clientX: number, clientY: number, cancelScroll?: () => void) => {
            if (!activeMode) return;
            const rawDy = clientY - startY;
            const rawDx = clientX - startX;

            if (!dragging) {
                if (Math.abs(rawDx) > 12 && Math.abs(rawDx) > Math.abs(rawDy)) {
                    activeMode = null;
                    return;
                }
                if (rawDy < -10) {
                    activeMode = null;
                    return;
                }
                if (rawDy > 5) {
                    dragging = true;
                } else {
                    return;
                }
            }

            cancelScroll?.();
            currentDy = Math.max(0, rawDy);

            if (panelRef.current) {
                panelRef.current.style.transition = 'none';
                panelRef.current.style.transform = `translateY(${currentDy}px)`;
            }
            if (backdropRef.current) {
                const progress = Math.min(currentDy / 280, 1);
                backdropRef.current.style.transition = 'none';
                backdropRef.current.style.opacity = String(1 - progress * 0.7);
            }
        };

        const endTrack = () => {
            if (!activeMode) return;
            const wasDragging = dragging;
            activeMode = null;
            dragging = false;

            if (!wasDragging) return;

            const panel = panelRef.current;
            const backdrop = backdropRef.current;
            const elapsed = Math.max(1, performance.now() - startTime);
            const velocity = currentDy / elapsed;
            const panelHeight = panel?.offsetHeight || 400;
            const threshold = Math.min(110, panelHeight * 0.28);
            const shouldClose = currentDy > threshold || (currentDy > 36 && velocity > 0.45);

            if (shouldClose) {
                if (panel) {
                    panel.style.transition =
                        'transform 190ms cubic-bezier(0.22, 1, 0.36, 1), opacity 190ms ease';
                    panel.style.transform = 'translateY(100%)';
                    panel.style.opacity = '0';
                }
                if (backdrop) {
                    backdrop.style.transition = 'opacity 190ms ease';
                    backdrop.style.opacity = '0';
                }
                animTimer = window.setTimeout(() => {
                    onCloseRef.current();
                }, 185);
            } else {
                if (panel) {
                    panel.style.transition = 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)';
                    panel.style.transform = 'translateY(0)';
                }
                if (backdrop) {
                    backdrop.style.transition = 'opacity 220ms ease';
                    backdrop.style.opacity = '1';
                }
                animTimer = window.setTimeout(clearInlineStyles, 220);
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (window.innerWidth >= 640) return;
            if (e.touches.length !== 1) return;
            if (isInteractiveTarget(e.target)) return;
            lastTouchTimestamp = performance.now();
            const touch = e.touches[0];
            beginTrack(touch.clientX, touch.clientY, 'touch');
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (activeMode !== 'touch' || e.touches.length !== 1) return;
            const touch = e.touches[0];
            moveTrack(touch.clientX, touch.clientY, () => {
                if (e.cancelable) e.preventDefault();
            });
        };

        const handleTouchEnd = () => {
            if (activeMode !== 'touch') return;
            lastTouchTimestamp = performance.now();
            endTrack();
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (window.innerWidth >= 640) return;
            if (e.button !== 0) return;
            if (performance.now() - lastTouchTimestamp < 500) return;
            if (isInteractiveTarget(e.target)) return;
            beginTrack(e.clientX, e.clientY, 'mouse');
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (activeMode !== 'mouse') return;
            moveTrack(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            if (activeMode !== 'mouse') return;
            endTrack();
        };

        handleEl.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        handleEl.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            if (animTimer !== null) {
                window.clearTimeout(animTimer);
            }
            handleEl.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);

            handleEl.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            clearInlineStyles();
        };
    }, [isOpen, enabled]);

    return { backdropRef, panelRef, handleRef };
}
