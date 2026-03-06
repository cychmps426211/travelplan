import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tripService } from '../services/tripService';
import type { Trip } from '../types';
import TripCard from '../components/TripCard';
import CreateTripModal from '../components/CreateTripModal';
import { Plus, Map, LogOut, Loader2, RefreshCw } from 'lucide-react';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.addEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (user) {
            const unsubscribe = tripService.subscribeToAllTrips((data) => {
                const now = new Date();

                const sortedTrips = [...data].sort((a, b) => {
                    const aEndDate = a.endDate?.toDate() || new Date(0);
                    const bEndDate = b.endDate?.toDate() || new Date(0);
                    const aStartDate = a.startDate?.toDate() || new Date(0);
                    const bStartDate = b.startDate?.toDate() || new Date(0);

                    // end of the day roughly for comparison
                    const isAEnded = aEndDate.getTime() < now.getTime();
                    const isBEnded = bEndDate.getTime() < now.getTime();

                    if (isAEnded && !isBEnded) return 1; // a is ended, b is not -> a goes last
                    if (!isAEnded && isBEnded) return -1; // a is not ended, b is ended -> b goes last

                    if (isAEnded && isBEnded) {
                        // Both ended: sort by most recently ended first
                        return bEndDate.getTime() - aEndDate.getTime();
                    }

                    // Both not ended (upcoming or ongoing): sort by start date ascending (closest first)
                    return aStartDate.getTime() - bStartDate.getTime();
                });

                setTrips(sortedTrips);
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
        await tripService.deleteTrip(id);
    };

    const handleEditTrip = (trip: Trip) => {
        setEditingTrip(trip);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <img src={`${import.meta.env.BASE_URL}travel.png`} alt="TravelPlan" className="w-8 h-8" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                                TravelPlan
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setEditingTrip(null);
                                    setIsModalOpen(true);
                                }}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                                title="建立新旅程"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-100 transition-colors"
                                >
                                    <img
                                        src={user?.photoURL || ''}
                                        alt="Profile"
                                        className="w-6 h-6 rounded-full border border-white shadow-sm"
                                    />
                                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                                        {user?.displayName}
                                    </span>
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                logout();
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            登出
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setIsMenuOpen(false);
                                                if ('caches' in window) {
                                                    try {
                                                        const cacheNames = await caches.keys();
                                                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                                                    } catch (err) { }
                                                }
                                                if ('serviceWorker' in navigator) {
                                                    try {
                                                        const registrations = await navigator.serviceWorker.getRegistrations();
                                                        for (const registration of registrations) {
                                                            await registration.unregister();
                                                        }
                                                    } catch (err) { }
                                                }
                                                window.location.reload();
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            清除快取並重新載入
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                                onEdit={() => handleEditTrip(trip)}
                                onDelete={() => handleDeleteTrip(trip.id)}
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
