import { useState, useEffect } from 'react';
import { X, Loader2, Navigation2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { getTravelDuration } from '../utils/googleMaps';

interface CreateActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    selectedDate: Date | null;
    initialData?: any;
}

const ACTIVITY_TYPES = [
    { value: 'sightseeing', label: '觀光', icon: '📷' },
    { value: 'food', label: '美食', icon: '🍽️' },
    { value: 'shopping', label: '購物', icon: '🛍️' },
    { value: 'transport', label: '交通', icon: '🚆' },
    { value: 'lodging', label: '住宿', icon: '🏨' },
    { value: 'other', label: '其他', icon: '📍' }
];

export default function CreateActivityModal({ isOpen, onClose, onSubmit, selectedDate, initialData }: CreateActivityModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingDuration, setFetchingDuration] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'sightseeing',
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        departureLocation: '',
        arrivalLocation: '',
        estimatedDuration: '',
        notes: ''
    });

    const handleFetchDuration = async () => {
        if (!formData.departureLocation || !formData.arrivalLocation) return;

        setFetchingDuration(true);
        try {
            const result = await getTravelDuration(formData.departureLocation, formData.arrivalLocation);
            setFormData(prev => ({
                ...prev,
                estimatedDuration: result.durationMinutes.toString()
            }));
        } catch (error) {
            console.error('Failed to fetch travel duration:', error);
            alert('無法取得預估時間，請確認地點名稱是否正確');
        } finally {
            setFetchingDuration(false);
        }
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                type: initialData.type,
                startTime: initialData.startTime ? new Date(initialData.startTime.seconds * 1000).toTimeString().slice(0, 5) : '09:00',
                endTime: initialData.endTime ? new Date(initialData.endTime.seconds * 1000).toTimeString().slice(0, 5) : '10:00',
                location: initialData.location || '',
                departureLocation: initialData.departureLocation || '',
                arrivalLocation: initialData.arrivalLocation || '',
                estimatedDuration: initialData.estimatedDuration?.toString() || '',
                notes: initialData.notes || ''
            });
        } else {
            setFormData({
                title: '',
                type: 'sightseeing',
                startTime: '09:00',
                endTime: '10:00',
                location: '',
                departureLocation: '',
                arrivalLocation: '',
                estimatedDuration: '',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate) return;

        setLoading(true);
        try {
            // Construct standard Javascript Date objects combining selectedDate (year/month/day) with time input (hours/minutes)
            const [startHour, startMinute] = formData.startTime.split(':');
            const startDate = new Date(selectedDate);
            startDate.setHours(parseInt(startHour), parseInt(startMinute));

            const [endHour, endMinute] = formData.endTime.split(':');
            const endDate = new Date(selectedDate);
            endDate.setHours(parseInt(endHour), parseInt(endMinute));

            await onSubmit({
                ...formData,
                startTime: Timestamp.fromDate(startDate),
                endTime: Timestamp.fromDate(endDate),
                estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : undefined
            });
            onClose();
            setFormData({
                title: '',
                type: 'sightseeing',
                startTime: '09:00',
                endTime: '10:00',
                location: '',
                departureLocation: '',
                arrivalLocation: '',
                estimatedDuration: '',
                notes: ''
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">{initialData ? '編輯活動' : '新增活動'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">標題</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="例如：參觀淺草寺"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                {ACTIVITY_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                                ))}
                            </select>
                        </div>
                        {formData.type !== 'transport' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">位置 (選填)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="例如：淺草站"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="col-span-1" />
                        )}
                    </div>

                    {formData.type === 'transport' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">出發地點 (選填)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="例如：東京車站"
                                    value={formData.departureLocation}
                                    onChange={e => setFormData({ ...formData, departureLocation: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">到達地點 (選填)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="例如：大阪站"
                                    value={formData.arrivalLocation}
                                    onChange={e => setFormData({ ...formData, arrivalLocation: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">預估交通時間 (分鐘，選填)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="例如：120"
                                        value={formData.estimatedDuration}
                                        onChange={e => setFormData({ ...formData, estimatedDuration: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        disabled={!formData.departureLocation || !formData.arrivalLocation || fetchingDuration}
                                        onClick={handleFetchDuration}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {fetchingDuration ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> 查詢中...</>
                                        ) : (
                                            <><Navigation2 className="w-4 h-4" /> 自動取得</>
                                        )}
                                    </button>
                                </div>
                                {!formData.departureLocation || !formData.arrivalLocation ? (
                                    <p className="text-xs text-gray-400 mt-1">請先填寫出發和到達地點</p>
                                ) : null}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
                            <input
                                type="time"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">結束時間 (選填)</label>
                            <input
                                type="time"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">備註 (選填)</label>
                        <textarea
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                            placeholder="任何細節或筆記..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center"
                        >
                            {loading ? '儲存中...' : '儲存活動'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
