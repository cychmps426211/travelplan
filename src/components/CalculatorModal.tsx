import { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseCurrency: string; // The trip's currency
}

export default function CalculatorModal({ isOpen, onClose, baseCurrency }: CalculatorModalProps) {
    const [displayValue, setDisplayValue] = useState<string>('0');
    const [previousValue, setPreviousValue] = useState<string | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForNewValue, setWaitingForNewValue] = useState<boolean>(false);
    const [rateToTwd, setRateToTwd] = useState<number | null>(null);
    const [loadingRate, setLoadingRate] = useState<boolean>(false);
    const [errorRate, setErrorRate] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) return;
        // Fetch rate
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
                console.error("Failed to fetch exchange rate", error);
                setErrorRate(true);
            } finally {
                setLoadingRate(false);
            }
        };
        fetchRate();
        
        // Reset calc
        setDisplayValue('0');
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(false);
    }, [isOpen, baseCurrency]);

    if (!isOpen) return null;

    const calculate = (a: number, b: number, op: string) => {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '×': return a * b;
            case '÷': return b !== 0 ? a / b : null;
            default: return b;
        }
    };

    const handleDigit = (digit: string) => {
        if (waitingForNewValue) {
            setDisplayValue(digit);
            setWaitingForNewValue(false);
        } else {
            // Prevent multiple leading zeros, but allow 0 followed by decimal
            if (displayValue === '0') {
               setDisplayValue(digit);
            } else if (displayValue === '-0') {
               setDisplayValue('-' + digit);
            } else {
               // limit display length to fit nicely
               if (displayValue.replace(/[-.]/g, '').length < 9) {
                   setDisplayValue(displayValue + digit);
               }
            }
        }
    };

    const handleDecimal = () => {
        if (waitingForNewValue) {
            setDisplayValue('0.');
            setWaitingForNewValue(false);
        } else if (!displayValue.includes('.')) {
            setDisplayValue(displayValue + '.');
        }
    };

    const handleClear = () => {
        setDisplayValue('0');
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(false);
    };

    const handleOperator = (nextOperator: string) => {
        const inputValue = parseFloat(displayValue);

        if (previousValue == null) {
            setPreviousValue(displayValue);
        } else if (operator && !waitingForNewValue) {
            // Only calculate if a new value was entered
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
    };

    const handleEqual = () => {
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
    };

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

    const currentAmount = parseFloat(displayValue) || 0;
    const twdAmount = rateToTwd ? currentAmount * rateToTwd : 0;

    // Formatting utility for numbers
    const formatDisplay = (numStr: string) => {
        if (numStr === 'Error') return 'Error';
        
        const parts = numStr.split('.');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
        
        // Handle negative sign correctly when string is just "-"
        if (integerPart === '-') return '-0' + decimalPart;
        if (integerPart === '') return '0' + decimalPart;

        const num = parseFloat(integerPart);
        if (isNaN(num)) return numStr;
        
        return num.toLocaleString('en-US') + decimalPart;
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-black border border-gray-800 rounded-[2.5rem] w-full max-w-[320px] shadow-2xl overflow-hidden shadow-black/80 ring-1 ring-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 pt-5 pb-0">
                        <div className="text-gray-400 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-medium">匯率計算機</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Display */}
                    <div className="px-6 pt-4 pb-4 flex flex-col items-end">
                        <div className="flex flex-col items-end w-full min-h-[80px] justify-end">
                            <div className="flex items-center justify-between w-full text-gray-400 text-sm mb-1 font-medium">
                                <span>輸入金額 ({baseCurrency})</span>
                                {operator && <span className="opacity-60">{operator}</span>}
                            </div>
                            <div className="text-white text-5xl font-light tracking-tight w-full text-right overflow-hidden mb-1">
                                <span className={displayValue.length > 7 ? "text-4xl" : ""}>
                                    {formatDisplay(displayValue)}
                                </span>
                            </div>
                        </div>

                        {/* TWD Conversion */}
                        <div className="mt-3 flex flex-col items-end w-full rounded-2xl bg-gray-900 border border-gray-800 p-4">
                            <div className="flex items-center justify-between w-full text-gray-400 text-xs font-medium mb-1">
                                <span>換算台幣 (TWD)</span>
                                {loadingRate && <span className="animate-pulse">載入匯率中...</span>}
                                {errorRate && <span className="text-red-400">無法取得即時匯率</span>}
                                {!loadingRate && !errorRate && rateToTwd && <span className="text-orange-500/90">1 {baseCurrency} = {rateToTwd.toFixed(4)}</span>}
                            </div>
                            <div className="text-orange-500 text-3xl font-medium w-full text-right overflow-hidden overflow-ellipsis">
                                ≈ {twdAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>

                    {/* Keypad */}
                    <div className="p-[14px] bg-black grid grid-cols-4 gap-[12px] pb-[20px]">
                        <button onClick={handleClear} className="aspect-square rounded-full bg-[#A5A5A5] text-black text-[28px] hover:bg-[#D4D4D2] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-black/5">
                            {displayValue === '0' && previousValue === null ? 'AC' : 'C'}
                        </button>
                        <button onClick={handleToggleSign} className="aspect-square rounded-full bg-[#A5A5A5] text-black text-[32px] hover:bg-[#D4D4D2] transition-colors active:scale-95 text-center flex items-center justify-center font-light ring-[1px] ring-black/5">
                            <span className="-mb-[4px]">±</span>
                        </button>
                        <button onClick={handlePercentage} className="aspect-square rounded-full bg-[#A5A5A5] text-black text-[28px] hover:bg-[#D4D4D2] transition-colors active:scale-95 text-center flex items-center justify-center font-medium ring-[1px] ring-black/5">
                            %
                        </button>
                        <button onClick={() => handleOperator('÷')} className={`aspect-square rounded-full text-[40px] font-medium transition-colors active:scale-95 text-center flex items-center justify-center ${operator === '÷' && waitingForNewValue ? 'bg-white text-[#FE9F06]' : 'bg-[#FE9F06] text-white hover:bg-[#FFB233]'}`}>
                            <span className="-mb-[6px]">÷</span>
                        </button>

                        <button onClick={() => handleDigit('7')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">7</button>
                        <button onClick={() => handleDigit('8')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">8</button>
                        <button onClick={() => handleDigit('9')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">9</button>
                        <button onClick={() => handleOperator('×')} className={`aspect-square rounded-full text-[42px] font-medium transition-colors active:scale-95 text-center flex items-center justify-center ${operator === '×' && waitingForNewValue ? 'bg-white text-[#FE9F06]' : 'bg-[#FE9F06] text-white hover:bg-[#FFB233]'}`}>
                            <span className="-mb-[4px]">×</span>
                        </button>

                        <button onClick={() => handleDigit('4')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">4</button>
                        <button onClick={() => handleDigit('5')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">5</button>
                        <button onClick={() => handleDigit('6')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">6</button>
                        <button onClick={() => handleOperator('-')} className={`aspect-square rounded-full text-[42px] font-medium transition-colors active:scale-95 text-center flex items-center justify-center ${operator === '-' && waitingForNewValue ? 'bg-white text-[#FE9F06]' : 'bg-[#FE9F06] text-white hover:bg-[#FFB233]'}`}>
                            <span className="-mb-[6px]">−</span>
                        </button>

                        <button onClick={() => handleDigit('1')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">1</button>
                        <button onClick={() => handleDigit('2')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">2</button>
                        <button onClick={() => handleDigit('3')} className="aspect-square rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">3</button>
                        <button onClick={() => handleOperator('+')} className={`aspect-square rounded-full text-[40px] font-medium transition-colors active:scale-95 text-center flex items-center justify-center ${operator === '+' && waitingForNewValue ? 'bg-white text-[#FE9F06]' : 'bg-[#FE9F06] text-white hover:bg-[#FFB233]'}`}>
                            <span className="-mb-[4px]">+</span>
                        </button>

                        <button onClick={() => handleDigit('0')} className="col-span-2 h-[72px] rounded-full bg-[#333333] text-white text-[32px] font-normal hover:bg-[#737373] transition-colors active:scale-95 text-left pl-[30px] flex items-center justify-start ring-[1px] ring-white/5">
                            0
                        </button>
                        <button onClick={handleDecimal} className="aspect-square rounded-full bg-[#333333] text-white text-[36px] font-bold hover:bg-[#737373] transition-colors active:scale-95 text-center flex items-center justify-center ring-[1px] ring-white/5">
                            <span className="-mb-[16px]">.</span>
                        </button>
                        <button onClick={handleEqual} className="aspect-square rounded-full bg-[#FE9F06] text-white text-[40px] font-medium hover:bg-[#FFB233] transition-colors active:scale-95 text-center flex items-center justify-center">
                            <span className="-mb-[4px]">=</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
