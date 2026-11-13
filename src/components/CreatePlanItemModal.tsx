import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PlanItem } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';

interface CreatePlanItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PlanItem) => Promise<void>;
    initialData?: PlanItem;
}

const inputBaseClass =
    'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all';

export default function CreatePlanItemModal({ isOpen, onClose, onSubmit, initialData }: CreatePlanItemModalProps) {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [urls, setUrls] = useState<string[]>(['']);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
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
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            const filteredUrls = urls.filter(url => url.trim() !== '');

            const newItem: PlanItem = {
                id: initialData?.id || crypto.randomUUID(),
                name: name.trim(),
                urls: filteredUrls,
                ...(initialData?.isScheduled !== undefined ? { isScheduled: initialData.isScheduled } : {}),
            };

            if (location.trim()) newItem.location = location.trim();
            if (notes.trim()) newItem.notes = notes.trim();

            await onSubmit(newItem);
            onClose();
        } catch (error) {
            console.error('Failed to save plan item:', error);
            showToast('儲存失敗，請稍後再試', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addUrlField = () => setUrls([...urls, '']);

    const removeUrlField = (index: number) => {
        const newUrls = [...urls];
        newUrls.splice(index, 1);
        if (newUrls.length === 0) newUrls.push('');
        setUrls(newUrls);
    };

    const updateUrlField = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '編輯待規劃項目' : '新增待規劃項目'}
            maxWidthClass="max-w-lg"
            footer={
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 rounded-xl transition-colors"
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        form="planItemForm"
                        disabled={isSubmitting || !name.trim()}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
                    >
                        {isSubmitting ? '儲存中...' : '儲存'}
                    </button>
                </div>
            }
        >
            <form id="planItemForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                        名稱 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputBaseClass}
                        placeholder="例如：想去的咖啡廳"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                        地點（選填）
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className={inputBaseClass}
                        placeholder="地標名稱或地址"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                        參考網址（選填）
                    </label>
                    <div className="space-y-2">
                        {urls.map((url, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrlField(index, e.target.value)}
                                    className={`${inputBaseClass} flex-1`}
                                    placeholder="https://"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeUrlField(index)}
                                    aria-label="移除網址"
                                    className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
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

                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                        備註（選填）
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={`${inputBaseClass} resize-none`}
                        placeholder="任何其他想記下的事..."
                    />
                </div>
            </form>
        </Modal>
    );
}
