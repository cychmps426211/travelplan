import { X, MapPin, Clock, FileText, Utensils, Bed, Car, Camera, Tag, Navigation, ExternalLink } from 'lucide-react';
import type { Activity } from '../types';
import { format } from 'date-fns';

interface ActivityDetailModalProps {
    activity: Activity | null;
    onClose: () => void;
}

const ACTIVITY_TYPE_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    sightseeing: { label: '觀光', icon: <Camera className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
    food: { label: '美食', icon: <Utensils className="w-5 h-5" />, color: 'bg-orange-100 text-orange-600' },
    transport: { label: '交通', icon: <Car className="w-5 h-5" />, color: 'bg-green-100 text-green-600' },
    lodging: { label: '住宿', icon: <Bed className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
    shopping: { label: '購物', icon: <Tag className="w-5 h-5" />, color: 'bg-pink-100 text-pink-600' },
    other: { label: '其他', icon: <MapPin className="w-5 h-5" />, color: 'bg-gray-100 text-gray-600' }
};

// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function getMapUrl(activity: Activity): string | null {
    // For transport type with departure and arrival
    if (activity.type === 'transport') {
        if (activity.departureLocation && activity.arrivalLocation) {
            // Show directions between two locations
            const origin = encodeURIComponent(activity.departureLocation);
            const destination = encodeURIComponent(activity.arrivalLocation);
            return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${destination}&mode=transit`;
        } else if (activity.departureLocation || activity.arrivalLocation) {
            // Show single location
            const location = encodeURIComponent(activity.departureLocation || activity.arrivalLocation || '');
            return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${location}`;
        }
    } else if (activity.location) {
        // For other types with location
        const location = encodeURIComponent(activity.location);
        return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${location}`;
    }

    return null;
}

// Generate external Google Maps URL (for opening in new tab/app)
function getExternalMapUrl(activity: Activity): string | null {
    if (activity.type === 'transport') {
        if (activity.departureLocation && activity.arrivalLocation) {
            // Directions URL
            const origin = encodeURIComponent(activity.departureLocation);
            const destination = encodeURIComponent(activity.arrivalLocation);
            return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
        } else if (activity.departureLocation || activity.arrivalLocation) {
            const location = encodeURIComponent(activity.departureLocation || activity.arrivalLocation || '');
            return `https://www.google.com/maps/search/?api=1&query=${location}`;
        }
    } else if (activity.location) {
        const location = encodeURIComponent(activity.location);
        return `https://www.google.com/maps/search/?api=1&query=${location}`;
    }
    return null;
}

export default function ActivityDetailModal({ activity, onClose }: ActivityDetailModalProps) {
    if (!activity) return null;

    const typeInfo = ACTIVITY_TYPE_INFO[activity.type] || ACTIVITY_TYPE_INFO.other;
    const mapUrl = getMapUrl(activity);
    const externalMapUrl = getExternalMapUrl(activity);
    const hasRoute = activity.type === 'transport' && activity.departureLocation && activity.arrivalLocation;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                            {typeInfo.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{activity.title}</h2>
                            <span className="text-sm text-gray-500">{typeInfo.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Time Section */}
                    <div className="flex items-center gap-3 text-gray-700">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <div>
                            <span className="font-medium">
                                {format(activity.startTime.toDate(), 'yyyy/MM/dd HH:mm')}
                            </span>
                            {activity.endTime && (
                                <span className="text-gray-500">
                                    {' ~ '}{format(activity.endTime.toDate(), 'HH:mm')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Location Section */}
                    {activity.type === 'transport' ? (
                        (activity.departureLocation || activity.arrivalLocation) && (
                            <div className="flex items-start gap-3 text-gray-700">
                                <Navigation className="w-5 h-5 text-green-500 mt-0.5" />
                                <div className="space-y-1">
                                    {activity.departureLocation && (
                                        <div>
                                            <span className="text-sm text-gray-500">出發：</span>
                                            <span className="font-medium">{activity.departureLocation}</span>
                                        </div>
                                    )}
                                    {activity.arrivalLocation && (
                                        <div>
                                            <span className="text-sm text-gray-500">到達：</span>
                                            <span className="font-medium">{activity.arrivalLocation}</span>
                                        </div>
                                    )}
                                    {activity.estimatedDuration && (
                                        <div className="pt-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                                                <Clock className="w-3.5 h-3.5" />
                                                預估 {activity.estimatedDuration >= 60
                                                    ? `${Math.floor(activity.estimatedDuration / 60)} 小時${activity.estimatedDuration % 60 > 0 ? ` ${activity.estimatedDuration % 60} 分鐘` : ''}`
                                                    : `${activity.estimatedDuration} 分鐘`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        activity.location && (
                            <div className="flex items-center gap-3 text-gray-700">
                                <MapPin className="w-5 h-5 text-red-500" />
                                <span className="font-medium">{activity.location}</span>
                            </div>
                        )
                    )}

                    {/* Notes Section */}
                    {activity.notes && (
                        <div className="flex items-start gap-3 text-gray-700">
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg flex-1">{activity.notes}</p>
                        </div>
                    )}

                    {/* Open in Google Maps Link */}
                    {externalMapUrl && (
                        <a
                            href={externalMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium"
                        >
                            <ExternalLink className="w-4 h-4" />
                            用 Google 地圖開啟
                        </a>
                    )}

                    {/* Map Section */}
                    {mapUrl && GOOGLE_MAPS_API_KEY && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-700">
                                <MapPin className="w-5 h-5 text-blue-500" />
                                <span className="font-medium">
                                    {hasRoute ? '交通路線' : '地圖位置'}
                                </span>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                <iframe
                                    width="100%"
                                    height="300"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={mapUrl}
                                    title="Google Map"
                                />
                            </div>
                        </div>
                    )}

                    {/* No map message if no API key */}
                    {mapUrl && !GOOGLE_MAPS_API_KEY && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                            需要設定 VITE_GOOGLE_MAPS_API_KEY 環境變數才能顯示地圖
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
}
