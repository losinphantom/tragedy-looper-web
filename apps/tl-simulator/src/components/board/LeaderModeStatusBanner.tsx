import React from 'react';

import { getSeatDisplayName } from './boardHelpers';
import { cn } from '../../lib/utils';

type LeaderModeStatusBannerProps = {
  phase: string;
  leaderMode: boolean;
  leaderSeatId: string | null;
  currentTurnSeatId: string | null;
  viewerSeatId: string | null;
  variant?: 'board' | 'hand' | 'sidebar';
  className?: string;
};

function buildLeaderPermissionCopy(args: {
  leaderSeatId: string | null;
  currentTurnSeatId: string | null;
  viewerSeatId: string | null;
  phase: string;
}): { stageLabel: string; summary: string; permission: string } {
  const leaderLabel = args.leaderSeatId ? getSeatDisplayName(args.leaderSeatId) : '待指定队长';
  const currentTurnLabel = args.currentTurnSeatId ? getSeatDisplayName(args.currentTurnSeatId) : leaderLabel;
  const viewerIsCurrentTurn = args.viewerSeatId != null && args.viewerSeatId === args.currentTurnSeatId;
  const viewerIsLeader = args.viewerSeatId != null && args.viewerSeatId === args.leaderSeatId;

  if (args.phase === 'goodwill_window') {
    return {
      stageLabel: '队长裁定',
      summary: viewerIsLeader
        ? '当前由你负责发起友好能力选择。'
        : `当前由 ${leaderLabel} 负责发起友好能力选择。`,
      permission: viewerIsLeader
        ? '你拥有当前队长权限。'
        : `${leaderLabel} 拥有当前队长权限。`,
    };
  }

  return {
    stageLabel: '队长模式',
    summary: viewerIsCurrentTurn
      ? '轮到你出牌，点击主路径与拖拽增强共享同一套合法目标。'
      : `当前轮到 ${currentTurnLabel} 出牌。`,
    permission: viewerIsLeader
      ? '你负责协调整个主角侧顺序。'
      : `${leaderLabel} 负责协调整个主角侧顺序。`,
  };
}

export const LeaderModeStatusBanner: React.FC<LeaderModeStatusBannerProps> = ({
  phase,
  leaderMode,
  leaderSeatId,
  currentTurnSeatId,
  viewerSeatId,
  variant = 'board',
  className,
}) => {
  if (!leaderMode && phase !== 'goodwill_window') {
    return null;
  }

  const leaderLabel = leaderSeatId ? getSeatDisplayName(leaderSeatId) : '待指定队长';
  const currentTurnLabel = currentTurnSeatId ? getSeatDisplayName(currentTurnSeatId) : leaderLabel;
  const copy = buildLeaderPermissionCopy({
    leaderSeatId,
    currentTurnSeatId,
    viewerSeatId,
    phase,
  });

  return (
    <section
      className={cn(
        'rounded-2xl border border-gold-500/30 bg-obsidian-950/85 text-slate-100 shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl',
        variant === 'board' && 'mb-3 px-4 py-3',
        variant === 'hand' && 'mb-3 px-4 py-3',
        variant === 'sidebar' && 'mb-4 px-3 py-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gold-500/30 bg-gold-950/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-gold-200">
          {copy.stageLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
          队长 {leaderLabel}
        </span>
        <span className="rounded-full border border-loop-500/30 bg-loop-950/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-loop-200">
          当前 {currentTurnLabel}
        </span>
      </div>
      <div className="mt-2 text-sm font-bold text-slate-100">{copy.summary}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{copy.permission}</div>
    </section>
  );
};
