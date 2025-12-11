import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string;
    email: string;
}

export interface FlightInfo {
    airline: string;
    flightNumber: string;
    departureTime: Timestamp;
    arrivalTime: Timestamp;
    departureTimezone: string; // ISO offset e.g. "+09:00"
    arrivalTimezone: string;
    departureAirport: string;
    arrivalAirport: string;
}

export interface Trip {
    id: string;
    title: string;
    destination: string;
    startDate: Timestamp;
    endDate: Timestamp;
    createdBy: string;
    members: string[]; // List of UIDs including creator
    createdAt: Timestamp;
    outboundFlight?: FlightInfo;
    returnFlight?: FlightInfo;
    coverColor?: string;
}

export interface Activity {
    id: string;
    tripId: string;
    title: string;
    type: 'sightseeing' | 'food' | 'shopping' | 'transport' | 'lodging' | 'other';
    startTime: Timestamp;
    endTime?: Timestamp;
    location?: string;
    departureLocation?: string; // For transport type
    arrivalLocation?: string;   // For transport type
    estimatedDuration?: number; // For transport type: estimated travel time in minutes
    notes?: string;
}
