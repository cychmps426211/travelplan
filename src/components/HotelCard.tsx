import { Building2, MapPin, Calendar, Clock, Edit2, Trash2, AlignLeft, Copy } from 'lucide-react';
import type { HotelInfo } from '../types';
import { useToast } from '../hooks/useToast';
import { formatDateStrWithWeekday, getHotelCheckInParts, getHotelCheckOutParts } from '../utils/date';

interface HotelCardProps {
    hotel: HotelInfo;
    onEdit: () => void;
    onDelete: () => void;
}

export default function HotelCard({ hotel, onEdit, onDelete }: HotelCardProps) {
    const { showToast } = useToast();
    const checkIn = getHotelCheckInParts(hotel);
    const checkOut = getHotelCheckOutParts(hotel);

    const handleCopyBookingRef = async () => {
        if (!hotel.bookingReference) return;
        try {
            await navigator.clipboard.writeText(hotel.bookingReference);
            showToast('已複製訂房代號', 'success');
        } catch {
            showToast('複製失敗', 'error');
        }
    };

    return (
        <div className="cq-card cv-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors overflow-hidden relative group">
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="p-2.5 bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 rounded-xl shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
                                {hotel.name}
                            </h3>
                            {hotel.address && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm mt-1"
                                >
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span className="line-clamp-1">{hotel.address}</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Touch-friendly actions */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                            type="button"
                            onClick={onEdit}
                            aria-label={`編輯 ${hotel.name}`}
                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            title="編輯"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onDelete}
                            aria-label={`刪除 ${hotel.name}`}
                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                            title="刪除"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* Check-In */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800">
                        <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                            Check-in
                        </div>
                        <div className="flex items-center gap-1.5 mb-1 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {checkIn ? formatDateStrWithWeekday(checkIn.date) : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span>{checkIn?.time || ''} 之後</span>
                        </div>
                    </div>

                    {/* Check-Out */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800">
                        <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                            Check-out
                        </div>
                        <div className="flex items-center gap-1.5 mb-1 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {checkOut ? formatDateStrWithWeekday(checkOut.date) : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span>{checkOut?.time || ''} 之前</span>
                        </div>
                    </div>
                </div>

                {(hotel.bookingReference || hotel.notes) && (
                    <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
                        {hotel.bookingReference && (
                            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium shrink-0">訂房代號</span>
                                <button
                                    type="button"
                                    onClick={handleCopyBookingRef}
                                    className="inline-flex items-center gap-1.5 font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 px-2.5 py-1 rounded-lg transition-colors"
                                    title="點擊複製訂房代號"
                                >
                                    <span>{hotel.bookingReference}</span>
                                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                </button>
                            </div>
                        )}
                        {hotel.notes && (
                            <div className="flex items-start gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                                <AlignLeft className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                                <p className="leading-relaxed whitespace-pre-wrap">{hotel.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {hotel.address && (
                    <div className="mt-4 h-44 w-full rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800">
                        <iframe
                            title={`${hotel.name} map`}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            className="dark:invert-[.92] dark:hue-rotate-180 dark:brightness-95 dark:contrast-95"
                        ></iframe>
                    </div>
                )}
            </div>
        </div>
    );
}
