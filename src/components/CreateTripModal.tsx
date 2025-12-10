import { useState, useEffect } from 'react';
import { X, MapPin, Palette } from 'lucide-react';
import { format } from 'date-fns';
import { GRADIENT_COLORS, DEFAULT_GRADIENT, type GradientColorKey } from '../constants/gradients';

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
        coverColor: DEFAULT_GRADIENT
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                destination: initialData.destination,
                startDate: format(initialData.startDate.toDate(), 'yyyy-MM-dd'),
                endDate: format(initialData.endDate.toDate(), 'yyyy-MM-dd'),
                coverColor: initialData.coverColor || DEFAULT_GRADIENT
            });
        } else {
            setFormData({
                title: '',
                destination: '',
                startDate: '',
                endDate: '',
                coverColor: DEFAULT_GRADIENT
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
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            選擇封面顏色
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(GRADIENT_COLORS).map(([key, color]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, coverColor: key as GradientColorKey })}
                                    className={`relative h-20 rounded-lg bg-gradient-to-br ${color.gradient} transition-all ${formData.coverColor === key
                                        ? 'ring-4 ring-blue-500 ring-offset-2 scale-105'
                                        : 'hover:scale-105 hover:shadow-lg'
                                        }`}
                                    title={color.name}
                                >
                                    {formData.coverColor === key && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-1 left-0 right-0 text-center">
                                        <span className="text-xs font-medium text-white drop-shadow-lg">{color.name}</span>
                                    </div>
                                </button>
                            ))}
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
