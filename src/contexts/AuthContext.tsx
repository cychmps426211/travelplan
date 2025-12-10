import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const ALLOWED_EMAILS = [
        'cychmps426211@gmail.com',
        '1987suhao@gmail.com'
    ];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && currentUser.email && !ALLOWED_EMAILS.includes(currentUser.email)) {
                console.log(`Blocking Access: ${currentUser.email}`);
                await signOut(auth);
                setUser(null);
                setLoading(false);
                alert('此帳號無權限登入 (Unauthorized Email)');
                return;
            }

            try {
                if (currentUser) {
                    // Sync user data to Firestore
                    const userRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        await setDoc(userRef, {
                            uid: currentUser.uid,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            email: currentUser.email,
                            lastLogin: new Date().toISOString()
                        }, { merge: true });
                    } else {
                        // Update last login
                        await setDoc(userRef, {
                            lastLogin: new Date().toISOString()
                        }, { merge: true });
                    }
                }
            } catch (error) {
                console.error("Error updating user data:", error);
            }

            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user.email && !ALLOWED_EMAILS.includes(result.user.email)) {
                await signOut(auth);
                throw new Error('Unauthorized email');
            }
        } catch (error: any) {
            console.error("Error signing in with Google", error);
            if (error.message === 'Unauthorized email') {
                alert('此帳號無權限登入 (Unauthorized Email)');
            }
            throw error;
        }
    };

    const logout = () => signOut(auth);

    const value = {
        user,
        loading,
        signInWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
