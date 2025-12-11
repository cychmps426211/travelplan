import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Trip, Activity, FlightInfo } from '../types';
import { activityService } from '../services/activityService';
import { tripService } from '../services/tripService';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { MapPin, ArrowLeft, Plus, Utensils, Bed, Car, Camera, Calendar, Edit2, Trash2 } from 'lucide-react';
import CreateActivityModal from '../components/CreateActivityModal';
import CreateFlightModal from '../components/CreateFlightModal';
import FlightCard from '../components/FlightCard';
import ConfirmDialog from '../components/ConfirmDialog';
import ActivityDetailModal from '../components/ActivityDetailModal';

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
    const [deleteActivityConfirm, setDeleteActivityConfirm] = useState<{
        isOpen: boolean;
        activityId: string;
        activityTitle: string;
    }>({ isOpen: false, activityId: '', activityTitle: '' });
    const [selectedActivityForDetail, setSelectedActivityForDetail] = useState<Activity | null>(null);

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
        activeTab !== 'overview' && isSameDay(a.startTime.toDate(), new Date(activeTab))
    );

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'food': return <Utensils className="w-4 h-4" />;
            case 'lodging': return <Bed className="w-4 h-4" />;
            case 'transport': return <Car className="w-4 h-4" />;
            default: return <Camera className="w-4 h-4" />;
        }
    };

    // Placeholder for user, assuming it would come from an auth context
    const user = { displayName: 'User' };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4 group">
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        返回主控台
                    </Link>

                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
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
                        <div className="flex -space-x-2">
                            {/* Placeholder for members */}
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white text-xs font-bold text-blue-600">
                                {user?.displayName?.charAt(0)}
                            </div>
                        </div>
                    </div>

                    {/* Days/Tabs Navigation */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                        {/* Flight/Overview Tab */}
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'overview'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            總覽 (機票)
                        </button>

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

            {/* Content Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
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

                                        {/* Edit/Delete Actions */}
                                        <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                isOpen={isActivityModalOpen}
                onClose={() => {
                    setIsActivityModalOpen(false);
                    setEditingActivity(null);
                }}
                onSubmit={handleActivitySubmit}
                selectedDate={activeTab === 'overview' ? tripStartDate : new Date(activeTab)}
                initialData={editingActivity}
            />

            <CreateFlightModal
                isOpen={flightModal.isOpen}
                onClose={() => setFlightModal({ ...flightModal, isOpen: false })}
                onSubmit={handleSaveFlight}
                initialData={flightModal.data}
                type={flightModal.type}
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
            />
        </div>
    );
}
