import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
    const { signInWithGoogle, user, authError } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (error) {
            console.error('Login failed', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    if (user) return null;

    return (
        <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 transition-colors">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-7 sm:p-9 rounded-2xl shadow-sm max-w-sm w-full text-center">
                <div className="mb-7">
                    <img
                        src={`${import.meta.env.BASE_URL}travel.png`}
                        alt="TravelPlan"
                        className="w-14 h-14 mx-auto mb-5 rounded-2xl shadow-sm"
                    />
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1.5">
                        登入 TravelPlan
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        整合航班、住宿與每日行程的旅遊筆記
                    </p>
                </div>

                {authError && (
                    <div className="mb-5 flex items-start gap-2.5 text-left p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs leading-relaxed">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{authError}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 active:scale-[0.99] font-medium py-3 px-4 rounded-xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-500 dark:text-zinc-400" />
                    ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                fill="#4285F4"
                                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                            />
                        </svg>
                    )}
                    <span>{loading ? '登入中...' : '使用 Google 帳號繼續'}</span>
                </button>

                <p className="mt-7 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    &copy; {new Date().getFullYear()} TravelPlan
                </p>
            </div>
        </div>
    );
}
