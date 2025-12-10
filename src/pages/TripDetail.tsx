import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Trip, Activity, FlightInfo } from '../types';
import { activityService } from '../services/activityService';
import { tripService } from '../services/tripService';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { MapPin, ArrowLeft, Plus, Utensils, Bed, Car, Camera, Plane, LayoutDashboard, Calendar } from 'lucide-react';
import CreateActivityModal from '../components/CreateActivityModal';
import CreateFlightModal from '../components/CreateFlightModal';
import FlightCard from '../components/FlightCard';

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
    const [flightModal, setFlightModal] = useState<{
        isOpen: boolean;
        type: 'outbound' | 'return';
        data?: FlightInfo;
    }>({ isOpen: false, type: 'outbound' });

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

    const handleAddActivity = async (activityData: any) => {
        if (!id) return;
        try {
            await activityService.addActivity(id, activityData);
        } catch (error) {
            console.error("Error adding activity: ", error);
            alert("Failed to add activity");
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
        if (!window.confirm('Remove this flight information?')) return;

        // Firestore doesn't strictly support "deleting" a field easily with update without using deleteField(), 
        // but setting to null or a special update object works if mapped correctly. 
        // For simplicity in this helper, we recreate the object without the field or set it to null.
        // HOWEVER, Firestore update helper usually merges. We might need logic in service. 
        // Let's rely on tripService.updateTrip handling the Partial object.
        // Wait, standard updateDoc simply merges. Passing undefined might ignore it. Passing null writes null.
        // Let's update tripService to handle this or just pass null and update types to Allow null? 
        // Or cleaner: use deleteField() from firestore. 
        // Since I can't easily import deleteField in the UI without making it messy, 
        // I'll just write { outboundFlight: null } effectively (though types say optional).
        // Actual fix: Force cast to any or fix types to allow null if I want to "delete".
        // Or better, let's just make the service method robust or overwrite with empty? 
        // Let's try passing null casting as any for now.

        const updates: any = {};
        if (type === 'outbound') updates.outboundFlight = null;
        else updates.returnFlight = null;

        // Note: Firestore treats null as a valid value, effectively "deleting" the map structure if using doc() update? 
        // Actually no, it sets the field to null. That's fine for our UI checks (if !flight).
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
                                    <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 hover:shadow-md transition-shadow">
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
                                                    {activity.location && (
                                                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {activity.location}
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
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </main>

            <CreateActivityModal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                onSubmit={handleAddActivity}
                selectedDate={activeTab === 'overview' ? tripStartDate : new Date(activeTab)}
            />

            <CreateFlightModal
                isOpen={flightModal.isOpen}
                onClose={() => setFlightModal({ ...flightModal, isOpen: false })}
                onSubmit={handleSaveFlight}
                initialData={flightModal.data}
                type={flightModal.type}
            />
        </div>
    );
}
