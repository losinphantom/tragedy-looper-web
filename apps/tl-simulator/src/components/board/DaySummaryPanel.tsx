import React from 'react';

export interface DaySummaryStats {
  moves: number;
  tokensAdded: number;
  incidentsTriggered: number;
  deaths: number;
}

export interface DaySummaryPanelProps {
  day: number;
  loop: number;
  onContinue: () => void;
  stats?: DaySummaryStats;
}

export const DaySummaryPanel: React.FC<DaySummaryPanelProps> = ({
  day, loop, onContinue,
  stats,
}) => {
  const isPlaceholder = !stats;
  return (
    <div className="fixed inset-0 z-[6500] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-obsidian-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg animate-in zoom-in-95 duration-500 delay-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-obsidian-800 to-obsidian-900 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-500 tracking-[0.2em] mb-1">
              LOOP {loop} - DAY END
            </div>
            <h2 className="text-2xl font-black text-white tracking-widest font-serif drop-shadow-md flex items-center gap-2">
              <span className="text-blue-400">✧</span> 第 {day} 天结束
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-300 mb-6 drop-shadow-sm font-serif">
            夜幕降临。在这一天里，暗潮涌动...
          </p>
          {isPlaceholder && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
              当前运行时不再从兼容日志重建日结摘要；如需显示此面板，请显式传入统计数据。
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* 移动小结 */}
            <div className="bg-obsidian-800/80 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-obsidian-800 transition-colors">
              <div className="text-3xl mb-2 drop-shadow-md transition-transform group-hover:scale-110">🚶</div>
              <div className="text-xl font-black text-white">{stats?.moves ?? 0}</div>
              <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">角色移动</div>
            </div>

            {/* 指示物小结 */}
            <div className="bg-obsidian-800/80 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-obsidian-800 transition-colors">
              <div className="text-3xl mb-2 drop-shadow-md transition-transform group-hover:scale-110">🔮</div>
              <div className="text-xl font-black text-white">+{stats?.tokensAdded ?? 0}</div>
              <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">异常激化</div>
            </div>

            {/* 事件小结 */}
            <div className="bg-inner border border-red-900/30 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:bg-red-950/20 transition-colors">
              <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay"></div>
              <div className="text-3xl mb-2 relative z-10 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-transform group-hover:scale-110">⚠️</div>
              <div className="text-xl font-black text-red-100 relative z-10">{stats?.incidentsTriggered ?? 0}</div>
              <div className="text-[10px] text-red-300/80 font-bold tracking-widest uppercase mt-1 relative z-10">发生事件</div>
            </div>

            {/* 死亡小结 */}
            <div className="bg-inner border border-red-900/50 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:bg-blood-950/40 transition-colors">
              <div className="absolute inset-0 bg-blood-600/10 mix-blend-overlay"></div>
              <div className="text-3xl mb-2 relative z-10 drop-shadow-[0_0_15px_rgba(225,29,72,0.8)] transition-transform group-hover:scale-110">💀</div>
              <div className="text-xl font-black text-blood-400 relative z-10">{stats?.deaths ?? 0}</div>
              <div className="text-[10px] text-blood-400/80 font-bold tracking-widest uppercase mt-1 relative z-10">死者增加</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-obsidian-950 border-t border-white/5 flex justify-end">
          <button
            onClick={onContinue}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-lg tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            继续推演 <span className="opacity-60 text-lg leading-none">▶</span>
          </button>
        </div>

      </div>
    </div>
  );
};
