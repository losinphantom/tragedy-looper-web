import React, { useEffect, useState } from 'react';

export type FloatingNumberType = 'paranoia' | 'goodwill' | 'intrigue' | 'ex' | 'death';

export interface FloatingNumberProps {
  id: string;
  value: number | string; // e.g. +1, -1, "DEAD"
  type: FloatingNumberType;
  onComplete: (id: string) => void;
  delay?: number; // ms to wait before showing/animating
}

export const FloatingNumber: React.FC<FloatingNumberProps> = ({ id, value, type, onComplete, delay = 0 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: number;
    let completeTimer: number;

    showTimer = window.setTimeout(() => {
      setVisible(true);
      // animation lasts 1.5s, give it a tiny bit of buffer
      completeTimer = window.setTimeout(() => {
        onComplete(id);
      }, 1500);
    }, delay);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(completeTimer);
    };
  }, [id, delay, onComplete]);

  if (!visible) return null;

  let colorClass = 'text-white';
  let prefix = '';

  if (typeof value === 'number') {
    prefix = value > 0 ? '+' : '';
  }

  switch (type) {
    case 'paranoia':
      colorClass = 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]';
      break;
    case 'goodwill':
      colorClass = 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.9)]';
      break;
    case 'intrigue':
      colorClass = 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]';
      break;
    case 'ex':
      colorClass = 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]';
      break;
    case 'death':
      colorClass = 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]';
      break;
  }

  return (
    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[200] animate-float-up-fade flex items-center justify-center`}>
      <span className={`font-black font-sans text-3xl tracking-wider ${colorClass}`}>
        {prefix}{value}
      </span>
    </div>
  );
};
