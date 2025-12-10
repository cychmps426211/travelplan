import { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                            <p className="text-gray-600 mt-1">{message}</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 pt-2 bg-gray-50">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                        確定刪除
                    </button>
                </div>
            </div>
        </div>
    );
}

// Hook for easier usage
export function useConfirmDialog() {
    const [state, setState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title,
                message,
                onConfirm: () => {
                    setState(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
            });
        });
    }, []);

    const handleCancel = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const ConfirmDialogComponent = (
        <ConfirmDialog
            isOpen={state.isOpen}
            title={state.title}
            message={state.message}
            onConfirm={state.onConfirm}
            onCancel={handleCancel}
        />
    );

    return { showConfirm, ConfirmDialogComponent };
}
