import React from 'react';
import type { Trip } from '../types';
import { Calendar, MapPin, Trash2, Clock, CheckCircle2, Edit2 } from 'lucide-react';
import { format, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { Link } from 'react-router-dom';

interface TripCardProps {
    trip: Trip;
    onDelete: (id: string) => void;
    onEdit: () => void;
}

export default function TripCard({ trip, onDelete, onEdit }: TripCardProps) {
    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(trip.id);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit();
    };

    const days = differenceInDays(trip.endDate.toDate(), trip.startDate.toDate()) + 1;

    // Status Logic
    const now = new Date();
    const startDate = trip.startDate.toDate();
    const endDate = trip.endDate.toDate();
    const daysUntilStart = differenceInCalendarDays(startDate, now);
    const daysUntilEnd = differenceInCalendarDays(endDate, now);

    let statusBadge;
    if (daysUntilStart > 0) {
        statusBadge = (
            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>距離啟程還有 {daysUntilStart} 天</span>
            </div>
        );
    } else if (daysUntilEnd >= 0) {
        statusBadge = (
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>進行中</span>
            </div>
        );
    } else {
        statusBadge = (
            <div className="flex items-center gap-1.5 text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>已結束</span>
            </div>
        );
    }

    return (
        <Link to={`/trip/${trip.id}`} className="group block h-full">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 h-full flex flex-col">
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                    <img
                        src={trip.coverImage || `https://source.unsplash.com/800x600/?${trip.destination},travel`}
                        alt={trip.destination}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            onClick={handleEdit}
                            className="p-2 bg-white/10 hover:bg-blue-500/90 text-white rounded-full backdrop-blur-sm transition-colors"
                            title="編輯旅程"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 bg-white/10 hover:bg-red-500/90 text-white rounded-full backdrop-blur-sm transition-colors"
                            title="刪除旅程"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="text-xl font-bold mb-1 shadow-black/50 drop-shadow-md">{trip.title}</h3>
                        <div className="flex items-center gap-2 text-sm font-medium/90">
                            <MapPin className="w-3.5 h-3.5" />
                            {trip.destination}
                        </div>
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span>
                                {format(trip.startDate.toDate(), 'yyyy/MM/dd')} - {format(trip.endDate.toDate(), 'yyyy/MM/dd')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            <span>{days} 天旅程</span>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-50">
                        {statusBadge}
                    </div>
                </div>
            </div>
        </Link>
    );
}
