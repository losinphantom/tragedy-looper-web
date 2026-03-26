import React, { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getCardImageUrl, getCardLabel, getSeatAvatarUrl, getSeatDisplayName } from './boardHelpers';
import {
  getManualPhaseAdvanceDecision,
  type GoodwillInteractionPhase,
  type PhaseAdvanceAction,
  type PhaseAdvanceTheme,
  type PlayedCard,
} from '@tragedy/game-logic';
import { cn } from '../../lib/utils';


// ── Types ────────────────────────────────────────────────────────────────────

export interface HandAreaProps {
  myHand: string[];
  selectedHandCard: number | null;
  setSelectedHandCard: (idx: number | null) => void;
  canPlayCards: boolean;
  cardsRemaining: number;
  maxCards: number;
  myPlayedCount: number;
  isManualPhase: boolean;
  isMastermind: boolean;
  phase: string;
  playerID: string | null;
  playedCards: PlayedCard[];
  readyPlayers: Record<string, boolean>;
  leaderMode: boolean;
  leaderTurnOrder: string[];
  leaderTurnIndex: number;
  isLeader: boolean;
  goodwillInteractionPhase?: GoodwillInteractionPhase;
  hasLoopResultPanel?: boolean;
  hasBlockingRuntimeInteraction?: boolean;
  moves: {
    advancePhase: () => void;
    finishAbilities: () => void;
    skipAllAbilities: () => void;
    recallCard: (playedCardId: string) => void;
    toggleReady: () => void;
  };
  hasPendingAbilitiesForPhase: boolean;
  hasMandatoryPendingAbilities: boolean;
  onPreviewCard: (cardTemplateId: string) => void;
  onRecallCard: (playedCardId: string) => void;
}

type HandCardDropTarget = { type: 'location' | 'character'; id: string };

export function parseHandDropTargetId(
  value: string | number | null | undefined,
): HandCardDropTarget | null {
  if (value == null) return null;

  const stringValue = String(value);
  if (stringValue.startsWith('character:')) {
    return { type: 'character', id: stringValue.slice('character:'.length) };
  }
  if (stringValue.startsWith('location:')) {
    return { type: 'location', id: stringValue.slice('location:'.length) };
  }
  return null;
}

export function getAdvanceButtonState(args: {
  isMyPlanPhase: boolean;
  isReady: boolean;
  isManualPhase: boolean;
  isMastermind: boolean;
  isLeader: boolean;
  phase: string;
  hasPendingAbilitiesForPhase: boolean;
  hasMandatoryPendingAbilities: boolean;
  goodwillInteractionPhase?: GoodwillInteractionPhase;
  hasLoopResultPanel?: boolean;
  hasBlockingRuntimeInteraction?: boolean;
}): {
  canAdvance: boolean;
  action: PhaseAdvanceAction;
  theme: PhaseAdvanceTheme;
} {
  const {
    isMyPlanPhase,
    isReady,
    isManualPhase,
    isMastermind,
    isLeader,
    phase,
    hasPendingAbilitiesForPhase,
    hasMandatoryPendingAbilities,
    goodwillInteractionPhase,
    hasLoopResultPanel,
    hasBlockingRuntimeInteraction,
  } = args;

  if (isMyPlanPhase) {
    return {
      canAdvance: !isReady,
      action: 'advancePhase',
      theme: !isReady ? 'plan-ready' : 'disabled',
    };
  }

  if (phase === 'goodwill_window' && isLeader && !isMastermind) {
    const decision = getManualPhaseAdvanceDecision({
      isMastermind,
      isLeader,
      phase,
      hasPendingAbilitiesForPhase,
      hasMandatoryPendingAbilities,
      goodwillInteractionPhase,
      hasBlockingLoopResult: hasLoopResultPanel,
    });
    if (hasBlockingRuntimeInteraction && decision.action === 'advancePhase') {
      return {
        canAdvance: false,
        action: decision.action,
        theme: 'disabled',
      };
    }
    return decision;
  }

  if (!(isManualPhase && isMastermind && phase !== 'protagonist_plan')) {
    return {
      canAdvance: false,
      action: 'advancePhase',
      theme: 'disabled',
    };
  }

  const decision = getManualPhaseAdvanceDecision({
    isMastermind,
    isLeader,
    phase,
    hasPendingAbilitiesForPhase,
    hasMandatoryPendingAbilities,
    goodwillInteractionPhase,
    hasBlockingLoopResult: hasLoopResultPanel,
  });
  if (hasBlockingRuntimeInteraction && decision.action === 'advancePhase') {
    return {
      canAdvance: false,
      action: decision.action,
      theme: 'disabled',
    };
  }
  return decision;
}

