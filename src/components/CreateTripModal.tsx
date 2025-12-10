import { useState, useEffect } from 'react';
import { X, MapPin, Image } from 'lucide-react';
import { format } from 'date-fns';

interface CreateTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

export default function CreateTripModal({ isOpen, onClose, onSubmit, initialData }: CreateTripModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        coverImage: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                destination: initialData.destination,
                startDate: format(initialData.startDate.toDate(), 'yyyy-MM-dd'),
                endDate: format(initialData.endDate.toDate(), 'yyyy-MM-dd'),
                coverImage: initialData.coverImage || ''
            });
        } else {
            setFormData({
                title: '',
                destination: '',
                startDate: '',
                endDate: '',
                coverImage: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate)
            });
            onClose();
            // Form reset is handled by useEffect
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">{initialData ? '編輯旅程' : '建立新旅程'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">旅程名稱</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="例如：2025 東京賞櫻之旅"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">封面圖片網址 (選填)</label>
                        <div className="relative">
                            <Image className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="url"
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="https://example.com/image.jpg"
                                value={formData.coverImage}
                                onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">目的地</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="例如：東京, 日本"
                                value={formData.destination}
                                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
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
                            {loading ? '儲存中...' : (initialData ? '儲存變更' : '建立旅程')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
