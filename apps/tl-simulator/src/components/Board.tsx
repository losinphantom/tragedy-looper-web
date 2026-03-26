import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { SERVER_URL } from '../config';
import type { BoardProps } from 'boardgame.io/react';
import type { TragedyGameState } from '../game/game';
import { getCardImageUrl } from './board/boardHelpers';
import { ReferenceSheetModal } from './ReferenceSheetModal';
import { ScriptSelectorScreen } from './ScriptSelectorScreen';
import { LobbyWaitScreen } from './LobbyWaitScreen';
import { TimeDials, PhaseFlowGraphic } from './GraphicalTrackers';
import { PHASE_LABELS, PHASE_HINTS, getCharImageSrc, getCharLabel, CHARACTERS } from './board/boardHelpers';
import { LocationPanel } from './board/LocationPanel';
import { InfoSidebar } from './board/InfoSidebar';
import { HandArea } from './board/HandArea';
// GoodwillPanel, IncidentPanel, ButterflyChoiceModal removed — now rendered inside InfoSidebar public tab
import { getBoardInteractionState, getBoardHighlights, getLegalTargetsFromInteractionState, getModuleSurfaceViewModel } from './board/runtimeInteractionView';
import type { CharacterHighlightInfo } from './board/runtimeInteractionView';
import { AnimationProvider, useAnimation } from './animations/AnimationContext';
import { FlyingCardLayer } from './animations/FlyingCard';
import type { FlyingCardData } from './animations/FlyingCard';
import { MovementAnimationLayer } from './animations/MovementAnimationLayer';
import { ResolutionOverlay } from './animations/ResolutionOverlay';
import { MastermindConsole } from './board/MastermindConsole';
import { FinalGuessOverlay } from './board/FinalGuessOverlay';
import { PhaseTransitionBanner } from './board/PhaseTransitionBanner';

type LeaderModeDialogStateInput = {
  phase: string;
  leaderMode: boolean;
  leaderSeatId: string | null;
  leaderTurnOrder: string[];
  leaderTurnIndex: number;
  goodwillInteractionPhase: string;
  viewerSeatId: string | null;
};

export function shouldShowDaySummaryPanel(): boolean {
  return false;
}

export function shouldResetFlyingCardsForPhase(phase: string): boolean {
  return phase !== 'mastermind_plan' && phase !== 'protagonist_plan';
}

export function getLeaderModeDialogState(input: LeaderModeDialogStateInput): { stepKey: string; title: string } | null {
  if (!input.leaderMode || !input.viewerSeatId) return null;

  const currentTurnSeatId = input.leaderTurnOrder[input.leaderTurnIndex] || null;
  if (input.phase === 'protagonist_plan' && currentTurnSeatId === input.viewerSeatId) {
    return {
      stepKey: `protagonist_plan:${input.leaderSeatId || ''}:${input.viewerSeatId}:${input.leaderTurnIndex}`,
      title: '轮到你出牌',
    };
  }

  if (
    input.phase === 'goodwill_window'
    && input.goodwillInteractionPhase === 'leader_choosing'
    && input.viewerSeatId === input.leaderSeatId
  ) {
    return {
      stepKey: `goodwill_window:${input.leaderSeatId || ''}:${input.viewerSeatId}`,
      title: '轮到你选择友好能力',
    };
  }

  return null;
}

// ── Inner Board ──────────────────────────────────────────────────────────────

