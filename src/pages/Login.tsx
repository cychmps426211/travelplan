import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plane } from 'lucide-react';

export default function Login() {
    const { signInWithGoogle, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            navigate('/');
        } catch (error) {
            console.error("Login failed", error);
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
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 p-4 rounded-full inline-block mb-4">
                        <Plane className="w-12 h-12 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">登入 TravelPlan</h1>
                    <p className="text-gray-500">協作旅遊規劃，讓旅程更輕鬆</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-3" />
                        {loading ? '登入中...' : '使用 Google 帳號登入'}
                    </button>
                </div>

                <p className="mt-8 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} TravelPlan. start your journey.
                </p>
            </div>
        </div>
    );
}
