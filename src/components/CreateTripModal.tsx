import { useState, useEffect } from 'react';
import { X, MapPin, Palette, Upload, DollarSign } from 'lucide-react';
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
        coverColor: DEFAULT_GRADIENT,
        coverImageUrl: '',
        currency: 'TWD'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                destination: initialData.destination,
                startDate: format(initialData.startDate.toDate(), 'yyyy-MM-dd'),
                endDate: format(initialData.endDate.toDate(), 'yyyy-MM-dd'),
                coverColor: initialData.coverColor || DEFAULT_GRADIENT,
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

    if (!isOpen) return null;

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

                // Use JPEG with 0.5 quality to assure very small size and prevent Firestore 1MB limits.
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

                // Firestore limit is ~1MB (1,048,576 bytes).
                // Base64 is roughly 1.37x the original file size.
                // An arbitrary safe max length for just the image string is ~800,000 chars.
                if (dataUrl.length > 800000) {
                    alert("警告：圖片壓縮後仍然過大無法儲存，請嘗試使用其他更簡單的圖片。");
                    return;
                }

                setFormData(prev => ({ ...prev, coverImageUrl: dataUrl }));
            };

            img.onerror = () => {
                alert("無法讀取圖片檔案。");
            };

            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalData = {
                ...formData,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate)
            };

            // Clean undefined/empty values to not write messy structure to Firebase
            if (!finalData.coverImageUrl) {
                delete (finalData as any).coverImageUrl;
            }

            await onSubmit(finalData);
            onClose();
            // Form reset is handled by useEffect
        } catch (error: any) {
            console.error("Submit error:", error);
            const msg = error?.message || "未知錯誤";
            alert("儲存失敗: " + msg + " (可能是圖片依然過大，或尚未登入)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 z-10">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{initialData ? '編輯旅程' : '建立新旅程'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">旅程名稱</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            placeholder="例如：2025 東京賞櫻之旅"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                選擇封面顏色或上傳圖片
                            </div>
                            {formData.coverImageUrl && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, coverImageUrl: '' }))}
                                    className="text-xs text-red-500 hover:text-red-600"
                                >
                                    移除自訂圖片
                                </button>
                            )}
                        </label>

                        {formData.coverImageUrl ? (
                            <div className="relative h-32 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
                                <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="mb-3">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative overflow-hidden">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-6 h-6 mb-1 text-gray-500 dark:text-gray-400" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            <span className="font-semibold">點擊上傳圖片</span>
                                        </p>
                                    </div>
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                        )}

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
                                            <div className="w-8 h-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-full flex items-center justify-center shadow-lg">
                                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目的地</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                required
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                placeholder="例如：東京, 日本"
                                value={formData.destination}
                                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">開始日期</label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">結束日期</label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">主要貨幣</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <select
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
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
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
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
