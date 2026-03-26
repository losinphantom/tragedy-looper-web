import React, { useEffect, useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { getCharLabel, getCharImageSrc, getPlayedCardRenderUrl, CHARACTERS } from './boardHelpers';
import type { PlayedCard, CharacterState } from '@tragedy/game-logic';
import { FloatingNumber, type FloatingNumberType } from '../animations/FloatingNumber';
import type { HighlightSemantic } from './runtimeInteractionView';
import { cn } from '../../lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────




export interface CharacterCardProps {
  charId: string;
  char: CharacterState;
  cardW: number;
  cardH: number;
  tokenBarH: number;
  nameFs: number;
  tokenFs: number;
  playedCards: PlayedCard[];
  isFocused: boolean;
  isDragging: boolean;
  isMastermind: boolean;
  isCardPlayMode: boolean;
  onClickCard: (e: React.MouseEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onViewChar: (charId: string) => void;
  onKillChar: (charId: string) => void;
  onModifyToken: (charId: string, token: string, delta: number) => void;
  onModifyExCard?: (charId: string, delta: number) => void;
  flyingCardIds?: Set<string>;
  highlightSemantic?: HighlightSemantic;
  isGhosted?: boolean;
  phase?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export const CharacterCard: React.FC<CharacterCardProps> = ({
  charId, char, cardW, cardH, tokenBarH, nameFs, tokenFs,
  playedCards, isFocused, isDragging, isMastermind, isCardPlayMode,
  onClickCard, onPointerDown, onPointerUp, onPointerLeave,
  onViewChar, onKillChar, onModifyToken, onModifyExCard, flyingCardIds,
  highlightSemantic = 'none',
  isGhosted = false,
}) => {
  const charDef = CHARACTERS[charId];
  const uneaseLimit = charDef?.uneaseLimit ?? '?';
  const charPlayedCards = playedCards.filter(c => c.targetType === 'character' && c.targetId === charId);
  const { setNodeRef, isOver } = useDroppable({
    id: `character:${charId}`,
    disabled: !isCardPlayMode || !char.alive,
  });

  // ── Floating animations & Death state ──
  const [floatingNums, setFloatingNums] = useState<Array<{ id: string, type: FloatingNumberType, value: number | string, delay: number }>>([]);
  const [recentlyDead, setRecentlyDead] = useState(false);
  
  const prevTokensRef = useRef(char.tokens);
  const prevExRef = useRef(char.exCardCount);
  const prevAliveRef = useRef(char.alive);

  useEffect(() => {
    const newFloats: typeof floatingNums = [];
    let delayCounter = 0;

    const addFloat = (type: FloatingNumberType, val: number | string) => {
      newFloats.push({ id: Math.random().toString(), type, value: val, delay: delayCounter * 300 });
      delayCounter++;
    };

    if (char.tokens && prevTokensRef.current) {
      if ((char.tokens.paranoia ?? 0) !== (prevTokensRef.current.paranoia ?? 0)) {
        addFloat('paranoia', (char.tokens.paranoia ?? 0) - (prevTokensRef.current.paranoia ?? 0));
      }
      if ((char.tokens.goodwill ?? 0) !== (prevTokensRef.current.goodwill ?? 0)) {
        addFloat('goodwill', (char.tokens.goodwill ?? 0) - (prevTokensRef.current.goodwill ?? 0));
      }
      if ((char.tokens.intrigue ?? 0) !== (prevTokensRef.current.intrigue ?? 0)) {
        addFloat('intrigue', (char.tokens.intrigue ?? 0) - (prevTokensRef.current.intrigue ?? 0));
      }
    }
    if ((char.exCardCount ?? 0) !== (prevExRef.current ?? 0) && typeof prevExRef.current !== 'undefined') {
      addFloat('ex', (char.exCardCount ?? 0) - (prevExRef.current ?? 0));
    }
    if (char.alive === false && prevAliveRef.current === true) {
      addFloat('death', 'DEAD');
      setRecentlyDead(true);
      setTimeout(() => setRecentlyDead(false), 2000);
    }

    if (newFloats.length > 0) {
      setFloatingNums(prev => [...prev, ...newFloats]);
    }

    prevTokensRef.current = char.tokens;
    prevExRef.current = char.exCardCount;
    prevAliveRef.current = char.alive;
  }, [char.tokens, char.exCardCount, char.alive]);

  const removeFloat = (id: string) => {
    setFloatingNums(prev => prev.filter(f => f.id !== id));
  };

  // ── Border state from semantic highlight (computed by Board) ──
  const isGoodwillReady = highlightSemantic === 'goodwill-ready';

  const HIGHLIGHT_BORDER_MAP: Record<HighlightSemantic, string> = {
    'dead': `grayscale border-blood-900/80 shadow-[inset_0_0_20px_rgba(220,38,38,0.5)] ${recentlyDead ? 'opacity-30 scale-95 duration-[2000ms] border-4 animate-pulse' : 'opacity-50 shadow-none hover:opacity-80'}`,
    'paranoia-critical': 'border-purple-500 shadow-glow-purple animate-pulse',
    'paranoia-warning': 'border-blue-400 shadow-glow-blue',
    'goodwill-ready': 'border-pink-400 shadow-glow-pink',
    'legal-target': 'border-gold-400 shadow-glow-gold ring-2 ring-gold-400/60 animate-pulse cursor-crosshair',
    'recently-changed': 'border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.4)] animate-[pulse_0.6s_ease-in-out_2]',
    'none': 'border-slate-600/50 shadow-[0_8px_16px_rgba(0,0,0,0.6)] group-hover/char:border-loop-400/80 group-hover/char:shadow-glow-cyan group-hover/char:-translate-y-1',
  };

  const borderState = HIGHLIGHT_BORDER_MAP[highlightSemantic] || HIGHLIGHT_BORDER_MAP['none'];
  const TokenCell = ({
    value,
    toneClass,
    hoverClass,
    onIncrement,
    onDecrement,
    extraClass = '',
    suffix,
  }: {
    value: React.ReactNode;
    toneClass: string;
    hoverClass: string;
    onIncrement: () => void;
    onDecrement: () => void;
    extraClass?: string;
    suffix?: React.ReactNode;
  }) => {
    const sharedClass = `flex-1 flex items-center justify-center bg-obsidian-800 ${extraClass}`;
    const textClass = `font-black font-sans ${toneClass}`;

    if (!isMastermind) {
      return (
        <div className={sharedClass}>
          <span className={textClass} style={{ fontSize: tokenFs }}>
            {value}
            {suffix}
          </span>
        </div>
      );
    }

    return (
      <button
        onClick={(e) => { e.stopPropagation(); onIncrement(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onDecrement(); }}
        className={`${sharedClass} ${hoverClass} transition-colors group/token`}
      >
        <span className={`${textClass} group-hover/token:text-white`} style={{ fontSize: tokenFs }}>
          {value}
          {suffix}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={setNodeRef}
      data-char-id={charId}
      className={cn(
        'relative group/char transition-all',
        isCardPlayMode ? 'cursor-crosshair' : '',
        isFocused ? 'z-[100]' : 'z-30 hover:z-40',
        isDragging ? 'opacity-50 scale-95' : '',
        isGhosted ? 'opacity-0 pointer-events-none' : '',
        isOver && isCardPlayMode ? 'scale-[1.03]' : '',
      )}
      onClick={onClickCard}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {/* Falling hearts particle effect */}
      {isGoodwillReady && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 rounded-lg">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="absolute text-[10px] animate-heartfall opacity-80"
              style={{
                left: `${20 + i * 30}%`,
                animationDelay: `${i * 1.2}s`,
              }}
            >💗</span>
          ))}
        </div>
      )}

      {/* Ex Card Badge */}
      {(isMastermind || (char.exCardCount ?? 0) > 0) && (
        <div className="absolute top-1 left-1 z-50">
          {isMastermind ? (
            <button
              onClick={(e) => { e.stopPropagation(); onModifyExCard?.(charId, 1); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onModifyExCard?.(charId, -1); }}
              className={`px-1.5 py-0.5 rounded border flex items-center gap-0.5 transition-all cursor-pointer ${
                (char.exCardCount ?? 0) > 0
                  ? 'bg-emerald-600/90 border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.7)] hover:bg-emerald-500/90'
                  : 'bg-obsidian-800/80 border-slate-600/40 hover:border-emerald-500/60 hover:bg-emerald-900/40 opacity-60 hover:opacity-100'
              }`}
              title="左键 +1 Ex牌 / 右键 -1 Ex牌"
            >
              <span className="text-[9px] font-black text-white tracking-wider">Ex</span>
              {(char.exCardCount ?? 0) > 0 && (
                <span className="text-[9px] font-bold text-emerald-200">×{char.exCardCount}</span>
              )}
            </button>
          ) : (char.exCardCount ?? 0) > 0 ? (
            <div className="px-1.5 py-0.5 rounded bg-emerald-600/90 border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.7)] flex items-center gap-0.5 pointer-events-none">
              <span className="text-[9px] font-black text-white tracking-wider">Ex</span>
              {(char.exCardCount ?? 0) > 1 && (
                <span className="text-[9px] font-bold text-emerald-200">×{char.exCardCount}</span>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Floating Numbers overlay */}
      {floatingNums.map(f => (
        <FloatingNumber key={f.id} id={f.id} type={f.type} value={f.value} delay={f.delay} onComplete={removeFloat} />
      ))}

      {/* Token Card */}
      <div
        className={cn(
          'relative bg-obsidian-800 rounded-lg flex flex-col items-center justify-between border transition-all',
          recentlyDead ? 'duration-[2000ms]' : 'duration-300',
          borderState,
          isOver && isCardPlayMode ? 'ring-2 ring-gold-300/80 shadow-[0_0_30px_rgba(251,191,36,0.45)] border-gold-300' : '',
        )}
        style={{ width: cardW, height: cardH }}
      >
        <img
          src={getCharImageSrc(charId)}
          alt={charId}
          className="absolute inset-x-0 top-0 w-full object-cover object-top opacity-90 rounded-t-[7px] pointer-events-none mix-blend-lighten"
          style={{ height: `calc(100% - ${tokenBarH}px)` }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {/* Dark overlay behind text */}
        <div className="absolute inset-x-0 h-[40px] bg-gradient-to-t from-obsidian-900/90 to-transparent pointer-events-none z-0" style={{ bottom: tokenBarH }}></div>

        {/* Name Label */}
        <div className="absolute inset-x-0 w-full pt-1 pb-1 text-center z-10 border-t border-white/5" style={{ bottom: tokenBarH }}>
          <span className="font-bold font-serif text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,1)] tracking-widest block" style={{ fontSize: nameFs }}>
            {getCharLabel(charId)}
          </span>
        </div>

        {/* Played card indicators */}
        <div className="absolute inset-x-0 bottom-[44px] flex items-end justify-center pointer-events-none z-50">
          {charPlayedCards.length > 0 && (
            <div className="relative w-10 h-14 transition-transform group-hover/char:-translate-y-2 group-hover/char:scale-110">
              {charPlayedCards.map((c, idx) => {
                const isMastermindCard = c.owner === 'mastermind';
                const offsetClass = isMastermindCard ? 'rotate-[-8deg] -translate-x-[8px] translate-y-[2px]' : 'rotate-[8deg] translate-x-[8px]';
                return (
                  <div
                    key={c.id}
                    className={`absolute inset-0 bg-obsidian-900 border-[1.5px] border-slate-300/80 rounded shadow-[0_4px_10px_rgba(0,0,0,0.8)] bg-cover bg-center origin-bottom transform transition-all ${offsetClass} ${flyingCardIds?.has(c.id) ? 'opacity-0' : ''}`}
                    data-played-card-id={c.id}
                    style={{
                      backgroundImage: `url('${getPlayedCardRenderUrl(c)}')`,
                      zIndex: 50 + idx
                    }}
                  ></div>
                );
              })}
              <div className="absolute -top-1.5 -right-3.5 bg-blood-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-obsidian-900 shadow-glow-red z-[60]">
                {charPlayedCards.length}
              </div>
            </div>
          )}
        </div>

        {/* Token Counters — Paranoia shows current/threshold */}
        <div className="relative w-full flex z-20 mt-auto bg-obsidian-900 border-t border-slate-700/50 rounded-b-[7px] overflow-hidden" style={{ height: tokenBarH }}>
          {/* Paranoia (不安) */}
          <TokenCell
            value={char.tokens?.paranoia ?? 0}
            suffix={<span className="text-purple-500/60" style={{ fontSize: tokenFs - 3 }}>/{uneaseLimit}</span>}
            toneClass={`drop-shadow-[0_0_5px_rgba(168,85,247,0.8)] ${(char.tokens?.paranoia ?? 0) >= uneaseLimit ? 'text-red-300 animate-pulse' : 'text-purple-300'}`}
            hoverClass="hover:bg-purple-900/60 border-r border-slate-700/50"
            extraClass={`${(char.tokens?.paranoia ?? 0) >= uneaseLimit ? 'bg-purple-900/40' : ''} border-r border-slate-700/50`}
            onIncrement={() => onModifyToken(charId, 'paranoia', 1)}
            onDecrement={() => onModifyToken(charId, 'paranoia', -1)}
          />
          {/* Goodwill (友好) */}
          <TokenCell
            value={char.tokens?.goodwill ?? 0}
            toneClass="text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.8)]"
            hoverClass="hover:bg-rose-900/60 border-r border-slate-700/50"
            extraClass="border-r border-slate-700/50"
            onIncrement={() => onModifyToken(charId, 'goodwill', 1)}
            onDecrement={() => onModifyToken(charId, 'goodwill', -1)}
          />
          {/* Intrigue (密谋) */}
          <TokenCell
            value={char.tokens?.intrigue ?? 0}
            toneClass="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"
            hoverClass="hover:bg-yellow-900/60"
            onIncrement={() => onModifyToken(charId, 'intrigue', 1)}
            onDecrement={() => onModifyToken(charId, 'intrigue', -1)}
          />
        </div>
      </div>

      {/* ── Focused Action Buttons ── */}
      {!isCardPlayMode && isFocused && (
        <div className="absolute inset-0 pointer-events-none animate-in fade-in zoom-in duration-200">
          {/* View Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onViewChar(charId); }}
            className="pointer-events-auto absolute -right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 border-2 border-blue-300/50 shadow-[0_0_15px_rgba(37,99,235,0.8)] flex items-center justify-center text-white text-sm hover:scale-110 z-50 transition-all"
            title="查看大图"
          >🔍</button>

          {/* Kill/Revive Button */}
          {isMastermind && (
            <button
              onClick={(e) => { e.stopPropagation(); onKillChar(charId); }}
              className={`pointer-events-auto absolute -top-4 -right-4 w-8 h-8 rounded-full border-2 shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center text-sm hover:scale-110 z-50 transition-all ${char.alive ? 'bg-red-700 hover:bg-red-600 border-red-400/50 text-white' : 'bg-green-700 hover:bg-green-600 border-green-400/50 text-white'}`}
              title={char.alive ? '杀死' : '复活'}
            >{char.alive ? '💀' : '💚'}</button>
          )}

          {/* Move hint */}
          {isMastermind && (
            <div className="pointer-events-none absolute -top-3 -left-3 z-50">
              <div className="w-7 h-7 rounded-full bg-emerald-700/80 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center text-white text-[10px]" title="长按拖拽移动">
                🚶
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
