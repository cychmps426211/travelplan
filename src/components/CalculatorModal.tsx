import { useState, useEffect, useCallback } from 'react';
import { X, Calculator } from 'lucide-react';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseCurrency: string; // The trip's currency
}

export default function CalculatorModal({ isOpen, onClose, baseCurrency }: CalculatorModalProps) {
    const { backdropRef, panelRef, handleRef } = useBottomSheetDrag({
        isOpen,
        onClose,
    });
    const [displayValue, setDisplayValue] = useState<string>('0');
    const [previousValue, setPreviousValue] = useState<string | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForNewValue, setWaitingForNewValue] = useState<boolean>(false);
    const [rateToTwd, setRateToTwd] = useState<number | null>(null);
    const [loadingRate, setLoadingRate] = useState<boolean>(false);
    const [errorRate, setErrorRate] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoadingRate(true);
        setErrorRate(false);

        const fetchRate = async () => {
            if (baseCurrency === 'TWD') {
                setRateToTwd(1);
                setLoadingRate(false);
                return;
            }
            try {
                const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
                const data = await res.json();
                if (data && data.rates && data.rates.TWD) {
                    setRateToTwd(data.rates.TWD);
                } else {
                    setErrorRate(true);
                }
            } catch (error) {
                console.error('Failed to fetch exchange rate', error);
                setErrorRate(true);
            } finally {
                setLoadingRate(false);
            }
        };
        fetchRate();

        setDisplayValue('0');
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(false);
    }, [isOpen, baseCurrency]);

    const calculate = (a: number, b: number, op: string) => {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '×': return a * b;
            case '÷': return b !== 0 ? a / b : null;
            default: return b;
        }
    };

    const handleDigit = useCallback((digit: string) => {
        if (waitingForNewValue) {
            setDisplayValue(digit);
            setWaitingForNewValue(false);
        } else if (displayValue === '0') {
            setDisplayValue(digit);
        } else if (displayValue === '-0') {
            setDisplayValue('-' + digit);
        } else if (displayValue.replace(/[-.]/g, '').length < 9) {
            setDisplayValue(displayValue + digit);
        }
    }, [displayValue, waitingForNewValue]);

    const handleDecimal = useCallback(() => {
        if (waitingForNewValue) {
            setDisplayValue('0.');
            setWaitingForNewValue(false);
        } else if (!displayValue.includes('.')) {
            setDisplayValue(displayValue + '.');
        }
    }, [displayValue, waitingForNewValue]);

    const handleClear = useCallback(() => {
        setDisplayValue('0');
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(false);
    }, []);

    const handleOperator = useCallback((nextOperator: string) => {
        const inputValue = parseFloat(displayValue);

        if (previousValue == null) {
            setPreviousValue(displayValue);
        } else if (operator && !waitingForNewValue) {
            const currentValue = previousValue || '0';
            const newValue = calculate(parseFloat(currentValue), inputValue, operator);

            if (newValue === null) {
                setDisplayValue('Error');
                setPreviousValue(null);
            } else {
                setDisplayValue(String(newValue));
                setPreviousValue(String(newValue));
            }
        }

        setWaitingForNewValue(true);
        setOperator(nextOperator);
    }, [displayValue, operator, previousValue, waitingForNewValue]);

    const handleEqual = useCallback(() => {
        if (!operator || previousValue == null) return;

        const inputValue = parseFloat(displayValue);
        const newValue = calculate(parseFloat(previousValue), inputValue, operator);

        if (newValue === null) {
            setDisplayValue('Error');
        } else {
            setDisplayValue(String(newValue));
        }

        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(true);
    }, [displayValue, operator, previousValue]);

    const handleToggleSign = () => {
        if (displayValue === 'Error') return;
        const val = parseFloat(displayValue);
        if (val === 0) return;
        setDisplayValue(String(val * -1));
    };

    const handlePercentage = () => {
        if (displayValue === 'Error') return;
        setDisplayValue(String(parseFloat(displayValue) / 100));
    };

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (/^[0-9]$/.test(e.key)) handleDigit(e.key);
            else if (e.key === '.') handleDecimal();
            else if (e.key === '+') handleOperator('+');
            else if (e.key === '-') handleOperator('-');
            else if (e.key === '*') handleOperator('×');
            else if (e.key === '/') {
                e.preventDefault();
                handleOperator('÷');
            } else if (e.key === 'Enter' || e.key === '=') handleEqual();
            else if (e.key === 'Backspace') {
                setDisplayValue(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, handleDigit, handleDecimal, handleOperator, handleEqual]);

    if (!isOpen) return null;

    const currentAmount = parseFloat(displayValue) || 0;
    const twdAmount = rateToTwd ? currentAmount * rateToTwd : 0;

    const formatDisplay = (numStr: string) => {
        if (numStr === 'Error') return 'Error';
        const parts = numStr.split('.');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
        if (integerPart === '-') return '-0' + decimalPart;
        if (integerPart === '') return '0' + decimalPart;
        const num = parseFloat(integerPart);
        if (isNaN(num)) return numStr;
        return num.toLocaleString('en-US') + decimalPart;
    };

    const digitBtnClass =
        'h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.97] text-zinc-900 dark:text-zinc-50 text-xl font-medium transition-all flex items-center justify-center tabular-nums';
    const utilBtnClass =
        'h-14 rounded-2xl bg-zinc-200/80 dark:bg-zinc-700/70 hover:bg-zinc-300/80 dark:hover:bg-zinc-600/80 active:scale-[0.97] text-zinc-800 dark:text-zinc-100 text-lg font-medium transition-all flex items-center justify-center';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="匯率計算機"
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
        >
            <div
                ref={backdropRef}
                className="modal-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                ref={panelRef}
                className="modal-panel relative z-10 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[340px] shadow-2xl overflow-hidden pb-safe sm:pb-0"
                onClick={(e) => e.stopPropagation()}
            >
                <div ref={handleRef} className="touch-none sm:touch-auto select-none">
                    <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                        <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    </div>

                    {/* Header */}
                    <div className="flex justify-between items-center px-5 pt-2.5 pb-1">
                        <div className="text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-semibold">匯率計算機</span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="關閉計算機"
                            className="p-2 -mr-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Display */}
                <div className="px-5 pt-3 pb-4 space-y-3">
                    <div className="flex flex-col items-end w-full">
                        <div className="flex items-center justify-between w-full text-zinc-400 dark:text-zinc-500 text-xs mb-1 font-medium">
                            <span>輸入金額 ({baseCurrency})</span>
                            {operator && <span className="font-mono text-amber-500">{operator}</span>}
                        </div>
                        <div className="text-zinc-900 dark:text-zinc-50 text-4xl font-light tracking-tight w-full text-right overflow-hidden tabular-nums">
                            <span className={displayValue.length > 8 ? 'text-3xl' : ''}>
                                {formatDisplay(displayValue)}
                            </span>
                        </div>
                    </div>

                    {/* TWD Conversion */}
                    <div className="flex flex-col items-end w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5">
                        <div className="flex items-center justify-between w-full text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">
                            <span>換算台幣 (TWD)</span>
                            {loadingRate && <span className="animate-pulse">載入匯率中...</span>}
                            {errorRate && <span className="text-red-500 dark:text-red-400">無法取得匯率</span>}
                            {!loadingRate && !errorRate && rateToTwd && (
                                <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                                    1 {baseCurrency} = {rateToTwd.toFixed(4)}
                                </span>
                            )}
                        </div>
                        <div className="text-amber-600 dark:text-amber-400 text-2xl font-semibold w-full text-right overflow-hidden text-ellipsis tabular-nums">
                            ≈ {twdAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>

                {/* Keypad (Uniform grid height for crisp alignment) */}
                <div className="px-4 pb-5 grid grid-cols-4 gap-2.5">
                    <button type="button" onClick={handleClear} className={utilBtnClass}>
                        {displayValue === '0' && previousValue === null ? 'AC' : 'C'}
                    </button>
                    <button type="button" onClick={handleToggleSign} className={utilBtnClass}>±</button>
                    <button type="button" onClick={handlePercentage} className={utilBtnClass}>%</button>
                    <button
                        type="button"
                        onClick={() => handleOperator('÷')}
                        className={`h-14 rounded-2xl text-2xl font-medium transition-all active:scale-[0.97] flex items-center justify-center ${
                            operator === '÷' && waitingForNewValue
                                ? 'bg-amber-100 text-amber-700 dark:bg-white dark:text-amber-600'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                    >
                        ÷
                    </button>

                    <button type="button" onClick={() => handleDigit('7')} className={digitBtnClass}>7</button>
                    <button type="button" onClick={() => handleDigit('8')} className={digitBtnClass}>8</button>
                    <button type="button" onClick={() => handleDigit('9')} className={digitBtnClass}>9</button>
                    <button
                        type="button"
                        onClick={() => handleOperator('×')}
                        className={`h-14 rounded-2xl text-2xl font-medium transition-all active:scale-[0.97] flex items-center justify-center ${
                            operator === '×' && waitingForNewValue
                                ? 'bg-amber-100 text-amber-700 dark:bg-white dark:text-amber-600'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                    >
                        ×
                    </button>

                    <button type="button" onClick={() => handleDigit('4')} className={digitBtnClass}>4</button>
                    <button type="button" onClick={() => handleDigit('5')} className={digitBtnClass}>5</button>
                    <button type="button" onClick={() => handleDigit('6')} className={digitBtnClass}>6</button>
                    <button
                        type="button"
                        onClick={() => handleOperator('-')}
                        className={`h-14 rounded-2xl text-2xl font-medium transition-all active:scale-[0.97] flex items-center justify-center ${
                            operator === '-' && waitingForNewValue
                                ? 'bg-amber-100 text-amber-700 dark:bg-white dark:text-amber-600'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                    >
                        −
                    </button>

                    <button type="button" onClick={() => handleDigit('1')} className={digitBtnClass}>1</button>
                    <button type="button" onClick={() => handleDigit('2')} className={digitBtnClass}>2</button>
                    <button type="button" onClick={() => handleDigit('3')} className={digitBtnClass}>3</button>
                    <button
                        type="button"
                        onClick={() => handleOperator('+')}
                        className={`h-14 rounded-2xl text-2xl font-medium transition-all active:scale-[0.97] flex items-center justify-center ${
                            operator === '+' && waitingForNewValue
                                ? 'bg-amber-100 text-amber-700 dark:bg-white dark:text-amber-600'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                    >
                        +
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDigit('0')}
                        className="col-span-2 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.97] text-zinc-900 dark:text-zinc-50 text-xl font-medium transition-all flex items-center justify-start pl-6 tabular-nums"
                    >
                        0
                    </button>
                    <button type="button" onClick={handleDecimal} className={digitBtnClass}>.</button>
                    <button
                        type="button"
                        onClick={handleEqual}
                        className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-2xl font-medium transition-all flex items-center justify-center"
                    >
                        =
                    </button>
                </div>
            </div>
        </div>
    );
}
