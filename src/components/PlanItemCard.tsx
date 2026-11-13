import { useState } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Trash2, ChevronDown, ChevronUp, AlignLeft, CalendarPlus, Check, ExternalLink } from 'lucide-react';
import type { PlanItem } from '../types';
import { getHostnameLabel } from '../utils/date';

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
        <div className="cq-card cv-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors overflow-hidden group">
            {/* Header (Flex layout avoids button collision on mobile) */}
            <div
                className={`p-3.5 sm:p-4 flex items-center gap-3 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 ${
                    isExpanded ? 'border-b border-zinc-100 dark:border-zinc-800/80' : ''
                }`}
            >
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.isScheduled || false}
                    aria-label={item.isScheduled ? `取消標記 ${item.name}` : `標記 ${item.name} 為已規劃`}
                    onClick={() => onToggleSchedule(!item.isScheduled)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        item.isScheduled
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-blue-500'
                    }`}
                >
                    {item.isScheduled && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                    type="button"
                    className="flex-1 min-w-0 text-left py-0.5"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h3
                        className={`text-base font-semibold truncate transition-colors ${
                            item.isScheduled
                                ? 'text-zinc-400 dark:text-zinc-500 line-through'
                                : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                    >
                        {item.name}
                    </h3>
                    {item.location && !isExpanded && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                            {item.location}
                        </p>
                    )}
                </button>

                {/* Actions: always accessible on mobile */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            aria-label={`編輯 ${item.name}`}
                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            title="編輯"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            aria-label={`刪除 ${item.name}`}
                            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                            title="刪除"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-label={isExpanded ? '收合詳細資訊' : '展開詳細資訊'}
                        className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="expand-panel p-4 bg-zinc-50/70 dark:bg-zinc-950/50 space-y-3.5 text-sm">
                    {item.location && (
                        <div className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-zinc-900 dark:text-zinc-100 font-medium break-words">
                                    {item.location}
                                </span>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                    <span>地圖開啟</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    )}

                    {item.urls && item.urls.length > 0 && (
                        <div className="flex items-start gap-2.5">
                            <LinkIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <div className="flex flex-wrap gap-1.5">
                                {item.urls.map((url, index) => (
                                    <a
                                        key={index}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 px-2.5 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                    >
                                        <span className="truncate max-w-[180px]">{getHostnameLabel(url, index)}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {item.notes && (
                        <div className="flex items-start gap-2.5">
                            <AlignLeft className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {item.notes}
                            </p>
                        </div>
                    )}

                    {!item.location && (!item.urls || item.urls.length === 0) && !item.notes && (
                        <div className="text-xs text-zinc-400 dark:text-zinc-500 py-1">
                            無其他詳細資訊
                        </div>
                    )}

                    {!item.isScheduled && onAddToItinerary && (
                        <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToItinerary();
                                }}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <CalendarPlus className="w-4 h-4" />
                                <span>排入行程</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
