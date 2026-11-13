import { useState } from 'react';
import { X, MapPin, Clock, FileText, Navigation, ExternalLink, Plus, Trash2, Check, Edit2, ListChecks, Link as LinkIcon, Navigation2 } from 'lucide-react';
import type { Activity, ChecklistItem } from '../types';
import { format } from 'date-fns';
import GoogleMapRoute from './GoogleMapRoute';
import Modal from './Modal';
import { getActivityMeta, TRAVEL_MODE_ICONS } from '../constants/activityTypes';
import { formatDuration, getHostnameLabel } from '../utils/date';
import { useToast } from '../hooks/useToast';

interface ActivityDetailModalProps {
    activity: Activity | null;
    onClose: () => void;
    onUpdateChecklist?: (activityId: string, checklist: ChecklistItem[]) => Promise<void>;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function getUrlTravelMode(travelMode?: string): string {
    switch (travelMode) {
        case 'DRIVING': return 'driving';
        case 'WALKING': return 'walking';
        case 'BICYCLING': return 'bicycling';
        case 'TRANSIT':
        default: return 'transit';
    }
}

function getExternalMapUrl(activity: Activity): string | null {
    if (activity.type === 'transport') {
        if (activity.departureLocation && activity.arrivalLocation) {
            const origin = encodeURIComponent(activity.departureLocation);
            const destination = encodeURIComponent(activity.arrivalLocation);
            const mode = getUrlTravelMode(activity.travelMode);
            return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
        } else if (activity.departureLocation || activity.arrivalLocation) {
            const location = encodeURIComponent(activity.departureLocation || activity.arrivalLocation || '');
            return `https://www.google.com/maps/search/?api=1&query=${location}`;
        }
    } else if (activity.location) {
        const location = encodeURIComponent(activity.location);
        return `https://www.google.com/maps/search/?api=1&query=${location}`;
    }
    return null;
}

function getChecklistLabel(type: string): string {
    switch (type) {
        case 'food': return '美食清單';
        case 'shopping': return '購物清單';
        default: return '待辦清單';
    }
}

export default function ActivityDetailModal({ activity, onClose, onUpdateChecklist }: ActivityDetailModalProps) {
    const { showToast } = useToast();
    const [newItemText, setNewItemText] = useState('');
    const [newItemAddress, setNewItemAddress] = useState('');
    const [newItemRemark, setNewItemRemark] = useState('');
    const [showAddressInput, setShowAddressInput] = useState(false);
    const [showRemarkInput, setShowRemarkInput] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [editingAddress, setEditingAddress] = useState('');
    const [editingRemark, setEditingRemark] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    if (!activity) return null;

    const meta = getActivityMeta(activity.type);
    const TypeIcon = meta.icon;
    const travelModeInfo = activity.travelMode ? TRAVEL_MODE_ICONS[activity.travelMode] : null;
    const TravelIcon = travelModeInfo?.icon;
    const externalMapUrl = getExternalMapUrl(activity);
    const hasRoute = activity.type === 'transport' && activity.departureLocation && activity.arrivalLocation;
    const hasMapContent = hasRoute || activity.location || activity.departureLocation || activity.arrivalLocation;
    const checklist = activity.checklist || [];
    const checklistLabel = getChecklistLabel(activity.type);

    const generateId = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const handleAddItem = async () => {
        if (!newItemText.trim() || !onUpdateChecklist) return;

        setIsUpdating(true);
        const newItem: ChecklistItem = {
            id: generateId(),
            text: newItemText.trim(),
            completed: false,
            ...(newItemAddress.trim() ? { address: newItemAddress.trim() } : {}),
            ...(newItemRemark.trim() ? { remark: newItemRemark.trim() } : {})
        };

        try {
            await onUpdateChecklist(activity.id, [...checklist, newItem]);
            setNewItemText('');
            setNewItemAddress('');
            setNewItemRemark('');
            setShowAddressInput(false);
            setShowRemarkInput(false);
        } catch (error) {
            console.error('Failed to add item:', error);
            showToast('新增清單項目失敗', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleItem = async (itemId: string) => {
        if (!onUpdateChecklist) return;

        setIsUpdating(true);
        const updatedChecklist = checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );

        try {
            await onUpdateChecklist(activity.id, updatedChecklist);
        } catch (error) {
            console.error('Failed to toggle item:', error);
            showToast('更新項目狀態失敗', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!onUpdateChecklist) return;

        setIsUpdating(true);
        const updatedChecklist = checklist.filter(item => item.id !== itemId);

        try {
            await onUpdateChecklist(activity.id, updatedChecklist);
        } catch (error) {
            console.error('Failed to delete item:', error);
            showToast('刪除項目失敗', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStartEdit = (item: ChecklistItem) => {
        setEditingItemId(item.id);
        setEditingText(item.text);
        setEditingAddress(item.address || '');
        setEditingRemark(item.remark || '');
    };

    const handleSaveEdit = async () => {
        if (!editingItemId || !editingText.trim() || !onUpdateChecklist) return;

        setIsUpdating(true);
        const updatedChecklist = checklist.map(item => {
            if (item.id === editingItemId) {
                const updated: ChecklistItem = { ...item, text: editingText.trim() };
                if (editingAddress.trim()) {
                    updated.address = editingAddress.trim();
                } else {
                    delete updated.address;
                }
                if (editingRemark.trim()) {
                    updated.remark = editingRemark.trim();
                } else {
                    delete updated.remark;
                }
                return updated;
            }
            return item;
        });

        try {
            await onUpdateChecklist(activity.id, updatedChecklist);
            setEditingItemId(null);
            setEditingText('');
            setEditingAddress('');
            setEditingRemark('');
        } catch (error) {
            console.error('Failed to update item:', error);
            showToast('更新清單項目失敗', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditingText('');
        setEditingAddress('');
        setEditingRemark('');
    };

    return (
        <Modal
            isOpen={Boolean(activity)}
            onClose={onClose}
            title={activity.title}
            subtitle={meta.label}
            maxWidthClass="max-w-2xl"
            headerLeading={
                <div className={`p-2 rounded-xl border shrink-0 ${meta.badgeClass}`}>
                    <TypeIcon className="w-5 h-5" />
                </div>
            }
            footer={
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-medium transition-colors"
                >
                    關閉
                </button>
            }
        >
            <div className="space-y-5">
                {/* Time */}
                <div className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <div className="tabular-nums font-medium">
                        <span>{format(activity.startTime.toDate(), 'yyyy/MM/dd HH:mm')}</span>
                        {activity.endTime && (
                            <span className="text-zinc-400 dark:text-zinc-500">
                                {' – '}{format(activity.endTime.toDate(), 'HH:mm')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Location */}
                {activity.type === 'transport' ? (
                    (activity.departureLocation || activity.arrivalLocation) && (
                        <div className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                            <Navigation className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <div className="space-y-1.5 min-w-0">
                                {activity.departureLocation && (
                                    <div>
                                        <span className="text-zinc-400 dark:text-zinc-500">出發：</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{activity.departureLocation}</span>
                                    </div>
                                )}
                                {activity.arrivalLocation && (
                                    <div>
                                        <span className="text-zinc-400 dark:text-zinc-500">到達：</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{activity.arrivalLocation}</span>
                                    </div>
                                )}
                                {(travelModeInfo || activity.estimatedDuration) && (
                                    <div className="pt-1 flex flex-wrap gap-2">
                                        {travelModeInfo && TravelIcon && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-xs font-medium">
                                                <TravelIcon className="w-3.5 h-3.5" />
                                                <span>{travelModeInfo.label}</span>
                                            </span>
                                        )}
                                        {activity.estimatedDuration && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 text-xs font-medium tabular-nums">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>預估 {formatDuration(activity.estimatedDuration)}</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    activity.location && (
                        <div className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                            <MapPin className="w-4 h-4 text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{activity.location}</span>
                        </div>
                    )
                )}

                {/* Notes */}
                {activity.notes && (
                    <div className="flex items-start gap-3 text-sm">
                        <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                        <p className="text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 p-3 rounded-xl flex-1 whitespace-pre-wrap leading-relaxed">
                            {activity.notes}
                        </p>
                    </div>
                )}

                {/* URLs */}
                {activity.urls && activity.urls.length > 0 && (
                    <div className="flex items-start gap-3 text-sm">
                        <LinkIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-1 shrink-0" />
                        <div className="flex flex-wrap gap-2">
                            {activity.urls.map((url, index) => (
                                <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                >
                                    <span className="truncate max-w-[200px]">{getHostnameLabel(url, index)}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Checklist Section */}
                {onUpdateChecklist && (
                    <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                <ListChecks className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                                <span>{checklistLabel}</span>
                                {checklist.length > 0 && (
                                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
                                        {checklist.filter(i => i.completed).length}/{checklist.length}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {checklist.map(item => (
                                <div
                                    key={item.id}
                                    className={`rounded-xl border transition-colors ${
                                        item.completed
                                            ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/70 dark:border-emerald-500/20'
                                            : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
                                    }`}
                                >
                                    {editingItemId === item.id ? (
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                    className="flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-blue-400 dark:border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleSaveEdit}
                                                    disabled={isUpdating}
                                                    aria-label="儲存"
                                                    className="p-2 shrink-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    aria-label="取消"
                                                    className="p-2 shrink-0 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <input
                                                    type="text"
                                                    value={editingAddress}
                                                    onChange={(e) => setEditingAddress(e.target.value)}
                                                    placeholder="地址（選填，可開啟 Google 地圖）"
                                                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                <input
                                                    type="text"
                                                    value={editingRemark}
                                                    onChange={(e) => setEditingRemark(e.target.value)}
                                                    placeholder="備註（選填）"
                                                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3 p-3">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleItem(item.id)}
                                                disabled={isUpdating}
                                                aria-label={item.completed ? `取消完成 ${item.text}` : `標記完成 ${item.text}`}
                                                className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                                                    item.completed
                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                        : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-400'
                                                }`}
                                            >
                                                {item.completed && <Check className="w-3 h-3" />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <span
                                                    className={`block text-sm ${
                                                        item.completed
                                                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                                                            : 'text-zinc-800 dark:text-zinc-200'
                                                    }`}
                                                >
                                                    {item.text}
                                                </span>
                                                {item.remark && (
                                                    <span
                                                        className={`block mt-0.5 text-xs break-words ${
                                                            item.completed
                                                                ? 'line-through text-zinc-400 dark:text-zinc-500'
                                                                : 'text-zinc-500 dark:text-zinc-400'
                                                        }`}
                                                    >
                                                        {item.remark}
                                                    </span>
                                                )}
                                                {item.address && (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                                                    >
                                                        <Navigation2 className="w-3 h-3" />
                                                        <span>在地圖開啟</span>
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEdit(item)}
                                                    disabled={isUpdating}
                                                    aria-label={`編輯 ${item.text}`}
                                                    className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    disabled={isUpdating}
                                                    aria-label={`刪除 ${item.text}`}
                                                    className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {checklist.length === 0 && (
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-3">
                                    還沒有項目，在下方新增一個吧
                                </p>
                            )}
                        </div>

                        {/* Add new item */}
                        <div className="space-y-2 pt-1">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !showAddressInput && !showRemarkInput) handleAddItem();
                                    }}
                                    placeholder={activity.type === 'food' ? '新增美食項目...' : activity.type === 'shopping' ? '新增購物項目...' : '新增項目...'}
                                    className="flex-1 min-w-0 px-3.5 py-2 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAddressInput(!showAddressInput)}
                                    title="加入地址"
                                    aria-label="加入地址"
                                    className={`px-3 py-2 shrink-0 rounded-xl border transition-colors ${
                                        showAddressInput
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                                    }`}
                                >
                                    <MapPin className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRemarkInput(!showRemarkInput)}
                                    title="加入備註"
                                    aria-label="加入備註"
                                    className={`px-3 py-2 shrink-0 rounded-xl border transition-colors ${
                                        showRemarkInput
                                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400'
                                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    disabled={!newItemText.trim() || isUpdating}
                                    className="px-3.5 py-2 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">新增</span>
                                </button>
                            </div>
                            {showAddressInput && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <input
                                        type="text"
                                        value={newItemAddress}
                                        onChange={(e) => setNewItemAddress(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddItem();
                                        }}
                                        placeholder="地址（選填）"
                                        className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            )}
                            {showRemarkInput && (
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <input
                                        type="text"
                                        value={newItemRemark}
                                        onChange={(e) => setNewItemRemark(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddItem();
                                        }}
                                        placeholder="備註（選填）"
                                        className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Map Section */}
                {hasMapContent && (
                    <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                <span>{hasRoute ? '交通路線' : '地圖位置'}</span>
                            </div>
                            {externalMapUrl && (
                                <a
                                    href={externalMapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    <span>用 Google 地圖開啟</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>

                        {GOOGLE_MAPS_API_KEY ? (
                            <GoogleMapRoute activity={activity} height={260} />
                        ) : (
                            <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                                需要設定 VITE_GOOGLE_MAPS_API_KEY 環境變數才能顯示內嵌地圖
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
