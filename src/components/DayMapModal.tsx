/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map as MapIcon, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Activity } from '../types';

interface DayMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    activities: Activity[];
    dayTitle: string;
}

export default function DayMapModal({ isOpen, onClose, activities, dayTitle }: DayMapModalProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    // Extract locations from activity locations AND checklist addresses
    const locations: string[] = [];
    activities.forEach(a => {
        if (a.type !== 'transport' && a.location && a.location.trim() !== '') {
            locations.push(a.location.trim());
        }
        if (a.checklist && Array.isArray(a.checklist)) {
            a.checklist.forEach(item => {
                if (item.address && item.address.trim() !== '') {
                    locations.push(item.address.trim());
                }
            });
        }
    });

    // Remove duplicates
    const uniqueLocations = Array.from(new Set(locations));

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!isOpen || uniqueLocations.length === 0 || !apiKey) return;

        let isMounted = true;

        const initMap = async () => {
            setIsLoading(true);
            setMapError(null);
            try {
                // Ensure Google Maps API is loaded
                if (!(window as any).google || !(window as any).google.maps) {
                    await new Promise<void>((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                        script.async = true;
                        script.defer = true;

                        // Check if a script is already loading to avoid duplicates
                        const head = document.head;
                        const existingScript = head.querySelector(`script[src^="https://maps.googleapis.com"]`);
                        if (existingScript) {
                            existingScript.addEventListener('load', () => resolve());
                            existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
                            return;
                        }

                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('無法載入 Google Maps API'));
                        head.appendChild(script);
                    });
                }

                if (!isMounted || !mapRef.current) return;

                const googleMaps = (window as any).google.maps;

                const map = new googleMaps.Map(mapRef.current, {
                    zoom: 12,
                    center: { lat: 25.0330, lng: 121.5654 }, // Default fallback
                    mapTypeControl: false,
                    streetViewControl: false,
                    gestureHandling: 'greedy', // Allows single-finger panning without the prompt
                });

                const geocoder = new googleMaps.Geocoder();
                const bounds = new googleMaps.LatLngBounds();
                let hasValidLocation = false;

                // Create a single shared InfoWindow to prevent overlapping
                const sharedInfoWindow = new googleMaps.InfoWindow();

                // Geocode all unique locations to plot markers
                const geocodePromises = uniqueLocations.map((loc) => {
                    return new Promise<void>((resolve) => {
                        geocoder.geocode({ address: loc }, (results: any, status: string) => {
                            if (status === 'OK' && results && results[0] && isMounted) {
                                const position = results[0].geometry.location;
                                const marker = new googleMaps.Marker({
                                    map,
                                    position,
                                    title: loc,
                                    animation: googleMaps.Animation.DROP,
                                });

                                const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;
                                const contentHtml = `
                                    <div style="padding: 2px 4px 0px 4px; font-family: sans-serif; display: flex; flex-direction: column; gap: 8px; min-width: 160px; max-width: 250px;">
                                        <div style="font-weight: 600; color: #1e293b; font-size: 15px; line-height: 1.4;">${loc}</div>
                                        <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-size: 14px; font-weight: 500; text-decoration: none; display: flex; align-items: center; gap: 4px; padding-bottom: 4px;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                            使用 Google 地圖開啟
                                        </a>
                                    </div>
                                `;

                                marker.addListener('click', () => {
                                    sharedInfoWindow.setOptions({
                                        headerDisabled: true, // Specifically disables the new bulky header/blank space in latest Maps API
                                    });
                                    sharedInfoWindow.setContent(contentHtml);
                                    sharedInfoWindow.open(map, marker);
                                });

                                bounds.extend(position);
                                hasValidLocation = true;
                            } else {
                                console.warn(`Geocode failed for: ${loc}`, status);
                            }
                            resolve(); // Resolve anyway to proceed with others
                        });
                    });
                });

                await Promise.all(geocodePromises);

                if (isMounted) {
                    if (hasValidLocation) {
                        map.fitBounds(bounds);
                        // Prevent extreme zoom if only 1 mapped marker
                        const listener = googleMaps.event.addListener(map, "idle", () => {
                            if (map.getZoom() > 16) {
                                map.setZoom(16);
                            }
                            googleMaps.event.removeListener(listener);
                        });
                    } else {
                        setMapError('無法定位任何地點，請確認地址是否正確。');
                    }
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Map rendering error:", error);
                if (isMounted) {
                    setMapError('地圖載入發生錯誤');
                    setIsLoading(false);
                }
            }
        };

        // Delay slightly for modal animation
        const timeoutId = setTimeout(() => {
            initMap();
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [isOpen, uniqueLocations.join(','), apiKey]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pl-safe pr-safe pb-safe shadow-2xl backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="relative w-full max-w-4xl h-[70vh] bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200/50 dark:border-gray-800/50"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-100 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <MapIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100">今日地點標記</h2>
                                <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{dayTitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 relative bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden">
                        {uniqueLocations.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center p-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                                        <MapIcon className="w-8 h-8 text-slate-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-slate-500 dark:text-gray-400 font-medium text-lg">
                                        行程及清單中尚未包含任何地點
                                    </p>
                                    <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">
                                        新增活動地點或待辦清單地點後即可查看
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {isLoading && !mapError && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                                        <p className="text-slate-600 dark:text-gray-300 font-medium">正在載入地圖與標記...</p>
                                    </div>
                                )}
                                
                                {mapError && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-6 text-center">
                                        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                                            <X className="w-8 h-8 text-red-500 dark:text-red-400" />
                                        </div>
                                        <p className="text-red-600 dark:text-red-400 font-bold text-lg mb-2">{mapError}</p>
                                        <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md">
                                            我們可能無法解析您輸入的某些地址，請確認它們是有效的地標或地址名稱。
                                        </p>
                                    </div>
                                )}

                                {/* Fix Tailwind CSS reset conflicts with Google Maps UI */}
                                <style>{`
                                    /* Restore close button visibility and positioning */
                                    .gm-ui-hover-effect {
                                        opacity: 1 !important;
                                    }
                                    .gm-ui-hover-effect span {
                                        margin: 0 !important;
                                        width: 100% !important;
                                        height: 100% !important;
                                    }
                                    /* Fix SVG scaling inside close button */
                                    .gm-ui-hover-effect svg {
                                        display: inline !important;
                                    }
                                `}</style>
                                <div ref={mapRef} className="absolute inset-0 w-full h-full rounded-b-[2rem] overflow-hidden" />
                            </>
                        )}
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}

