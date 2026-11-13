import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { loadGoogleMapsAPI } from '../utils/googleMaps';
import { getThemedMapOptions, attachRasterDarkStyleFallback } from '../constants/mapStyles';
import type { Activity } from '../types';
import { Loader2, Info } from 'lucide-react';

interface GoogleMapRouteProps {
    activity: Activity;
    height?: number;
}

/**
 * Google Map component that displays routes using JavaScript API
 * Supports native dark mode and full transit preferences.
 */
export default function GoogleMapRoute({ activity, height = 300 }: GoogleMapRouteProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
        let isMounted = true;

        async function initMap() {
            if (!mapRef.current) return;

            try {
                setLoading(true);
                setError(null);
                setFallbackNotice(null);

                await loadGoogleMapsAPI();

                if (!isMounted) return;

                const isTransportRoute =
                    activity.type === 'transport' &&
                    activity.departureLocation &&
                    activity.arrivalLocation;

                const singleLocation =
                    activity.type === 'transport'
                        ? activity.departureLocation || activity.arrivalLocation
                        : activity.location;

                if (isTransportRoute) {
                    await displayRoute();
                } else if (singleLocation) {
                    await displayPlace(singleLocation);
                } else {
                    setError('沒有可顯示的地點資訊');
                }
            } catch (err) {
                console.error('Map initialization error:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : '地圖載入失敗');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        async function displayFallbackEndpoints(map: google.maps.Map, origin: string, destination: string): Promise<boolean> {
            const geocoder = new google.maps.Geocoder();
            const geocodeAddress = (address: string): Promise<google.maps.LatLng | null> =>
                new Promise((resolve) => {
                    geocoder.geocode({ address }, (results, status) => {
                        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                            resolve(results[0].geometry.location);
                        } else {
                            resolve(null);
                        }
                    });
                });

            const [originPos, destPos] = await Promise.all([
                geocodeAddress(origin),
                geocodeAddress(destination),
            ]);

            if (!isMounted) return true;

            if (!originPos && !destPos) {
                return false;
            }

            const bounds = new google.maps.LatLngBounds();

            if (originPos) {
                new google.maps.Marker({
                    position: originPos,
                    map,
                    label: { text: '起', color: '#ffffff', fontWeight: 'bold' },
                    title: `出發：${origin}`,
                });
                bounds.extend(originPos);
            }

            if (destPos) {
                new google.maps.Marker({
                    position: destPos,
                    map,
                    label: { text: '終', color: '#ffffff', fontWeight: 'bold' },
                    title: `到達：${destination}`,
                });
                bounds.extend(destPos);
            }

            if (originPos && destPos) {
                new google.maps.Polyline({
                    path: [originPos, destPos],
                    geodesic: true,
                    strokeOpacity: 0,
                    icons: [
                        {
                            icon: {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 0.9,
                                strokeColor: isDark ? '#60a5fa' : '#2563eb',
                                scale: 3,
                            },
                            offset: '0',
                            repeat: '16px',
                        },
                    ],
                    map,
                });
                map.fitBounds(bounds, 48);
            } else {
                const pos = (originPos || destPos)!;
                map.setCenter(pos);
                map.setZoom(15);
            }

            return true;
        }

        async function displayRoute() {
            if (!mapRef.current || !activity.departureLocation || !activity.arrivalLocation) return;

            const origin = activity.departureLocation;
            const destination = activity.arrivalLocation;

            const map = new google.maps.Map(mapRef.current, {
                zoom: 12,
                center: { lat: 35.6762, lng: 139.6503 },
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                ...getThemedMapOptions(isDark),
            });
            attachRasterDarkStyleFallback(map, isDark);
            mapInstanceRef.current = map;

            const directionsRenderer = new google.maps.DirectionsRenderer({
                map,
                suppressMarkers: false,
                polylineOptions: {
                    strokeColor: isDark ? '#60a5fa' : '#2563eb',
                    strokeWeight: 5,
                    strokeOpacity: 0.85,
                },
            });
            directionsRendererRef.current = directionsRenderer;

            const directionsService = new google.maps.DirectionsService();

            const request: google.maps.DirectionsRequest = {
                origin,
                destination,
                travelMode: getTravelMode(activity.travelMode),
            };

            if (activity.travelMode === 'TRANSIT' || !activity.travelMode) {
                const transitOptions: google.maps.TransitOptions = {};

                if (activity.transitModes && activity.transitModes.length > 0) {
                    transitOptions.modes = activity.transitModes.map(mode => {
                        switch (mode) {
                            case 'SUBWAY': return google.maps.TransitMode.SUBWAY;
                            case 'BUS': return google.maps.TransitMode.BUS;
                            case 'TRAIN': return google.maps.TransitMode.TRAIN;
                            case 'TRAM': return google.maps.TransitMode.TRAM;
                            case 'RAIL': return google.maps.TransitMode.RAIL;
                            default: return google.maps.TransitMode.SUBWAY;
                        }
                    });
                }

                if (activity.transitRoutingPreference) {
                    switch (activity.transitRoutingPreference) {
                        case 'LESS_WALKING':
                            transitOptions.routingPreference = google.maps.TransitRoutePreference.LESS_WALKING;
                            break;
                        case 'FEWER_TRANSFERS':
                            transitOptions.routingPreference = google.maps.TransitRoutePreference.FEWER_TRANSFERS;
                            break;
                    }
                }

                if (Object.keys(transitOptions).length > 0) {
                    request.transitOptions = transitOptions;
                }
            }

            await new Promise<void>((resolve) => {
                directionsService.route(request, async (result, status) => {
                    if (!isMounted) {
                        resolve();
                        return;
                    }

                    if (status === google.maps.DirectionsStatus.OK && result) {
                        directionsRenderer.setDirections(result);
                        resolve();
                        return;
                    }

                    if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
                        const fallbackSuccess = await displayFallbackEndpoints(map, origin, destination);
                        if (fallbackSuccess && isMounted) {
                            setFallbackNotice(
                                'Google Maps API 暫不支援此地區（如日本）或該時段的大眾運輸路線繪製，已為您標示起訖點位置。完整乘車路線請點上方「用 Google 地圖開啟」。'
                            );
                            resolve();
                            return;
                        }
                    }

                    console.error('Directions request failed:', status);
                    setError(`無法取得路線: ${status}`);
                    resolve();
                });
            });
        }

        async function displayPlace(location: string) {
            if (!mapRef.current) return;

            const geocoder = new google.maps.Geocoder();

            await new Promise<void>((resolve) => {
                geocoder.geocode({ address: location }, (results, status) => {
                    if (!isMounted) {
                        resolve();
                        return;
                    }
                    if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                        const position = results[0].geometry.location;

                        const map = new google.maps.Map(mapRef.current!, {
                            zoom: 15,
                            center: position,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: true,
                            ...getThemedMapOptions(isDark),
                        });
                        attachRasterDarkStyleFallback(map, isDark);
                        mapInstanceRef.current = map;

                        new google.maps.Marker({
                            position,
                            map,
                            title: location,
                            animation: google.maps.Animation.DROP,
                        });
                    } else {
                        console.error('Geocoding failed:', status);
                        setError(`無法找到地點: ${location}`);
                    }
                    resolve();
                });
            });
        }

        function getTravelMode(mode?: string): google.maps.TravelMode {
            switch (mode) {
                case 'DRIVING': return google.maps.TravelMode.DRIVING;
                case 'WALKING': return google.maps.TravelMode.WALKING;
                case 'BICYCLING': return google.maps.TravelMode.BICYCLING;
                case 'TRANSIT':
                default: return google.maps.TravelMode.TRANSIT;
            }
        }

        initMap();

        return () => {
            isMounted = false;
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setMap(null);
            }
            mapInstanceRef.current = null;
            directionsRendererRef.current = null;
        };
    }, [activity, isDark]);

    if (error) {
        return (
            <div
                className="flex items-center justify-center bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 px-4 text-center"
                style={{ height }}
            >
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {fallbackNotice && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>{fallbackNotice}</span>
                </div>
            )}
            <div className="relative rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800">
                <div ref={mapRef} style={{ height, width: '100%' }} />

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">載入地圖中...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
