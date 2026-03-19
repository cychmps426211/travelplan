import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tripService } from '../services/tripService';
import type { Trip } from '../types';
import TripCard from '../components/TripCard';
import CreateTripModal from '../components/CreateTripModal';
import { Plus, Map, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';

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
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 transition-colors pb-20">
            {/* Navbar */}
            <nav className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                            <img src={`${import.meta.env.BASE_URL}travel.png`} alt="TravelPlan" className="w-8 h-8" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
                                TravelPlan
                            </span>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setEditingTrip(null);
                                    setIsModalOpen(true);
                                }}
                                className="p-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all"
                                title="建立新旅程"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 px-1.5 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-800 transition-all active:scale-95"
                                >
                                    <img
                                        src={user?.photoURL || ''}
                                        alt="Profile"
                                        className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block pr-2">
                                        {user?.displayName}
                                    </span>
                                </button>

                                {isMenuOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 backdrop-blur-xl"
                                    >
                                        <div className="p-2 space-y-1">
                                            <ThemeToggle />
                                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2"></div>
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
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                            >
                                                <RefreshCw className="w-4 h-4 text-blue-500" />
                                                清除快取並重新載入
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    logout();
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                登出
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                ) : trips.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-3xl rounded-3xl p-12 text-center border border-white/20 dark:border-gray-800 shadow-xl shadow-blue-900/5"
                    >
                        <div className="bg-gradient-to-tr from-blue-100 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Map className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">開始您的第一趟旅程</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                            開始規劃你的下一次冒險！邀請朋友一起協作，打造完美行程，記錄每個美好時刻。
                        </p>
                        <button
                            onClick={() => {
                                setEditingTrip(null);
                                setIsModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-full flex items-center justify-center gap-2 mx-auto transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
                        >
                            立刻建立行程 <Plus className="w-5 h-5" />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial="hidden"
                        animate="show"
                        variants={{
                            hidden: { opacity: 0 },
                            show: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                            }
                        }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {trips.map((trip) => (
                            <motion.div 
                                key={trip.id}
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    show: { opacity: 1, y: 0 }
                                }}
                            >
                                <TripCard
                                    trip={trip}
                                    onEdit={() => handleEditTrip(trip)}
                                    onDelete={() => handleDeleteTrip(trip.id)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
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