const InnerBoard: React.FC<BoardProps<TragedyGameState>> = ({ G: _realG, ctx, moves, playerID, matchID }) => {
  const { displayedG, isAnimating: _isAnimating } = useAnimation();
  const G = displayedG as TragedyGameState;
  const viewerSeatId = playerID ?? null;
  const isSpectator = viewerSeatId === null;

  const [selectedHandCard, setSelectedHandCard] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'log' | 'public' | 'secret'>('public');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [focusCharId, setFocusCharId] = useState<string | null>(null);
  const [showReferenceSheet, setShowReferenceSheet] = useState(false);
  const [referenceSheetDrawingData, setReferenceSheetDrawingData] = useState<string | null>(null);
  const [showMastermindConsole, setShowMastermindConsole] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState<{ id: number; name?: string; isConnected?: boolean }[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Drag-to-Move State ──
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingCardData[]>([]);
  const pendingFlightRef = useRef<{ rect: DOMRect, templateId: string } | null>(null);
  const prevPlayedCardsLenRef = useRef(G.v1.playedCards?.length || 0);

  // ── Derived state ──
  const isMastermind = viewerSeatId === '0';
  const handSeatId = viewerSeatId;
  const myHand = handSeatId ? (G.seatHands[handSeatId] || []) : [];

  const phaseName = PHASE_LABELS[ctx.phase || ''] || ctx.phase || '';
  const phaseHint = PHASE_HINTS[ctx.phase || ''] || '';

  const canPlayCards = (isMastermind && ctx.phase === 'mastermind_plan') ||
                       (!isMastermind && ctx.phase === 'protagonist_plan');

  const myPlayedCount = G.v1.playedCards.filter(
    c => c.playedBySeat === playerID
  ).length;

  // 动态出牌上限：按 playerCount 和队长身份派生
  const playerCount = G.v1.settings?.playerCount ?? 4;
  const maxCards = isMastermind ? 3
    : playerCount === 2 ? 3                                     // 2人: 唯一主角出 3 张
    : playerCount === 3 ? (playerID === G.v1.leader ? 2 : 0)    // 3人: 队长 2 张/非队长 0
    : 1;                                                         // 4人: 各出 1 张
  const cardsRemaining = Math.max(0, maxCards - myPlayedCount);
  const interactionState = getBoardInteractionState(ctx.phase || '', {
    pendingInteractions: G.v1.pendingInteractions || [],
    activeInteractionId: G.v1.activeInteractionId || null,
  });
  const isManualPhase = interactionState.isManualPhase;
  const hasBlockingRuntimeInteraction = (G.v1.pendingInteractions || []).some(
    (interaction) => interaction.blocking && interaction.kind !== 'time_spiral_discussion',
  );
  const pendingAbilities = G.v1.pendingAbilities || [];
  const hasPendingAbilitiesForPhase = pendingAbilities.length > 0 || interactionState.abilityPanel.entries.length > 0;
  const hasMandatoryPendingAbilities = pendingAbilities.some((ability) => ability.mandatory)
    || interactionState.abilityPanel.entries.some((entry) => entry.mandatory);
  const currentTurnSeatId = G.v1.leaderTurnOrder?.[G.v1.leaderTurnIndex || 0] || null;
  const moduleSurface = getModuleSurfaceViewModel({
    phase: ctx.phase || '',
    playerID: playerID ?? null,
    isMastermind,
    scriptOpen: G.scriptOpen,
    v1: G.v1 as any,
  });

  // ── Board-wide highlight computation (single source of truth) ──
  const isCardPlayMode = canPlayCards && selectedHandCard !== null;
  const prevCharsRef = useRef(G.v1.characters);
  const prevLocsRef = useRef(G.v1.locations);
  const [recentCharChanges, setRecentCharChanges] = useState<Set<string>>(new Set());
  const [recentLocChanges, setRecentLocChanges] = useState<Set<string>>(new Set());

  useEffect(() => {
    const changedChars = new Set<string>();
    const changedLocs = new Set<string>();

    for (const [id, ch] of Object.entries(G.v1.characters)) {
      const prev = prevCharsRef.current[id];
      if (!prev) continue;
      if (ch.tokens?.paranoia !== prev.tokens?.paranoia ||
          ch.tokens?.goodwill !== prev.tokens?.goodwill ||
          ch.tokens?.intrigue !== prev.tokens?.intrigue ||
          ch.exCardCount !== prev.exCardCount ||
          ch.alive !== prev.alive) {
        changedChars.add(id);
      }
    }
    for (const [id, loc] of Object.entries(G.v1.locations)) {
      const prev = prevLocsRef.current[id];
      if (!prev) continue;
      if (loc.tokens?.intrigue !== prev.tokens?.intrigue) {
        changedLocs.add(id);
      }
    }

    if (changedChars.size > 0 || changedLocs.size > 0) {
      setRecentCharChanges(changedChars);
      setRecentLocChanges(changedLocs);
      const timer = setTimeout(() => {
        setRecentCharChanges(new Set());
        setRecentLocChanges(new Set());
      }, 1200);
      prevCharsRef.current = G.v1.characters;
      prevLocsRef.current = G.v1.locations;
      return () => clearTimeout(timer);
    }
    prevCharsRef.current = G.v1.characters;
    prevLocsRef.current = G.v1.locations;
  }, [G.v1.characters, G.v1.locations]);

  const charInfo: Record<string, CharacterHighlightInfo> = React.useMemo(() => {
    const info: Record<string, CharacterHighlightInfo> = {};
    for (const charId of Object.keys(G.v1.characters)) {
      const def = CHARACTERS[charId];
      info[charId] = {
        uneaseLimit: def?.uneaseLimit ?? Infinity as any,
        goodwillAbilities: def?.goodwillAbilities ?? [],
      };
    }
    return info;
  }, [G.v1.characters]);

  const legalTargets = React.useMemo(() => {
    if (!isCardPlayMode) {
      return getLegalTargetsFromInteractionState(interactionState, false);
    }

    const chars = new Set<string>();
    for (const [id, ch] of Object.entries(G.v1.characters)) {
      if (ch.alive) chars.add(id);
    }
    return {
      characters: chars,
      locations: new Set(Object.keys(G.v1.locations)),
    };
  }, [interactionState, isCardPlayMode, G.v1.characters, G.v1.locations]);

  const boardHighlights = React.useMemo(() => {
    return getBoardHighlights(
      G.v1.characters as any,
      G.v1.locations as any,
      charInfo,
      legalTargets,
      { characters: recentCharChanges, locations: recentLocChanges },
    );
  }, [G.v1.characters, G.v1.locations, charInfo, legalTargets, recentCharChanges, recentLocChanges]);

  // ── Effects ──
  useEffect(() => {
    if (!matchID) return;
    const fetchPlayers = async () => {
      try {
        const resp = await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}`);
        if (resp.ok) {
          const data = await resp.json();
          setRoomPlayers(
            data.players?.map((p: any) => ({
              id: p.id,
              name: p.name,
              isConnected: p.isConnected,
            })) || []
          );
        }
      } catch { /* ignore */ }
    };
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, [matchID]);

  useEffect(() => {
    if (ctx.phase !== 'lobby_wait') return;
    if (!playerID || playerID === '0') return;
    if (G.v1.joinedProtagonists?.[playerID]) return;
    moves.registerLobbySeat?.();
  }, [ctx.phase, playerID, G.v1.joinedProtagonists, moves]);

  useEffect(() => {
    if (activeTab === 'log') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [G.publicLog.length, activeTab]);

  useEffect(() => {
    if (!shouldResetFlyingCardsForPhase(ctx.phase || '')) return;
    pendingFlightRef.current = null;
    setFlyingCards([]);
  }, [ctx.phase]);

  useLayoutEffect(() => {
    const currLen = G.v1.playedCards.length;
    if (currLen > prevPlayedCardsLenRef.current) {
      const newCard = G.v1.playedCards[currLen - 1];
      
      if (viewerSeatId != null && newCard.playedBySeat === viewerSeatId && pendingFlightRef.current) {
        const flightData = pendingFlightRef.current;
        pendingFlightRef.current = null;

        // 同步在浏览器绘制前：查找目标 DOM → 读取坐标
        const targetEl = document.querySelector(`[data-played-card-id="${newCard.id}"]`) as HTMLElement;
        if (targetEl) {
          const toRect = targetEl.getBoundingClientRect();

          setFlyingCards(prev => [...prev, {
            id: newCard.id,
            cardTemplateId: flightData.templateId,
            playedBySeat: viewerSeatId,
            fromRect: { x: flightData.rect.x, y: flightData.rect.y, width: flightData.rect.width, height: flightData.rect.height },
            toRect: { x: toRect.x, y: toRect.y, width: toRect.width, height: toRect.height },
            targetCardId: newCard.id,
          }]);
        }
      }
    }
    prevPlayedCardsLenRef.current = currLen;
  }, [G.v1.playedCards, viewerSeatId]);

  // ── Handlers ──
  const handlePlayCard = (targetType: 'location' | 'character', targetId: string) => {
    if (selectedHandCard !== null && myHand && selectedHandCard < myHand.length) {
      if (!canPlayCards || cardsRemaining <= 0) return;

      const cardTemplateId = myHand[selectedHandCard];
      const handCardEl = document.querySelector(`[data-hand-idx="${selectedHandCard}"]`);
      
      if (handCardEl) {
        pendingFlightRef.current = {
          rect: handCardEl.getBoundingClientRect(),
          templateId: cardTemplateId
        };
      }

      moves.playCard(cardTemplateId, targetType, targetId);
      setSelectedHandCard(null);
    }
  };

  const handleFlyingCardComplete = (id: string) => {
    setFlyingCards(prev => prev.filter(fc => fc.id !== id));
  };

  const handleLongPressStart = (charId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setDraggingCharId(charId);
      setFocusCharId(null);
    }, 400);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDropOnLocation = (locId: string) => {
    if (draggingCharId) {
      moves.moveCharacter(draggingCharId, locId);
      setDraggingCharId(null);
    }
  };

  const closeRoom = async () => {
    if (!matchID) return;
    if (!confirm('确定要关闭并删除此房间吗？')) return;
    try {
      // First, leave properly via boardgame.io API
      const session = JSON.parse(localStorage.getItem('tl_session') || '{}');
      if (session.credentials && playerID) {
        await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerID, credentials: session.credentials }),
        });
      }
      // Then try to delete the match
      await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    localStorage.removeItem('tl_session');
    window.location.reload();
  };

  const leaveRoom = async () => {
    if (!matchID) return;
    try {
      const session = JSON.parse(localStorage.getItem('tl_session') || '{}');
      if (session.credentials && playerID) {
        await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerID, credentials: session.credentials }),
        });
      }
    } catch { /* ignore */ }
    localStorage.removeItem('tl_session');
    window.location.reload();
  };

  // ── Pre-game: script selection or lobby wait ──
  const hasScriptLoaded = G.v1 && Object.keys(G.v1.characters || {}).length > 0;

  if (ctx.phase === 'lobby_wait') {
    return (
        <LobbyWaitScreen
          playerID={playerID}
          readyPlayers={G.v1.readyPlayers}
          joinedProtagonists={G.v1.joinedProtagonists || {}}
          isMastermind={isMastermind}
        scriptOpen={G.scriptOpen}
        roomPlayers={roomPlayers}
        settings={G.v1.settings}
        characters={G.v1.characters || {}}
        onToggleReady={() => moves.toggleReady()}
        onStartGame={() => moves.startGame()}
        onUpdateSettings={(key: string, value: any) => {
          moves.updateSetting(key, value);
        }}
        onSetTerritory={(characterId: string, locationId: string) => {
          moves.setCharacterTerritory(characterId, locationId);
        }}
      />
    );
  }

  if (!hasScriptLoaded) {
    return (
      <div className="h-screen bg-obsidian-900 text-slate-100 font-sans flex flex-col overflow-hidden relative">
        <header className="flex justify-between items-center bg-obsidian-900/70 px-6 py-4 border-b border-white/5 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative z-40">
          <h1 className="text-2xl font-black font-serif tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blood-500 via-blood-400 to-gold-500">
            惨剧轮回 <span className="text-base opacity-60 font-sans text-slate-300 ml-2">TRAGEDY LOOPER</span>
          </h1>
          <div className="text-[11px] font-black tracking-widest uppercase">
            {isMastermind ? (
              <span className="text-blood-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]">■ 剧本家 (Mastermind)</span>
            ) : isSpectator ? (
              <span className="text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.45)]">■ 观战者 (Spectator)</span>
            ) : (
              <span className="text-loop-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">■ 主角 (Protagonist)</span>
            )}
          </div>
        </header>
        <ScriptSelectorScreen
          isMastermind={isMastermind}
          onSelectScript={(scriptId) => { moves.selectScript(scriptId); }}
        />
      </div>
    );
  }

  // ── Main game board ──
  return (
    <div className="h-screen bg-obsidian-900 text-slate-100 font-sans selection:bg-blood-500/30 flex flex-col overflow-hidden relative">
      <PhaseTransitionBanner phase={ctx.phase || 'idle'} />
      {/* ── 剧作家能力：主角等待提示条（剧作家侧已集成到右侧栏） ── */}
      {interactionState.abilityPanel.visible && !isMastermind && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] rounded-2xl border border-blood-800/30 bg-obsidian-900/95 px-8 py-4 shadow-[0_8px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blood-300 mb-1">剧作家能力处理中</div>
            <div className="text-[11px] text-slate-400">盘面保持可见，等待剧作家完成裁定。</div>
          </div>
        </div>
      )}
      {/* GoodwillPanel, IncidentPanel, ButterflyChoiceModal — now inside InfoSidebar public tab */}
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-obsidian-900 via-obsidian-800 to-obsidian-900"></div>
        <div className="absolute inset-0 bg-scanlines mix-blend-overlay opacity-20"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 120%, rgba(225,29,72,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(56,189,248,0.05) 0%, transparent 50%)' }}></div>
      </div>

      {/* ── Header ── */}
      <header className="flex justify-between items-center bg-obsidian-900/70 px-6 py-1 border-b border-white/5 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative z-40 min-h-[60px]">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blood-700/30 to-transparent"></div>
        <h1 className="text-2xl font-black font-serif tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blood-500 via-blood-400 to-gold-500 drop-shadow-lg whitespace-nowrap">
          惨剧轮回 <span className="text-base opacity-60 font-sans text-slate-300 ml-2 align-middle">TRAGEDY LOOPER</span>
        </h1>
        <PhaseFlowGraphic phase={ctx.phase || ''} phaseName={phaseName} phaseHint={phaseHint} />
        <div className="flex items-center gap-5">
          <div className="text-[11px] font-black tracking-widest uppercase">
            {isMastermind ? (
              <span className="text-blood-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]">■ 剧本家</span>
            ) : isSpectator ? (
              <span className="text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.45)]">■ 观战者</span>
            ) : (
              <span className="text-loop-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">■ 主角</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider">
            {matchID && <span className="text-slate-600 mr-1">#{matchID}</span>}
            {roomPlayers.map(p => {
              const sc: Record<number, [string, string, string, string]> = {
                0: ['bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]', 'border-yellow-700/50', 'text-yellow-400', 'bg-yellow-950/40'],
                1: ['bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.8)]', 'border-red-700/50', 'text-red-400', 'bg-red-950/40'],
                2: ['bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]', 'border-blue-700/50', 'text-blue-400', 'bg-blue-950/40'],
                3: ['bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.8)]', 'border-purple-700/50', 'text-purple-400', 'bg-purple-950/40'],
              };
              const [dot, border, text, bg] = sc[p.id] || sc[1]!;
              const off = !p.isConnected;
              return (
                <div key={p.id} className={`flex items-center gap-1 px-2 py-1 rounded-md border ${off ? 'border-slate-800 opacity-40' : border} ${bg}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${off ? 'bg-slate-700' : dot}`}></div>
                  <span className={off ? 'text-slate-700' : text}>{p.name || `P${p.id}`}</span>
                </div>
              );
            })}
          </div>
          {/* Mode indicator — clickable by mastermind */}
          <button
            onClick={() => { if (isMastermind) moves.updateSetting('autoResolve', !G.v1.settings.autoResolve); }}
            className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border transition-all ${
              G.v1.settings.autoResolve
                ? 'border-loop-700/50 text-loop-400 bg-loop-950/40 hover:bg-loop-900/60 shadow-[0_0_8px_rgba(56,189,248,0.15)]'
                : 'border-gold-700/50 text-gold-400 bg-gold-950/40 hover:bg-gold-900/60 shadow-[0_0_8px_rgba(234,179,8,0.15)]'
            } ${isMastermind ? 'cursor-pointer' : 'cursor-default'}`}
            title={isMastermind ? '点击切换模式' : G.v1.settings.autoResolve ? '结算模式' : '沙盒模式'}
          >
            {G.v1.settings.autoResolve ? '⚡ 结算' : '🏖️ 沙盒'}
          </button>
          {isMastermind && (
            <button
              onClick={() => setShowMastermindConsole(true)}
              className="text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border border-blood-800/60 text-blood-300 bg-blood-950/30 hover:bg-blood-900/50 transition-all"
              title="打开剧作家控制台"
            >
              控制台
            </button>
          )}
          <button onClick={leaveRoom} className="text-[10px] text-slate-600 hover:text-amber-400 transition-colors uppercase tracking-widest border border-slate-800 hover:border-amber-800 px-2 py-1 rounded" title="退出房间（不删除）">↩ 退出</button>
          <button onClick={closeRoom} className="text-[10px] text-slate-600 hover:text-blood-400 transition-colors uppercase tracking-widest border border-slate-800 hover:border-blood-800 px-2 py-1 rounded" title="关闭房间（删除）">✕</button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden relative z-10 w-full max-w-[1900px] mx-auto">

        {/* Left Sidebar (Time Dials) */}
        <aside className="w-[140px] lg:w-[180px] 2xl:w-[260px] p-2 lg:p-3 2xl:p-4 pr-0 flex flex-col shrink-0 z-20">
          <TimeDials
            day={G.day}
            daysPerLoop={G.daysPerLoop}
            loopIndex={G.loopIndex}
            maxLoops={G.maxLoops}
            exGauge={G.v1.ex?.gauge ?? 0}
            exEnabled={!!G.v1.ex?.enabled}
          />
        </aside>

        {/* Board Layout */}
        <main className="flex-1 min-w-0 flex flex-col p-4 relative z-0 hide-scrollbar overflow-hidden" onClick={() => setFocusCharId(null)}>
          <div className="grid grid-cols-2 grid-rows-2 gap-1 2xl:gap-2 flex-1 min-h-0 w-full mx-auto relative shadow-[0_10px_40px_rgba(0,0,0,0.8)] bg-obsidian-900 border border-slate-700/50 rounded-xl p-1 2xl:p-2 backdrop-blur-3xl">
            {['hospital', 'shrine', 'city', 'school'].map((locId, idx) => (
              <LocationPanel
                key={locId}
                locId={locId}
                locNameCn={locId === 'hospital' ? '医院' : locId === 'shrine' ? '神社' : locId === 'city' ? '都市' : '学校'}
                playmatImage={`/assets/牌垫/playmat_s1_p0${idx + 1}_i00${idx + 1}.png`}
                characters={G.v1.characters}
                locationIntrigue={G.v1.locations[locId]?.tokens?.intrigue || 0}
                playedCards={G.v1.playedCards}
                focusCharId={focusCharId}
                draggingCharId={draggingCharId}
                isMastermind={isMastermind}
                isCardPlayMode={canPlayCards && selectedHandCard !== null}
                onClickLocation={() => handlePlayCard('location', locId)}
                onClickCharacter={(charId) => handlePlayCard('character', charId)}
                onFocusChar={setFocusCharId}
                onViewChar={(charId) => { setSelectedCharId(charId); setFocusCharId(null); }}
                onKillChar={(charId) => moves.killCharacter(charId)}
                onModifyToken={(charId, token, delta) => moves.modifyToken(charId, token, delta)}
                onModifyExCard={(charId, delta) => moves.modifyExCard(charId, delta)}
                onModifyLocationToken={(locId, token, delta) => moves.modifyLocationToken(locId, token, delta)}
                onLongPressStart={handleLongPressStart}
                onLongPressEnd={handleLongPressEnd}
                onDropOnLocation={handleDropOnLocation}
                playerID={viewerSeatId}
                phase={ctx.phase || ''}
                onRecallCard={(cardId) => moves.recallCard(cardId)}
                onPreviewCard={(cardTemplateId) => setPreviewCardId(cardTemplateId)}
                flyingCardIds={new Set(flyingCards.map(fc => fc.targetCardId).filter((id): id is string => id != null))}
                highlightSemantic={boardHighlights.locations[locId]?.semantic ?? 'none'}
                characterHighlights={Object.fromEntries(
                  Object.entries(boardHighlights.characters)
                    .filter(([cid]) => G.v1.characters[cid]?.locationId === locId)
                    .map(([cid, h]) => [cid, h.semantic])
                )}
              />
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <InfoSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMastermind={isMastermind}
          isLeader={playerID === G.v1.leader}
          leaderMode={G.v1.settings?.leaderMode || false}
          currentTurnSeatId={currentTurnSeatId}
          viewerSeatId={viewerSeatId}
          phase={ctx.phase || ''}
          moduleSurface={moduleSurface}
          abilityPanel={interactionState.abilityPanel}
          abilityMoves={{
            confirmAbility: moves.confirmAbility,
            skipAbility: moves.skipAbility,
            finishAbilities: moves.finishAbilities,
          }}
          goodwillPanel={interactionState.goodwillPanel}
          incidentPanel={interactionState.incidentPanel}
          butterflyPanel={interactionState.butterflyChoicePanel}
          loopResultPanel={interactionState.loopResultPanel}
          interactionMoves={{
            declareAbility: moves.declareAbility,
            resolveAbility: moves.resolveAbility,
            confirmLoopResult: moves.confirmLoopResult,
            resolveIncident: moves.resolveIncident,
            chooseButterflyToken: moves.chooseButterflyToken,
          }}
          G={{
            scriptOpen: G.scriptOpen,
            scriptSecret: G.scriptSecret,
            day: G.day,
            daysPerLoop: G.daysPerLoop,
            v1: {
              scheduledIncidents: G.v1.scheduledIncidents,
              incidentHistory: G.v1.loopState?.incidentHistory,
              timeline: G.v1.timeline,
            },
          }}
          onShowReferenceSheet={() => setShowReferenceSheet(true)}
          onDeclareLoopLoss={() => moves.declareLoopLoss()}
          logEndRef={logEndRef as any}
        />
      </div>

      {/* Footer: Hand + Controls */}
      <HandArea
        myHand={myHand}
        selectedHandCard={selectedHandCard}
        setSelectedHandCard={setSelectedHandCard}
        canPlayCards={canPlayCards}
        cardsRemaining={cardsRemaining}
        maxCards={maxCards}
        myPlayedCount={myPlayedCount}
        isManualPhase={isManualPhase}
        isMastermind={isMastermind}

        phase={ctx.phase || ''}
        playerID={viewerSeatId}
        playedCards={G.v1.playedCards}
        readyPlayers={G.v1.readyPlayers}
        leaderMode={G.v1.settings?.leaderMode || false}
        leaderTurnOrder={G.v1.leaderTurnOrder || []}
        leaderTurnIndex={G.v1.leaderTurnIndex || 0}
        isLeader={viewerSeatId === G.v1.leader}
        goodwillInteractionPhase={interactionState.goodwillPanel.phase}
        hasLoopResultPanel={interactionState.loopResultPanel.visible}
        hasBlockingRuntimeInteraction={hasBlockingRuntimeInteraction}
        hasPendingAbilitiesForPhase={hasPendingAbilitiesForPhase}
        hasMandatoryPendingAbilities={hasMandatoryPendingAbilities}
        moves={{
          advancePhase: moves.advancePhase,
          finishAbilities: moves.finishAbilities,
          skipAllAbilities: moves.skipAllAbilities,
          recallCard: moves.recallCard,
          toggleReady: moves.toggleReady,
        }}
        onPreviewCard={(cardTemplateId) => setPreviewCardId(cardTemplateId)}
        onRecallCard={(playedCardId) => moves.recallCard(playedCardId)}
      />

      {/* Character Preview Overlay */}
      {selectedCharId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 backdrop-blur-sm cursor-pointer"
          onClick={() => setSelectedCharId(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="w-[420px] h-[600px] rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9),0_0_30px_rgba(100,100,255,0.15)] border-2 border-slate-400/60 bg-slate-950">
              <img
                src={getCharImageSrc(selectedCharId)}
                alt={selectedCharId}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md px-6 py-2 rounded-xl border border-slate-600/50 shadow-2xl whitespace-nowrap">
              <span className="text-lg font-black text-slate-100 tracking-widest">{getCharLabel(selectedCharId)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Module Reference Sheet */}
      {showReferenceSheet && (
        <ReferenceSheetModal
          setId={G.scriptOpen?.tragedySetId || 'first_steps'}
          onClose={() => setShowReferenceSheet(false)}
          initialCanvasData={referenceSheetDrawingData}
          onSaveCanvas={setReferenceSheetDrawingData}
        />
      )}

      {/* Card Preview Modal */}
      {previewCardId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setPreviewCardId(null)}
        >
          <div className="relative max-w-[400px] max-h-[90vh] transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <img
              src={getCardImageUrl(previewCardId)}
              alt={previewCardId}
              className="w-full h-auto rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.15)] border-2 border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
       )}

      {/* Flying Card Animation Layer */}
      <FlyingCardLayer flyingCards={flyingCards} onCardComplete={handleFlyingCardComplete} />

      {/* Board-space Movement Animation */}
      <MovementAnimationLayer />

      {/* Resolution Animation Overlay */}
      <ResolutionOverlay />

      {/* Final Guess Overlay */}
      {(ctx.phase === 'final_guess' || (ctx.phase === 'match_end' && G.v1.finalGuess)) && (
        <FinalGuessOverlay
          characters={G.v1.characters}
          tragedySetId={G.scriptOpen?.tragedySetId || ''}
          targets={G.v1.finalGuess?.targets || []}
          guesses={G.v1.finalGuess?.guesses || []}
          completed={G.v1.finalGuess?.completed || false}
          winner={G.v1.winner}
          isMastermind={isMastermind}
          onSubmitGuess={(charId, guess) => moves.submitGuess(charId, guess)}
        />
      )}

      {/* Mastermind Console */}
      <MastermindConsole
        isOpen={showMastermindConsole}
        isMastermind={isMastermind}
        currentPhase={ctx.phase || ''}
        G={G}
        moves={{
          createMastermindSnapshot: moves.createMastermindSnapshot,
          restoreMastermindSnapshot: moves.restoreMastermindSnapshot,
          setLoopAndDay: moves.setLoopAndDay,
          setLeader: moves.setLeader,
          setExState: moves.setExState,
          setHiddenRole: moves.setHiddenRole,
          setIncidentCulprit: moves.setIncidentCulprit,
          jumpToPhase: moves.jumpToPhase,
          setPlayerCount: moves.setPlayerCount,
        }}
        onClose={() => setShowMastermindConsole(false)}
      />
    </div>
  );
};

export const TragedyBoard: React.FC<BoardProps<TragedyGameState>> = (props) => {
  return (
    <AnimationProvider currentG={props.G}>
      <InnerBoard {...props} />
    </AnimationProvider>
  );
};
