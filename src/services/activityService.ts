import { db } from '../firebase';
import { collection, addDoc, query, orderBy, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { Activity } from '../types';

// Constant removed as it was unused

export const activityService = {
    // Subscribe to activities for a real-time list
    subscribeToActivities: (tripId: string, callback: (activities: Activity[]) => void) => {
        const q = query(
            collection(db, `trips/${tripId}/activities`),
            orderBy('startTime', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Activity[];
            callback(activities);
        });
    },

    // Create activity
    addActivity: async (tripId: string, activityData: Omit<Activity, 'id' | 'tripId'>) => {
        await addDoc(collection(db, `trips/${tripId}/activities`), {
            ...activityData,
            tripId
        });
    },

    // Update activity
    updateActivity: async (tripId: string, activityId: string, updates: Partial<Activity>) => {
        await updateDoc(doc(db, `trips/${tripId}/activities`, activityId), updates);
    },

    // Delete activity
    deleteActivity: async (tripId: string, activityId: string) => {
        await deleteDoc(doc(db, `trips/${tripId}/activities`, activityId));
    }
};
