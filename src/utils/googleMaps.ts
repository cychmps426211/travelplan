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

/**
 * Get travel duration between two locations using Google Maps Directions API
 */
export async function getTravelDuration(
    origin: string,
    destination: string,
    travelMode: 'TRANSIT' | 'DRIVING' | 'WALKING' | 'BICYCLING' = 'TRANSIT'
): Promise<TravelDurationResult> {
    await loadGoogleMapsAPI();

    // Get the actual TravelMode enum value after API is loaded
    const travelModeEnum = google.maps.TravelMode[travelMode];

    return new Promise((resolve, reject) => {
        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
            {
                origin,
                destination,
                travelMode: travelModeEnum,
            },
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
