import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Activity } from '../types';

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
            // Find current date of the activity and set it as initial or default to first day
            const activityDateStr = format(activity.startTime.toDate(), 'yyyy-MM-dd');
            setSelectedDateStr(activityDateStr);
        }
    }, [isOpen, activity]);

    if (!isOpen || !activity) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDateStr) return;

        const targetDate = new Date(selectedDateStr);
        setIsSubmitting(true);
        try {
            await onMove(activity.id, targetDate);
            onClose();
        } catch (error) {
            console.error("Failed to move activity", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">移動行程</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            將「{activity.title}」移動至：
                        </label>
                        <select
                            value={selectedDateStr}
                            onChange={(e) => setSelectedDateStr(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
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
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                            disabled={isSubmitting}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            {isSubmitting ? '移動中...' : '確認移動'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
