import React, { useEffect, useState } from 'react';

export interface CardRevealSequenceProps {
  currentStep: number; // 0: 禁止移动, 1: 移动, 2: 其他禁止, 3: 其余卡牌
  invalidCardIds: string[];
  showProgress?: boolean;
}

export const CardRevealSequence: React.FC<CardRevealSequenceProps> = ({
  currentStep,
  invalidCardIds,
  showProgress = true,
}) => {
  const steps = ['禁止移动', '移动', '其他禁止', '其余'];

  // Logic to render Red X over invalid cards using DOM queries on data-played-card-id
  const [rects, setRects] = useState<Record<string, DOMRect>>({});

  useEffect(() => {
    if (invalidCardIds.length === 0) {
      setRects({});
      return;
    }

    const updateRects = () => {
      const newRects: Record<string, DOMRect> = {};
      invalidCardIds.forEach(id => {
        const el = document.querySelector(`[data-played-card-id="${id}"]`);
        if (el) {
          newRects[id] = el.getBoundingClientRect();
        }
      });
      setRects(newRects);
    };

    // 初始测量
    updateRects();

    // 监听可能引起位置变化的事件
    window.addEventListener('resize', updateRects);
    window.addEventListener('scroll', updateRects, true);

    // ResizeObserver：监听目标卡牌元素尺寸变化
    const observer = new ResizeObserver(updateRects);
    invalidCardIds.forEach(id => {
      const el = document.querySelector(`[data-played-card-id="${id}"]`);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('resize', updateRects);
      window.removeEventListener('scroll', updateRects, true);
      observer.disconnect();
    };
  }, [invalidCardIds, currentStep]);

  return (
    <>
      {showProgress && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[8000] pointer-events-none flex flex-col items-center gap-2">
          <div className="bg-obsidian-900/95 border border-slate-700/60 rounded-full px-8 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
            {steps.map((step, idx) => {
              const isCurrent = currentStep === idx;
              const isPast = currentStep > idx;

              return (
                <div key={idx} className={`flex items-center gap-2 transition-all duration-500 ${isCurrent ? 'scale-110 opacity-100' : isPast ? 'opacity-70 grayscale' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black transition-colors duration-500 ${
                    isCurrent
                      ? 'bg-loop-500 text-obsidian-950 shadow-[0_0_15px_rgba(6,182,212,0.9)]'
                      : isPast
                        ? 'bg-loop-900/60 text-loop-400 border border-loop-500/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {isPast ? '✓' : (idx + 1)}
                  </div>
                  <span className={`font-bold transition-colors duration-500 ${isCurrent ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : isPast ? 'text-loop-200' : 'text-slate-400'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invalid Cards Overlays */}
      {invalidCardIds.map(id => {
        const rect = rects[id];
        if (!rect || rect.width === 0 || rect.height === 0) return null;
        return (
          <div 
            key={id} 
            className="fixed z-[8100] pointer-events-none flex items-center justify-center animate-in fade-in zoom-in duration-300"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          >
            {/* Semi-transparent red overlay */}
            <div className="absolute inset-0 bg-red-950/70 border-2 border-red-500/80 rounded shadow-[inset_0_0_20px_rgba(220,38,38,0.5)] backdrop-blur-[1px]" />
            {/* Big X */}
            <span className="text-red-500 font-black text-6xl drop-shadow-[0_0_15px_rgba(220,38,38,1)] transform -rotate-12 scale-150 animate-pulse">
              X
            </span>
          </div>
        );
      })}
    </>
  );
};
