import { Building2, MapPin, Calendar, Clock, Edit2, Trash2, AlignLeft } from 'lucide-react';
import type { HotelInfo } from '../types';

interface HotelCardProps {
    hotel: HotelInfo;
    onEdit: () => void;
    onDelete: () => void;
}

export default function HotelCard({ hotel, onEdit, onDelete }: HotelCardProps) {
    const checkIn = hotel.checkIn.toDate();
    const checkOut = hotel.checkOut.toDate();

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            weekday: 'short'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
            {/* Actions */}
            <div className="absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={onEdit}
                    className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 transition-all hover:scale-105"
                    title="編輯"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-red-600 rounded-lg shadow-sm border border-slate-200 transition-all hover:scale-105"
                    title="刪除"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{hotel.name}</h3>
                        {hotel.address && (
                            <div className="flex items-center gap-1.5 text-gray-600 text-sm mt-1">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="line-clamp-1">{hotel.address}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    {/* Check-In */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Check-in</div>
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-medium text-gray-900">{formatDate(checkIn)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{formatTime(checkIn)} 之後</span>
                        </div>
                    </div>

                    {/* Check-Out */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Check-out</div>
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-medium text-gray-900">{formatDate(checkOut)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{formatTime(checkOut)} 之前</span>
                        </div>
                    </div>
                </div>

                {(hotel.bookingReference || hotel.notes) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        {hotel.bookingReference && (
                            <div className="flex items-start gap-2 text-sm">
                                <span className="text-gray-500 font-medium shrink-0">訂房代號:</span>
                                <span className="text-gray-900 font-mono bg-gray-100 px-2 py-0.5 rounded">{hotel.bookingReference}</span>
                            </div>
                        )}
                        {hotel.notes && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                                <AlignLeft className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                <p className="leading-relaxed whitespace-pre-wrap">{hotel.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
