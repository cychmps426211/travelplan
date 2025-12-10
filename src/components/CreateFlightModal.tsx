import React, { useState, useEffect } from 'react';
import { X, Plane, Calendar, Clock, Globe } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import type { FlightInfo } from '../types';

interface CreateFlightModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FlightInfo) => Promise<void>;
    initialData?: FlightInfo;
    type: 'outbound' | 'return';
}

export default function CreateFlightModal({ isOpen, onClose, onSubmit, initialData, type }: CreateFlightModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        airline: '',
        flightNumber: '',
        departureDate: '',
        departureTime: '',
        departureTimezone: '+08:00',
        arrivalDate: '',
        arrivalTime: '',
        arrivalTimezone: '+08:00',
        departureAirport: '',
        arrivalAirport: ''
    });

    useEffect(() => {
        if (initialData) {
            const dep = initialData.departureTime.toDate();
            const arr = initialData.arrivalTime.toDate();

            const getLocalParts = (date: Date, offsetStr: string) => {
                const sign = offsetStr.startsWith('-') ? -1 : 1;
                const [h, m] = offsetStr.slice(1).split(':').map(Number);
                const offsetMinutes = sign * ((h * 60) + m);

                const utcMillis = date.getTime();
                const targetMillis = utcMillis + (offsetMinutes * 60 * 1000);
                const targetDate = new Date(targetMillis);

                return {
                    date: targetDate.toISOString().split('T')[0],
                    time: targetDate.toISOString().split('T')[1].slice(0, 5)
                };
            };

            const depParts = getLocalParts(dep, initialData.departureTimezone || '+08:00');
            const arrParts = getLocalParts(arr, initialData.arrivalTimezone || '+08:00');

            setFormData({
                airline: initialData.airline,
                flightNumber: initialData.flightNumber,
                departureDate: depParts.date,
                departureTime: depParts.time,
                departureTimezone: initialData.departureTimezone || '+08:00',
                arrivalDate: arrParts.date,
                arrivalTime: arrParts.time,
                arrivalTimezone: initialData.arrivalTimezone || '+08:00',
                departureAirport: initialData.departureAirport,
                arrivalAirport: initialData.arrivalAirport
            });
        } else {
            setFormData({
                airline: '',
                flightNumber: '',
                departureDate: '',
                departureTime: '',
                departureTimezone: '+08:00',
                arrivalDate: '',
                arrivalTime: '',
                arrivalTimezone: '+08:00',
                departureAirport: '',
                arrivalAirport: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const TIMEZONES = [
        { label: 'UTC-12:00', value: '-12:00' },
        { label: 'UTC-11:00', value: '-11:00' },
        { label: 'UTC-10:00 (Hawaii)', value: '-10:00' },
        { label: 'UTC-09:00 (Alaska)', value: '-09:00' },
        { label: 'UTC-08:00 (US/Canada Pacific)', value: '-08:00' },
        { label: 'UTC-07:00 (US/Canada Mountain)', value: '-07:00' },
        { label: 'UTC-06:00 (US/Canada Central)', value: '-06:00' },
        { label: 'UTC-05:00 (US/Canada Eastern)', value: '-05:00' },
        { label: 'UTC-04:00 (Atlantic)', value: '-04:00' },
        { label: 'UTC-03:00 (Brasilia)', value: '-03:00' },
        { label: 'UTC-02:00', value: '-02:00' },
        { label: 'UTC-01:00', value: '-01:00' },
        { label: 'UTC+00:00 (London)', value: '+00:00' },
        { label: 'UTC+01:00 (Paris, Berlin)', value: '+01:00' },
        { label: 'UTC+02:00 (Athens, Cairo)', value: '+02:00' },
        { label: 'UTC+03:00 (Moscow, Dubai)', value: '+03:00' },
        { label: 'UTC+04:00', value: '+04:00' },
        { label: 'UTC+05:00', value: '+05:00' },
        { label: 'UTC+05:30 (India)', value: '+05:30' },
        { label: 'UTC+06:00', value: '+06:00' },
        { label: 'UTC+07:00 (Bangkok)', value: '+07:00' },
        { label: 'UTC+08:00 (Taipei, Beijing, SG)', value: '+08:00' },
        { label: 'UTC+09:00 (Tokyo, Seoul)', value: '+09:00' },
        { label: 'UTC+10:00 (Sydney)', value: '+10:00' },
        { label: 'UTC+11:00', value: '+11:00' },
        { label: 'UTC+12:00 (NZ)', value: '+12:00' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const depIso = `${formData.departureDate}T${formData.departureTime}:00${formData.departureTimezone}`;
            const arrIso = `${formData.arrivalDate}T${formData.arrivalTime}:00${formData.arrivalTimezone}`;

            const depDate = new Date(depIso);
            const arrDate = new Date(arrIso);

            const flightData: FlightInfo = {
                airline: formData.airline,
                flightNumber: formData.flightNumber,
                departureTime: Timestamp.fromDate(depDate),
                arrivalTime: Timestamp.fromDate(arrDate),
                departureTimezone: formData.departureTimezone,
                arrivalTimezone: formData.arrivalTimezone,
                departureAirport: formData.departureAirport,
                arrivalAirport: formData.arrivalAirport
            };

            await onSubmit(flightData);
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
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? '編輯航班' : `新增 ${type === 'outbound' ? '去程' : '回程'} 航班`}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Airline & Flight Number */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">航空公司</label>
                            <div className="relative">
                                <Plane className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="例如：長榮航空"
                                    value={formData.airline}
                                    onChange={e => setFormData({ ...formData, airline: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">航班號碼</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="例如：BR198"
                                value={formData.flightNumber}
                                onChange={e => setFormData({ ...formData, flightNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Departure */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-500 rounded-full" />
                            出發資訊
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">出發機場</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                    placeholder="例如：TPE (桃園國際機場)"
                                    value={formData.departureAirport}
                                    onChange={e => setFormData({ ...formData, departureAirport: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                        value={formData.departureDate}
                                        onChange={e => setFormData({ ...formData, departureDate: e.target.value })}
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
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                        value={formData.departureTime}
                                        onChange={e => setFormData({ ...formData, departureTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">出發時區</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white appearance-none"
                                        value={formData.departureTimezone}
                                        onChange={e => setFormData({ ...formData, departureTimezone: e.target.value })}
                                    >
                                        {TIMEZONES.map(tz => (
                                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                            抵達資訊
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">抵達機場</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                    placeholder="例如：NRT (成田國際機場)"
                                    value={formData.arrivalAirport}
                                    onChange={e => setFormData({ ...formData, arrivalAirport: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                        value={formData.arrivalDate}
                                        onChange={e => setFormData({ ...formData, arrivalDate: e.target.value })}
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
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                        value={formData.arrivalTime}
                                        onChange={e => setFormData({ ...formData, arrivalTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">抵達時區</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white appearance-none"
                                        value={formData.arrivalTimezone}
                                        onChange={e => setFormData({ ...formData, arrivalTimezone: e.target.value })}
                                    >
                                        {TIMEZONES.map(tz => (
                                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                                        ))}
                                    </select>
                                </div>
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
                            {loading ? '儲存中...' : '儲存航班'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
