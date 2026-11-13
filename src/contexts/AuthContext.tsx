import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AuthContext } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const ALLOWED_EMAILS = [
    'cychmps426211@gmail.com',
    '1987suhao@gmail.com'
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && currentUser.email && !ALLOWED_EMAILS.includes(currentUser.email)) {
                await signOut(auth);
                setUser(null);
                setLoading(false);
                const msg = '此帳號無權限登入，請使用已授權的 Google 帳號。';
                setAuthError(msg);
                showToast(msg, 'error');
                return;
            }

            setUser(currentUser);
            setLoading(false);

            // 背景非同步更新 user data，不阻塞頁面渲染
            if (currentUser) {
                setAuthError(null);
                try {
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
                        await setDoc(userRef, {
                            lastLogin: new Date().toISOString()
                        }, { merge: true });
                    }
                } catch (error) {
                    console.error('Error updating user data:', error);
                }
            }
        });

        return unsubscribe;
    }, [showToast]);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        setAuthError(null);
        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user.email && !ALLOWED_EMAILS.includes(result.user.email)) {
                await signOut(auth);
                const msg = '此帳號無權限登入，請使用已授權的 Google 帳號。';
                setAuthError(msg);
                showToast(msg, 'error');
                throw new Error('Unauthorized email');
            }
        } catch (error: unknown) {
            console.error('Error signing in with Google', error);
            if (error instanceof Error && error.message !== 'Unauthorized email') {
                const msg = '登入失敗，請稍後再試。';
                setAuthError(msg);
                showToast(msg, 'error');
            }
            throw error;
        }
    };

    const logout = () => signOut(auth);

    const value = {
        user,
        loading,
        authError,
        signInWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
