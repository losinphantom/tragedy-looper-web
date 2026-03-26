import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { getCardBackUrl, getPlayedCardRenderUrl, LOCATION_LABELS_MAP } from './boardHelpers';
import { CharacterCard } from './CharacterCard';
import type { PlayedCard, CharacterState } from '@tragedy/game-logic';
import type { HighlightSemantic } from './runtimeInteractionView';
import { cn } from '../../lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LocationPanelProps {
  locId: string;
  locNameCn: string;
  playmatImage: string;
  characters: Record<string, CharacterState>;
  locationIntrigue: number;
  playedCards: PlayedCard[];
  focusCharId: string | null;
  draggingCharId: string | null;
  isMastermind: boolean;
  isCardPlayMode: boolean; // canPlayCards && selectedHandCard !== null
  playerID: string | null;
  phase: string;
  onClickLocation: () => void;
  onClickCharacter: (charId: string) => void;
  onFocusChar: (charId: string | null) => void;
  onViewChar: (charId: string) => void;
  onKillChar: (charId: string) => void;
  onModifyToken: (charId: string, token: string, delta: number) => void;
  onModifyExCard?: (charId: string, delta: number) => void;
  onModifyLocationToken: (locId: string, token: string, delta: number) => void;
  onLongPressStart: (charId: string) => void;
  onLongPressEnd: () => void;
  onDropOnLocation: (locId: string) => void;
  onRecallCard: (playedCardId: string) => void;
  onPreviewCard: (cardTemplateId: string) => void;
  flyingCardIds?: Set<string>;
  highlightSemantic?: HighlightSemantic;
  characterHighlights?: Record<string, HighlightSemantic>;
  hiddenCharacterId?: string | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export const LocationPanel: React.FC<LocationPanelProps> = ({
  locId, locNameCn, playmatImage,
  characters, locationIntrigue, playedCards,
  focusCharId, draggingCharId, isMastermind, isCardPlayMode,
  playerID, phase,
  onClickLocation, onClickCharacter, onFocusChar,
  onViewChar, onKillChar,
  onModifyToken, onModifyExCard, onModifyLocationToken,
  onLongPressStart, onLongPressEnd, onDropOnLocation,
  onRecallCard, onPreviewCard, flyingCardIds,
  highlightSemantic = 'none', characterHighlights = {},
  hiddenCharacterId = null,
}) => {
  const charsInLoc = Object.entries(characters).filter(([_, c]) => c.locationId === locId);
  const n = charsInLoc.length;
  const { setNodeRef, isOver } = useDroppable({
    id: `location:${locId}`,
    disabled: !isCardPlayMode,
  });

  // Responsive detection for card sizes (matching Tailwind's 2xl breakpoint)
  const [isLargeScreen, setIsLargeScreen] = React.useState(window.innerWidth >= 1536);

  React.useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1536);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamic sizing base values
  // Large screen: original big sizes
  // Small screen: slightly smaller sizes for better spacing on 1080p/1440p
  const baseW = isLargeScreen ? { s: 140, m: 120, l: 96 } : { s: 120, m: 100, l: 86 };
  const baseH = isLargeScreen ? { s: 203, m: 174, l: 139 } : { s: 174, m: 145, l: 124 };
  const baseT = isLargeScreen ? { s: 30, m: 28, l: 24 } : { s: 28, m: 24, l: 20 };
  const nameF = isLargeScreen ? { s: 13, m: 13, l: 12 } : { s: 12, m: 12, l: 11 };
  const tokenF = isLargeScreen ? { s: 14, m: 13, l: 12 } : { s: 13, m: 12, l: 11 };

  const cardW = n <= 3 ? baseW.s : n <= 5 ? baseW.m : baseW.l;
  const cardH = n <= 3 ? baseH.s : n <= 5 ? baseH.m : baseH.l;
  const tokenBarH = n <= 3 ? baseT.s : n <= 5 ? baseT.m : baseT.l;
  const nameFs = n <= 3 ? nameF.s : nameF.l;
  const tokenFs = n <= 3 ? tokenF.s : n <= 5 ? tokenF.m : tokenF.l;

  return (
    <div
      ref={setNodeRef}
      data-loc-id={locId}
      className={cn(
        'relative h-full group transition-all duration-300 rounded-lg overflow-hidden border',
        isOver && isCardPlayMode
          ? 'border-gold-300 ring-2 ring-inset ring-gold-300 shadow-[0_0_30px_rgba(251,191,36,0.45)] z-20 cursor-crosshair brightness-110'
          : highlightSemantic === 'legal-target'
            ? 'border-gold-400/80 ring-2 ring-inset ring-gold-400 shadow-glow-gold z-10 cursor-crosshair'
            : highlightSemantic === 'recently-changed'
              ? 'border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.3)] z-10'
              : isCardPlayMode
                ? 'border-loop-400/50 ring-2 ring-inset ring-loop-400 shadow-glow-cyan z-10 hover:brightness-125 cursor-crosshair'
                : 'border-white/5 z-0 hover:border-white/10',
      )}
      onClick={onClickLocation}
    >
      {/* Background Art */}
      <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none mix-blend-screen" style={{ backgroundImage: `url(${playmatImage})` }} />
      <div className="absolute inset-0 bg-scanlines mix-blend-overlay opacity-30 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian-900/90 via-obsidian-800/60 to-obsidian-900/95 pointer-events-none"></div>

      <div className="relative z-10 p-2 2xl:p-5 h-full flex flex-col pointer-events-none">
        {/* Subtle location aurora light */}
        <div className={`absolute -inset-20 opacity-30 blur-[80px] rounded-full mix-blend-screen transition-opacity duration-700 group-hover:opacity-50 ${
          locId === 'hospital' ? 'bg-loop-600/30' : locId === 'shrine' ? 'bg-purple-600/30' : locId === 'city' ? 'bg-gold-600/30' : 'bg-emerald-600/30'
        }`} />

        {/* Location Header */}
        <div className="flex justify-between items-start mb-2 2xl:mb-6 relative z-20 pointer-events-auto border-b border-white/10 pb-1 2xl:pb-2">
          <h2 className="text-base 2xl:text-xl font-black font-serif text-slate-200 flex items-center gap-1.5 2xl:gap-2 tracking-widest drop-shadow-md">
            <span className={`w-1.5 h-6 rounded-full ${
              locId === 'hospital' ? 'bg-loop-500 shadow-glow-cyan' : locId === 'shrine' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : locId === 'city' ? 'bg-gold-500 shadow-glow-gold' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
            }`}></span>
            {locNameCn}
          </h2>
          {isMastermind ? (
            <button
              onClick={(e) => { e.stopPropagation(); onModifyLocationToken(locId, 'intrigue', 1); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onModifyLocationToken(locId, 'intrigue', -1); }}
              className="flex items-center gap-1.5 bg-obsidian-900/80 hover:bg-blood-900/60 border border-blood-700/40 text-blood-100 px-2.5 py-1.5 rounded-md transition-all shadow-md backdrop-blur-sm group/intrigue"
            >
              <span className="text-[10px] text-blood-400/80 font-bold uppercase tracking-widest leading-none group-hover/intrigue:text-blood-300">密谋</span>
              <span className="text-lg font-black leading-none text-blood-400 drop-shadow-[0_0_5px_rgba(225,29,72,0.8)] group-hover/intrigue:text-white group-hover/intrigue:drop-shadow-[0_0_8px_rgba(225,29,72,1)]">{locationIntrigue}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-obsidian-900/80 border border-blood-700/25 text-blood-100 px-2.5 py-1.5 rounded-md shadow-md backdrop-blur-sm">
              <span className="text-[10px] text-blood-400/80 font-bold uppercase tracking-widest leading-none">密谋</span>
              <span className="text-lg font-black leading-none text-blood-400 drop-shadow-[0_0_5px_rgba(225,29,72,0.8)]">{locationIntrigue}</span>
            </div>
          )}
        </div>

        {/* Character Cards */}
        <div className="relative z-30 pointer-events-auto mt-1 2xl:mt-2 flex flex-wrap gap-1.5 2xl:gap-3">
          {charsInLoc.map(([charId, char]) => (
            <CharacterCard
              key={charId}
              charId={charId}
              char={char}
              cardW={cardW}
              cardH={cardH}
              tokenBarH={tokenBarH}
              nameFs={nameFs}
              tokenFs={tokenFs}
              playedCards={playedCards}
              isFocused={focusCharId === charId}
              isDragging={draggingCharId === charId}
              isMastermind={isMastermind}
              isCardPlayMode={isCardPlayMode}
              onClickCard={(e) => {
                e.stopPropagation();
                if (draggingCharId) return;
                if (isCardPlayMode) {
                  onClickCharacter(charId);
                } else {
                  onFocusChar(focusCharId === charId ? null : charId);
                }
              }}
              onPointerDown={(e) => { e.stopPropagation(); onLongPressStart(charId); }}
              onPointerUp={onLongPressEnd}
              onPointerLeave={onLongPressEnd}
              onViewChar={onViewChar}
              onKillChar={onKillChar}
              onModifyToken={onModifyToken}
              onModifyExCard={onModifyExCard}
              flyingCardIds={flyingCardIds}
              highlightSemantic={characterHighlights[charId] ?? 'none'}
              isGhosted={hiddenCharacterId === charId}
              phase={phase}
            />
          ))}

          {/* Drag drop-zone overlay */}
          {draggingCharId && characters[draggingCharId]?.locationId !== locId && (
            <button
              onClick={() => onDropOnLocation(locId)}
              className="absolute inset-0 z-[200] bg-emerald-500/20 border-2 border-dashed border-emerald-400 rounded-xl flex items-center justify-center backdrop-blur-[1px] animate-pulse cursor-pointer hover:bg-emerald-500/30 transition-colors"
            >
              <span className="text-emerald-300 font-black text-lg tracking-widest drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                ⬇ 移动到{LOCATION_LABELS_MAP[locId]}
              </span>
            </button>
          )}
        </div>

        {/* Location played cards */}
        <div className="absolute bottom-4 right-4 flex pointer-events-auto z-50">
          {playedCards.filter(c => c.targetType === 'location' && c.targetId === locId).map((c, i) => {
            const isMastermindCard = c.owner === 'mastermind';
            const offsetClass = isMastermindCard ? 'rotate-[-8deg] -translate-x-[4px] translate-y-[2px]' : 'rotate-[8deg] translate-x-[4px]';
            const isMyCard = playerID != null && c.playedBySeat === playerID;
            const canRecall = isMyCard && !c.faceUp && (phase === 'mastermind_plan' || phase === 'protagonist_plan');
            return (
              <div
                key={c.id}
                data-played-card-id={c.id}
                className={`group w-12 h-16 origin-bottom transform transition-all ${offsetClass} ${canRecall ? 'cursor-pointer hover:scale-110' : c.faceUp ? 'cursor-pointer' : 'cursor-default'} ${flyingCardIds?.has(c.id) ? 'opacity-0' : ''}`}
                style={{
                  marginLeft: i > 0 ? '-24px' : '0',
                  zIndex: 50 + i
                }}
                onClick={(e) => { e.stopPropagation(); if (c.faceUp) onPreviewCard(c.cardTemplateId); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (canRecall) onRecallCard(c.id); }}
                title={canRecall ? '右键撤回' : c.faceUp ? '点击查看大图' : ''}
              >
                <div 
                  className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] shadow-[0_4px_10px_rgba(0,0,0,0.8)] rounded border-[1.5px] border-slate-300/80 bg-obsidian-900 ${canRecall ? 'group-hover:ring-2 group-hover:ring-blood-400' : c.faceUp ? 'group-hover:ring-1 group-hover:ring-white/30' : ''}`}
                  style={{ transform: c.faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  <div className="absolute inset-0 bg-cover bg-center rounded [backface-visibility:hidden]" style={{ backgroundImage: `url('${getCardBackUrl(c.playedBySeat)}')` }} />
                  <div className="absolute inset-0 bg-cover bg-center rounded [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ backgroundImage: `url('${getPlayedCardRenderUrl(c)}')` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
