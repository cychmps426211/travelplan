import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Trip, Activity, FlightInfo, ChecklistItem, HotelInfo } from '../types';
import { activityService } from '../services/activityService';
import { tripService } from '../services/tripService';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { MapPin, ArrowLeft, Plus, Utensils, Bed, Car, Camera, Calendar, Edit2, Trash2, ArrowRight } from 'lucide-react';
import CreateActivityModal from '../components/CreateActivityModal';
import CreateFlightModal from '../components/CreateFlightModal';
import FlightCard from '../components/FlightCard';
import CreateHotelModal from '../components/CreateHotelModal';
import HotelCard from '../components/HotelCard';
import ConfirmDialog from '../components/ConfirmDialog';
import ActivityDetailModal from '../components/ActivityDetailModal';
import CreatePlanItemModal from '../components/CreatePlanItemModal';
import PlanItemCard from '../components/PlanItemCard';
import MoveActivityModal from '../components/MoveActivityModal';
import type { PlanItem } from '../types';

type Tab = 'overview' | string; // string will be ISO date

export default function TripDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

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
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(prev => {
                const SCROLL_THRESHOLD = 30;
                if (prev) {
                    return window.scrollY > SCROLL_THRESHOLD;
                } else {
                    // Header 縮小大約會短縮 250px 左右的高度
                    // 如果剩餘長度不夠（低於縮去的高度），就會觸發瀏覽器強迫捲動回彈，導致死循環
                    // 所以將閾值提高到 450px，確保下方至少還有半個螢幕的內容時才開始縮縮 Header
                    const hasEnoughContent = document.documentElement.scrollHeight > window.innerHeight + 450;
                    return window.scrollY > SCROLL_THRESHOLD && hasEnoughContent;
                }
            });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!id) return;

        // Subscribe to Trip Details for real-time flight updates
        const unsubscribeTrip = onSnapshot(doc(db, 'trips', id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const tripData = {
                    id: docSnap.id,
                    ...data,
                    startDate: data.startDate?.toDate ? data.startDate : data.startDate,
                    endDate: data.endDate?.toDate ? data.endDate : data.endDate,
                    // Handle timestamps for flights if they exist
                    outboundFlight: data.outboundFlight ? { ...data.outboundFlight } : undefined,
                    returnFlight: data.returnFlight ? { ...data.returnFlight } : undefined
                } as Trip;
                setTrip(tripData);
            } else {
                navigate('/');
            }
            setLoading(false);
        });

        // Subscribe to activities
        const unsubscribeActivities = activityService.subscribeToActivities(id, (data) => {
            setActivities(data);
        });

        return () => {
            unsubscribeTrip();
            unsubscribeActivities();
        };
    }, [id, navigate]);

    const handleActivitySubmit = async (activityData: any) => {
        if (!id) return;
        try {
            if (editingActivity) {
                await activityService.updateActivity(id, editingActivity.id, activityData);
            } else {
                await activityService.addActivity(id, activityData);
            }
            if (addPlanItemToItinerary.isOpen && addPlanItemToItinerary.planItem) {
                await handleTogglePlanItemSchedule(addPlanItemToItinerary.planItem, true);
                setAddPlanItemToItinerary({ isOpen: false, planItem: null });
            }
            setIsActivityModalOpen(false);
            setEditingActivity(null);
        } catch (error) {
            console.error("Error saving activity: ", error);
            alert("Failed to save activity");
        }
    };

    const handleDeleteActivity = async (activityId: string) => {
        if (!id) return;
        try {
            await activityService.deleteActivity(id, activityId);
        } catch (error) {
            console.error("Error deleting activity: ", error);
            alert("刪除活動失敗");
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

                // Keep the original duration or same day logic
                // Typically if it's the same day, move both to the target date.
                // If it spans multiple days, we might just preserve the length. 
                // For simplicity, just set the start date, and shift the end date by same amount of ms.
                const diffTime = originalEnd.getTime() - originalStart.getTime();
                newEnd.setTime(newStart.getTime() + diffTime);
            }

            await activityService.updateActivity(id, activityId, {
                startTime: Timestamp.fromDate(newStart),
                ...(newEnd ? { endTime: Timestamp.fromDate(newEnd) } : {})
            });
        } catch (error) {
            console.error("Error moving activity: ", error);
            alert("移動活動失敗");
        }
    };

    const handleUpdateChecklist = async (activityId: string, checklist: ChecklistItem[]) => {
        if (!id) return;
        try {
            await activityService.updateActivity(id, activityId, { checklist });
            // Update the local state for the detail modal
            if (selectedActivityForDetail && selectedActivityForDetail.id === activityId) {
                setSelectedActivityForDetail({ ...selectedActivityForDetail, checklist });
            }
        } catch (error) {
            console.error("Error updating checklist: ", error);
            throw error;
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
    };

    const handleDeleteFlight = async (type: 'outbound' | 'return') => {
        if (!trip) return;
        const updates: any = {};
        if (type === 'outbound') updates.outboundFlight = null;
        else updates.returnFlight = null;
        await tripService.updateTrip(trip.id, updates);
    };

    const handleSaveHotel = async (hotelData: HotelInfo) => {
        if (!trip) return;
        const currentHotels = trip.hotels || [];
        const existingIndex = currentHotels.findIndex(h => h.id === hotelData.id);

        let newHotels;
        if (existingIndex >= 0) {
            newHotels = [...currentHotels];
            newHotels[existingIndex] = hotelData;
        } else {
            newHotels = [...currentHotels, hotelData];
        }

        await tripService.updateTrip(trip.id, { hotels: newHotels });
    };

    const handleDeleteHotel = async (hotelId: string) => {
        if (!trip) return;
        const currentHotels = trip.hotels || [];
        const newHotels = currentHotels.filter(h => h.id !== hotelId);
        await tripService.updateTrip(trip.id, { hotels: newHotels });
    };

    const handleSavePlanItem = async (planItemData: PlanItem) => {
        if (!trip) return;
        const currentItems = trip.planItems || [];
        const existingIndex = currentItems.findIndex(i => i.id === planItemData.id);

        let newItems;
        if (existingIndex >= 0) {
            newItems = [...currentItems];
            newItems[existingIndex] = planItemData;
        } else {
            newItems = [...currentItems, planItemData];
        }

        await tripService.updateTrip(trip.id, { planItems: newItems });
    };

    const handleDeletePlanItem = async (itemId: string) => {
        if (!trip) return;
        const currentItems = trip.planItems || [];
        const newItems = currentItems.filter(i => i.id !== itemId);
        await tripService.updateTrip(trip.id, { planItems: newItems });
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

    if (loading || !trip) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const tripStartDate = trip.startDate.toDate();
    const tripEndDate = trip.endDate.toDate();
    const days = eachDayOfInterval({ start: tripStartDate, end: tripEndDate });

    const currentDayActivities = activities.filter(a =>
        activeTab !== 'overview' && activeTab !== 'hotels' && activeTab !== 'planItems' && isSameDay(a.startTime.toDate(), new Date(activeTab))
    );

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'food': return <Utensils className="w-4 h-4" />;
            case 'lodging': return <Bed className="w-4 h-4" />;
            case 'transport': return <Car className="w-4 h-4" />;
            default: return <Camera className="w-4 h-4" />;
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className={`bg-white border-b border-slate-200 sticky top-0 z-40 transition-shadow duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
                <div className={`max-w-4xl mx-auto px-4 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-4'}`}>
                    {/* Top Section to Hide */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isScrolled ? 'max-h-0 opacity-0 mb-0' : 'max-h-[200px] opacity-100 mb-6'}`}>
                        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4 group">
                            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                            返回主控台
                        </Link>

                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.title}</h1>
                                <div className="flex items-center gap-4 text-gray-500 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4" />
                                        {trip.destination}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        {format(trip.startDate.toDate(), 'yyyy/MM/dd')} - {format(trip.endDate.toDate(), 'yyyy/MM/dd')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex flex-col">
                        {/* First Row: Categories */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isScrolled && activeTab !== 'overview' && activeTab !== 'hotels' && activeTab !== 'planItems'
                            ? 'max-h-0 opacity-0 !mb-0'
                            : 'max-h-[60px] opacity-100 mb-3'
                            }`}>
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'overview'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    機票
                                </button>
                                <button
                                    onClick={() => setActiveTab('hotels')}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'hotels'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    飯店
                                </button>
                                <button
                                    onClick={() => setActiveTab('planItems')}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'planItems'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    待規劃清單
                                </button>
                            </div>
                        </div>

                        {/* Second Row: Days */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isScrolled && (activeTab === 'overview' || activeTab === 'hotels' || activeTab === 'planItems')
                            ? 'max-h-0 opacity-0 !mb-0'
                            : 'max-h-[60px] opacity-100 pb-1'
                            }`}>
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                                {days.map((day, index) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const isActive = activeTab === dateStr;
                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => setActiveTab(dateStr)}
                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                }`}
                                        >
                                            第 {index + 1} 天 <span className="opacity-75 text-xs ml-1">({format(day, 'MM/dd')})</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 pb-32">
                {activeTab === 'overview' ? (
                    <div className="space-y-6">
                        {/* Outbound */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-blue-500 rounded-full" />
                                    去程航班
                                </h2>
                                {!trip.outboundFlight && (
                                    <button
                                        onClick={() => {
                                            setFlightModal({ isOpen: true, type: 'outbound' });
                                        }}
                                        className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> 新增航班
                                    </button>
                                )}
                            </div>
                            {trip.outboundFlight ? (
                                <FlightCard
                                    flight={trip.outboundFlight}
                                    type="outbound"
                                    onEdit={() => {
                                        setFlightModal({ isOpen: true, type: 'outbound', data: trip.outboundFlight });
                                    }}
                                    onDelete={() => handleDeleteFlight('outbound')}
                                />
                            ) : (
                                <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                                    <p className="text-sm">尚未新增去程航班資訊</p>
                                </div>
                            )}
                        </div>

                        {/* Return */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                                    回程航班
                                </h2>
                                {!trip.returnFlight && (
                                    <button
                                        onClick={() => {
                                            setFlightModal({ isOpen: true, type: 'return' });
                                        }}
                                        className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> 新增航班
                                    </button>
                                )}
                            </div>
                            {trip.returnFlight ? (
                                <FlightCard
                                    flight={trip.returnFlight}
                                    type="return"
                                    onEdit={() => {
                                        setFlightModal({ isOpen: true, type: 'return', data: trip.returnFlight });
                                    }}
                                    onDelete={() => handleDeleteFlight('return')}
                                />
                            ) : (
                                <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                                    <p className="text-sm">尚未新增回程航班資訊</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'hotels' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                                飯店資訊
                            </h2>
                            <button
                                onClick={() => setHotelModal({ isOpen: true })}
                                className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> 新增飯店
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
                            <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                                <p className="text-sm">尚未新增飯店資訊</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'planItems' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="w-2 h-6 bg-purple-500 rounded-full" />
                                待規劃清單
                            </h2>
                            <button
                                onClick={() => setPlanItemModal({ isOpen: true })}
                                className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> 新增項目
                            </button>
                        </div>
                        {trip.planItems && trip.planItems.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
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
                            <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                                <p className="text-sm">此清單可以臨時放置一些可能會想去、想做的事情</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Itinerary View
                    <>
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">
                                當日行程
                            </h2>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                onClick={() => setIsActivityModalOpen(true)}
                            >
                                <Plus className="w-4 h-4" />
                                新增活動
                            </button>
                        </div>

                        <div className="space-y-4">
                            {currentDayActivities.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                                    <div className="text-slate-400 mb-2">此日沒有活動安排</div>
                                    <button
                                        onClick={() => setIsActivityModalOpen(true)}
                                        className="text-blue-600 text-sm font-medium hover:underline"
                                    >
                                        新增您的第一個活動
                                    </button>
                                </div>
                            ) : (
                                currentDayActivities.map(activity => (
                                    <div
                                        key={activity.id}
                                        className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 hover:shadow-md transition-shadow group relative pr-12 cursor-pointer"
                                        onClick={() => setSelectedActivityForDetail(activity)}
                                    >
                                        <div className="flex flex-col items-center gap-1 w-16 pt-1 text-slate-500">
                                            <span className="font-bold text-slate-900">{format(activity.startTime.toDate(), 'HH:mm')}</span>
                                            {activity.endTime && (
                                                <span className="text-xs opacity-70">{format(activity.endTime.toDate(), 'HH:mm')}</span>
                                            )}
                                        </div>

                                        <div className="w-1 bg-slate-100 rounded-full relative">
                                            {/* Timeline dot could go here */}
                                        </div>

                                        <div className="flex-1 pb-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{activity.title}</h3>
                                                    {activity.location && activity.type !== 'transport' && (
                                                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {activity.location}
                                                        </div>
                                                    )}
                                                    {activity.type === 'transport' && (activity.departureLocation || activity.arrivalLocation) && (
                                                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {activity.departureLocation || '?'} → {activity.arrivalLocation || '?'}
                                                            {activity.estimatedDuration && (
                                                                <span className="ml-2 text-blue-600 font-medium">
                                                                    ({activity.estimatedDuration >= 60
                                                                        ? `${Math.floor(activity.estimatedDuration / 60)}小時${activity.estimatedDuration % 60 > 0 ? ` ${activity.estimatedDuration % 60}分鐘` : ''}`
                                                                        : `${activity.estimatedDuration}分鐘`})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {activity.notes && (
                                                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">{activity.notes}</p>
                                                    )}
                                                </div>
                                                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                                                    {getActivityIcon(activity.type)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Edit/Move/Delete Actions */}
                                        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingActivity(activity);
                                                    setIsActivityModalOpen(true);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="編輯"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMoveActivityModal({ isOpen: true, activity });
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="移動"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteActivityConfirm({
                                                        isOpen: true,
                                                        activityId: activity.id,
                                                        activityTitle: activity.title
                                                    });
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="刪除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </main>

            <CreateActivityModal
                isOpen={isActivityModalOpen || addPlanItemToItinerary.isOpen}
                onClose={() => {
                    setIsActivityModalOpen(false);
                    setEditingActivity(null);
                    setAddPlanItemToItinerary({ isOpen: false, planItem: null });
                }}
                onSubmit={handleActivitySubmit}
                selectedDate={activeTab === 'overview' || activeTab === 'hotels' || activeTab === 'planItems' ? tripStartDate : new Date(activeTab)}
                initialData={addPlanItemToItinerary.isOpen && addPlanItemToItinerary.planItem ? {
                    title: addPlanItemToItinerary.planItem.name,
                    location: addPlanItemToItinerary.planItem.location,
                    urls: addPlanItemToItinerary.planItem.urls,
                    notes: addPlanItemToItinerary.planItem.notes,
                    type: 'sightseeing'
                } : editingActivity}
                availableDays={addPlanItemToItinerary.isOpen ? days : undefined}
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

            {/* Delete Activity Confirmation Dialog */}
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

            {/* Activity Detail Modal */}
            <ActivityDetailModal
                activity={selectedActivityForDetail}
                onClose={() => setSelectedActivityForDetail(null)}
                onUpdateChecklist={handleUpdateChecklist}
            />

            {/* Move Activity Modal */}
            <MoveActivityModal
                isOpen={moveActivityModal.isOpen}
                onClose={() => setMoveActivityModal({ isOpen: false, activity: null })}
                onMove={handleMoveActivity}
                activity={moveActivityModal.activity}
                days={days}
            />
        </div>
    );
}
