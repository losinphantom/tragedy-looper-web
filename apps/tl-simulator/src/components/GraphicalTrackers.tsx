import React from 'react';

// ── Time Dials (Left Sidebar) ──

export interface TimeDialsProps {
  day: number;
  daysPerLoop: number;
  loopIndex: number;
  maxLoops: number;
  exGauge?: number;
  exEnabled?: boolean;
}

export const TimeDials: React.FC<TimeDialsProps> = ({
  day,
  daysPerLoop,
  loopIndex,
  maxLoops,
  exGauge: exGaugeProp = 0,
  exEnabled = false,
}) => {
  // Always render 8 rows to match the physical board's aesthetic layout
  const rows = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex flex-col h-full bg-obsidian-900/40 p-2 md:p-3 lg:p-4 rounded-xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-y-auto hide-scrollbar">
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.2] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #cca352 0%, transparent 80%)' }}></div>
      <div
        className="absolute inset-0 opacity-10 mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(204,163,82,0.18) 0 2px, transparent 2px 11px), repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 13px)',
        }}
      ></div>

      {/* Grid Header */}
      <div className="grid grid-cols-3 gap-1 md:gap-2 w-full mb-3 md:mb-5 z-10 sticky top-0 bg-obsidian-900/80 backdrop-blur-md py-3 border-b border-obsidian-700 rounded-t-lg">
        <div className="flex flex-col items-center justify-end h-full">
          <span className="text-[10px] md:text-xs lg:text-sm text-slate-300 font-serif font-black tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase text-center leading-none">Day<br/>Affair</span>
          <span className="text-[8px] md:text-[9px] lg:text-[10px] text-gold-500/80 tracking-widest mt-1.5 whitespace-nowrap font-bold">当前天数</span>
        </div>
        <div className="flex flex-col items-center justify-end h-full">
          <span className="text-[10px] md:text-xs lg:text-sm text-slate-300 font-serif font-black tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase text-center leading-none">Loop</span>
          <span className="text-[8px] md:text-[9px] lg:text-[10px] text-loop-400/80 tracking-widest mt-1.5 whitespace-nowrap font-bold">轮回次数</span>
        </div>
        <div className="flex flex-col items-center justify-end h-full">
          <span className="text-[10px] md:text-xs lg:text-sm text-slate-300 font-serif font-black tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase text-center leading-none">Extra<br/>Gauge</span>
          <span className="text-[8px] md:text-[9px] lg:text-[10px] text-purple-400/80 tracking-widest mt-1.5 whitespace-nowrap font-bold">扩展槽</span>
        </div>
      </div>

      {/* Grid Body */}
      <div className="flex flex-col gap-2 md:gap-3 lg:gap-4 w-full z-10 pb-4">
        {rows.map(i => {
          // Day Column logic
          const d = i + 1;
          const isValidDay = d <= daysPerLoop;
          const safeDay = Number(day) || 1;
          const isCurrentDay = safeDay === d;

          // Loop Column logic
          const targetLoopIndex = i;
          const isBadEndingRow = targetLoopIndex === maxLoops;
          const isValidLoopRow = targetLoopIndex <= maxLoops;
          const isCurrentLoop = loopIndex === targetLoopIndex && !isBadEndingRow;
          
          let loopText = '';
          const loopsRemaining = maxLoops - targetLoopIndex;
          if (isBadEndingRow) {
            loopText = 'Bad\nEnding';
          } else if (targetLoopIndex === maxLoops - 1) {
            loopText = 'Final\nLoop';
          } else if (isValidLoopRow) {
            loopText = `${loopsRemaining} Loops\nGame\nStart`;
          }

          // Extra Gauge logic
          const exValue = i; // Row index 0-7 represents gauge value
          const isExActive = exEnabled && exGaugeProp === exValue;

          // Common Circle Classes to guarantee uniformity
          const circleBaseClasses = "relative w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 mx-auto";
          const inactiveClasses = "bg-obsidian-950/50 border border-white/5 shadow-inner opacity-50 grayscale mix-blend-luminosity";

          return (
            <div key={`track-row-${i}`} className="grid grid-cols-3 gap-1 md:gap-2 w-full relative">
              {/* Subtle connective horizontal line to mimic mechanical linkage */}
              <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-700/20 -z-10 pointer-events-none"></div>
              
              {/* Day Cell */}
              <div className="flex justify-center flex-col justify-center">
                <div className={`${circleBaseClasses} ${
                  isValidDay 
                    ? isCurrentDay 
                      ? 'bg-obsidian-800 border-2 border-gold-400 shadow-[inset_0_0_15px_rgba(204,163,82,0.4),0_0_20px_rgba(204,163,82,0.6)] scale-110 z-20' 
                      : 'bg-obsidian-900/80 border border-slate-700/80 shadow-inner group hover:border-gold-700/50'
                    : inactiveClasses
                }`}>
                  {isValidDay ? (
                    <div className={`flex flex-col items-center justify-center leading-none ${isCurrentDay ? '' : 'opacity-80'}`}>
                      <span className={`text-[7px] md:text-[8px] lg:text-[9px] font-serif uppercase tracking-widest ${isCurrentDay ? 'text-gold-300 font-bold mb-0.5' : 'text-slate-400'}`}>Day</span>
                      <span className={`text-xl md:text-2xl lg:text-3xl font-serif leading-none ${isCurrentDay ? 'text-gold-100 font-black' : 'text-slate-300 font-bold'}`}>{d}</span>
                    </div>
                  ) : (
                    <div className="w-4 border-b border-slate-600/50"></div>
                  )}
                  {isCurrentDay && <div className="absolute -inset-1 rounded-full border border-gold-400/30 animate-pulse pointer-events-none"></div>}
                </div>
              </div>

              {/* Loop Cell */}
              <div className="flex justify-center flex-col justify-center">
                <div className={`${circleBaseClasses} ${
                  isValidLoopRow
                    ? isCurrentLoop
                      ? 'bg-obsidian-800 border-2 border-loop-400 shadow-[inset_0_0_15px_rgba(56,189,248,0.4),0_0_20px_rgba(56,189,248,0.6)] scale-[1.15] z-20'
                      : isBadEndingRow
                        ? 'bg-blood-950/60 border border-blood-900 shadow-[inset_0_0_15px_rgba(225,29,72,0.5)]'
                        : 'bg-obsidian-900/80 border border-slate-700/80 shadow-inner'
                    : inactiveClasses
                }`}>
                  {isValidLoopRow ? (
                    <span className={`text-center font-serif leading-tight whitespace-pre-line ${
                      isBadEndingRow 
                        ? 'text-blood-500 text-[10px] lg:text-xs font-black' 
                        : isCurrentLoop
                          ? 'text-loop-100 text-[8px] md:text-[9px] lg:text-[10px] font-black tracking-tight'
                          : 'text-slate-300 text-[7px] md:text-[8px] lg:text-[9px] font-bold opacity-80'
                    }`}>
                      {loopText}
                    </span>
                  ) : (
                    <div className="w-4 border-b border-slate-600/50"></div>
                  )}
                  {isCurrentLoop && <div className="absolute -inset-1 rounded-full border border-loop-400/30 animate-pulse pointer-events-none"></div>}
                </div>
              </div>

              {/* Extra Gauge Cell */}
              <div className="flex justify-center flex-col justify-center">
                <div className={`${circleBaseClasses} ${
                  isExActive 
                    ? 'bg-obsidian-800 border-2 border-purple-400 shadow-[inset_0_0_15px_rgba(192,132,252,0.4),0_0_20px_rgba(192,132,252,0.6)] scale-110 z-20'
                    : exEnabled
                      ? 'bg-obsidian-900/60 border border-slate-700/50 shadow-inner opacity-70'
                      : 'bg-obsidian-950/50 border border-white/5 shadow-inner opacity-30 grayscale'
                }`}>
                  <span className={`text-xl md:text-2xl lg:text-3xl font-serif ${isExActive ? 'text-purple-200 font-black' : exEnabled ? 'text-slate-500 font-bold' : 'text-slate-700 font-bold'}`}>
                    {exValue}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
      
    </div>
  );
};

// ── Phase Flow Graphic (Top Header) ──

export interface PhaseFlowGraphicProps {
  phase: string;
  phaseName: string;
  phaseHint?: string;
}

export const PhaseFlowGraphic: React.FC<PhaseFlowGraphicProps> = ({ phase, phaseName, phaseHint }) => {
  const getStageCode = (p: string): number => {
    switch (p) {
      case 'loop_setup':
      case 'day_start':
        return 1; // I. 夜过天明
      case 'mastermind_plan':
      case 'protagonist_plan':
      case 'resolve_cards':
        return 2; // II. 行动卡使用
      case 'mastermind_abilities':
      case 'goodwill_window':
        return 3; // III. 能力使用
      case 'incidents':
        return 4; // IV. 事件发生
      case 'switch_leader':
      case 'day_end':
      case 'loop_end_check':
      case 'match_end':
        return 5; // V. 夜入三更 (Includes switch leader and round end)
      default:
        return 0;
    }
  };

  const currentStage = getStageCode(phase);

  const flowSteps = [
    { num: 'I', label: '夜过天明', subLabel: '回合开始阶段' },
    { num: 'II', label: '行动卡使用', subLabel: '行动设定与结算' },
    { num: 'III', label: '能力使用', subLabel: '能力阶段(剧本家/主角)' },
    { num: 'IV', label: '事件发生', subLabel: '事件阶段' },
    { num: 'V', label: '夜入三更', subLabel: '交换领队·回合结束' },
  ];

  return (
    <div className="flex flex-col items-center justify-center relative w-full h-full max-w-[900px]">
      
      {/* ── Active Phase Text Header ── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-loop-400 animate-pulse shadow-glow-cyan"></div>
          <span className="text-xs text-white font-bold tracking-widest px-2 py-0.5 bg-obsidian-800 rounded border border-white/10 shadow-inner">{phaseName}</span>
        </div>
        {phaseHint && <span className="text-[10px] text-slate-400 font-serif leading-none mt-0.5">{phaseHint}</span>}
      </div>

      {/* ── Graphic Flow ── */}
      <div className="flex items-start gap-4 z-10 justify-center">
        <div className="relative flex flex-col items-center justify-center h-full min-h-[90px] mr-3 ml-2">
          {/* Subtle connecting line and glow dot */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-[1px] h-[70px] bg-gradient-to-b from-transparent via-gold-500/40 to-transparent"></div>
          <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(204,163,82,0.8)]"></div>
          <div className="text-[10px] text-gold-400 font-serif tracking-[0.4em] writing-vertical-rl whitespace-nowrap opacity-80 pl-1" style={{ textOrientation: 'upright' }}>
            一天的流程
          </div>
        </div>
        
        {flowSteps.map((step, idx) => {
          const isActive = currentStage === (idx + 1);
          const isPassed = currentStage > (idx + 1);
          
          return (
            <React.Fragment key={step.num}>
              {/* Step Node Container */}
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div className={`relative flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 transition-all duration-500 mb-1 ${isActive ? 'scale-110 z-20' : 'scale-100 opacity-90 z-10'}`}>
                  {/* Outer Ring */}
                  <div className={`absolute inset-0 rounded-full border border-dashed transition-colors duration-500 animate-[spin_20s_linear_infinite] ${isActive ? 'border-gold-400/60' : 'border-slate-600/20'}`}></div>
                  
                  {/* Inner Bezel */}
                  <div className={`absolute inset-1 rounded-full border-2 transition-all duration-500 shadow-inner ${
                    isActive 
                      ? 'border-loop-400/60 bg-obsidian-800 shadow-[0_0_15px_rgba(56,189,248,0.5)]' 
                      : isPassed 
                        ? 'border-blood-900/40 bg-obsidian-800/80' 
                        : 'border-slate-700/40 bg-obsidian-900/50'
                  }`}></div>
                  
                  {/* Roman Numeral */}
                  <span className={`relative z-10 font-serif text-lg md:text-xl font-light transition-all duration-300 ${
                    isActive 
                      ? 'text-loop-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)] font-bold' 
                      : isPassed 
                        ? 'text-blood-400/60' 
                        : 'text-slate-500'
                  }`}>
                    {step.num}
                  </span>
                </div>

                {/* Main Label */}
                <div className={`text-center text-[11px] font-serif transition-colors duration-300 whitespace-nowrap tracking-widest ${isActive ? 'text-gold-400 font-bold drop-shadow-[0_0_5px_rgba(204,163,82,0.8)]' : 'text-slate-400'}`}>
                  {step.label}
                </div>
                {/* Sub Label (Detailed Phase info from board image) */}
                <div className={`text-center text-[9px] mt-0.5 max-w-[70px] leading-tight font-serif transition-colors duration-300 ${isActive ? 'text-loop-300' : 'text-slate-600'}`}>
                  {step.subLabel}
                </div>
              </div>

              {/* Connecting Arrow */}
              {idx < flowSteps.length - 1 && (
                <div className="w-4 md:w-6 flex justify-center mt-3">
                  <div className={`text-sm md:text-lg transition-colors duration-500 ${
                    currentStage > (idx + 1) ? 'text-blood-600/60' : 'text-slate-800/50'
                  }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="rotate-[-45deg] scale-x-125 drop-shadow-md">
                      <path d="M12 21L10.5 19.5L16.5 13.5H3V11.5H16.5L10.5 5.5L12 4L20.5 12.5L12 21Z" />
                    </svg>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
