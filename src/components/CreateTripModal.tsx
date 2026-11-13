import { useState, useEffect } from 'react';
import { MapPin, Palette, Upload, DollarSign, Check } from 'lucide-react';
import { format } from 'date-fns';
import { GRADIENT_COLORS, DEFAULT_GRADIENT, type GradientColorKey } from '../constants/gradients';
import type { Trip } from '../types';
import type { TripMutationPayload } from '../services/tripService';
import { parseLocalDate } from '../utils/date';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';

interface CreateTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TripMutationPayload) => Promise<void>;
    initialData?: Trip | null;
}

const inputBaseClass =
    'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all';

export default function CreateTripModal({ isOpen, onClose, onSubmit, initialData }: CreateTripModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        coverColor: DEFAULT_GRADIENT as GradientColorKey,
        coverImageUrl: '',
        currency: 'TWD'
    });

    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setFormData({
                title: initialData.title,
                destination: initialData.destination,
                startDate: format(initialData.startDate.toDate(), 'yyyy-MM-dd'),
                endDate: format(initialData.endDate.toDate(), 'yyyy-MM-dd'),
                coverColor: (initialData.coverColor as GradientColorKey) || DEFAULT_GRADIENT,
                coverImageUrl: initialData.coverImageUrl || '',
                currency: initialData.currency || 'TWD'
            });
        } else {
            setFormData({
                title: '',
                destination: '',
                startDate: '',
                endDate: '',
                coverColor: DEFAULT_GRADIENT,
                coverImageUrl: '',
                currency: 'TWD'
            });
        }
    }, [initialData, isOpen]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

                if (dataUrl.length > 800000) {
                    showToast('圖片壓縮後仍然過大，請改用較小圖片', 'error');
                    return;
                }

                setFormData(prev => ({ ...prev, coverImageUrl: dataUrl }));
            };

            img.onerror = () => {
                showToast('無法讀取圖片檔案', 'error');
            };

            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalData: TripMutationPayload = {
                title: formData.title.trim(),
                destination: formData.destination.trim(),
                startDate: parseLocalDate(formData.startDate),
                endDate: parseLocalDate(formData.endDate),
                coverColor: formData.coverColor,
                currency: formData.currency,
                ...(formData.coverImageUrl ? { coverImageUrl: formData.coverImageUrl } : {})
            };

            await onSubmit(finalData);
            onClose();
        } catch (error: unknown) {
            console.error('Submit error:', error);
            const msg = error instanceof Error ? error.message : '未知錯誤';
            showToast(`儲存失敗：${msg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '編輯旅程' : '建立新旅程'}
            maxWidthClass="max-w-md"
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
                        form="tripForm"
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center"
                    >
                        {loading ? '儲存中...' : (initialData ? '儲存變更' : '建立旅程')}
                    </button>
                </div>
            }
        >
            <form id="tripForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">旅程名稱</label>
                    <input
                        type="text"
                        required
                        className={inputBaseClass}
                        placeholder="例如：2026 東京賞櫻之旅"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5" />
                            <span>封面色調或上傳圖片</span>
                        </label>
                        {formData.coverImageUrl && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, coverImageUrl: '' }))}
                                className="text-xs text-red-500 hover:text-red-400 font-medium"
                            >
                                移除圖片
                            </button>
                        )}
                    </div>

                    {formData.coverImageUrl ? (
                        <div className="relative h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-3 border border-zinc-200/80 dark:border-zinc-700">
                            <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer bg-zinc-50 dark:bg-zinc-950/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors relative overflow-hidden mb-3">
                            <Upload className="w-4 h-4 mb-1 text-zinc-400" />
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">點擊上傳封面圖片</span>
                            <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </label>
                    )}

                    <div className="grid grid-cols-3 gap-2.5">
                        {Object.entries(GRADIENT_COLORS).map(([key, color]) => {
                            const selected = formData.coverColor === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, coverColor: key as GradientColorKey })}
                                    className={`relative h-14 rounded-xl bg-gradient-to-br ${color.gradient} transition-all ${
                                        selected
                                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900'
                                            : 'opacity-85 hover:opacity-100'
                                    }`}
                                    title={color.name}
                                >
                                    {selected && (
                                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                                            <Check className="w-3 h-3 text-blue-600 stroke-[3]" />
                                        </span>
                                    )}
                                    <span className="absolute bottom-1.5 left-2 text-[11px] font-medium text-white/95">
                                        {color.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">目的地</label>
                    <div className="relative">
                        <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            required
                            className={`${inputBaseClass} pl-10`}
                            placeholder="例如：東京, 日本"
                            value={formData.destination}
                            onChange={e => setFormData({ ...formData, destination: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">開始日期</label>
                        <input
                            type="date"
                            required
                            className={`${inputBaseClass} tabular-nums`}
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">結束日期</label>
                        <input
                            type="date"
                            required
                            min={formData.startDate || undefined}
                            className={`${inputBaseClass} tabular-nums`}
                            value={formData.endDate}
                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">當地主要貨幣</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                        <select
                            className={`${inputBaseClass} pl-10 appearance-none`}
                            value={formData.currency}
                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        >
                            <option value="TWD">台幣 (TWD)</option>
                            <option value="JPY">日圓 (JPY)</option>
                            <option value="KRW">韓元 (KRW)</option>
                            <option value="THB">泰銖 (THB)</option>
                            <option value="USD">美元 (USD)</option>
                            <option value="EUR">歐元 (EUR)</option>
                            <option value="HKD">港幣 (HKD)</option>
                            <option value="CNY">人民幣 (CNY)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
