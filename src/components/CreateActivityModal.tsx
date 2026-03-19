import { useState, useEffect } from 'react';
import { X, Loader2, Navigation2, Plus, Trash2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import {
    getTravelDuration,
    TRAVEL_MODE_OPTIONS,
    TRANSIT_MODE_OPTIONS,
    TRANSIT_ROUTING_OPTIONS
} from '../utils/googleMaps';
import type {
    TravelModeType,
    TransitModeType,
    TransitRoutingPreference
} from '../utils/googleMaps';

interface CreateActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    selectedDate: Date | null;
    initialData?: any;
    availableDays?: Date[];
}

const ACTIVITY_TYPES = [
    { value: 'sightseeing', label: '觀光', icon: '📷' },
    { value: 'food', label: '美食', icon: '🍽️' },
    { value: 'shopping', label: '購物', icon: '🛍️' },
    { value: 'transport', label: '交通', icon: '🚆' },
    { value: 'lodging', label: '住宿', icon: '🏨' },
    { value: 'other', label: '其他', icon: '📍' }
];

export default function CreateActivityModal({ isOpen, onClose, onSubmit, selectedDate, initialData, availableDays }: CreateActivityModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingDuration, setFetchingDuration] = useState(false);
    const [selectedDayString, setSelectedDayString] = useState<string>('');
    const [formData, setFormData] = useState({
        title: '',
        type: 'sightseeing',
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        departureLocation: '',
        arrivalLocation: '',
        estimatedDuration: '',
        travelMode: 'TRANSIT' as TravelModeType,
        transitModes: [] as TransitModeType[],
        transitRoutingPreference: '' as TransitRoutingPreference | '',
        notes: '',
        urls: [''] as string[]
    });

    const handleFetchDuration = async () => {
        if (!formData.departureLocation || !formData.arrivalLocation) return;

        setFetchingDuration(true);
        try {
            // Build transit options if using transit mode
            const transitOptions = formData.travelMode === 'TRANSIT' ? {
                modes: formData.transitModes.length > 0 ? formData.transitModes : undefined,
                routingPreference: formData.transitRoutingPreference || undefined
            } : undefined;

            const result = await getTravelDuration(
                formData.departureLocation,
                formData.arrivalLocation,
                formData.travelMode,
                transitOptions
            );
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

    const addUrlField = () => {
        setFormData(prev => ({ ...prev, urls: [...prev.urls, ''] }));
    };

    const removeUrlField = (index: number) => {
        setFormData(prev => {
            const newUrls = [...prev.urls];
            newUrls.splice(index, 1);
            if (newUrls.length === 0) {
                newUrls.push('');
            }
            return { ...prev, urls: newUrls };
        });
    };

    const updateUrlField = (index: number, value: string) => {
        setFormData(prev => {
            const newUrls = [...prev.urls];
            newUrls[index] = value;
            return { ...prev, urls: newUrls };
        });
    };

    const handleTransitModeToggle = (mode: TransitModeType) => {
        setFormData(prev => {
            const currentModes = prev.transitModes;
            if (currentModes.includes(mode)) {
                return { ...prev, transitModes: currentModes.filter(m => m !== mode) };
            } else {
                return { ...prev, transitModes: [...currentModes, mode] };
            }
        });
    };

    useEffect(() => {
        if (selectedDate) {
            setSelectedDayString(format(selectedDate, 'yyyy-MM-dd'));
        }
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
                travelMode: 'TRANSIT' as TravelModeType,
                transitModes: [] as TransitModeType[],
                transitRoutingPreference: '' as TransitRoutingPreference | '',
                notes: initialData.notes || '',
                urls: initialData.urls && initialData.urls.length > 0 ? initialData.urls : [''] as string[]
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
                travelMode: 'TRANSIT' as TravelModeType,
                transitModes: [] as TransitModeType[],
                transitRoutingPreference: '' as TransitRoutingPreference | '',
                notes: '',
                urls: [''] as string[]
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const targetDate = availableDays && availableDays.length > 0 && selectedDayString
            ? new Date(selectedDayString)
            : selectedDate;

        if (!targetDate) return;

        setLoading(true);
        try {
            // Construct standard Javascript Date objects combining targetDate (year/month/day) with time input (hours/minutes)
            const [startHour, startMinute] = formData.startTime.split(':');
            const startDate = new Date(targetDate);
            startDate.setHours(parseInt(startHour), parseInt(startMinute));

            const [endHour, endMinute] = formData.endTime.split(':');
            const endDate = new Date(targetDate);
            endDate.setHours(parseInt(endHour), parseInt(endMinute));

            // Build activity data, only including optional fields if they have values
            // Firestore does NOT accept undefined values
            const activityData: Record<string, any> = {
                title: formData.title,
                type: formData.type,
                startTime: Timestamp.fromDate(startDate),
                endTime: Timestamp.fromDate(endDate),
            };

            // Only add optional fields if they have values
            if (formData.location && formData.location.trim()) {
                activityData.location = formData.location.trim();
            }
            if (formData.departureLocation && formData.departureLocation.trim()) {
                activityData.departureLocation = formData.departureLocation.trim();
            }
            if (formData.arrivalLocation && formData.arrivalLocation.trim()) {
                activityData.arrivalLocation = formData.arrivalLocation.trim();
            }
            if (formData.estimatedDuration && formData.estimatedDuration.trim()) {
                activityData.estimatedDuration = parseInt(formData.estimatedDuration);
            }
            // Save travel mode settings for transport activities
            if (formData.type === 'transport') {
                activityData.travelMode = formData.travelMode;
                if (formData.transitModes.length > 0) {
                    activityData.transitModes = formData.transitModes;
                }
                if (formData.transitRoutingPreference) {
                    activityData.transitRoutingPreference = formData.transitRoutingPreference;
                }
            }
            if (formData.notes && formData.notes.trim()) {
                activityData.notes = formData.notes.trim();
            }
            const filteredUrls = formData.urls.filter(url => url.trim() !== '');
            if (filteredUrls.length > 0) {
                activityData.urls = filteredUrls;
            } else {
                activityData.urls = [];
            }

            await onSubmit(activityData);
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
                travelMode: 'TRANSIT' as TravelModeType,
                transitModes: [] as TransitModeType[],
                transitRoutingPreference: '' as TransitRoutingPreference | '',
                notes: '',
                urls: [''] as string[]
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
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 z-10">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{initialData && !availableDays ? '編輯活動' : '新增活動'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {availableDays && availableDays.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">選擇日期</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                value={selectedDayString}
                                onChange={e => setSelectedDayString(e.target.value)}
                                required
                            >
                                <option value="" disabled>請選擇日期</option>
                                {availableDays.map((day, index) => (
                                    <option key={index} value={format(day, 'yyyy-MM-dd')}>
                                        第 {index + 1} 天 ({format(day, 'MM/dd')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">標題</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="例如：參觀淺草寺"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">類型</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">位置 (選填)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">出發地點 (選填)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        placeholder="例如：東京車站"
                                        value={formData.departureLocation}
                                        onChange={e => setFormData({ ...formData, departureLocation: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">到達地點 (選填)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                        placeholder="例如：大阪站"
                                        value={formData.arrivalLocation}
                                        onChange={e => setFormData({ ...formData, arrivalLocation: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Travel Mode Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">交通方式</label>
                                <div className="flex flex-wrap gap-2">
                                    {TRAVEL_MODE_OPTIONS.map(mode => (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, travelMode: mode.value as TravelModeType })}
                                            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1 text-sm ${formData.travelMode === mode.value
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span>{mode.icon}</span>
                                            <span>{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Transit Mode Preferences - Only show when TRANSIT is selected */}
                            {formData.travelMode === 'TRANSIT' && (
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">偏好大眾運輸類型 (可多選)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {TRANSIT_MODE_OPTIONS.map(mode => (
                                                <button
                                                    key={mode.value}
                                                    type="button"
                                                    onClick={() => handleTransitModeToggle(mode.value as TransitModeType)}
                                                    className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 text-sm ${formData.transitModes.includes(mode.value as TransitModeType)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-800'
                                                        }`}
                                                >
                                                    <span>{mode.icon}</span>
                                                    <span>{mode.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">不選擇則使用所有可用類型</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">路線偏好</label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                            value={formData.transitRoutingPreference}
                                            onChange={e => setFormData({ ...formData, transitRoutingPreference: e.target.value as TransitRoutingPreference | '' })}
                                        >
                                            {TRANSIT_ROUTING_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">預估交通時間 (分鐘，選填)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">開始時間</label>
                            <input
                                type="time"
                                required
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">結束時間 (選填)</label>
                            <input
                                type="time"
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* 參考網址 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            參考網址 (選填)
                        </label>
                        <div className="space-y-2">
                            {formData.urls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => updateUrlField(index, e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="https://"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeUrlField(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addUrlField}
                            className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            新增網址
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">備註 (選填)</label>
                        <textarea
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="任何細節或筆記..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
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
