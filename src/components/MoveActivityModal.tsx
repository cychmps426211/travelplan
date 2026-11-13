import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Activity } from '../types';
import { parseLocalDate } from '../utils/date';
import Modal from './Modal';

interface MoveActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: (activityId: string, targetDate: Date) => Promise<void>;
    activity: Activity | null;
    days: Date[];
}

export default function MoveActivityModal({
    isOpen,
    onClose,
    onMove,
    activity,
    days
}: MoveActivityModalProps) {
    const [selectedDateStr, setSelectedDateStr] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && activity) {
            setSelectedDateStr(format(activity.startTime.toDate(), 'yyyy-MM-dd'));
        }
    }, [isOpen, activity]);

    if (!activity) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDateStr) return;

        const targetDate = parseLocalDate(selectedDateStr);
        setIsSubmitting(true);
        try {
            await onMove(activity.id, targetDate);
            onClose();
        } catch (error) {
            console.error('Failed to move activity', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="移動行程日期"
            maxWidthClass="max-w-md"
            footer={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 rounded-xl font-medium transition-colors"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        form="moveActivityForm"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
                    >
                        {isSubmitting ? '移動中...' : '確認移動'}
                    </button>
                </div>
            }
        >
            <form id="moveActivityForm" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2.5">
                    將「{activity.title}」移動至：
                </label>
                <select
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all tabular-nums"
                    required
                >
                    {days.map((day, index) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        return (
                            <option key={dateStr} value={dateStr}>
                                第 {index + 1} 天 ({format(day, 'MM/dd')})
                            </option>
                        );
                    })}
                </select>
            </form>
        </Modal>
    );
}
