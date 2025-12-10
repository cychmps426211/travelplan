import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import type { Trip } from '../types';

const TRIPS_COLLECTION = 'trips';

export const tripService = {
    // Create a new trip
    createTrip: async (tripData: Omit<Trip, 'id' | 'createdAt' | 'members'>, userId: string) => {
        try {
            const docRef = await addDoc(collection(db, TRIPS_COLLECTION), {
                ...tripData,
                createdBy: userId,
                members: [userId],
                createdAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error creating trip:", error);
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
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Trip[];
        } catch (error) {
            console.error("Error fetching trips:", error);
            throw error;
        }
    },

    // Subscribe to trips for real-time updates
    subscribeToUserTrips: (userId: string, callback: (trips: Trip[]) => void) => {
        const q = query(
            collection(db, TRIPS_COLLECTION),
            where('members', 'array-contains', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const trips = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Trip[];
            // Client-side sort
            trips.sort((a, b) => {
                const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate as any);
                const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate as any);
                return dateA.getTime() - dateB.getTime();
            });
            callback(trips);
        });
    },

    // Update trip details
    updateTrip: async (tripId: string, updates: Partial<Trip>) => {
        try {
            const tripRef = doc(db, TRIPS_COLLECTION, tripId);
            await updateDoc(tripRef, updates);
        } catch (error) {
            console.error("Error updating trip:", error);
            throw error;
        }
    },

    // Delete a trip
    deleteTrip: async (tripId: string) => {
        try {
            await deleteDoc(doc(db, TRIPS_COLLECTION, tripId));
        } catch (error) {
            console.error("Error deleting trip:", error);
            throw error;
        }
    }
};
