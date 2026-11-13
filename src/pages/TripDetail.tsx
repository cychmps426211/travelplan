import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, Timestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import type { Trip, Activity, FlightInfo, ChecklistItem, HotelInfo, PlanItem } from '../types';
import { activityService } from '../services/activityService';
import { tripService } from '../services/tripService';
import { useToast } from '../hooks/useToast';
import { format, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import {
    MapPin,
    ArrowLeft,
    Plus,
    Calendar,
    Edit2,
    Trash2,
    ArrowRight,
    ListChecks,
    Check,
    Navigation2,
    Map as MapIcon,
    Calculator,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreateActivityModal, { type ActivityFormSubmitData } from '../components/CreateActivityModal';
import CreateFlightModal from '../components/CreateFlightModal';
import FlightCard from '../components/FlightCard';
import CreateHotelModal from '../components/CreateHotelModal';
import HotelCard from '../components/HotelCard';
import ConfirmDialog from '../components/ConfirmDialog';
import ActivityDetailModal from '../components/ActivityDetailModal';
import CreatePlanItemModal from '../components/CreatePlanItemModal';
import PlanItemCard from '../components/PlanItemCard';
import MoveActivityModal from '../components/MoveActivityModal';
import DayMapModal from '../components/DayMapModal';
import CalculatorModal from '../components/CalculatorModal';
import { getActivityMeta } from '../constants/activityTypes';
import { formatDuration, parseLocalDate, addMinutesToTimeStr } from '../utils/date';

type Tab = 'overview' | 'hotels' | 'planItems' | string; // string for ISO date yyyy-MM-dd

export default function TripDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const initializedTripIdRef = useRef<string | null>(null);
    const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Modals
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [flightModal, setFlightModal] = useState<{
        isOpen: boolean;
        type: 'outbound' | 'return';
        data?: FlightInfo;
    }>({ isOpen: false, type: 'outbound' });
    const [hotelModal, setHotelModal] = useState<{
        isOpen: boolean;
        data?: HotelInfo;
    }>({ isOpen: false });
    const [deleteHotelConfirm, setDeleteHotelConfirm] = useState<{
        isOpen: boolean;
        hotelId: string;
        hotelName: string;
    }>({ isOpen: false, hotelId: '', hotelName: '' });
    const [planItemModal, setPlanItemModal] = useState<{
        isOpen: boolean;
        data?: PlanItem;
    }>({ isOpen: false });
    const [deletePlanItemConfirm, setDeletePlanItemConfirm] = useState<{
        isOpen: boolean;
        itemId: string;
        itemName: string;
    }>({ isOpen: false, itemId: '', itemName: '' });
    const [deleteActivityConfirm, setDeleteActivityConfirm] = useState<{
        isOpen: boolean;
        activityId: string;
        activityTitle: string;
    }>({ isOpen: false, activityId: '', activityTitle: '' });
    const [addPlanItemToItinerary, setAddPlanItemToItinerary] = useState<{
        isOpen: boolean;
        planItem: PlanItem | null;
    }>({ isOpen: false, planItem: null });
    const [moveActivityModal, setMoveActivityModal] = useState<{
        isOpen: boolean;
        activity: Activity | null;
    }>({ isOpen: false, activity: null });
    const [selectedActivityForDetail, setSelectedActivityForDetail] = useState<Activity | null>(null);
    const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
    const [isUpdatingChecklist, setIsUpdatingChecklist] = useState<Record<string, boolean>>({});
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    useEffect(() => {
        if (!id) return;

        const unsubscribeTrip = onSnapshot(doc(db, 'trips', id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const tripData = {
                    id: docSnap.id,
                    ...data,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    outboundFlight: data.outboundFlight ? { ...data.outboundFlight } : undefined,
                    returnFlight: data.returnFlight ? { ...data.returnFlight } : undefined
                } as Trip;
                setTrip(tripData);

                // Smart default tab: if trip is ongoing right now, jump straight to today's itinerary
                if (initializedTripIdRef.current !== docSnap.id && tripData.startDate && tripData.endDate) {
                    initializedTripIdRef.current = docSnap.id;
                    const today = startOfDay(new Date());
                    const start = startOfDay(tripData.startDate.toDate());
                    const end = startOfDay(tripData.endDate.toDate());
                    if (today >= start && today <= end) {
                        setActiveTab(format(today, 'yyyy-MM-dd'));
                    }
                }
            } else {
                navigate('/');
            }
            setLoading(false);
        });

        const unsubscribeActivities = activityService.subscribeToActivities(id, (data) => {
            setActivities(data);
        });

        return () => {
            unsubscribeTrip();
            unsubscribeActivities();
        };
    }, [id, navigate]);

    // Auto-scroll active day tab into center view on horizontal scroll bar
    useEffect(() => {
        if (activeTab !== 'overview' && activeTab !== 'hotels' && activeTab !== 'planItems') {
            const btn = dayButtonRefs.current[activeTab];
            btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [activeTab]);

    const handleActivitySubmit = async (activityData: ActivityFormSubmitData) => {
        if (!id) return;
        try {
            if (editingActivity) {
                await activityService.updateActivity(id, editingActivity.id, activityData);
                showToast('已更新活動', 'success');
            } else {
                await activityService.addActivity(id, activityData);
                showToast('已新增活動', 'success');
            }
            if (addPlanItemToItinerary.isOpen && addPlanItemToItinerary.planItem) {
                await handleTogglePlanItemSchedule(addPlanItemToItinerary.planItem, true);
                setAddPlanItemToItinerary({ isOpen: false, planItem: null });
            }
            setIsActivityModalOpen(false);
            setEditingActivity(null);
        } catch (error) {
            console.error('Error saving activity: ', error);
            showToast('儲存活動失敗，請稍後再試', 'error');
        }
    };

    const handleDeleteActivity = async (activityId: string) => {
        if (!id) return;
        try {
            await activityService.deleteActivity(id, activityId);
            showToast('已刪除活動', 'info');
        } catch (error) {
            console.error('Error deleting activity: ', error);
            showToast('刪除活動失敗', 'error');
        }
    };

    const handleMoveActivity = async (activityId: string, targetDate: Date) => {
        if (!id || !moveActivityModal.activity) return;
        try {
            const activity = moveActivityModal.activity;
            const originalStart = activity.startTime.toDate();

            const newStart = new Date(originalStart);
            newStart.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

            let newEnd: Date | undefined;
            if (activity.endTime) {
                const originalEnd = activity.endTime.toDate();
                newEnd = new Date(originalEnd);
                const diffTime = originalEnd.getTime() - originalStart.getTime();
                newEnd.setTime(newStart.getTime() + diffTime);
            }

            await activityService.updateActivity(id, activityId, {
                startTime: Timestamp.fromDate(newStart),
                ...(newEnd ? { endTime: Timestamp.fromDate(newEnd) } : {})
            });
            showToast(`已移動至 ${format(targetDate, 'MM/dd')}`, 'success');
        } catch (error) {
            console.error('Error moving activity: ', error);
            showToast('移動活動失敗', 'error');
        }
    };

    const handleUpdateChecklist = async (activityId: string, checklist: ChecklistItem[]) => {
        if (!id) return;
        await activityService.updateActivity(id, activityId, { checklist });
        if (selectedActivityForDetail && selectedActivityForDetail.id === activityId) {
            setSelectedActivityForDetail({ ...selectedActivityForDetail, checklist });
        }
    };

    const handleToggleChecklistItem = async (e: React.MouseEvent, activityId: string, itemId: string) => {
        e.stopPropagation();
        if (!id) return;

        setIsUpdatingChecklist(prev => ({ ...prev, [activityId]: true }));
        try {
            const activity = activities.find(a => a.id === activityId);
            if (!activity || !activity.checklist) return;

            const updatedChecklist = activity.checklist.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
            );

            await activityService.updateActivity(id, activityId, { checklist: updatedChecklist });
        } catch (error) {
            console.error('Failed to toggle item:', error);
            showToast('更新清單狀態失敗', 'error');
        } finally {
            setIsUpdatingChecklist(prev => ({ ...prev, [activityId]: false }));
        }
    };

    const handleSaveFlight = async (flightData: FlightInfo) => {
        if (!trip) return;
        const updates: Partial<Trip> = {};
        if (flightModal.type === 'outbound') {
            updates.outboundFlight = flightData;
        } else {
            updates.returnFlight = flightData;
        }
        await tripService.updateTrip(trip.id, updates);
        showToast('已儲存航班資訊', 'success');
    };

    const handleDeleteFlight = async (type: 'outbound' | 'return') => {
        if (!trip) return;
        const field = type === 'outbound' ? 'outboundFlight' : 'returnFlight';
        await tripService.updateTrip(trip.id, { [field]: deleteField() });
        showToast('已刪除航班資訊', 'info');
    };

    const handleSaveHotel = async (hotelData: HotelInfo) => {
        if (!trip) return;
        const currentHotels = trip.hotels || [];
        const existingIndex = currentHotels.findIndex(h => h.id === hotelData.id);

        const newHotels =
            existingIndex >= 0
                ? currentHotels.map((h, i) => (i === existingIndex ? hotelData : h))
                : [...currentHotels, hotelData];

        await tripService.updateTrip(trip.id, { hotels: newHotels });
        showToast('已儲存飯店資訊', 'success');
    };

    const handleDeleteHotel = async (hotelId: string) => {
        if (!trip) return;
        const currentHotels = trip.hotels || [];
        const newHotels = currentHotels.filter(h => h.id !== hotelId);
        await tripService.updateTrip(trip.id, { hotels: newHotels });
        showToast('已刪除飯店資訊', 'info');
    };

    const handleSavePlanItem = async (planItemData: PlanItem) => {
        if (!trip) return;
        const currentItems = trip.planItems || [];
        const existingIndex = currentItems.findIndex(i => i.id === planItemData.id);

        const newItems =
            existingIndex >= 0
                ? currentItems.map((item, i) => (i === existingIndex ? planItemData : item))
                : [...currentItems, planItemData];

        await tripService.updateTrip(trip.id, { planItems: newItems });
        showToast('已儲存待規劃項目', 'success');
    };

    const handleDeletePlanItem = async (itemId: string) => {
        if (!trip) return;
        const currentItems = trip.planItems || [];
        const newItems = currentItems.filter(i => i.id !== itemId);
        await tripService.updateTrip(trip.id, { planItems: newItems });
        showToast('已刪除待規劃項目', 'info');
    };

    const handleTogglePlanItemSchedule = async (item: PlanItem, isScheduled: boolean) => {
        if (!trip) return;
        const currentItems = trip.planItems || [];
        const existingIndex = currentItems.findIndex(i => i.id === item.id);
        if (existingIndex < 0) return;

        const newItems = [...currentItems];
        newItems[existingIndex] = { ...item, isScheduled };

        await tripService.updateTrip(trip.id, { planItems: newItems });
    };

    const isDayTab = activeTab !== 'overview' && activeTab !== 'hotels' && activeTab !== 'planItems';

    const currentDayActivities = useMemo(() => {
        if (!isDayTab) return [];
        const target = parseLocalDate(activeTab);
        return activities.filter(a => isSameDay(a.startTime.toDate(), target));
    }, [activities, activeTab, isDayTab]);

    // Smart default start time for newly added activity on the current day
    const defaultNewActivityStartTime = useMemo(() => {
        if (currentDayActivities.length === 0) return '09:00';
        const last = currentDayActivities[currentDayActivities.length - 1];
        if (last.endTime) {
            return format(last.endTime.toDate(), 'HH:mm');
        }
        return addMinutesToTimeStr(format(last.startTime.toDate(), 'HH:mm'), 60);
    }, [currentDayActivities]);

    if (loading || !trip) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors">
                <div className="w-7 h-7 border-2 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const tripStartDate = trip.startDate.toDate();
    const tripEndDate = trip.endDate.toDate();
    const days = eachDayOfInterval({ start: tripStartDate, end: tripEndDate });
    const unscheduledCount = (trip.planItems || []).filter(i => !i.isScheduled).length;

    return (
        <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 transition-colors flex flex-col">
            {/* Hero Title Section */}
            <header className="bg-white dark:bg-zinc-950 pt-safe">
                <div className="max-w-4xl mx-auto px-4 pt-3.5 pb-3">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <Link
                            to="/"
                            viewTransition
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group py-1"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span>所有旅程</span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsCalculatorOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 transition-colors"
                        >
                            <Calculator className="w-3.5 h-3.5 text-amber-500" />
                            <span>匯率換算</span>
                        </button>
                    </div>

                    <div>
                        <h1
                            className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight mb-2"
                            style={{ viewTransitionName: `trip-title-${trip.id}` }}
                        >
                            {trip.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                            <div
                                className="flex items-center gap-1.5"
                                style={{ viewTransitionName: `trip-dest-${trip.id}` }}
                            >
                                <MapPin className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                                <span>{trip.destination}</span>
                            </div>
                            <div className="flex items-center gap-1.5 tabular-nums">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                <span>
                                    {format(tripStartDate, 'yyyy/MM/dd')} – {format(tripEndDate, 'MM/dd')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Compact Sticky Navigation */}
            <div className="bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border-y border-zinc-200/80 dark:border-zinc-800/80 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-2 space-y-2">
                    {/* Segmented Section Tabs */}
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className={`py-1.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                activeTab === 'overview'
                                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                        >
                            機票
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('hotels')}
                            className={`py-1.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                activeTab === 'hotels'
                                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                        >
                            飯店
                            {trip.hotels && trip.hotels.length > 0 && (
                                <span className="ml-1 text-[11px] opacity-60 tabular-nums">({trip.hotels.length})</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('planItems')}
                            className={`py-1.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                activeTab === 'planItems'
                                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                        >
                            待規劃
                            {unscheduledCount > 0 && (
                                <span className="ml-1 text-[11px] opacity-60 tabular-nums">({unscheduledCount})</span>
                            )}
                        </button>
                    </div>

                    {/* Horizontal Day Strip */}
                    <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
                        <div className="flex items-center gap-1.5 pb-0.5">
                            {days.map((day, index) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const isActive = activeTab === dateStr;
                                return (
                                    <button
                                        key={dateStr}
                                        ref={(el) => {
                                            dayButtonRefs.current[dateStr] = el;
                                        }}
                                        type="button"
                                        onClick={() => setActiveTab(dateStr)}
                                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all tabular-nums ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-zinc-100/80 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800'
                                        }`}
                                    >
                                        <span className="font-semibold">D{index + 1}</span>
                                        <span className={isActive ? 'text-blue-100' : 'text-zinc-400 dark:text-zinc-500'}>
                                            {format(day, 'MM/dd')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-28 sm:pb-24">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16 }}
                    >
                        {activeTab === 'overview' ? (
                            <div className="space-y-6">
                                {/* Outbound */}
                                <section>
                                    <div className="flex justify-between items-center mb-3">
                                        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                            去程航班
                                        </h2>
                                        {!trip.outboundFlight && (
                                            <button
                                                type="button"
                                                onClick={() => setFlightModal({ isOpen: true, type: 'outbound' })}
                                                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>新增航班</span>
                                            </button>
                                        )}
                                    </div>
                                    {trip.outboundFlight ? (
                                        <FlightCard
                                            flight={trip.outboundFlight}
                                            type="outbound"
                                            onEdit={() => setFlightModal({ isOpen: true, type: 'outbound', data: trip.outboundFlight })}
                                            onDelete={() => handleDeleteFlight('outbound')}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setFlightModal({ isOpen: true, type: 'outbound' })}
                                            className="w-full p-7 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white/50 dark:bg-zinc-900/40 transition-colors"
                                        >
                                            <span className="text-sm font-medium">點擊新增去程航班資訊</span>
                                        </button>
                                    )}
                                </section>

                                {/* Return */}
                                <section>
                                    <div className="flex justify-between items-center mb-3">
                                        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                            回程航班
                                        </h2>
                                        {!trip.returnFlight && (
                                            <button
                                                type="button"
                                                onClick={() => setFlightModal({ isOpen: true, type: 'return' })}
                                                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>新增航班</span>
                                            </button>
                                        )}
                                    </div>
                                    {trip.returnFlight ? (
                                        <FlightCard
                                            flight={trip.returnFlight}
                                            type="return"
                                            onEdit={() => setFlightModal({ isOpen: true, type: 'return', data: trip.returnFlight })}
                                            onDelete={() => handleDeleteFlight('return')}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setFlightModal({ isOpen: true, type: 'return' })}
                                            className="w-full p-7 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white/50 dark:bg-zinc-900/40 transition-colors"
                                        >
                                            <span className="text-sm font-medium">點擊新增回程航班資訊</span>
                                        </button>
                                    )}
                                </section>
                            </div>
                        ) : activeTab === 'hotels' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        住宿資訊
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setHotelModal({ isOpen: true })}
                                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>新增飯店</span>
                                    </button>
                                </div>
                                {trip.hotels && trip.hotels.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {trip.hotels.map(hotel => (
                                            <HotelCard
                                                key={hotel.id}
                                                hotel={hotel}
                                                onEdit={() => setHotelModal({ isOpen: true, data: hotel })}
                                                onDelete={() => setDeleteHotelConfirm({ isOpen: true, hotelId: hotel.id, hotelName: hotel.name })}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-white/50 dark:bg-zinc-900/40">
                                        <p className="text-sm mb-3">尚未新增飯店資訊</p>
                                        <button
                                            type="button"
                                            onClick={() => setHotelModal({ isOpen: true })}
                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            新增第一間飯店
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'planItems' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        待規劃清單
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setPlanItemModal({ isOpen: true })}
                                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>新增項目</span>
                                    </button>
                                </div>
                                {trip.planItems && trip.planItems.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {[...trip.planItems]
                                            .sort((a, b) => {
                                                if (a.isScheduled === b.isScheduled) return 0;
                                                return a.isScheduled ? 1 : -1;
                                            })
                                            .map(item => (
                                                <PlanItemCard
                                                    key={item.id}
                                                    item={item}
                                                    onEdit={() => setPlanItemModal({ isOpen: true, data: item })}
                                                    onDelete={() => setDeletePlanItemConfirm({ isOpen: true, itemId: item.id, itemName: item.name })}
                                                    onToggleSchedule={(isScheduled) => handleTogglePlanItemSchedule(item, isScheduled)}
                                                    onAddToItinerary={() => setAddPlanItemToItinerary({ isOpen: true, planItem: item })}
                                                />
                                            ))}
                                    </div>
                                ) : (
                                    <div className="p-10 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-white/50 dark:bg-zinc-900/40 text-center">
                                        <p className="text-sm mb-3">暫存還沒決定哪天去的餐廳、景點或想買的東西</p>
                                        <button
                                            type="button"
                                            onClick={() => setPlanItemModal({ isOpen: true })}
                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            新增待規劃項目
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Day Itinerary View
                            <>
                                <div className="mb-4 flex justify-between items-center">
                                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider tabular-nums">
                                        {format(parseLocalDate(activeTab), 'MM/dd')} 當日行程
                                        {currentDayActivities.length > 0 && ` · ${currentDayActivities.length} 項`}
                                    </h2>
                                    <div className="hidden sm:flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 text-xs font-medium rounded-xl transition-colors"
                                            onClick={() => setIsMapModalOpen(true)}
                                        >
                                            <MapIcon className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>當日地圖</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors"
                                            onClick={() => {
                                                setEditingActivity(null);
                                                setIsActivityModalOpen(true);
                                            }}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>新增活動</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {currentDayActivities.length === 0 ? (
                                        <div className="text-center py-12 bg-white/50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
                                            <div className="text-zinc-500 dark:text-zinc-400 text-sm mb-2">這天還沒有安排活動</div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingActivity(null);
                                                    setIsActivityModalOpen(true);
                                                }}
                                                className="text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline"
                                            >
                                                新增第一個活動
                                            </button>
                                        </div>
                                    ) : (
                                        currentDayActivities.map(activity => {
                                            const hasChecklist = Boolean(activity.checklist && activity.checklist.length > 0);
                                            const isExpanded = expandedActivities[activity.id];
                                            const meta = getActivityMeta(activity.type);
                                            const Icon = meta.icon;

                                            return (
                                                <div
                                                    key={activity.id}
                                                    onClick={() => setSelectedActivityForDetail(activity)}
                                                    className="cq-card cv-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 p-3.5 sm:p-4 flex gap-3 sm:gap-4 transition-colors group relative cursor-pointer"
                                                >
                                                    {/* Time Column */}
                                                    <div className="flex flex-col items-end w-12 sm:w-14 pt-0.5 shrink-0 tabular-nums">
                                                        <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm sm:text-base leading-tight">
                                                            {format(activity.startTime.toDate(), 'HH:mm')}
                                                        </span>
                                                        {activity.endTime && (
                                                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                                                                {format(activity.endTime.toDate(), 'HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Vertical Semantic Timeline Spine */}
                                                    <div className="w-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full relative shrink-0 my-1">
                                                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full -left-[4px] ring-4 ${meta.dotClass}`} />
                                                    </div>

                                                    {/* Card Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2.5">
                                                            <div className="min-w-0">
                                                                <h3 className="font-semibold text-zinc-950 dark:text-zinc-50 text-base leading-snug">
                                                                    {activity.title}
                                                                </h3>

                                                                {activity.location && activity.type !== 'transport' && (
                                                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                                                        <span className="truncate">{activity.location}</span>
                                                                    </div>
                                                                )}

                                                                {activity.type === 'transport' && (activity.departureLocation || activity.arrivalLocation) && (
                                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                                                            {activity.departureLocation || '?'} → {activity.arrivalLocation || '?'}
                                                                        </span>
                                                                        {activity.estimatedDuration && (
                                                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs tabular-nums">
                                                                                ({formatDuration(activity.estimatedDuration)})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className={`p-2 rounded-xl border shrink-0 ${meta.badgeClass}`}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                        </div>

                                                        {activity.notes && (
                                                            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800 px-3 py-2 rounded-xl line-clamp-3 leading-relaxed">
                                                                {activity.notes}
                                                            </p>
                                                        )}

                                                        {/* Checklist Toggle Pill & Inline Preview */}
                                                        {hasChecklist && (
                                                            <div className="mt-2.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedActivities(prev => ({
                                                                            ...prev,
                                                                            [activity.id]: !prev[activity.id]
                                                                        }));
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 px-2.5 py-1 rounded-lg transition-colors tabular-nums"
                                                                >
                                                                    <ListChecks className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                                                                    <span>
                                                                        清單 {activity.checklist!.filter(i => i.completed).length}/{activity.checklist!.length}
                                                                    </span>
                                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                </button>

                                                                {isExpanded && (
                                                                    <div
                                                                        className="expand-panel mt-2.5 space-y-1.5"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {activity.checklist!.map(item => (
                                                                            <div
                                                                                key={item.id}
                                                                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${
                                                                                    item.completed
                                                                                        ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/60 dark:border-emerald-500/20'
                                                                                        : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200/70 dark:border-zinc-800'
                                                                                }`}
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => handleToggleChecklistItem(e, activity.id, item.id)}
                                                                                    disabled={isUpdatingChecklist[activity.id]}
                                                                                    aria-label={item.completed ? `取消完成 ${item.text}` : `完成 ${item.text}`}
                                                                                    className={`mt-0.5 w-5 h-5 shrink-0 rounded-md flex items-center justify-center transition-colors border ${
                                                                                        item.completed
                                                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                                            : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-emerald-400'
                                                                                    }`}
                                                                                >
                                                                                    {item.completed && <Check className="w-3 h-3" />}
                                                                                </button>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <span className={`block text-xs sm:text-sm ${item.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                                                                        {item.text}
                                                                                    </span>
                                                                                    {item.remark && (
                                                                                        <span className={`block mt-0.5 text-xs break-words ${item.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                                                            {item.remark}
                                                                                        </span>
                                                                                    )}
                                                                                    {item.address && (
                                                                                        <a
                                                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                                                                                        >
                                                                                            <Navigation2 className="w-3 h-3" />
                                                                                            <span>在地圖開啟</span>
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Card Footer Actions (Touch-friendly) */}
                                                        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/70 flex items-center justify-between gap-2">
                                                            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                                                點擊查看詳情與地圖
                                                            </span>
                                                            <div
                                                                className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingActivity(activity);
                                                                        setIsActivityModalOpen(true);
                                                                    }}
                                                                    aria-label={`編輯 ${activity.title}`}
                                                                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                                    title="編輯"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMoveActivityModal({ isOpen: true, activity })}
                                                                    aria-label={`移動 ${activity.title}`}
                                                                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                                                    title="移動日期"
                                                                >
                                                                    <ArrowRight className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteActivityConfirm({
                                                                        isOpen: true,
                                                                        activityId: activity.id,
                                                                        activityTitle: activity.title
                                                                    })}
                                                                    aria-label={`刪除 ${activity.title}`}
                                                                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                                    title="刪除"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Mobile Floating Quick Actions (thumb-reachable) */}
            {isDayTab && (
                <div
                    className="sm:hidden fixed right-4 bottom-5 z-30 flex items-center gap-2"
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <button
                        type="button"
                        onClick={() => setIsMapModalOpen(true)}
                        aria-label="當日地圖"
                        className="h-12 px-3.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg shadow-black/15 dark:shadow-black/50 flex items-center gap-1.5 text-xs font-medium active:scale-95 transition-transform"
                    >
                        <MapIcon className="w-4 h-4 text-emerald-500" />
                        <span>地圖</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingActivity(null);
                            setIsActivityModalOpen(true);
                        }}
                        aria-label="新增活動"
                        className="h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-black/25 dark:shadow-black/50 flex items-center gap-1.5 text-sm font-medium active:scale-95 transition-transform"
                    >
                        <Plus className="w-4 h-4" />
                        <span>新增活動</span>
                    </button>
                </div>
            )}

            {activeTab === 'hotels' && (
                <button
                    type="button"
                    onClick={() => setHotelModal({ isOpen: true })}
                    aria-label="新增飯店"
                    className="sm:hidden fixed right-4 bottom-5 z-30 h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-black/25 dark:shadow-black/50 flex items-center gap-1.5 text-sm font-medium active:scale-95 transition-transform"
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <Plus className="w-4 h-4" />
                    <span>新增飯店</span>
                </button>
            )}

            {activeTab === 'planItems' && (
                <button
                    type="button"
                    onClick={() => setPlanItemModal({ isOpen: true })}
                    aria-label="新增待規劃項目"
                    className="sm:hidden fixed right-4 bottom-5 z-30 h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-black/25 dark:shadow-black/50 flex items-center gap-1.5 text-sm font-medium active:scale-95 transition-transform"
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <Plus className="w-4 h-4" />
                    <span>新增項目</span>
                </button>
            )}

            <CreateActivityModal
                isOpen={isActivityModalOpen || addPlanItemToItinerary.isOpen}
                onClose={() => {
                    setIsActivityModalOpen(false);
                    setEditingActivity(null);
                    setAddPlanItemToItinerary({ isOpen: false, planItem: null });
                }}
                onSubmit={handleActivitySubmit}
                selectedDate={isDayTab ? parseLocalDate(activeTab) : tripStartDate}
                defaultStartTime={defaultNewActivityStartTime}
                initialData={
                    addPlanItemToItinerary.isOpen && addPlanItemToItinerary.planItem
                        ? {
                              title: addPlanItemToItinerary.planItem.name,
                              location: addPlanItemToItinerary.planItem.location,
                              urls: addPlanItemToItinerary.planItem.urls,
                              notes: addPlanItemToItinerary.planItem.notes,
                              type: 'sightseeing'
                          }
                        : editingActivity
                }
                availableDays={addPlanItemToItinerary.isOpen ? days : undefined}
            />

            <DayMapModal
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                activities={currentDayActivities}
                dayTitle={`${format(isDayTab ? parseLocalDate(activeTab) : tripStartDate, 'yyyy/MM/dd')} 行程`}
            />

            <CreateFlightModal
                isOpen={flightModal.isOpen}
                onClose={() => setFlightModal({ ...flightModal, isOpen: false })}
                onSubmit={handleSaveFlight}
                initialData={flightModal.data}
                type={flightModal.type}
            />

            <CreateHotelModal
                isOpen={hotelModal.isOpen}
                onClose={() => setHotelModal({ isOpen: false })}
                onSubmit={handleSaveHotel}
                initialData={hotelModal.data}
            />

            <ConfirmDialog
                isOpen={deleteHotelConfirm.isOpen}
                title="刪除飯店資訊"
                message={`確定要刪除「${deleteHotelConfirm.hotelName}」嗎？`}
                onConfirm={() => {
                    handleDeleteHotel(deleteHotelConfirm.hotelId);
                    setDeleteHotelConfirm({ isOpen: false, hotelId: '', hotelName: '' });
                }}
                onCancel={() => setDeleteHotelConfirm({ isOpen: false, hotelId: '', hotelName: '' })}
            />

            <CreatePlanItemModal
                isOpen={planItemModal.isOpen}
                onClose={() => setPlanItemModal({ isOpen: false })}
                onSubmit={handleSavePlanItem}
                initialData={planItemModal.data}
            />

            <ConfirmDialog
                isOpen={deletePlanItemConfirm.isOpen}
                title="刪除待規劃項目"
                message={`確定要刪除「${deletePlanItemConfirm.itemName}」嗎？`}
                onConfirm={() => {
                    handleDeletePlanItem(deletePlanItemConfirm.itemId);
                    setDeletePlanItemConfirm({ isOpen: false, itemId: '', itemName: '' });
                }}
                onCancel={() => setDeletePlanItemConfirm({ isOpen: false, itemId: '', itemName: '' })}
            />

            <ConfirmDialog
                isOpen={deleteActivityConfirm.isOpen}
                title="刪除活動"
                message={`確定要刪除「${deleteActivityConfirm.activityTitle}」嗎？`}
                onConfirm={() => {
                    handleDeleteActivity(deleteActivityConfirm.activityId);
                    setDeleteActivityConfirm({ isOpen: false, activityId: '', activityTitle: '' });
                }}
                onCancel={() => setDeleteActivityConfirm({ isOpen: false, activityId: '', activityTitle: '' })}
            />

            <ActivityDetailModal
                activity={selectedActivityForDetail}
                onClose={() => setSelectedActivityForDetail(null)}
                onUpdateChecklist={handleUpdateChecklist}
            />

            <MoveActivityModal
                isOpen={moveActivityModal.isOpen}
                onClose={() => setMoveActivityModal({ isOpen: false, activity: null })}
                onMove={handleMoveActivity}
                activity={moveActivityModal.activity}
                days={days}
            />

            <CalculatorModal
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
                baseCurrency={trip.currency || 'TWD'}
            />
        </div>
    );
}
