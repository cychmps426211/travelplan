/// <reference types="@types/google.maps" />

export const OBSIDIAN_DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#111216' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#111216' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8e96a4' }] },
    {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#c4cad4' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#788292' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#141e1b' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#5f8a78' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#222630' }],
    },
    {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#181b22' }],
    },
    {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca3af' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#2d3544' }],
    },
    {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1e2430' }],
    },
    {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#1d222c' }],
    },
    {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#93a5be' }],
    },
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#090c12' }],
    },
    {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#4d5d73' }],
    },
];

export function getThemedMapOptions(isDark: boolean): Partial<google.maps.MapOptions> {
    const renderingType = window.google?.maps?.RenderingType?.VECTOR;
    return {
        ...(renderingType ? { renderingType } : {}),
        colorScheme: isDark ? 'DARK' : 'LIGHT',
        backgroundColor: isDark ? '#09090b' : '#f4f4f5',
    };
}

export function attachRasterDarkStyleFallback(map: google.maps.Map, isDark: boolean): void {
    if (!isDark) return;
    const applyIfRaster = () => {
        if (typeof map.getRenderingType === 'function' && map.getRenderingType() === window.google?.maps?.RenderingType?.RASTER) {
            map.setOptions({ styles: OBSIDIAN_DARK_MAP_STYLES });
        }
    };
    window.google.maps.event.addListenerOnce(map, 'renderingtype_changed', applyIfRaster);
    applyIfRaster();
}
