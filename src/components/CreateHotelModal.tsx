import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Calendar, Clock, AlignLeft } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import type { HotelInfo } from '../types';
import Modal from './Modal';

interface CreateHotelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: HotelInfo) => Promise<void>;
    initialData?: HotelInfo;
}

const inputBaseClass =
    'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all';

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
        if (!isOpen) return;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const checkInDateObj = new Date(`${formData.checkInDate}T${formData.checkInTime}:00`);
            const checkOutDateObj = new Date(`${formData.checkOutDate}T${formData.checkOutTime}:00`);

            const hotelData: HotelInfo = {
                id: initialData?.id || Date.now().toString(),
                name: formData.name.trim(),
                address: formData.address.trim(),
                checkIn: Timestamp.fromDate(checkInDateObj),
                checkOut: Timestamp.fromDate(checkOutDateObj),
                bookingReference: formData.bookingReference.trim(),
                notes: formData.notes.trim()
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '編輯飯店資訊' : '新增飯店資訊'}
            maxWidthClass="max-w-2xl"
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
                        form="hotelForm"
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center"
                    >
                        {loading ? '儲存中...' : '儲存飯店資訊'}
                    </button>
                </div>
            }
        >
            <form id="hotelForm" onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">飯店名稱</label>
                        <div className="relative">
                            <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                required
                                className={`${inputBaseClass} pl-10`}
                                placeholder="例如：東京格拉斯麗新宿酒店"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">飯店地址（選填）</label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                className={`${inputBaseClass} pl-10`}
                                placeholder="例如：東京都新宿區歌舞伎町1-19-1"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-3.5">
                    <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        入住資訊 (Check-in)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">日期</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    type="date"
                                    required
                                    className={`${inputBaseClass} pl-9 tabular-nums`}
                                    value={formData.checkInDate}
                                    onChange={e => setFormData({ ...formData, checkInDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">時間</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    type="time"
                                    required
                                    className={`${inputBaseClass} pl-9 tabular-nums`}
                                    value={formData.checkInTime}
                                    onChange={e => setFormData({ ...formData, checkInTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-3.5">
                    <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        退房資訊 (Check-out)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">日期</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    type="date"
                                    required
                                    min={formData.checkInDate || undefined}
                                    className={`${inputBaseClass} pl-9 tabular-nums`}
                                    value={formData.checkOutDate}
                                    onChange={e => setFormData({ ...formData, checkOutDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">時間</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                                <input
                                    type="time"
                                    required
                                    className={`${inputBaseClass} pl-9 tabular-nums`}
                                    value={formData.checkOutTime}
                                    onChange={e => setFormData({ ...formData, checkOutTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">訂房代號（選填）</label>
                        <input
                            type="text"
                            className={`${inputBaseClass} font-mono`}
                            placeholder="例如：ABC12345"
                            value={formData.bookingReference}
                            onChange={e => setFormData({ ...formData, bookingReference: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">備註（選填）</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                            <textarea
                                rows={3}
                                className={`${inputBaseClass} pl-10 resize-none`}
                                placeholder="輸入任何其他訂房相關資訊"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
