import React, { useState, useEffect } from 'react';

export interface PhaseTransitionBannerProps {
  phase: string;
}

type PhaseBannerDetails = {
  step: string;
  titleCn: string;
  titleEn: string;
  executor: string;
  roleClass: string;
  icon: string;
  desc: string;
};

const PHASE_DETAILS: Record<string, PhaseBannerDetails> = {
  mastermind_plan: {
    step: 'I', titleCn: '剧作家计划阶段', titleEn: 'MASTERMIND PHASE',
    executor: '剧作家', roleClass: 'text-blood-500', icon: '🔴', desc: '剧作家暗伏行动卡，使用强制或可选能力。'
  },
  protagonist_plan: {
    step: 'II', titleCn: '主角行动阶段', titleEn: 'PROTAGONIST PHASE',
    executor: '主角', roleClass: 'text-loop-500', icon: '🔵', desc: '主角组讨论并放置行动卡。'
  },
  resolve_cards: {
    step: 'III', titleCn: '行动揭晓与结算', titleEn: 'RESOLUTION PHASE',
    executor: '共同', roleClass: 'text-slate-300', icon: '⚡', desc: '双方揭示卡牌，依次进行禁止移动、移动、其他禁止、其余结算。'
  },
  mastermind_abilities: {
    step: 'IV', titleCn: '剧作家能力阶段', titleEn: 'ABILITY PHASE',
    executor: '剧作家', roleClass: 'text-blood-500', icon: '🔴', desc: '剧作家使用能力并暗中修改状态。'
  },
  incidents: {
    step: 'V', titleCn: '事件阶段', titleEn: 'INCIDENT PHASE',
    executor: '剧作家', roleClass: 'text-blood-500', icon: '🔴', desc: '剧作家宣告触发的事件并结算效果。'
  },
  goodwill_window: {
    step: 'VI', titleCn: '友好能力阶段', titleEn: 'GOODWILL PHASE',
    executor: '队长', roleClass: 'text-gold-500', icon: '⭐', desc: '队长选择是否使用角色的友好能力。'
  },
  switch_leader: {
    step: 'VII', titleCn: '队长交接', titleEn: 'LEADER CHANGE',
    executor: '系统', roleClass: 'text-slate-400', icon: '🔄', desc: '顺时针传递队长标记。'
  },
  match_end: {
    step: 'OVER', titleCn: '游戏结束', titleEn: 'GAME OVER',
    executor: '系统', roleClass: 'text-blood-500', icon: '💀', desc: '轮回终结。'
  }
};

const PHASE_ALIASES: Record<string, string> = {
  resolution: 'resolve_cards',
  mastermind_ability: 'mastermind_abilities',
  events: 'incidents',
  goodwill: 'goodwill_window',
  leader_change: 'switch_leader',
  game_end: 'match_end',
};

export function getPhaseBannerDetails(phase: string): PhaseBannerDetails | null {
  if (!phase || phase === 'idle' || phase === 'done') return null;
  const normalizedPhase = PHASE_ALIASES[phase] || phase;
  return PHASE_DETAILS[normalizedPhase] || null;
}

export const PhaseTransitionBanner: React.FC<PhaseTransitionBannerProps> = ({ phase }) => {
  const [visible, setVisible] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(phase);

  useEffect(() => {
    if (!getPhaseBannerDetails(phase)) {
      setVisible(false);
      return;
    }

    setCurrentPhase(phase);
    setVisible(true);

    // 动画进场停顿 2.5 秒后消失
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [phase]);

  if (!visible) return null;
  const info = getPhaseBannerDetails(currentPhase);
  if (!info) return null;

  return (
    <div className="fixed inset-x-0 top-[20%] z-[6000] flex justify-center pointer-events-none">
      <div className="relative animate-in slide-in-from-right-16 fade-in duration-500 ease-out fill-mode-both">
        {/* 背景光效 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-obsidian-900/90 to-transparent blur-md"></div>
        <div className="absolute inset-0 border-y border-white/10 bg-gradient-to-r from-transparent via-obsidian-800/80 to-transparent"></div>
        
        <div className="relative px-20 py-6 flex items-center gap-6">
          {/* 步骤数字 */}
          <div className="text-5xl font-black font-serif italic text-white/20 select-none drop-shadow-md">
            {info.step}
          </div>
          
          <div className="flex flex-col">
            {/* 顶栏：执行者 + 英文名 */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-black tracking-widest px-2 py-0.5 rounded backdrop-blur-sm bg-black/50 border border-white/5 ${info.roleClass}`}>
                {info.icon} {info.executor}
              </span>
              <span className="text-[10px] text-slate-500 font-bold tracking-[0.2em] font-mono">
                {info.titleEn}
              </span>
            </div>
            
            {/* 主标题 */}
            <h2 className="text-3xl font-black text-white tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {info.titleCn}
            </h2>
            
            {/* 描述 */}
            <p className="text-sm text-slate-300 mt-2 max-w-lg drop-shadow-md">
              {info.desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
