import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import PickerPopover from './PickerPopover';

export interface SelectOption<T extends string = string> {
    value: T;
    label: string;
    description?: string;
    disabled?: boolean;
}

interface CustomSelectProps<T extends string = string> {
    value: T;
    onChange: (value: T) => void;
    options: readonly SelectOption<T>[];
    placeholder?: string;
    label?: string;
    leadingIcon?: ReactNode;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
}

/**
 * Unified select input that renders a floating dark/light menu on desktop
 * and a touch-friendly bottom sheet on mobile.
 */
export default function CustomSelect<T extends string = string>({
    value,
    onChange,
    options,
    placeholder = '請選擇',
    label,
    leadingIcon,
    disabled = false,
    className = '',
    ariaLabel,
}: CustomSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const selectedItemRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        if (!isOpen) return;
        const timer = requestAnimationFrame(() => {
            selectedItemRef.current?.scrollIntoView({ block: 'nearest' });
        });
        return () => cancelAnimationFrame(timer);
    }, [isOpen]);

    const estimatedHeightPx = Math.min(options.length * 42 + 16, 280);

    return (
        <div className={`relative min-w-0 max-w-full ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel || label}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                className={`w-full min-w-0 max-w-full min-h-[46px] sm:min-h-[42px] px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 border rounded-xl flex items-center justify-between gap-2 text-left transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/25'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                }`}
            >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                    {leadingIcon && (
                        <span className="text-zinc-400 shrink-0 flex items-center">
                            {leadingIcon}
                        </span>
                    )}
                    <span
                        className={`truncate tabular-nums ${
                            selectedOption
                                ? 'text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                    >
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-blue-500' : ''
                    }`}
                />
            </button>

            <PickerPopover
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                title={label || placeholder}
                estimatedHeightPx={estimatedHeightPx}
            >
                <div role="listbox" aria-label={label || placeholder} className="p-1.5 space-y-0.5">
                    {options.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                ref={isSelected ? selectedItemRef : undefined}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                disabled={opt.disabled}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-3 py-2.5 sm:py-2 rounded-xl text-sm flex items-center justify-between gap-3 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isSelected
                                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                                }`}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate tabular-nums">{opt.label}</span>
                                    {opt.description && (
                                        <span className="block text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                                            {opt.description}
                                        </span>
                                    )}
                                </span>
                                {isSelected && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </PickerPopover>
        </div>
    );
}
