import { useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import { parseLocalDate } from '../utils/date';
import PickerPopover from './PickerPopover';

interface DatePickerProps {
    value: string; // "yyyy-MM-dd" or ""
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function safeParseDateStr(dateStr?: string): Date | null {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const parsed = parseLocalDate(dateStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Unified Calendar DatePicker:
 * - Prevents iOS WebKit native <input type="date"> width blowouts inside 2-col grids
 * - Renders consistent zinc popover (desktop) / bottom-sheet (mobile)
 */
export default function DatePicker({
    value,
    onChange,
    min,
    max,
    label = '選擇日期',
    placeholder = '選擇日期',
    disabled = false,
    className = '',
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const selectedDate = useMemo(() => safeParseDateStr(value), [value]);
    const minDate = useMemo(() => safeParseDateStr(min), [min]);
    const maxDate = useMemo(() => safeParseDateStr(max), [max]);
    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const [viewMonth, setViewMonth] = useState<Date>(() => selectedDate || minDate || today);

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) {
            setViewMonth(selectedDate || minDate || today);
        }
        setIsOpen((prev) => !prev);
    };

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
        const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
    }, [viewMonth]);

    const isOutOfRange = (day: Date) => {
        if (minDate && isBefore(day, minDate)) return true;
        if (maxDate && isAfter(day, maxDate)) return true;
        return false;
    };

    const todayDisabled = isOutOfRange(today);

    return (
        <div className={`relative min-w-0 max-w-full ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={label}
                onClick={handleToggle}
                className={`w-full min-w-0 max-w-full min-h-[46px] sm:min-h-[42px] px-3 sm:px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 border rounded-xl flex items-center gap-2 text-left transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/25'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                }`}
            >
                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                <span
                    className={`truncate tabular-nums ${
                        selectedDate
                            ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                            : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                >
                    {selectedDate ? format(selectedDate, 'yyyy/MM/dd') : placeholder}
                </span>
            </button>

            <PickerPopover
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                title={label}
                desktopWidthPx={296}
                estimatedHeightPx={320}
            >
                <div className="p-3.5 space-y-3">
                    {/* Month Header */}
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setViewMonth((m) => subMonths(m, 1))}
                            aria-label="上個月"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                            {format(viewMonth, 'yyyy 年 M 月')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewMonth((m) => addMonths(m, 1))}
                            aria-label="下個月"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Weekday Header */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {WEEKDAYS.map((day) => (
                            <span
                                key={day}
                                className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 py-1"
                            >
                                {day}
                            </span>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day) => {
                            const inCurrentMonth = isSameMonth(day, viewMonth);
                            const isSelected = Boolean(selectedDate && isSameDay(day, selectedDate));
                            const isToday = isSameDay(day, today);
                            const outOfRange = isOutOfRange(day);

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    disabled={outOfRange}
                                    onClick={() => {
                                        onChange(format(day, 'yyyy-MM-dd'));
                                        setIsOpen(false);
                                    }}
                                    className={`h-9 sm:h-8 rounded-lg text-xs font-medium tabular-nums transition-colors flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed ${
                                        isSelected
                                            ? 'bg-blue-600 text-white font-semibold'
                                            : isToday
                                              ? 'ring-1 ring-blue-500/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                                              : inCurrentMonth
                                                ? 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                : 'text-zinc-300 dark:text-zinc-600 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'
                                    }`}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            type="button"
                            disabled={todayDisabled}
                            onClick={() => {
                                onChange(format(today, 'yyyy-MM-dd'));
                                setIsOpen(false);
                            }}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                        >
                            選擇今天
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            關閉
                        </button>
                    </div>
                </div>
            </PickerPopover>
        </div>
    );
}
