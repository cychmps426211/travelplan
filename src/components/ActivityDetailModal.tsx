import { useState } from 'react';
import { X, MapPin, Clock, FileText, Utensils, Bed, Car, Camera, Tag, Navigation, ExternalLink, Plus, Trash2, Check, Edit2, ListChecks, Link as LinkIcon, Navigation2 } from 'lucide-react';
import type { Activity, ChecklistItem } from '../types';
import { format } from 'date-fns';
import GoogleMapRoute from './GoogleMapRoute';

interface ActivityDetailModalProps {
    activity: Activity | null;
    onClose: () => void;
    onUpdateChecklist?: (activityId: string, checklist: ChecklistItem[]) => Promise<void>;
}

const ACTIVITY_TYPE_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    sightseeing: { label: '觀光', icon: <Camera className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600 dark:text-blue-400' },
    food: { label: '美食', icon: <Utensils className="w-5 h-5" />, color: 'bg-orange-100 text-orange-600' },
    transport: { label: '交通', icon: <Car className="w-5 h-5" />, color: 'bg-green-100 text-green-600' },
    lodging: { label: '住宿', icon: <Bed className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
    shopping: { label: '購物', icon: <Tag className="w-5 h-5" />, color: 'bg-pink-100 text-pink-600' },
    other: { label: '其他', icon: <MapPin className="w-5 h-5" />, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' }
};

// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Map travel mode to Google Maps URL travelmode parameter
function getUrlTravelMode(travelMode?: string): string {
    switch (travelMode) {
        case 'DRIVING': return 'driving';
        case 'WALKING': return 'walking';
        case 'BICYCLING': return 'bicycling';
        case 'TRANSIT':
        default: return 'transit';
    }
}

// Travel mode display info
const TRAVEL_MODE_DISPLAY: Record<string, { label: string; icon: string }> = {
    'TRANSIT': { label: '大眾運輸', icon: '🚇' },
    'DRIVING': { label: '開車', icon: '🚗' },
    'WALKING': { label: '步行', icon: '🚶' },
    'BICYCLING': { label: '自行車', icon: '🚲' },
};

// Generate external Google Maps URL (for opening in new tab/app)
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

// Get checklist label based on activity type
function getChecklistLabel(type: string): string {
    switch (type) {
        case 'food': return '美食清單';
        case 'shopping': return '購物清單';
        default: return '待辦清單';
    }
}

export default function ActivityDetailModal({ activity, onClose, onUpdateChecklist }: ActivityDetailModalProps) {
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

    const typeInfo = ACTIVITY_TYPE_INFO[activity.type] || ACTIVITY_TYPE_INFO.other;
    const externalMapUrl = getExternalMapUrl(activity);
    const hasRoute = activity.type === 'transport' && activity.departureLocation && activity.arrivalLocation;
    const hasMapContent = hasRoute || activity.location || activity.departureLocation || activity.arrivalLocation;
    const checklist = activity.checklist || [];
    const checklistLabel = getChecklistLabel(activity.type);

    // Generate unique ID for checklist items
    const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add new item
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
        } finally {
            setIsUpdating(false);
        }
    };

    // Toggle item completion
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
        } finally {
            setIsUpdating(false);
        }
    };

    // Delete item
    const handleDeleteItem = async (itemId: string) => {
        if (!onUpdateChecklist) return;

        setIsUpdating(true);
        const updatedChecklist = checklist.filter(item => item.id !== itemId);

        try {
            await onUpdateChecklist(activity.id, updatedChecklist);
        } catch (error) {
            console.error('Failed to delete item:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    // Start editing item
    const handleStartEdit = (item: ChecklistItem) => {
        setEditingItemId(item.id);
        setEditingText(item.text);
        setEditingAddress(item.address || '');
        setEditingRemark(item.remark || '');
    };

    // Save edited item
    const handleSaveEdit = async () => {
        if (!editingItemId || !editingText.trim() || !onUpdateChecklist) return;

        setIsUpdating(true);
        const updatedChecklist = checklist.map(item => {
            if (item.id === editingItemId) {
                const updated = { ...item, text: editingText.trim() };
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
        } finally {
            setIsUpdating(false);
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditingText('');
        setEditingAddress('');
        setEditingRemark('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                            {typeInfo.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{activity.title}</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{typeInfo.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Time Section */}
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <div>
                            <span className="font-medium">
                                {format(activity.startTime.toDate(), 'yyyy/MM/dd HH:mm')}
                            </span>
                            {activity.endTime && (
                                <span className="text-gray-500 dark:text-gray-400">
                                    {' ~ '}{format(activity.endTime.toDate(), 'HH:mm')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Location Section */}
                    {activity.type === 'transport' ? (
                        (activity.departureLocation || activity.arrivalLocation) && (
                            <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                                <Navigation className="w-5 h-5 text-green-500 mt-0.5" />
                                <div className="space-y-1">
                                    {activity.departureLocation && (
                                        <div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">出發：</span>
                                            <span className="font-medium">{activity.departureLocation}</span>
                                        </div>
                                    )}
                                    {activity.arrivalLocation && (
                                        <div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">到達：</span>
                                            <span className="font-medium">{activity.arrivalLocation}</span>
                                        </div>
                                    )}
                                    <div className="pt-1 flex flex-wrap gap-2">
                                        {activity.travelMode && TRAVEL_MODE_DISPLAY[activity.travelMode] && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                                                <span>{TRAVEL_MODE_DISPLAY[activity.travelMode].icon}</span>
                                                {TRAVEL_MODE_DISPLAY[activity.travelMode].label}
                                            </span>
                                        )}
                                        {activity.estimatedDuration && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                預估 {activity.estimatedDuration >= 60
                                                    ? `${Math.floor(activity.estimatedDuration / 60)} 小時${activity.estimatedDuration % 60 > 0 ? ` ${activity.estimatedDuration % 60} 分鐘` : ''}`
                                                    : `${activity.estimatedDuration} 分鐘`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        activity.location && (
                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                <MapPin className="w-5 h-5 text-red-500" />
                                <span className="font-medium">{activity.location}</span>
                            </div>
                        )
                    )}

                    {/* Notes Section */}
                    {activity.notes && (
                        <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                            <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg flex-1">{activity.notes}</p>
                        </div>
                    )}

                    {/* URLs Section */}
                    {activity.urls && activity.urls.length > 0 && (
                        <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                            <LinkIcon className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="flex flex-col gap-1.5 pt-0.5">
                                {activity.urls.map((url, index) => (
                                    <a
                                        key={index}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline w-fit"
                                    >
                                        參考網頁 {index + 1}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Checklist Section */}
                    {onUpdateChecklist && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <ListChecks className="w-5 h-5 text-purple-500" />
                                <span className="font-medium">{checklistLabel}</span>
                                {checklist.length > 0 && (
                                    <span className="text-sm text-gray-400">
                                        ({checklist.filter(i => i.completed).length}/{checklist.length})
                                    </span>
                                )}
                            </div>

                            {/* Checklist Items */}
                            <div className="space-y-2">
                                {checklist.map(item => (
                                    <div
                                        key={item.id}
                                        className={`rounded-lg border transition-all ${item.completed
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300'
                                            }`}
                                    >
                                        {editingItemId === item.id ? (
                                            // Edit mode
                                            <div className="p-3 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        value={editingText}
                                                        onChange={(e) => setEditingText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveEdit();
                                                            if (e.key === 'Escape') handleCancelEdit();
                                                        }}
                                                        className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        disabled={isUpdating}
                                                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {/* Address edit field */}
                                                <div className="flex items-center gap-2 pl-1">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={editingAddress}
                                                        onChange={(e) => setEditingAddress(e.target.value)}
                                                        placeholder="地址（選填，可開啟 Google 地圖）"
                                                        className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                    />
                                                </div>
                                                {/* Remark edit field */}
                                                <div className="flex items-center gap-2 pl-1">
                                                    <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={editingRemark}
                                                        onChange={(e) => setEditingRemark(e.target.value)}
                                                        placeholder="備註（選填）"
                                                        className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            // View mode
                                            <div className="flex items-start gap-3 p-3">
                                                <button
                                                    onClick={() => handleToggleItem(item.id)}
                                                    disabled={isUpdating}
                                                    className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${item.completed
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                                                        }`}
                                                >
                                                    {item.completed && <Check className="w-3 h-3" />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`block ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {item.text}
                                                    </span>
                                                    {item.remark && (
                                                        <span className={`block mt-0.5 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-500 dark:text-gray-400'} break-words`}>
                                                            {item.remark}
                                                        </span>
                                                    )}
                                                    {/* Google Maps button if address exists */}
                                                    {item.address && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2 py-0.5 rounded-full transition-colors"
                                                        >
                                                            <Navigation2 className="w-3 h-3" />
                                                            用 Google 地圖開啟
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleStartEdit(item)}
                                                        disabled={isUpdating}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        disabled={isUpdating}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Empty state */}
                                {checklist.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">
                                        還沒有任何項目，在下方新增一個吧！
                                    </p>
                                )}
                            </div>

                            {/* Add new item */}
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newItemText}
                                        onChange={(e) => setNewItemText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !showAddressInput) handleAddItem();
                                        }}
                                        placeholder={activity.type === 'food' ? '新增美食項目...' : activity.type === 'shopping' ? '新增購物項目...' : '新增項目...'}
                                        className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAddressInput(!showAddressInput)}
                                        title="加入地址"
                                        className={`px-3 py-2 rounded-lg border transition-colors ${
                                            showAddressInput
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-emerald-600 hover:border-emerald-300'
                                        }`}
                                    >
                                        <MapPin className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowRemarkInput(!showRemarkInput)}
                                        title="加入備註"
                                        className={`px-3 py-2 rounded-lg border transition-colors ${
                                            showRemarkInput
                                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-600 hover:border-blue-300'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleAddItem}
                                        disabled={!newItemText.trim() || isUpdating}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        新增
                                    </button>
                                </div>
                                {/* Optional address input */}
                                {showAddressInput && (
                                    <div className="flex items-center gap-2 px-1">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <input
                                            type="text"
                                            value={newItemAddress}
                                            onChange={(e) => setNewItemAddress(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddItem();
                                            }}
                                            placeholder="地址（選填）"
                                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-emerald-200 dark:border-emerald-800 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                )}
                                {/* Optional remark input */}
                                {showRemarkInput && (
                                    <div className="flex items-center gap-2 px-1 mt-2">
                                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        <input
                                            type="text"
                                            value={newItemRemark}
                                            onChange={(e) => setNewItemRemark(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddItem();
                                            }}
                                            placeholder="備註（選填）"
                                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Open in Google Maps Link */}
                    {externalMapUrl && (
                        <a
                            href={externalMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors font-medium"
                        >
                            <ExternalLink className="w-4 h-4" />
                            用 Google 地圖開啟
                        </a>
                    )}

                    {/* Map Section */}
                    {hasMapContent && GOOGLE_MAPS_API_KEY && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <MapPin className="w-5 h-5 text-blue-500" />
                                <span className="font-medium">
                                    {hasRoute ? '交通路線' : '地圖位置'}
                                </span>
                            </div>
                            <GoogleMapRoute activity={activity} height={300} />
                        </div>
                    )}

                    {/* No map message if no API key */}
                    {hasMapContent && !GOOGLE_MAPS_API_KEY && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                            需要設定 VITE_GOOGLE_MAPS_API_KEY 環境變數才能顯示地圖
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
}
