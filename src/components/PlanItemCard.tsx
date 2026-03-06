import { useState } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Trash2, ChevronDown, ChevronUp, AlignLeft, CalendarPlus } from 'lucide-react';
import type { PlanItem } from '../types';

interface PlanItemCardProps {
    item: PlanItem;
    onEdit: () => void;
    onDelete: () => void;
    onToggleSchedule: (isScheduled: boolean) => void;
    onAddToItinerary?: () => void;
}

export default function PlanItemCard({ item, onEdit, onDelete, onToggleSchedule, onAddToItinerary }: PlanItemCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
            {/* Actions for Edit/Delete (visible on hover) */}
            <div className="absolute right-12 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 transition-all hover:scale-105"
                    title="編輯"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-red-600 rounded-lg shadow-sm border border-slate-200 transition-all hover:scale-105"
                    title="刪除"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Expand/Collapse Button (always visible) */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute right-3 top-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-20"
            >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {/* Header (Always Visible) */}
            <div
                className={`p-4 flex items-start gap-4 transition-colors hover:bg-gray-50/50 ${isExpanded ? 'border-b border-gray-100' : ''}`}
            >
                <div className="pt-0.5">
                    <input
                        type="checkbox"
                        checked={item.isScheduled || false}
                        onChange={(e) => onToggleSchedule(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                </div>
                <div
                    className="flex-1 cursor-pointer pr-20"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h3 className={`text-lg font-bold transition-all ${item.isScheduled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {item.name}
                    </h3>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 bg-gray-50/30 space-y-4">
                    {/* Location */}
                    {item.location && (
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-gray-900 font-medium">{item.location}</span>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-sm text-blue-600 hover:text-blue-800 hover:underline inline-block"
                                >
                                    在 Google Maps 中開啟
                                </a>
                            </div>
                        </div>
                    )}

                    {/* URLs */}
                    {item.urls && item.urls.length > 0 && (
                        <div className="flex items-start gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <div className="flex flex-col gap-1">
                                {item.urls.map((url, index) => (
                                    <a
                                        key={index}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline w-fit"
                                    >
                                        參考網頁 {index + 1}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                        <div className="flex items-start gap-2">
                            <AlignLeft className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {item.notes}
                            </p>
                        </div>
                    )}

                    {/* Empty placeholder if expanding but no extra content */}
                    {!item.location && (!item.urls || item.urls.length === 0) && !item.notes && (
                        <div className="text-sm text-gray-400 italic py-2">
                            無其他詳細資訊
                        </div>
                    )}

                    {/* Add to Itinerary Button */}
                    {!item.isScheduled && onAddToItinerary && (
                        <div className="pt-2 mt-2 border-t border-gray-200 border-dashed">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToItinerary();
                                }}
                                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <CalendarPlus className="w-4 h-4" />
                                加入行程
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
