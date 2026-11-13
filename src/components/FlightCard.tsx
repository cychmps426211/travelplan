import { useState } from 'react';
import { Plane, Clock, Edit2, CheckCircle2, Trash2 } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import type { FlightInfo } from '../types';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';

interface FlightCardProps {
    flight: FlightInfo;
    type: 'outbound' | 'return';
    onEdit: () => void;
    onDelete: () => void;
}

export default function FlightCard({ flight, type, onEdit, onDelete }: FlightCardProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const depTime = flight.departureTime.toDate();
    const arrTime = flight.arrivalTime.toDate();

    // Countdown Logic
    const now = new Date();
    const daysUntil = differenceInDays(depTime, now);
    const hoursUntil = differenceInHours(depTime, now) % 24;
    const minutesUntil = differenceInMinutes(depTime, now) % 60;

    const hasDeparted = now > depTime;
    const timeLeft = !hasDeparted ? { days: daysUntil, hours: hoursUntil, minutes: minutesUntil } : null;

    // Helper to format UTC timestamp to Local Time string using stored offset
    const formatLocalTime = (timestamp: Timestamp, offsetStr?: string) => {
        const date = timestamp.toDate();
        if (!offsetStr) return format(date, 'HH:mm');

        const sign = offsetStr.startsWith('-') ? -1 : 1;
        const [h, m] = offsetStr.slice(1).split(':').map(Number);
        const offsetMinutes = sign * ((h * 60) + m);

        const targetMillis = date.getTime() + (offsetMinutes * 60 * 1000);
        const targetDate = new Date(targetMillis);

        const hours = targetDate.getUTCHours().toString().padStart(2, '0');
        const minutes = targetDate.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const getDayMonth = (timestamp: Timestamp, offsetStr?: string) => {
        const date = timestamp.toDate();
        if (!offsetStr) return format(date, 'MM/dd');

        const sign = offsetStr.startsWith('-') ? -1 : 1;
        const [h, m] = offsetStr.slice(1).split(':').map(Number);
        const offsetMinutes = sign * ((h * 60) + m);
        const targetDate = new Date(date.getTime() + (offsetMinutes * 60 * 1000));
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        return `${months[targetDate.getUTCMonth()]}${targetDate.getUTCDate()}日`;
    };

    const diffMillis = arrTime.getTime() - depTime.getTime();
    const hours = Math.floor(diffMillis / (1000 * 60 * 60));
    const minutes = Math.floor((diffMillis % (1000 * 60 * 60)) / (1000 * 60));

    return (
        <>
            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors relative group">
                <div className="flex justify-between items-start gap-3 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`p-2.5 rounded-xl border shrink-0 ${
                                type === 'outbound'
                                    ? 'bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            }`}
                        >
                            <Plane className={`w-4 h-4 ${type === 'return' ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {type === 'outbound' ? '去程航班' : '回程航班'}
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {flight.airline} · <span className="font-mono">{flight.flightNumber}</span>
                            </p>
                        </div>
                    </div>

                    {/* Touch-friendly actions: visible on mobile, reveal on desktop hover */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            aria-label="編輯航班"
                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            title="編輯"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(true);
                            }}
                            aria-label="刪除航班"
                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                            title="刪除"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Boarding Pass Route Timeline */}
                <div className="flex items-center justify-between gap-2 mb-5">
                    <div className="text-left min-w-[76px] sm:min-w-[96px]">
                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
                            {formatLocalTime(flight.departureTime, flight.departureTimezone)}
                        </div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 tabular-nums">
                            {getDayMonth(flight.departureTime, flight.departureTimezone)} · UTC{flight.departureTimezone}
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 mt-1.5">
                            {flight.departureAirport}
                        </div>
                    </div>

                    <div className="flex-1 px-2 sm:px-6 flex flex-col items-center">
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1.5 font-medium whitespace-nowrap tabular-nums">
                            {hours}小時 {minutes}分
                        </div>
                        <div className="w-full flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                            <div className="flex-1 border-t border-dashed border-zinc-300 dark:border-zinc-700" />
                            <Plane
                                className={`w-3.5 h-3.5 shrink-0 ${
                                    type === 'return'
                                        ? 'rotate-180 text-emerald-500 dark:text-emerald-400'
                                        : 'text-blue-500 dark:text-blue-400'
                                }`}
                            />
                            <div className="flex-1 border-t border-dashed border-zinc-300 dark:border-zinc-700" />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                        </div>
                    </div>

                    <div className="text-right min-w-[76px] sm:min-w-[96px]">
                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
                            {formatLocalTime(flight.arrivalTime, flight.arrivalTimezone)}
                        </div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 tabular-nums">
                            {getDayMonth(flight.arrivalTime, flight.arrivalTimezone)} · UTC{flight.arrivalTimezone}
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5">
                            {flight.arrivalAirport}
                        </div>
                    </div>
                </div>

                {/* Countdown */}
                {timeLeft && !hasDeparted && (() => {
                    const totalMinutesIn30Days = 30 * 24 * 60;
                    const minutesLeft = timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes;
                    const progress = Math.max(6, Math.min(100, 100 - (minutesLeft / totalMinutesIn30Days) * 100));

                    return (
                        <div className="pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                    距離起飛還有
                                </span>
                                <span className="text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                    {timeLeft.days}天 {timeLeft.hours}小時 {timeLeft.minutes}分
                                </span>
                            </div>
                            <div className="relative h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                        type === 'outbound'
                                            ? 'bg-blue-600 dark:bg-blue-500'
                                            : 'bg-emerald-600 dark:bg-emerald-500'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    );
                })()}
                {hasDeparted && (
                    <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>航班已起飛</span>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="刪除航班"
                message={`確定要刪除${type === 'outbound' ? '去程' : '回程'}航班嗎？`}
                onConfirm={() => {
                    setShowDeleteConfirm(false);
                    onDelete();
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}
