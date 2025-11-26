import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLongPress } from '@/hooks/useLongPress';

interface SpinBoxProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export const SpinBox: React.FC<SpinBoxProps> = ({ 
  value, 
  onChange, 
  min = 0, 
  max = Infinity, 
  className = '' 
}) => {
  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const incrementProps = useLongPress(handleIncrement);
  const decrementProps = useLongPress(handleDecrement);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    if (valStr === '') return;
    const val = parseInt(valStr, 10);
    if (!isNaN(val)) {
      onChange(Math.max(min, Math.min(max, val)));
    }
  };

  return (
    <div className={`flex items-stretch bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden group focus-within:border-active transition-colors shadow-sm ${className}`}>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        className="w-full min-w-0 bg-transparent text-center text-gray-200 font-mono text-lg focus:outline-none px-2 py-1 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="flex flex-col border-l border-gray-700 w-8 shrink-0 bg-gray-800">
        <button 
          {...incrementProps}
          className="flex-1 flex items-center justify-center hover:bg-gray-700 text-gray-400 hover:text-white transition active:bg-gray-600 border-b border-gray-700"
          tabIndex={-1}
        >
          <ChevronUp size={14} />
        </button>
        <button 
          {...decrementProps}
          className="flex-1 flex items-center justify-center hover:bg-gray-700 text-gray-400 hover:text-white transition active:bg-gray-600"
          tabIndex={-1}
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
};