type HandCardButtonProps = {
  idx: number;
  cardTemplateId: string;
  isPlayPhase: boolean;
  isSelected: boolean;
  isDragging: boolean;
  playerID: string | null;
  onSelectToggle: () => void;
  onPreviewCard: (cardTemplateId: string) => void;
};

const HandCardButton: React.FC<HandCardButtonProps> = ({
  idx,
  cardTemplateId,
  isPlayPhase,
  isSelected,
  isDragging,
  playerID,
  onSelectToggle,
  onPreviewCard,
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `hand-card:${idx}`,
    disabled: !isPlayPhase,
    data: {
      idx,
      cardTemplateId,
    },
  });
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerOriginRef.current = { x: event.clientX, y: event.clientY };
    suppressClickRef.current = false;
    listeners?.onPointerDown?.(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerOriginRef.current) return;
    const distance = Math.hypot(
      event.clientX - pointerOriginRef.current.x,
      event.clientY - pointerOriginRef.current.y,
    );
    if (distance > 8) {
      suppressClickRef.current = true;
    }
  };

  const clearPointerState = () => {
    pointerOriginRef.current = null;
  };

  const handleClick = () => {
    if (!isPlayPhase || suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelectToggle();
  };
  const mergedListeners = {
    ...listeners,
    onPointerDown: handlePointerDown,
  };

  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>
        <button
          ref={setNodeRef}
          data-hand-idx={idx}
          type="button"
          {...attributes}
          {...mergedListeners}
          onPointerMove={handlePointerMove}
          onPointerUp={clearPointerState}
          onPointerCancel={clearPointerState}
          onPointerLeave={clearPointerState}
          onClick={handleClick}
          onContextMenu={(event) => {
            event.preventDefault();
            onPreviewCard(cardTemplateId);
          }}
          className={cn(
            'relative group w-[75px] h-[115px] 2xl:w-[105px] 2xl:h-[160px] rounded-xl overflow-hidden transition-all duration-300 flex flex-col items-center shadow-2xl border bg-obsidian-900',
            !isPlayPhase ? 'cursor-pointer border-white/10 hover:border-white/30' : 'hover:border-slate-500 border-white/10',
            isSelected
              ? '-translate-y-8 ring-2 ring-loop-400 shadow-glow-cyan scale-105 z-20'
              : isPlayPhase
                ? 'hover:-translate-y-4 hover:z-10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)]'
                : '',
            isDragging ? 'opacity-25 scale-95' : '',
          )}
          title="点击选中出牌 / 拖到角色或地点 / 悬停预览 / 右键查看大图"
        >
          <img
            src={getCardImageUrl(cardTemplateId, playerID || undefined)}
            alt={getCardLabel(cardTemplateId)}
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {!isSelected && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>}
          {!isSelected && <div className="absolute inset-0 bg-obsidian-900/20 group-hover:bg-transparent transition-colors pointer-events-none"></div>}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={14}
          className="z-[9999] rounded-2xl border border-white/10 bg-obsidian-950/95 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.78)] backdrop-blur-xl"
        >
          <img
            src={getCardImageUrl(cardTemplateId, playerID || undefined)}
            alt={getCardLabel(cardTemplateId)}
            className="h-[240px] w-[168px] rounded-xl object-cover"
          />
          <div className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
            {getCardLabel(cardTemplateId)}
          </div>
          <Tooltip.Arrow className="fill-obsidian-950/95" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

// ── Component ────────────────────────────────────────────────────────────────

export const HandArea: React.FC<HandAreaProps> = ({
  myHand, selectedHandCard, setSelectedHandCard,
  canPlayCards, cardsRemaining, maxCards, myPlayedCount,
  isManualPhase, isMastermind, phase, playerID, playedCards, readyPlayers,
  leaderMode, leaderTurnOrder, leaderTurnIndex,
  isLeader, goodwillInteractionPhase, hasLoopResultPanel,
  hasPendingAbilitiesForPhase, hasMandatoryPendingAbilities,
  moves,
  onPreviewCard,
  onRecallCard,
}) => {
  const isSpectator = playerID == null;

  // Cards played by this seat (for recall)
  const myPlayedCards = playerID ? playedCards.filter(c => c.playedBySeat === playerID) : [];

  // Am I ready?
  const isReady = playerID ? (readyPlayers[playerID] || false) : false;

  // Is this my planning phase?
  const isMyPlanPhase = (isMastermind && phase === 'mastermind_plan') ||
                        (!isMastermind && phase === 'protagonist_plan');

  // leaderMode: 是否轮到我出牌
  const isMyLeaderTurn = leaderMode && phase === 'protagonist_plan' && !isMastermind
    ? leaderTurnOrder[leaderTurnIndex] === playerID
    : true;
  const currentTurnSeat = leaderMode && leaderTurnOrder.length > 0
    ? leaderTurnOrder[leaderTurnIndex] || ''
    : '';

  // leaderMode 时非当前轮次玩家不能出牌
  const effectiveCanPlayCards = canPlayCards && (!leaderMode || isMyLeaderTurn || isMastermind);
  const seatAvatarSrc = playerID ? getSeatAvatarUrl(playerID) : '/assets/玩家头像/主人公蓝.png';
  const seatDisplayName = playerID ? getSeatDisplayName(playerID) : '观战';

  // Can I advance?
  // Plan phase: can advance when ready (played enough cards)
  // Other manual phases: only mastermind can advance
  // protagonist_plan: mastermind can never advance (protagonists must play)
  const advanceButtonState = getAdvanceButtonState({
    isMyPlanPhase,
    isReady,
    isManualPhase,
    isMastermind,
    isLeader,
    phase,
    hasPendingAbilitiesForPhase,
    hasMandatoryPendingAbilities,
    goodwillInteractionPhase,
    hasLoopResultPanel,
  });
  const canAdvance = advanceButtonState.canAdvance;

  return (
    <footer className="bg-obsidian-950/90 border-t border-white/10 p-2 lg:p-4 2xl:p-6 backdrop-blur-2xl relative z-50 shadow-[0_-10px_50px_rgba(0,0,0,0.6)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-loop-500/30 to-transparent"></div>

      <div className="w-full max-w-[1400px] mx-auto flex items-end justify-between relative z-10 gap-6">

        {/* ── LEFT ZONE: Recall + Identity ── */}
        <div className="flex items-end justify-start gap-3 min-w-0 shrink-0">
          {/* Recall buttons for played cards — LEFT of avatar */}
          {isMyPlanPhase && myPlayedCards.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-obsidian-900/60 p-2 rounded-xl border border-white/5 shadow-inner backdrop-blur-md">
              <span className="text-[8px] text-slate-500 uppercase tracking-widest px-1 font-bold flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-loop-500 animate-pulse"></div>
                PLAYED
              </span>
              <div className="flex flex-col gap-1">
                {myPlayedCards.map(pc => (
                  <button
                    key={pc.id}
                    onClick={() => onRecallCard(pc.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-obsidian-800 hover:bg-blood-900/40 border border-white/5 hover:border-blood-500/50 transition-all text-[10px] text-slate-300 hover:text-white uppercase tracking-wider group"
                    title={`Recall: ${getCardLabel(pc.cardTemplateId)}`}
                  >
                    <span className="text-slate-500 group-hover:text-blood-400 font-bold">↩</span>
                    <span className="truncate max-w-[80px]">{getCardLabel(pc.cardTemplateId)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player identity badge */}
          <div className="flex flex-col items-center gap-1.5 transform transition-all hover:scale-105" style={{ marginTop: '-10px' }}>
            <div className="relative">
              <div className="absolute inset-0 bg-white/5 rounded-full blur-md"></div>
              <img src={seatAvatarSrc} alt={seatDisplayName} className="relative w-10 h-10 2xl:w-16 2xl:h-16 rounded-full border-2 border-white/20 object-cover shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
              {isReady && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-obsidian-950 flex items-center justify-center text-[8px] text-white font-black shadow-glow-cyan">✓</div>}
            </div>
            <span className="text-[10px] text-slate-300 font-black tracking-widest uppercase bg-obsidian-900/60 px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-sm whitespace-nowrap shadow-inner">
              {seatDisplayName}
            </span>
          </div>
        </div>

        {/* ── CENTER ZONE: Hand Cards ── */}
        <div className="flex-1 flex justify-center pb-1">
          <Tooltip.Provider skipDelayDuration={80}>
            <div data-hand-drop-zone="true" className="flex gap-2 2xl:gap-3 items-end h-[120px] 2xl:h-[160px] relative">
              {myHand.length > 0 ? (
                myHand.map((card, idx) => {
                  const isSelected = selectedHandCard === idx;
                  const isPlayPhase = effectiveCanPlayCards;
                  return (
                    <HandCardButton
                      key={`${card}_${idx}`}
                      idx={idx}
                      cardTemplateId={card}
                      isPlayPhase={isPlayPhase}
                      isSelected={isSelected}
                      isDragging={false}
                      playerID={playerID}
                      onSelectToggle={() => setSelectedHandCard(isSelected ? null : idx)}
                      onPreviewCard={onPreviewCard}
                    />
                  );
                })
              ) : (
                <div className="text-slate-600 font-bold text-xs uppercase tracking-[0.3em] flex items-center justify-center h-[100px] 2xl:h-[140px] px-12 rounded-2xl border-2 border-dashed border-slate-700/30 bg-obsidian-900/20 mb-2">
                  NO CARDS IN HAND
                </div>
              )}
            </div>
          </Tooltip.Provider>
        </div>

        {/* ── RIGHT ZONE: Controls ── */}
        <div className="flex items-end justify-end gap-3 shrink-0">
          <div className="flex gap-3 items-center mb-1">
            {!isMyPlanPhase && (phase === 'mastermind_plan' || phase === 'protagonist_plan') && (
              <div className="flex flex-col items-end mr-1">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse hidden sm:block"></span>
                  {phase === 'mastermind_plan'
                    ? 'WAITING FOR MASTERMIND…'
                    : leaderMode && currentTurnSeat
                      ? `等待主角 ${getSeatDisplayName(currentTurnSeat)} 出牌…`
                      : 'WAITING FOR PROTAGONISTS…'
                  }
                </div>
              </div>
            )}
            {isMyPlanPhase && leaderMode && phase === 'protagonist_plan' && !isMastermind && (
              <div className="flex items-center gap-2 mr-2">
                {leaderTurnOrder.map((seat, i) => (
                  <div key={seat} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                    i < leaderTurnIndex
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-500 opacity-60'
                      : i === leaderTurnIndex
                        ? 'bg-gold-950/40 border-gold-500/50 text-gold-400 shadow-[0_0_10px_rgba(234,179,8,0.3)] animate-pulse'
                        : 'bg-obsidian-900/40 border-slate-700/30 text-slate-500'
                  }`}>
                    {i < leaderTurnIndex ? '✓' : i === leaderTurnIndex ? '▶' : '○'}
                    {getSeatDisplayName(seat)}
                  </div>
                ))}
              </div>
            )}

            {isManualPhase && (canAdvance || isMyPlanPhase) && (
              <button
                onClick={() => {
                  if (!canAdvance) return;
                  if (advanceButtonState.action === 'finishAbilities') {
                    moves.finishAbilities();
                    return;
                  }
                  if (advanceButtonState.action === 'skipAllAbilities') {
                    moves.skipAllAbilities();
                    return;
                  }
                  moves.advancePhase();
                }}
                className={`relative overflow-hidden group px-4 py-3 2xl:px-6 2xl:py-4 rounded-2xl font-black transition-all duration-300 transform hover:-translate-y-1 text-xs 2xl:text-sm tracking-widest uppercase border h-[56px] 2xl:h-[76px] flex flex-col items-center justify-center min-w-[100px] 2xl:min-w-[130px] ${
                  advanceButtonState.theme === 'plan-ready'
                    ? 'bg-blood-800 hover:bg-blood-700 text-white border-blood-500 shadow-glow-red hover:shadow-[0_0_30px_rgba(225,29,72,0.8)]'
                    : advanceButtonState.theme === 'manual-next'
                      ? 'bg-obsidian-900/90 hover:bg-blood-950/35 text-blood-300 border-blood-700/80 shadow-[0_0_14px_rgba(225,29,72,0.18)] hover:shadow-[0_0_24px_rgba(225,29,72,0.32)]'
                      : 'bg-obsidian-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-80'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                <span className="relative z-10 text-center leading-tight flex flex-col items-center gap-1">
                  {isMyPlanPhase ? (
                    canAdvance ? (
                      <>
                        <span>END PLAY</span>
                        <span className="opacity-70 text-[10px] font-mono">({myPlayedCount}/{maxCards})</span>
                      </>
                    ) : (
                      <>
                        <span>WAITING</span>
                        <span className="opacity-70 text-[10px] font-mono">({cardsRemaining} LEFT)</span>
                      </>
                    )
                  ) : (
                    <>
                      <span>NEXT ▶</span>
                      <span className="opacity-70 text-[10px] font-mono">{phase?.replace(/_/g, ' ')}</span>
                    </>
                  )}
                </span>
              </button>
            )}

            {!isSpectator && !isManualPhase && !isMyPlanPhase && (
              <button
                onClick={() => moves.toggleReady()}
                className={`relative overflow-hidden px-4 py-3 2xl:px-6 2xl:py-4 rounded-2xl font-black transition-all duration-300 transform hover:-translate-y-1 text-xs 2xl:text-sm tracking-widest uppercase border h-[56px] 2xl:h-[76px] flex items-center justify-center min-w-[100px] 2xl:min-w-[130px] shadow-lg ${
                  isReady 
                    ? 'bg-emerald-800 hover:bg-emerald-700 text-white border-emerald-500 shadow-glow-cyan hover:shadow-[0_0_20px_rgba(16,185,129,0.8)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                <span className="relative z-10">{isReady ? '✓ READY' : 'MARK READY'}</span>
              </button>
            )}

            {phase === 'match_end' && (
              <div className="text-blood-500 font-black text-2xl font-serif px-8 tracking-[0.2em] shadow-glow-red animate-pulse drop-shadow-lg flex items-center h-[76px]">
                GAME OVER
              </div>
            )}
          </div>
        </div>
      </div>

    </footer>
  );
};
