import React, { useState, useEffect } from 'react';
import { Plane, Globe } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import type { FlightInfo } from '../types';
import { useToast } from '../hooks/useToast';
import Modal from './Modal';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import CustomSelect from './CustomSelect';

interface CreateFlightModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FlightInfo) => Promise<void>;
    initialData?: FlightInfo;
    type: 'outbound' | 'return';
}

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

const inputBaseClass =
    'w-full min-w-0 max-w-full min-h-[46px] sm:min-h-[42px] px-3.5 py-2.5 text-base sm:text-sm bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all';

export default function CreateFlightModal({ isOpen, onClose, onSubmit, initialData, type }: CreateFlightModalProps) {
    const { showToast } = useToast();
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
        if (!isOpen) return;
        if (initialData) {
            const dep = initialData.departureTime.toDate();
            const arr = initialData.arrivalTime.toDate();

            const getLocalParts = (date: Date, offsetStr: string) => {
                const sign = offsetStr.startsWith('-') ? -1 : 1;
                const [h, m] = offsetStr.slice(1).split(':').map(Number);
                const offsetMinutes = sign * ((h * 60) + m);
                const targetDate = new Date(date.getTime() + (offsetMinutes * 60 * 1000));

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.departureDate || !formData.departureTime) {
            showToast('請選擇出發日期與時間', 'error');
            return;
        }
        if (!formData.arrivalDate || !formData.arrivalTime) {
            showToast('請選擇抵達日期與時間', 'error');
            return;
        }

        setLoading(true);
        try {
            const depIso = `${formData.departureDate}T${formData.departureTime}:00${formData.departureTimezone}`;
            const arrIso = `${formData.arrivalDate}T${formData.arrivalTime}:00${formData.arrivalTimezone}`;

            const flightData: FlightInfo = {
                airline: formData.airline.trim(),
                flightNumber: formData.flightNumber.trim(),
                departureTime: Timestamp.fromDate(new Date(depIso)),
                arrivalTime: Timestamp.fromDate(new Date(arrIso)),
                departureTimezone: formData.departureTimezone,
                arrivalTimezone: formData.arrivalTimezone,
                departureAirport: formData.departureAirport.trim(),
                arrivalAirport: formData.arrivalAirport.trim()
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '編輯航班' : `新增${type === 'outbound' ? '去程' : '回程'}航班`}
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
                        form="flightForm"
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center"
                    >
                        {loading ? '儲存中...' : '儲存航班'}
                    </button>
                </div>
            }
        >
            <form id="flightForm" onSubmit={handleSubmit} className="space-y-5 w-full min-w-0 max-w-full">
                {/* Airline & Flight Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">航空公司</label>
                        <div className="relative">
                            <Plane className="absolute left-3.5 top-3.5 sm:top-3 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                required
                                className={`${inputBaseClass} pl-10`}
                                placeholder="例如：長榮航空"
                                value={formData.airline}
                                onChange={e => setFormData({ ...formData, airline: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">航班號碼</label>
                        <input
                            type="text"
                            required
                            className={`${inputBaseClass} font-mono`}
                            placeholder="例如：BR198"
                            value={formData.flightNumber}
                            onChange={e => setFormData({ ...formData, flightNumber: e.target.value })}
                        />
                    </div>
                </div>

                {/* Departure */}
                <div className="bg-zinc-50 dark:bg-zinc-950/60 p-3.5 sm:p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-3.5 min-w-0 max-w-full">
                    <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        出發資訊
                    </h3>
                    <div className="grid grid-cols-2 gap-3 min-w-0">
                        <div className="col-span-2 min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">出發機場</label>
                            <input
                                type="text"
                                required
                                className={inputBaseClass}
                                placeholder="例如：TPE (桃園國際機場)"
                                value={formData.departureAirport}
                                onChange={e => setFormData({ ...formData, departureAirport: e.target.value })}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">日期</label>
                            <DatePicker
                                label="出發日期"
                                value={formData.departureDate}
                                onChange={val => setFormData({ ...formData, departureDate: val })}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">時間</label>
                            <TimePicker
                                label="出發時間"
                                value={formData.departureTime}
                                onChange={val => setFormData({ ...formData, departureTime: val })}
                            />
                        </div>
                        <div className="col-span-2 min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">出發時區</label>
                            <CustomSelect
                                label="出發時區"
                                leadingIcon={<Globe className="w-4 h-4" />}
                                options={TIMEZONES}
                                value={formData.departureTimezone}
                                onChange={val => setFormData({ ...formData, departureTimezone: val })}
                            />
                        </div>
                    </div>
                </div>

                {/* Arrival */}
                <div className="bg-zinc-50 dark:bg-zinc-950/60 p-3.5 sm:p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-3.5 min-w-0 max-w-full">
                    <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        抵達資訊
                    </h3>
                    <div className="grid grid-cols-2 gap-3 min-w-0">
                        <div className="col-span-2 min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">抵達機場</label>
                            <input
                                type="text"
                                required
                                className={inputBaseClass}
                                placeholder="例如：NRT (成田國際機場)"
                                value={formData.arrivalAirport}
                                onChange={e => setFormData({ ...formData, arrivalAirport: e.target.value })}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">日期</label>
                            <DatePicker
                                label="抵達日期"
                                min={undefined}
                                value={formData.arrivalDate}
                                onChange={val => setFormData({ ...formData, arrivalDate: val })}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">時間</label>
                            <TimePicker
                                label="抵達時間"
                                value={formData.arrivalTime}
                                onChange={val => setFormData({ ...formData, arrivalTime: val })}
                            />
                        </div>
                        <div className="col-span-2 min-w-0">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">抵達時區</label>
                            <CustomSelect
                                label="抵達時區"
                                leadingIcon={<Globe className="w-4 h-4" />}
                                options={TIMEZONES}
                                value={formData.arrivalTimezone}
                                onChange={val => setFormData({ ...formData, arrivalTimezone: val })}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
