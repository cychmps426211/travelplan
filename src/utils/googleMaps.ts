/// <reference types="@types/google.maps" />

// Google Maps API utilities

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

/**
 * Load Google Maps JavaScript API
 */
export function loadGoogleMapsAPI(): Promise<void> {
    if (googleMapsLoaded && window.google?.maps) {
        return Promise.resolve();
    }

    if (googleMapsLoadPromise) {
        return googleMapsLoadPromise;
    }

    googleMapsLoadPromise = new Promise((resolve, reject) => {
        if (window.google?.maps) {
            googleMapsLoaded = true;
            resolve();
            return;
        }

        if (!GOOGLE_MAPS_API_KEY) {
            reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            googleMapsLoaded = true;
            resolve();
        };

        script.onerror = () => {
            reject(new Error('Failed to load Google Maps API'));
        };

        document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
}

export interface TravelDurationResult {
    durationMinutes: number;
    durationText: string;
    distanceText: string;
}

// Travel mode types
export type TravelModeType = 'TRANSIT' | 'DRIVING' | 'WALKING' | 'BICYCLING';

// Transit mode preferences (only applicable when travelMode is TRANSIT)
export type TransitModeType = 'SUBWAY' | 'BUS' | 'TRAIN' | 'TRAM' | 'RAIL';

// Transit routing preferences
export type TransitRoutingPreference = 'LESS_WALKING' | 'FEWER_TRANSFERS';

export interface TransitOptions {
    modes?: TransitModeType[];           // Preferred transit types (subway, bus, train, etc.)
    routingPreference?: TransitRoutingPreference;  // Less walking or fewer transfers
}

// Travel mode options for UI
export const TRAVEL_MODE_OPTIONS = [
    { value: 'TRANSIT', label: '大眾運輸', icon: '🚇' },
    { value: 'DRIVING', label: '開車', icon: '🚗' },
    { value: 'WALKING', label: '步行', icon: '🚶' },
    { value: 'BICYCLING', label: '騎自行車', icon: '🚲' },
] as const;

// Transit mode options for UI (when TRANSIT is selected)
export const TRANSIT_MODE_OPTIONS = [
    { value: 'SUBWAY', label: '捷運/地鐵', icon: '🚇' },
    { value: 'BUS', label: '公車', icon: '🚌' },
    { value: 'TRAIN', label: '火車', icon: '🚂' },
    { value: 'TRAM', label: '輕軌/電車', icon: '🚃' },
    { value: 'RAIL', label: '鐵路', icon: '🛤️' },
] as const;

// Transit routing preference options for UI
export const TRANSIT_ROUTING_OPTIONS = [
    { value: '', label: '無偏好' },
    { value: 'LESS_WALKING', label: '減少步行' },
    { value: 'FEWER_TRANSFERS', label: '減少轉乘' },
] as const;

/**
 * Get travel duration between two locations using Google Maps Directions API
 */
export async function getTravelDuration(
    origin: string,
    destination: string,
    travelMode: TravelModeType = 'TRANSIT',
    transitOptions?: TransitOptions
): Promise<TravelDurationResult> {
    await loadGoogleMapsAPI();

    // Get the actual TravelMode enum value after API is loaded
    const travelModeEnum = google.maps.TravelMode[travelMode];

    return new Promise((resolve, reject) => {
        const directionsService = new google.maps.DirectionsService();

        // Build request options
        const request: google.maps.DirectionsRequest = {
            origin,
            destination,
            travelMode: travelModeEnum,
        };

        // Add transit options if travel mode is TRANSIT and options are provided
        if (travelMode === 'TRANSIT' && transitOptions) {
            const transitOptionsObj: google.maps.TransitOptions = {};

            // Add preferred transit modes
            if (transitOptions.modes && transitOptions.modes.length > 0) {
                transitOptionsObj.modes = transitOptions.modes.map(
                    (mode) => google.maps.TransitMode[mode]
                );
            }

            // Add routing preference
            if (transitOptions.routingPreference) {
                transitOptionsObj.routingPreference =
                    google.maps.TransitRoutePreference[transitOptions.routingPreference];
            }

            request.transitOptions = transitOptionsObj;
        }

        directionsService.route(
            request,
            (
                result: google.maps.DirectionsResult | null,
                status: google.maps.DirectionsStatus
            ) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    const route = result.routes[0];
                    const leg = route.legs[0];

                    resolve({
                        durationMinutes: Math.round((leg.duration?.value || 0) / 60),
                        durationText: leg.duration?.text || '',
                        distanceText: leg.distance?.text || '',
                    });
                } else {
                    reject(new Error(`Directions request failed: ${status}`));
                }
            }
        );
    });
}

