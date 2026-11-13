import { useState } from 'react';
import type { Trip } from '../types';
import { Calendar, MapPin, Trash2, Clock, CheckCircle2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { GRADIENT_COLORS, DEFAULT_GRADIENT } from '../constants/gradients';
import { runWithViewTransition } from '../utils/viewTransition';
import {
    diffCalendarDays,
    formatDateStrSlash,
    getTodayDateStr,
    getTripEndDateStr,
    getTripStartDateStr,
} from '../utils/date';

interface TripCardProps {
    trip: Trip;
    onEdit: () => void;
    onDelete: () => void;
}

export default function TripCard({ trip, onEdit, onDelete }: TripCardProps) {
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const startDateStr = getTripStartDateStr(trip);
    const endDateStr = getTripEndDateStr(trip);
    const days = diffCalendarDays(endDateStr, startDateStr) + 1;

    // Status Logic
    const todayStr = getTodayDateStr();
    const daysUntilStart = diffCalendarDays(startDateStr, todayStr);
    const daysUntilEnd = diffCalendarDays(endDateStr, todayStr);

    let statusBadge;
    if (daysUntilStart > 0) {
        statusBadge = (
            <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>還有 {daysUntilStart} 天出發</span>
            </span>
        );
    } else if (daysUntilEnd >= 0) {
        statusBadge = (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-medium">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>進行中</span>
            </span>
        );
    } else {
        statusBadge = (
            <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 px-2.5 py-1 rounded-lg text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>已結束</span>
            </span>
        );
    }

    const handleCardClick = () => {
        runWithViewTransition(() => {
            navigate(`/trip/${trip.id}`);
        });
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

    const coverGradient =
        GRADIENT_COLORS[trip.coverColor as keyof typeof GRADIENT_COLORS]?.gradient ||
        GRADIENT_COLORS[DEFAULT_GRADIENT].gradient;

    return (
        <>
            <article
                className="cq-card group h-full bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer"
                onClick={handleCardClick}
            >
                {/* Cover Area */}
                <div className="relative h-44 overflow-hidden">
                    <div
                        className={`absolute inset-0 bg-gradient-to-br ${!trip.coverImageUrl ? coverGradient : ''}`}
                        style={
                            trip.coverImageUrl
                                ? {
                                      backgroundImage: `url(${trip.coverImageUrl})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                  }
                                : {}
                        }
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

                    {/* Action Buttons - always reachable on touch, subtle reveal on desktop hover */}
                    <div className="absolute top-3 right-3 flex gap-1.5 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                        <button
                            type="button"
                            onClick={handleEditClick}
                            aria-label={`編輯 ${trip.title}`}
                            className="w-9 h-9 flex items-center justify-center bg-black/45 hover:bg-black/70 text-white rounded-xl backdrop-blur-md transition-colors border border-white/15"
                            title="編輯旅程"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            aria-label={`刪除 ${trip.title}`}
                            className="w-9 h-9 flex items-center justify-center bg-black/45 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-colors border border-white/15"
                            title="刪除旅程"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="absolute bottom-3.5 left-4 right-4 text-white z-10">
                        <h3
                            className="cq-trip-title text-xl font-bold mb-1 tracking-tight truncate"
                            style={{ viewTransitionName: `trip-title-${trip.id}` }}
                        >
                            {trip.title}
                        </h3>
                        <div
                            className="flex items-center gap-1.5 text-xs font-medium text-white/85 w-fit"
                            style={{ viewTransitionName: `trip-dest-${trip.id}` }}
                        >
                            <MapPin className="w-3.5 h-3.5 shrink-0 opacity-85" />
                            <span className="truncate">{trip.destination}</span>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="cq-card-body p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="cq-trip-meta space-y-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-2 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span>
                                {formatDateStrSlash(startDateStr)} – {formatDateStrSlash(endDateStr, false)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span>共 {days} 天</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {trip.currency || 'TWD'}
                        </span>
                        {statusBadge}
                    </div>
                </div>
            </article>

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
