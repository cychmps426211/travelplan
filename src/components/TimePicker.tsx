import { useRef, useState } from 'react';
import { Clock, Minus, Plus, X } from 'lucide-react';
import PickerPopover from './PickerPopover';

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    fallbackTime?: string;
    allowEmpty?: boolean;
    disabled?: boolean;
    className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const STEP_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function parseTimeParts(timeStr: string, fallback = '09:00'): { hour: string; minute: string } {
    const source = /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : fallback;
    const [h, m] = source.split(':');
    const hourNum = Math.min(23, Math.max(0, parseInt(h, 10) || 0));
    const minNum = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
    return {
        hour: String(hourNum).padStart(2, '0'),
        minute: String(minNum).padStart(2, '0'),
    };
}

/**
 * Unified 24-hour TimePicker:
 * - Zero-scroll 6x4 hour grid + 5-min / exact 1-min selector
 * - Direct HH:mm keyboard input on desktop without AM/PM juggling
 * - Consistent zinc styling on mobile bottom-sheet and desktop popover
 */
export default function TimePicker({
    value,
    onChange,
    label = '選擇時間',
    placeholder = '選擇時間',
    fallbackTime = '09:00',
    allowEmpty = false,
    disabled = false,
    className = '',
}: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showAllMinutes, setShowAllMinutes] = useState(false);
    const [editingField, setEditingField] = useState<{ field: 'hour' | 'minute'; text: string } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const hourInputRef = useRef<HTMLInputElement>(null);
    const minuteInputRef = useRef<HTMLInputElement>(null);

    const parsed = parseTimeParts(value, fallbackTime);
    const displayedHour = editingField?.field === 'hour' ? editingField.text : parsed.hour;
    const displayedMinute = editingField?.field === 'minute' ? editingField.text : parsed.minute;

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) {
            setShowAllMinutes(false);
            setEditingField(null);
        }
        setIsOpen((prev) => !prev);
    };

    const commitTime = (hour: string, minute: string) => {
        const safeH = String(Math.min(23, Math.max(0, parseInt(hour, 10) || 0))).padStart(2, '0');
        const safeM = String(Math.min(59, Math.max(0, parseInt(minute, 10) || 0))).padStart(2, '0');
        onChange(`${safeH}:${safeM}`);
    };

    const stepMinute = (delta: number) => {
        const h = parseInt(parsed.hour, 10);
        const m = parseInt(parsed.minute, 10);
        const total = ((h * 60 + m + delta) % 1440 + 1440) % 1440;
        const nextH = String(Math.floor(total / 60)).padStart(2, '0');
        const nextM = String(total % 60).padStart(2, '0');
        setEditingField(null);
        commitTime(nextH, nextM);
    };

    const handleHourInputChange = (raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, 2);
        setEditingField({ field: 'hour', text: digits });
        if (digits.length === 2) {
            const num = Math.min(23, parseInt(digits, 10));
            const padded = String(num).padStart(2, '0');
            setEditingField(null);
            onChange(`${padded}:${parsed.minute}`);
            minuteInputRef.current?.focus();
            minuteInputRef.current?.select();
        }
    };

    const handleMinuteInputChange = (raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, 2);
        setEditingField({ field: 'minute', text: digits });
        if (digits.length === 2) {
            const num = Math.min(59, parseInt(digits, 10));
            const padded = String(num).padStart(2, '0');
            setEditingField(null);
            onChange(`${parsed.hour}:${padded}`);
        }
    };

    const showClearBtn = allowEmpty && Boolean(value) && !disabled;

    return (
        <div className={`relative min-w-0 max-w-full ${className}`}>
            <div className="relative flex items-center min-w-0">
                <button
                    ref={triggerRef}
                    type="button"
                    disabled={disabled}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    aria-label={label}
                    onClick={handleToggle}
                    className={`w-full min-w-0 max-w-full min-h-[46px] sm:min-h-[42px] px-3 sm:px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 border rounded-xl flex items-center gap-2 text-left transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        showClearBtn ? 'pr-8' : ''
                    } ${
                        isOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/25'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                    }`}
                >
                    <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span
                        className={`truncate tabular-nums ${
                            value
                                ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                                : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                    >
                        {value || placeholder}
                    </span>
                </button>

                {showClearBtn && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                            setIsOpen(false);
                        }}
                        aria-label={`清除${label}`}
                        className="absolute right-2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <PickerPopover
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                title={label}
                desktopWidthPx={312}
                estimatedHeightPx={showAllMinutes ? 440 : 340}
            >
                <div className="p-3.5 space-y-3.5">
                    {/* Editable 24-hour preview bar */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5">
                            <input
                                ref={hourInputRef}
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                aria-label="小時"
                                value={displayedHour}
                                onFocus={(e) => {
                                    setEditingField({ field: 'hour', text: parsed.hour });
                                    e.target.select();
                                }}
                                onChange={(e) => handleHourInputChange(e.target.value)}
                                onBlur={() => {
                                    if (editingField?.field === 'hour') {
                                        commitTime(editingField.text || parsed.hour, parsed.minute);
                                        setEditingField(null);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitTime(displayedHour, parsed.minute);
                                        setEditingField(null);
                                        setIsOpen(false);
                                    }
                                }}
                                className="w-11 h-9 text-center text-base font-semibold tabular-nums rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none transition-colors"
                            />
                            <span className="text-base font-bold text-zinc-400 dark:text-zinc-500">:</span>
                            <input
                                ref={minuteInputRef}
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                aria-label="分鐘"
                                value={displayedMinute}
                                onFocus={(e) => {
                                    setEditingField({ field: 'minute', text: parsed.minute });
                                    e.target.select();
                                }}
                                onChange={(e) => handleMinuteInputChange(e.target.value)}
                                onBlur={() => {
                                    if (editingField?.field === 'minute') {
                                        commitTime(parsed.hour, editingField.text || parsed.minute);
                                        setEditingField(null);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitTime(parsed.hour, displayedMinute);
                                        setEditingField(null);
                                        setIsOpen(false);
                                    }
                                }}
                                className="w-11 h-9 text-center text-base font-semibold tabular-nums rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => stepMinute(-1)}
                                title="減少 1 分鐘"
                                aria-label="減少 1 分鐘"
                                className="px-2 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-0.5 tabular-nums transition-colors"
                            >
                                <Minus className="w-3 h-3" />
                                <span>1分</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => stepMinute(1)}
                                title="增加 1 分鐘"
                                aria-label="增加 1 分鐘"
                                className="px-2 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-0.5 tabular-nums transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                <span>1分</span>
                            </button>
                        </div>
                    </div>

                    {/* 24-hour Grid (no scroll needed) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                時 (24 小時制)
                            </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                            {HOURS.map((h) => {
                                const active = parsed.hour === h;
                                return (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => commitTime(h, parsed.minute)}
                                        className={`h-9 sm:h-8 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                                            active
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        {h}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Minute Grid */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                分
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowAllMinutes((prev) => !prev)}
                                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {showAllMinutes ? '僅顯示每 5 分鐘' : '顯示 00–59 分鐘'}
                            </button>
                        </div>
                        <div
                            className={`grid gap-1 ${
                                showAllMinutes
                                    ? 'grid-cols-6 max-h-40 overflow-y-auto pr-0.5'
                                    : 'grid-cols-6'
                            }`}
                        >
                            {(showAllMinutes ? ALL_MINUTES : STEP_MINUTES).map((m) => {
                                const active = Boolean(value) && parsed.minute === m;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => commitTime(parsed.hour, m)}
                                        className={`h-9 sm:h-8 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                                            active
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        {allowEmpty ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                                className="px-2.5 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                清除時間
                            </button>
                        ) : (
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                                點選後即時套用
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (!value) {
                                    commitTime(parsed.hour, parsed.minute);
                                }
                                setIsOpen(false);
                            }}
                            className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            確定
                        </button>
                    </div>
                </div>
            </PickerPopover>
        </div>
    );
}
