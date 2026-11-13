import { flushSync } from 'react-dom';

/**
 * Runs a state/navigation update inside the native View Transitions API
 * when supported by the browser, falling back to immediate execution.
 */
export function runWithViewTransition(updateCallback: () => void): void {
    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (
        typeof document !== 'undefined' &&
        'startViewTransition' in document &&
        typeof document.startViewTransition === 'function' &&
        !prefersReducedMotion
    ) {
        document.startViewTransition(() => {
            flushSync(() => {
                updateCallback();
            });
        });
    } else {
        updateCallback();
    }
}
