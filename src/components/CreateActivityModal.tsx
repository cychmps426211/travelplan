import { useState, useEffect, useMemo } from 'react';
import { Calendar, Loader2, Navigation2, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from './Modal';
import CustomSelect, { type SelectOption } from './CustomSelect';
import TimePicker from './TimePicker';
import { ACTIVITY_TYPES, TRAVEL_MODE_ICONS } from '../constants/activityTypes';
import {
    addMinutesToTimeStr,
    getActivityEndParts,
    getActivityStartParts,
    timeStrToMinutes,
    wallClockToCompatTimestamp,
} from '../utils/date';
import { useToast } from '../hooks/useToast';
import type { Activity } from '../types';
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

export type ActivityFormSubmitData = Omit<Activity, 'id' | 'tripId'>;

interface CreateActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ActivityFormSubmitData) => Promise<void>;
    selectedDate: Date | null;
    initialData?: Partial<Activity> | null;
    availableDays?: Date[];
    defaultStartTime?: string;
}

const inputBaseClass =
    'w-full min-w-0 max-w-full min-h-[46px] sm:min-h-[42px] px-3.5 py-2.5 text-base sm:text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all';

export default function CreateActivityModal({
    isOpen,
    onClose,
    onSubmit,
    selectedDate,
    initialData,
    availableDays,
    defaultStartTime = '09:00',
}: CreateActivityModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fetchingDuration, setFetchingDuration] = useState(false);
    const [selectedDayString, setSelectedDayString] = useState<string>('');
    const [formData, setFormData] = useState({
        title: '',
        type: 'sightseeing' as Activity['type'],
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
            showToast(`已取得預估交通時間：${result.durationMinutes} 分鐘`, 'success');
        } catch (error) {
            console.error('Failed to fetch travel duration:', error);
            const isZeroResults = error instanceof Error && error.message.includes('ZERO_RESULTS');
            if (isZeroResults && formData.travelMode === 'TRANSIT') {
                showToast('此地區暫不支援大眾運輸時間查詢，建議手動輸入或改用其他交通方式。', 'info');
            } else {
                showToast('無法取得預估時間，請確認地點名稱是否正確。', 'error');
            }
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
            }
            return { ...prev, transitModes: [...currentModes, mode] };
        });
    };

    const handleStartTimeChange = (nextStart: string) => {
        setFormData(prev => {
            const prevStartMin = timeStrToMinutes(prev.startTime);
            const prevEndMin = prev.endTime ? timeStrToMinutes(prev.endTime) : prevStartMin + 60;
            const duration = prevEndMin > prevStartMin ? prevEndMin - prevStartMin : 60;
            const nextEnd = prev.endTime ? addMinutesToTimeStr(nextStart, duration) : prev.endTime;
            return {
                ...prev,
                startTime: nextStart,
                endTime: nextEnd,
            };
        });
    };

    useEffect(() => {
        if (!isOpen) return;

        const startParts = initialData ? getActivityStartParts(initialData) : null;
        const endParts = initialData ? getActivityEndParts(initialData) : null;

        if (startParts?.date && !availableDays) {
            setSelectedDayString(startParts.date);
        } else if (selectedDate) {
            setSelectedDayString(format(selectedDate, 'yyyy-MM-dd'));
        }

        if (initialData) {
            const startStr = startParts ? startParts.time : defaultStartTime;
            const endStr = endParts ? endParts.time : (startParts ? '' : addMinutesToTimeStr(startStr, 60));

            setFormData({
                title: initialData.title || '',
                type: initialData.type || 'sightseeing',
                startTime: startStr,
                endTime: endStr,
                location: initialData.location || '',
                departureLocation: initialData.departureLocation || '',
                arrivalLocation: initialData.arrivalLocation || '',
                estimatedDuration: initialData.estimatedDuration?.toString() || '',
                travelMode: (initialData.travelMode || 'TRANSIT') as TravelModeType,
                transitModes: (initialData.transitModes || []) as TransitModeType[],
                transitRoutingPreference: (initialData.transitRoutingPreference || '') as TransitRoutingPreference | '',
                notes: initialData.notes || '',
                urls: initialData.urls && initialData.urls.length > 0 ? initialData.urls : ['']
            });
        } else {
            const initialStart = defaultStartTime || '09:00';
            setFormData({
                title: '',
                type: 'sightseeing',
                startTime: initialStart,
                endTime: addMinutesToTimeStr(initialStart, 60),
                location: '',
                departureLocation: '',
                arrivalLocation: '',
                estimatedDuration: '',
                travelMode: 'TRANSIT',
                transitModes: [],
                transitRoutingPreference: '',
                notes: '',
                urls: ['']
            });
        }
    }, [initialData, isOpen, selectedDate, defaultStartTime, availableDays]);

    const dayOptions = useMemo<SelectOption[]>(
        () =>
            (availableDays || []).map((day, index) => ({
                value: format(day, 'yyyy-MM-dd'),
                label: `第 ${index + 1} 天 (${format(day, 'MM/dd')})`,
            })),
        [availableDays]
    );

    const routingOptions = useMemo<SelectOption<TransitRoutingPreference | ''>[]>(
        () =>
            TRANSIT_ROUTING_OPTIONS.map((option) => ({
                value: option.value as TransitRoutingPreference | '',
                label: option.label,
            })),
        []
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (availableDays && availableDays.length > 0 && !selectedDayString) {
            showToast('請選擇活動日期', 'error');
            return;
        }

        const targetDateStr = availableDays && availableDays.length > 0 && selectedDayString
            ? selectedDayString
            : (selectedDayString || (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''));

        if (!targetDateStr) return;

        if (!formData.startTime) {
            showToast('請選擇開始時間', 'error');
            return;
        }

        if (formData.endTime && timeStrToMinutes(formData.endTime) < timeStrToMinutes(formData.startTime)) {
            showToast('結束時間不能早於開始時間', 'error');
            return;
        }

        setLoading(true);
        try {
            const activityData: ActivityFormSubmitData = {
                title: formData.title.trim(),
                type: formData.type,
                startTime: wallClockToCompatTimestamp(targetDateStr, formData.startTime),
                startTimeStr: `${targetDateStr}T${formData.startTime}`,
            };

            if (formData.endTime) {
                activityData.endTime = wallClockToCompatTimestamp(targetDateStr, formData.endTime);
                activityData.endTimeStr = `${targetDateStr}T${formData.endTime}`;
            }

            if (formData.location.trim()) {
                activityData.location = formData.location.trim();
            }
            if (formData.departureLocation.trim()) {
                activityData.departureLocation = formData.departureLocation.trim();
            }
            if (formData.arrivalLocation.trim()) {
                activityData.arrivalLocation = formData.arrivalLocation.trim();
            }
            if (formData.estimatedDuration.trim()) {
                activityData.estimatedDuration = parseInt(formData.estimatedDuration, 10);
            }
            if (formData.type === 'transport') {
                activityData.travelMode = formData.travelMode;
                if (formData.transitModes.length > 0) {
                    activityData.transitModes = formData.transitModes;
                }
                if (formData.transitRoutingPreference) {
                    activityData.transitRoutingPreference = formData.transitRoutingPreference;
                }
            }
            if (formData.notes.trim()) {
                activityData.notes = formData.notes.trim();
            }
            const filteredUrls = formData.urls.filter(url => url.trim() !== '');
            activityData.urls = filteredUrls;

            await onSubmit(activityData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const isEditing = Boolean(initialData && initialData.id && !availableDays);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? '編輯活動' : '新增活動'}
            maxWidthClass="max-w-lg"
            footer={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-colors font-medium"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        form="activityForm"
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center"
                    >
                        {loading ? '儲存中...' : '儲存活動'}
                    </button>
                </div>
            }
        >
            <form id="activityForm" onSubmit={handleSubmit} className="space-y-4 w-full min-w-0 max-w-full">
                {availableDays && availableDays.length > 0 && (
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">選擇日期</label>
                        <CustomSelect
                            label="選擇日期"
                            placeholder="請選擇日期"
                            leadingIcon={<Calendar className="w-4 h-4" />}
                            options={dayOptions}
                            value={selectedDayString}
                            onChange={setSelectedDayString}
                        />
                    </div>
                )}

                <div className="min-w-0">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">標題</label>
                    <input
                        type="text"
                        required
                        className={inputBaseClass}
                        placeholder="例如：參觀淺草寺"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                {/* Tactile 3x2 Category Selector */}
                <div className="min-w-0">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">類型</label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 min-w-0">
                        {ACTIVITY_TYPES.map(typeItem => {
                            const Icon = typeItem.icon;
                            const isSelected = formData.type === typeItem.value;
                            return (
                                <button
                                    key={typeItem.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: typeItem.value })}
                                    className={`min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                                        isSelected
                                            ? typeItem.activePillClass
                                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{typeItem.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {formData.type !== 'transport' ? (
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">位置（選填）</label>
                        <input
                            type="text"
                            className={inputBaseClass}
                            placeholder="例如：淺草站"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 p-3 sm:p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800 min-w-0 max-w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                            <div className="min-w-0">
                                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">出發地點（選填）</label>
                                <input
                                    type="text"
                                    className={inputBaseClass}
                                    placeholder="例如：東京車站"
                                    value={formData.departureLocation}
                                    onChange={e => setFormData({ ...formData, departureLocation: e.target.value })}
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">到達地點（選填）</label>
                                <input
                                    type="text"
                                    className={inputBaseClass}
                                    placeholder="例如：大阪站"
                                    value={formData.arrivalLocation}
                                    onChange={e => setFormData({ ...formData, arrivalLocation: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">交通方式</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
                                {TRAVEL_MODE_OPTIONS.map(mode => {
                                    const ModeIcon = TRAVEL_MODE_ICONS[mode.value]?.icon;
                                    const active = formData.travelMode === mode.value;
                                    return (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, travelMode: mode.value as TravelModeType })}
                                            className={`min-w-0 px-2.5 py-2 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                                active
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                        >
                                            {ModeIcon && <ModeIcon className="w-3.5 h-3.5 shrink-0" />}
                                            <span className="truncate">{mode.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {formData.travelMode === 'TRANSIT' && (
                            <div className="bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 p-2.5 sm:p-3 rounded-xl space-y-3 min-w-0 max-w-full">
                                <div className="min-w-0">
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-2">偏好大眾運輸類型（可多選）</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {TRANSIT_MODE_OPTIONS.map(mode => {
                                            const active = formData.transitModes.includes(mode.value as TransitModeType);
                                            return (
                                                <button
                                                    key={mode.value}
                                                    type="button"
                                                    onClick={() => handleTransitModeToggle(mode.value as TransitModeType)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                                        active
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                    }`}
                                                >
                                                    {mode.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">不選擇則使用所有可用類型</p>
                                </div>
                                <div className="min-w-0">
                                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1.5">路線偏好</label>
                                    <CustomSelect
                                        label="路線偏好"
                                        options={routingOptions}
                                        value={formData.transitRoutingPreference}
                                        onChange={val => setFormData({ ...formData, transitRoutingPreference: val })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">預估交通時間（分鐘，選填）</label>
                            <div className="flex gap-2 min-w-0">
                                <input
                                    type="number"
                                    min="0"
                                    className={`${inputBaseClass} flex-1 min-w-0 tabular-nums`}
                                    placeholder="例如：45"
                                    value={formData.estimatedDuration}
                                    onChange={e => setFormData({ ...formData, estimatedDuration: e.target.value })}
                                />
                                <button
                                    type="button"
                                    disabled={!formData.departureLocation || !formData.arrivalLocation || fetchingDuration}
                                    onClick={handleFetchDuration}
                                    className="px-3.5 py-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                >
                                    {fetchingDuration ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /><span>查詢中</span></>
                                    ) : (
                                        <><Navigation2 className="w-4 h-4" /><span>自動估算</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 min-w-0">
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">開始時間</label>
                        <TimePicker
                            label="開始時間"
                            value={formData.startTime}
                            onChange={handleStartTimeChange}
                        />
                    </div>
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">結束時間（選填）</label>
                        <TimePicker
                            label="結束時間（選填）"
                            placeholder="未設定"
                            allowEmpty
                            fallbackTime={addMinutesToTimeStr(formData.startTime || '09:00', 60)}
                            value={formData.endTime}
                            onChange={val => setFormData({ ...formData, endTime: val })}
                        />
                    </div>
                </div>

                {/* URLs */}
                <div className="min-w-0">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                        參考網址（選填）
                    </label>
                    <div className="space-y-2 min-w-0">
                        {formData.urls.map((url, index) => (
                            <div key={index} className="flex gap-2 min-w-0">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrlField(index, e.target.value)}
                                    className={`${inputBaseClass} flex-1 min-w-0`}
                                    placeholder="https://"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeUrlField(index)}
                                    aria-label="移除網址"
                                    className="p-2.5 shrink-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addUrlField}
                        className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新增網址</span>
                    </button>
                </div>

                <div className="min-w-0">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">備註（選填）</label>
                    <textarea
                        rows={3}
                        className={`${inputBaseClass} resize-none`}
                        placeholder="任何細節或筆記..."
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>
            </form>
        </Modal>
    );
}
