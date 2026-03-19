import { useState } from 'react';
import type { Trip } from '../types';
import { Calendar, MapPin, Trash2, Clock, CheckCircle2, Edit2 } from 'lucide-react';
import { format, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { GRADIENT_COLORS, DEFAULT_GRADIENT } from '../constants/gradients';

interface TripCardProps {
    trip: Trip;
    onEdit: () => void;
    onDelete: () => void;
}

export default function TripCard({ trip, onEdit, onDelete }: TripCardProps) {
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>距離啟程還有 {daysUntilStart} 天</span>
            </div>
        );
    } else if (daysUntilEnd >= 0) {
        statusBadge = (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 dark:bg-emerald-400"></span>
                </span>
                <span>進行中</span>
            </div>
        );
    } else {
        statusBadge = (
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>已結束</span>
            </div>
        );
    }

    const handleCardClick = () => {
        navigate(`/trip/${trip.id}`);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit();
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        setShowDeleteConfirm(false);
        onDelete();
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <>
            <div
                className="group block h-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col cursor-pointer mt-1"
                onClick={handleCardClick}
            >
                {/* Gradient Background Container */}
                <div className="relative h-48 overflow-hidden">
                    <div
                        className={`absolute inset-0 bg-gradient-to-br ${!trip.coverImageUrl ? (GRADIENT_COLORS[trip.coverColor as keyof typeof GRADIENT_COLORS]?.gradient ||
                            GRADIENT_COLORS[DEFAULT_GRADIENT].gradient) : ''
                            }`}
                        style={trip.coverImageUrl ? { backgroundImage: `url(${trip.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-90"></div>

                    {/* Action Buttons - Always visible */}
                    <div className="absolute top-3 right-3 flex gap-2 z-10 transition-transform duration-300 transform translate-y-0 opacity-100 group-hover:-translate-y-1">
                        <button
                            type="button"
                            onClick={handleEditClick}
                            className="p-2 bg-black/40 hover:bg-white text-white hover:text-blue-600 rounded-full backdrop-blur-md transition-colors border border-white/20 hover:border-white shadow-sm"
                            title="編輯旅程"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            className="p-2 bg-black/40 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-colors border border-white/20 hover:border-red-400 shadow-sm"
                            title="刪除旅程"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="absolute bottom-4 left-4 text-white z-10">
                        <h3 className="text-2xl font-bold mb-1 tracking-tight truncate drop-shadow-md">{trip.title}</h3>
                        <div className="flex items-center gap-2 text-sm font-medium text-white/90 drop-shadow-sm">
                            <MapPin className="w-4 h-4" />
                            {trip.destination}
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm font-medium">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            </div>
                            <span>
                                {format(trip.startDate.toDate(), 'yyyy/MM/dd')} - {format(trip.endDate.toDate(), 'yyyy/MM/dd')}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm font-medium">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            </div>
                            <span>{days} 天旅程</span>
                        </div>
                    </div>

                    <div className="flex justify-end mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/60">
                        {statusBadge}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="刪除旅程"
                message={`確定要刪除「${trip.title}」嗎？此操作無法復原。`}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
        </>
    );
}
