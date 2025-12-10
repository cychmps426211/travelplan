// React import removed as it is not used directly
import { Plane, Edit2, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import type { FlightInfo } from '../types';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

interface FlightCardProps {
    flight: FlightInfo;
    type: 'outbound' | 'return';
    onEdit: () => void;
    onDelete: () => void;
}

export default function FlightCard({ flight, type, onEdit, onDelete }: FlightCardProps) {
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
    const formatLocalTime = (timestamp: any, offsetStr?: string) => {
        const date = timestamp.toDate();
        if (!offsetStr) return format(date, 'HH:mm');

        // Convert UTC date to target timezone date object for display
        const sign = offsetStr.startsWith('-') ? -1 : 1;
        const [h, m] = offsetStr.slice(1).split(':').map(Number);
        const offsetMinutes = sign * ((h * 60) + m);

        // Get UTC time in ms
        const utcMillis = date.getTime();
        // Add offset to get "Local" time in ms (as if it were UTC)
        const targetMillis = utcMillis + (offsetMinutes * 60 * 1000);
        const targetDate = new Date(targetMillis);

        // Format utilizing UTC methods to avoid local browser timezone interference
        const hours = targetDate.getUTCHours().toString().padStart(2, '0');
        const minutes = targetDate.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const getDayMonth = (timestamp: any, offsetStr?: string) => {
        const date = timestamp.toDate();
        if (!offsetStr) return format(date, 'MMM d');

        const sign = offsetStr.startsWith('-') ? -1 : 1;
        const [h, m] = offsetStr.slice(1).split(':').map(Number);
        const offsetMinutes = sign * ((h * 60) + m);
        const targetDate = new Date(date.getTime() + (offsetMinutes * 60 * 1000));
        // Use UTC methods
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        return `${months[targetDate.getUTCMonth()]}${targetDate.getUTCDate()}日`;
    };

    // Duration in real time
    const diffMillis = arrTime.getTime() - depTime.getTime();
    const hours = Math.floor(diffMillis / (1000 * 60 * 60));
    const minutes = Math.floor((diffMillis % (1000 * 60 * 60)) / (1000 * 60));

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${type === 'outbound' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Plane className={`w-5 h-5 ${type === 'return' ? 'rotate-180' : ''}`} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">
                            {type === 'outbound' ? '去程航班' : '回程航班'}
                        </h3>
                        <p className="text-sm text-gray-500">{flight.airline} • {flight.flightNumber}</p>
                    </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="編輯"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('確定要刪除此航班嗎？')) {
                                onDelete();
                            }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="刪除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="text-center min-w-[80px]">
                    <div className="text-2xl font-bold text-gray-900">
                        {formatLocalTime(flight.departureTime, flight.departureTimezone)}
                        <span className="text-xs text-gray-400 font-normal ml-1 align-top">
                            (UTC{flight.departureTimezone})
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{getDayMonth(flight.departureTime, flight.departureTimezone)}</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{flight.departureAirport}</div>
                </div>

                <div className="flex-1 px-8 flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1 font-medium">{hours}小時 {minutes}分</div>
                    <div className="w-full h-px bg-gray-200 relative flex items-center justify-center">
                        <div className={`absolute w-full h-0.5 ${type === 'outbound' ? 'bg-blue-100' : 'bg-emerald-100'}`}></div>
                        <div className={`p-1 rounded-full ${type === 'outbound' ? 'bg-blue-50' : 'bg-emerald-50'} z-10`}>
                            <Plane className={`w-3 h-3 ${type === 'return' ? 'rotate-180 text-emerald-400' : 'text-blue-400'}`} />
                        </div>
                    </div>
                </div>

                <div className="text-center min-w-[80px]">
                    <div className="text-2xl font-bold text-gray-900">
                        {formatLocalTime(flight.arrivalTime, flight.arrivalTimezone)}
                        <span className="text-xs text-gray-400 font-normal ml-1 align-top">
                            (UTC{flight.arrivalTimezone})
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{getDayMonth(flight.arrivalTime, flight.arrivalTimezone)}</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{flight.arrivalAirport}</div>
                </div>
            </div>

            {/* Countdown */}
            {timeLeft && !hasDeparted && (() => {
                // Calculate "progress" based on a 30-day window (arbitrary "start" for visual effect)
                // If more than 30 days, bar is just starting (5%).
                // If less than 30 days, it fills up.
                const totalMinutesIn30Days = 30 * 24 * 60;
                const minutesLeft = timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes;
                const progress = Math.max(5, Math.min(100, 100 - (minutesLeft / totalMinutesIn30Days * 100)));

                return (
                    <div className="mt-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                距離起飛還有
                            </span>
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {timeLeft.days}天 {timeLeft.hours}小時 {timeLeft.minutes}分
                            </span>
                        </div>
                        <div className="relative h-3 bg-slate-100 rounded-full overflow-visible">
                            {/* Gradient Bar */}
                            <div
                                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                            {/* Animated Glitter/Pulse overlay */}
                            <div
                                className="absolute top-0 left-0 h-full w-full rounded-full opacity-30 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%)] bg-[length:20px_20px] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                                style={{ width: `${progress}%` }}
                            />
                            {/* Traveling Plane Icon */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out z-10"
                                style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
                            >
                                <div className="bg-white p-1 rounded-full shadow-md border border-blue-100">
                                    <Plane className="w-3 h-3 text-blue-600 rotate-90" fill="currentColor" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {hasDeparted && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>航班已起飛</span>
                </div>
            )}
        </div>
    );
}
