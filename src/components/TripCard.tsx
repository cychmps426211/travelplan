import { useState } from 'react';
import type { Trip } from '../types';
import { Calendar, MapPin, Trash2, Clock, CheckCircle2, Edit2 } from 'lucide-react';
import { format, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';

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
                className="group block h-full bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer"
                onClick={handleCardClick}
            >
                {/* Image Container */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                    <img
                        src={trip.coverImage || `https://source.unsplash.com/800x600/?${trip.destination},travel`}
                        alt={trip.destination}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                    {/* Action Buttons - Always visible */}
                    <div className="absolute top-3 right-3 flex gap-2 z-50">
                        <button
                            type="button"
                            onClick={handleEditClick}
                            className="p-2 bg-white/20 hover:bg-blue-500 text-white rounded-full backdrop-blur-sm transition-colors"
                            title="編輯旅程"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            className="p-2 bg-white/20 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors"
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

                {/* Content Body */}
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
