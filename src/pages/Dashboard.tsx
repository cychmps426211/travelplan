import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { tripService, type TripMutationPayload } from '../services/tripService';
import type { Trip } from '../types';
import TripCard from '../components/TripCard';
import CreateTripModal from '../components/CreateTripModal';
import { Plus, Map, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
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
            document.removeEventListener('mousedown', handleClickOutside);
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

                    const isAEnded = aEndDate.getTime() < now.getTime();
                    const isBEnded = bEndDate.getTime() < now.getTime();

                    if (isAEnded && !isBEnded) return 1;
                    if (!isAEnded && isBEnded) return -1;

                    if (isAEnded && isBEnded) {
                        return bEndDate.getTime() - aEndDate.getTime();
                    }

                    return aStartDate.getTime() - bStartDate.getTime();
                });

                setTrips(sortedTrips);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleTripSubmit = async (tripData: TripMutationPayload) => {
        if (!user) return;

        if (editingTrip) {
            await tripService.updateTrip(editingTrip.id, tripData);
            showToast('已更新旅程資訊', 'success');
        } else {
            await tripService.createTrip(tripData, user.uid);
            showToast('已建立新旅程', 'success');
        }
    };

    const handleDeleteTrip = async (id: string) => {
        try {
            await tripService.deleteTrip(id);
            showToast('已刪除旅程', 'info');
        } catch {
            showToast('刪除旅程失敗，請稍後再試', 'error');
        }
    };

    const handleEditTrip = (trip: Trip) => {
        setEditingTrip(trip);
        setIsModalOpen(true);
    };

    const handleClearCacheAndReload = async () => {
        setIsMenuOpen(false);
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            } catch (err) {
                console.warn('Cache cleanup error:', err);
            }
        }
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            } catch (err) {
                console.warn('Service worker unregister error:', err);
            }
        }
        window.location.reload();
    };

    return (
        <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 transition-colors pb-24 sm:pb-20">
            {/* Navbar */}
            <nav className="bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 sticky top-0 z-40 pt-safe transition-colors">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center gap-2.5">
                            <img
                                src={`${import.meta.env.BASE_URL}travel.png`}
                                alt="TravelPlan"
                                className="w-7 h-7 rounded-lg"
                            />
                            <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                TravelPlan
                            </span>
                        </div>
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingTrip(null);
                                    setIsModalOpen(true);
                                }}
                                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-[0.98] text-white text-sm font-medium rounded-xl transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span>新增旅程</span>
                            </button>

                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    aria-expanded={isMenuOpen}
                                    aria-haspopup="menu"
                                    aria-label="帳號選單"
                                    className="flex items-center gap-2 p-1 sm:pr-2.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 rounded-full border border-zinc-200/80 dark:border-zinc-800 transition-colors"
                                >
                                    <img
                                        src={user?.photoURL || ''}
                                        alt="Profile"
                                        className="w-7 h-7 rounded-full border border-white dark:border-zinc-700"
                                    />
                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 hidden sm:block">
                                        {user?.displayName}
                                    </span>
                                </button>

                                {isMenuOpen && (
                                    <div
                                        role="menu"
                                        className="expand-panel absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden z-50"
                                    >
                                        <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800 sm:hidden">
                                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                {user?.displayName}
                                            </p>
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                                {user?.email}
                                            </p>
                                        </div>
                                        <div className="p-1.5 space-y-0.5">
                                            <ThemeToggle />
                                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2" />
                                            <button
                                                type="button"
                                                onClick={handleClearCacheAndReload}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                            >
                                                <RefreshCw className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                                <span>清除快取並重新載入</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    logout();
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>登出</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                {!loading && trips.length > 0 && (
                    <div className="flex items-baseline justify-between mb-5">
                        <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                            我的旅程
                        </h1>
                        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
                            {trips.length} 個行程
                        </span>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" />
                    </div>
                ) : trips.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-2xl p-10 sm:p-12 text-center border border-zinc-200/80 dark:border-zinc-800 shadow-sm mt-4"
                    >
                        <div className="bg-zinc-100 dark:bg-zinc-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <Map className="w-8 h-8 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2 tracking-tight">
                            開始規劃第一趟旅程
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-7 max-w-sm mx-auto leading-relaxed">
                            集中管理班機、住宿、每日路線與必去清單，讓旅行準備更從容。
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingTrip(null);
                                setIsModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>建立新旅程</span>
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {trips.map((trip) => (
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

            {/* Mobile Floating Action Button (thumb-friendly) */}
            {!loading && (
                <button
                    type="button"
                    onClick={() => {
                        setEditingTrip(null);
                        setIsModalOpen(true);
                    }}
                    aria-label="建立新旅程"
                    className="sm:hidden fixed right-4 bottom-5 z-30 h-12 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl shadow-lg shadow-black/25 dark:shadow-black/50 flex items-center gap-2 text-sm font-medium transition-transform"
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <Plus className="w-5 h-5" />
                    <span>新增旅程</span>
                </button>
            )}

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
