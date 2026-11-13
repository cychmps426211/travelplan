import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import type { Trip } from '../types';

const TRIPS_COLLECTION = 'trips';

export type TripMutationPayload = Partial<Omit<Trip, 'id' | 'createdAt' | 'members' | 'startDate' | 'endDate'>> & {
    startDate?: Date | Timestamp;
    endDate?: Date | Timestamp;
};

function toMillis(value: unknown): number {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
        return (value as Timestamp).toDate().getTime();
    }
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
    return 0;
}

export const tripService = {
    // Create a new trip
    createTrip: async (tripData: TripMutationPayload, userId: string) => {
        try {
            const docRef = await addDoc(collection(db, TRIPS_COLLECTION), {
                ...tripData,
                createdBy: userId,
                members: [userId],
                createdAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating trip:', error);
            throw error;
        }
    },

    // Get trips for a specific user
    getUserTrips: async (userId: string) => {
        try {
            const q = query(
                collection(db, TRIPS_COLLECTION),
                where('members', 'array-contains', userId)
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as Trip[];
        } catch (error) {
            console.error('Error fetching trips:', error);
            throw error;
        }
    },

    // Subscribe to all trips for real-time updates
    subscribeToAllTrips: (callback: (trips: Trip[]) => void) => {
        const q = query(collection(db, TRIPS_COLLECTION));

        return onSnapshot(q, (snapshot) => {
            const trips = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as Trip[];
            trips.sort((a, b) => toMillis(a.startDate) - toMillis(b.startDate));
            callback(trips);
        });
    },

    // Update trip details
    updateTrip: async (tripId: string, updates: TripMutationPayload | Record<string, unknown>) => {
        try {
            const tripRef = doc(db, TRIPS_COLLECTION, tripId);
            await updateDoc(tripRef, updates);
        } catch (error) {
            console.error('Error updating trip:', error);
            throw error;
        }
    },

    // Delete a trip
    deleteTrip: async (tripId: string) => {
        try {
            await deleteDoc(doc(db, TRIPS_COLLECTION, tripId));
        } catch (error) {
            console.error('Error deleting trip:', error);
            throw error;
        }
    }
};
