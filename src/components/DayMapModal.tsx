import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Map as MapIcon, Loader2, X } from 'lucide-react';
import type { Activity } from '../types';
import Modal from './Modal';
import { loadGoogleMapsAPI } from '../utils/googleMaps';
import { getThemedMapOptions, attachRasterDarkStyleFallback } from '../constants/mapStyles';

interface DayMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    activities: Activity[];
    dayTitle: string;
}

function buildInfoWindowContent(location: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '4px 6px 2px 6px';
    wrapper.style.fontFamily = 'sans-serif';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';
    wrapper.style.minWidth = '160px';
    wrapper.style.maxWidth = '240px';

    const titleEl = document.createElement('div');
    titleEl.textContent = location;
    titleEl.style.fontWeight = '600';
    titleEl.style.color = '#18181b';
    titleEl.style.fontSize = '14px';
    titleEl.style.lineHeight = '1.4';

    const link = document.createElement('a');
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '在 Google 地圖開啟 ↗';
    link.style.color = '#2563eb';
    link.style.fontSize = '13px';
    link.style.fontWeight = '500';
    link.style.textDecoration = 'none';

    wrapper.appendChild(titleEl);
    wrapper.appendChild(link);
    return wrapper;
}

export default function DayMapModal({ isOpen, onClose, activities, dayTitle }: DayMapModalProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const uniqueLocations = useMemo(() => {
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
        return Array.from(new Set(locations));
    }, [activities]);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!isOpen || uniqueLocations.length === 0 || !apiKey) return;

        let isMounted = true;

        const initMap = async () => {
            setIsLoading(true);
            setMapError(null);
            try {
                await loadGoogleMapsAPI();

                if (!isMounted || !mapRef.current) return;

                const googleMaps = window.google.maps;

                const map = new googleMaps.Map(mapRef.current, {
                    zoom: 12,
                    center: { lat: 25.0330, lng: 121.5654 },
                    mapTypeControl: false,
                    streetViewControl: false,
                    gestureHandling: 'greedy',
                    ...getThemedMapOptions(isDark),
                });
                attachRasterDarkStyleFallback(map, isDark);

                const geocoder = new googleMaps.Geocoder();
                const bounds = new googleMaps.LatLngBounds();
                let hasValidLocation = false;
                const sharedInfoWindow = new googleMaps.InfoWindow();

                const geocodePromises = uniqueLocations.map((loc) => {
                    return new Promise<void>((resolve) => {
                        geocoder.geocode({ address: loc }, (results, status) => {
                            if (status === googleMaps.GeocoderStatus.OK && results && results[0] && isMounted) {
                                const position = results[0].geometry.location;
                                const marker = new googleMaps.Marker({
                                    map,
                                    position,
                                    title: loc,
                                    animation: googleMaps.Animation.DROP,
                                });

                                marker.addListener('click', () => {
                                    sharedInfoWindow.setOptions({ headerDisabled: true } as google.maps.InfoWindowOptions);
                                    sharedInfoWindow.setContent(buildInfoWindowContent(loc));
                                    sharedInfoWindow.open(map, marker);
                                });

                                bounds.extend(position);
                                hasValidLocation = true;
                            } else {
                                console.warn(`Geocode failed for: ${loc}`, status);
                            }
                            resolve();
                        });
                    });
                });

                await Promise.all(geocodePromises);

                if (isMounted) {
                    if (hasValidLocation) {
                        map.fitBounds(bounds);
                        const listener = googleMaps.event.addListener(map, 'idle', () => {
                            const zoom = map.getZoom();
                            if (zoom && zoom > 16) {
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
                console.error('Map rendering error:', error);
                if (isMounted) {
                    setMapError('地圖載入發生錯誤');
                    setIsLoading(false);
                }
            }
        };

        const timeoutId = setTimeout(() => {
            initMap();
        }, 200);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [isOpen, uniqueLocations, apiKey, isDark]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="當日地點標記"
            subtitle={dayTitle}
            maxWidthClass="max-w-4xl"
            bodyClassName="p-0 relative min-h-[65dvh] sm:min-h-[68vh] flex flex-col"
            headerLeading={
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <MapIcon className="w-4 h-4" />
                </div>
            }
        >
            <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-950 flex flex-col">
                {uniqueLocations.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                <MapIcon className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <p className="text-zinc-700 dark:text-zinc-300 font-medium text-base">
                                行程及清單中尚未包含任何地點
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                新增活動地點或待辦清單地址後即可在地圖上檢視
                            </p>
                        </div>
                    </div>
                ) : !apiKey ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 rounded-xl">
                            需要設定 VITE_GOOGLE_MAPS_API_KEY 環境變數才能顯示地圖
                        </p>
                    </div>
                ) : (
                    <>
                        {isLoading && !mapError && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
                                <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">正在載入地圖與標記...</p>
                            </div>
                        )}

                        {mapError && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm px-6 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                                    <X className="w-6 h-6 text-red-500 dark:text-red-400" />
                                </div>
                                <p className="text-red-600 dark:text-red-400 font-semibold text-base mb-1.5">{mapError}</p>
                                <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm">
                                    無法解析輸入的地址，請確認它們是有效的地標或地址名稱。
                                </p>
                            </div>
                        )}

                        <style>{`
                            .gm-ui-hover-effect { opacity: 1 !important; }
                            .gm-ui-hover-effect span { margin: 0 !important; width: 100% !important; height: 100% !important; }
                            .gm-ui-hover-effect svg { display: inline !important; }
                        `}</style>
                        <div ref={mapRef} className="absolute inset-0 w-full h-full" />
                    </>
                )}
            </div>
        </Modal>
    );
}
