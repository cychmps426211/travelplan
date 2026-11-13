import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function PrivateRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors">
                <div className="text-center">
                    <div className="w-7 h-7 border-2 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-sm">載入中...</div>
                </div>
            </div>
        );
    }

    return user ? <Outlet /> : <Navigate to="/login" />;
}
