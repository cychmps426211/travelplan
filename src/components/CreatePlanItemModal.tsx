import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { PlanItem } from '../types';

interface CreatePlanItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PlanItem) => Promise<void>;
    initialData?: PlanItem;
}

export default function CreatePlanItemModal({ isOpen, onClose, onSubmit, initialData }: CreatePlanItemModalProps) {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [urls, setUrls] = useState<string[]>(['']);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setLocation(initialData.location || '');
                setUrls(initialData.urls && initialData.urls.length > 0 ? initialData.urls : ['']);
                setNotes(initialData.notes || '');
            } else {
                setName('');
                setLocation('');
                setUrls(['']);
                setNotes('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const filteredUrls = urls.filter(url => url.trim() !== '');

            const newItem: PlanItem = {
                id: initialData?.id || crypto.randomUUID(),
                name: name.trim(),
            };

            if (location.trim()) newItem.location = location.trim();
            if (filteredUrls.length > 0) {
                newItem.urls = filteredUrls;
            } else {
                newItem.urls = [];
            }
            if (notes.trim()) newItem.notes = notes.trim();

            await onSubmit(newItem);
            onClose();
        } catch (error) {
            console.error('Failed to save plan item:', error);
            alert('儲存失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addUrlField = () => {
        setUrls([...urls, '']);
    };

    const removeUrlField = (index: number) => {
        const newUrls = [...urls];
        newUrls.splice(index, 1);
        if (newUrls.length === 0) {
            newUrls.push('');
        }
        setUrls(newUrls);
    };

    const updateUrlField = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? '編輯待規劃項目' : '新增待規劃項目'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="planItemForm" onSubmit={handleSubmit} className="space-y-6">
                        {/* 名稱 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                名稱 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                placeholder="例如：想去的咖啡廳"
                                required
                            />
                        </div>

                        {/* 地點 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                地點
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                placeholder="地標名稱或地址"
                            />
                        </div>

                        {/* 參考網址 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                參考網址
                            </label>
                            <div className="space-y-2">
                                {urls.map((url, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => updateUrlField(index, e.target.value)}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                            placeholder="https://"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeUrlField(index)}
                                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addUrlField}
                                className="mt-2 text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                新增網址
                            </button>
                        </div>

                        {/* 備註 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                備註
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                                placeholder="任何其他想記下的事..."
                            />
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        disabled={isSubmitting}
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        form="planItemForm"
                        disabled={isSubmitting || !name.trim()}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-colors shadow-sm"
                    >
                        {isSubmitting ? '儲存中...' : '儲存'}
                    </button>
                </div>
            </div>
        </div>
    );
}
