import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Calendar, Clock, AlignLeft } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import type { HotelInfo } from '../types';

interface CreateHotelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: HotelInfo) => Promise<void>;
    initialData?: HotelInfo;
}

export default function CreateHotelModal({ isOpen, onClose, onSubmit, initialData }: CreateHotelModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        checkInDate: '',
        checkInTime: '15:00',
        checkOutDate: '',
        checkOutTime: '11:00',
        bookingReference: '',
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            const checkIn = initialData.checkIn.toDate();
            const checkOut = initialData.checkOut.toDate();

            const pad = (n: number) => n.toString().padStart(2, '0');

            setFormData({
                name: initialData.name,
                address: initialData.address || '',
                checkInDate: `${checkIn.getFullYear()}-${pad(checkIn.getMonth() + 1)}-${pad(checkIn.getDate())}`,
                checkInTime: `${pad(checkIn.getHours())}:${pad(checkIn.getMinutes())}`,
                checkOutDate: `${checkOut.getFullYear()}-${pad(checkOut.getMonth() + 1)}-${pad(checkOut.getDate())}`,
                checkOutTime: `${pad(checkOut.getHours())}:${pad(checkOut.getMinutes())}`,
                bookingReference: initialData.bookingReference || '',
                notes: initialData.notes || ''
            });
        } else {
            setFormData({
                name: '',
                address: '',
                checkInDate: '',
                checkInTime: '15:00',
                checkOutDate: '',
                checkOutTime: '11:00',
                bookingReference: '',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const checkInDateObj = new Date(`${formData.checkInDate}T${formData.checkInTime}:00`);
            const checkOutDateObj = new Date(`${formData.checkOutDate}T${formData.checkOutTime}:00`);

            const hotelData: HotelInfo = {
                id: initialData?.id || Date.now().toString(),
                name: formData.name,
                address: formData.address,
                checkIn: Timestamp.fromDate(checkInDateObj),
                checkOut: Timestamp.fromDate(checkOutDateObj),
                bookingReference: formData.bookingReference,
                notes: formData.notes
            };

            await onSubmit(hotelData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100 z-10">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? '編輯飯店資訊' : '新增飯店資訊'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name & Address */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">飯店名稱</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="例如：東京格拉斯麗新宿酒店"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">飯店地址</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="例如：東京都新宿區歌舞伎町1-19-1"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Check-In */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-500 rounded-full" />
                            入住資訊 (Check-in)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100"
                                        value={formData.checkInDate}
                                        onChange={e => setFormData({ ...formData, checkInDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="time"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100"
                                        value={formData.checkInTime}
                                        onChange={e => setFormData({ ...formData, checkInTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Check-Out */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                            退房資訊 (Check-out)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100"
                                        value={formData.checkOutDate}
                                        onChange={e => setFormData({ ...formData, checkOutDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="time"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100"
                                        value={formData.checkOutTime}
                                        onChange={e => setFormData({ ...formData, checkOutTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extra Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">訂房代號 (選填)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="例如：ABC12345"
                                value={formData.bookingReference}
                                onChange={e => setFormData({ ...formData, bookingReference: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">備註 (選填)</label>
                            <div className="relative">
                                <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <textarea
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none h-24"
                                    placeholder="輸入任何其他訂房相關資訊"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
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
                            {loading ? '儲存中...' : '儲存飯店資訊'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
