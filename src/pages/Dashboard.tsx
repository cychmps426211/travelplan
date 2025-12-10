import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tripService } from '../services/tripService';
import type { Trip } from '../types';
import TripCard from '../components/TripCard';
import CreateTripModal from '../components/CreateTripModal';
import { Plus, Map, LogOut, Loader2 } from 'lucide-react';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

    useEffect(() => {
        if (user) {
            const unsubscribe = tripService.subscribeToUserTrips(user.uid, (data) => {
                setTrips(data);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleTripSubmit = async (tripData: any) => {
        if (!user) return;

        if (editingTrip) {
            await tripService.updateTrip(editingTrip.id, tripData);
        } else {
            await tripService.createTrip(tripData, user.uid);
        }
    };

    const handleDeleteTrip = async (id: string) => {
        if (window.confirm('確定要刪除此旅程嗎？')) {
            await tripService.deleteTrip(id);
        }
    };

    const handleEditTrip = (trip: Trip) => {
        setEditingTrip(trip);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-1.5 rounded-lg">
                                <Map className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                                TravelPlan
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                                <img
                                    src={user?.photoURL || ''}
                                    alt="Profile"
                                    className="w-6 h-6 rounded-full border border-white shadow-sm"
                                />
                                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                                    {user?.displayName}
                                </span>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                title="登出"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">我的旅程</h1>
                        <p className="text-gray-500 mt-1">管理與規劃你的下一場冒險</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingTrip(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        建立新旅程
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : trips.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Map className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">還沒有旅程</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            開始規劃你的下一次冒險！邀請朋友一起協作，打造完美行程。
                        </p>
                        <button
                            onClick={() => {
                                setEditingTrip(null);
                                setIsModalOpen(true);
                            }}
                            className="text-blue-600 font-medium hover:text-blue-700 flex items-center justify-center gap-2 mx-auto"
                        >
                            立刻建立 <Plus className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trips.map(trip => (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                onDelete={() => handleDeleteTrip(trip.id)}
                                onEdit={() => handleEditTrip(trip)}
                            />
                        ))}
                    </div>
                )}
            </main>

            <CreateTripModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTrip(null);
                }}
                onSubmit={handleTripSubmit}
                initialData={editingTrip}
            />
        </div>
    );
}
