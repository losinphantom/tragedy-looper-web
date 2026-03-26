import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { buildAnimationHistoryProjection, type LegacyEventLogEntry } from '@tragedy/game-logic';
import type { TragedyGameState } from '../../game/game';
import type { AnimationEvent } from './animationEvents';

// ── 不可变状态更新 helpers（消除深层 spread 嵌套）────────────────────

function updateCharToken(G: TragedyGameState, charId: string, token: string, delta: number): TragedyGameState {
  const ch = G.v1.characters[charId];
  if (!ch) return G;
  return {
    ...G,
    v1: {
      ...G.v1,
      characters: {
        ...G.v1.characters,
        [charId]: { ...ch, tokens: { ...ch.tokens, [token]: Math.max(0, (ch.tokens as any)[token] + delta) } },
      },
    },
  };
}

function updateLocToken(G: TragedyGameState, locId: string, token: string, delta: number): TragedyGameState {
  const loc = G.v1.locations[locId];
  if (!loc) return G;
  return {
    ...G,
    v1: {
      ...G.v1,
      locations: {
        ...G.v1.locations,
        [locId]: { ...loc, tokens: { ...loc.tokens, [token]: Math.max(0, (loc.tokens as any)[token] + delta) } },
      },
    },
  };
}

function updateCharLocation(G: TragedyGameState, charId: string, locationId: string): TragedyGameState {
  const ch = G.v1.characters[charId];
  if (!ch) return G;
  return {
    ...G,
    v1: {
      ...G.v1,
      characters: {
        ...G.v1.characters,
        [charId]: { ...ch, locationId },
      },
    },
  };
}

type AnimationFeedEntry = LegacyEventLogEntry;
type OverlayPlayedCard = TragedyGameState['v1']['playedCards'][number];

export function buildAnimationFeedFromGameState(G: TragedyGameState): AnimationFeedEntry[] {
  return buildAnimationHistoryProjection(G.v1.timeline?.facts || []);
}

function isOverlayPlayedCardArray(value: unknown): value is OverlayPlayedCard[] {
  return Array.isArray(value);
}

export function getOverlayCardsFromPayload(payload: any): OverlayPlayedCard[] {
  if (isOverlayPlayedCardArray(payload?.overlayCards) && payload.overlayCards.length > 0) {
    return payload.overlayCards;
  }
  if (isOverlayPlayedCardArray(payload?.cards) && payload.cards.length > 0) {
    return payload.cards;
  }
  return [];
}

export function attachOverlayCardsToPayload(
  payload: any,
  revealedCardsByTarget: Map<string, OverlayPlayedCard[]>,
): any {
  const overlayCards = getOverlayCardsFromPayload(payload);
  if (overlayCards.length > 0) {
    if (payload?.overlayCards === overlayCards) return payload;
    return { ...payload, overlayCards };
  }

  const targetKey = typeof payload?.targetKey === 'string'
    ? payload.targetKey
    : (payload?.targetType && payload?.targetId ? `${payload.targetType}:${payload.targetId}` : null);
  if (!targetKey) return payload;

  const cachedCards = revealedCardsByTarget.get(targetKey);
  if (!cachedCards || cachedCards.length === 0) return payload;
  return { ...payload, overlayCards: cachedCards };
}

// ── Types ─────────────────────────────────────────────────────────────

interface AnimationContextValue {
  // true = Board should render intermediate state; false = render G directly
  isAnimating: boolean;
  displayedG: TragedyGameState;
  // Add an animation to the queue
  pushAnimation: (event: Omit<AnimationEvent, 'id'>) => void;
  // The currently playing animation
  currentAnimation: AnimationEvent | null;
  // Pending animations waiting behind the current one
  queuedAnimations: AnimationEvent[];
}

const AnimationContext = createContext<AnimationContextValue | null>(null);

export const RESOLVE_FLIP_ALL_DURATION_MS = 3000;

export function shouldSeedDisplayedSnapshotFromPreviousState(args: {
  isAnimating: boolean;
  queuedAnimations: number;
  hasCurrentAnimation: boolean;
}): boolean {
  return !args.isAnimating
    && args.queuedAnimations === 0
    && !args.hasCurrentAnimation;
}

export function shouldRenderAnimatedSnapshot(args: {
  isAnimating: boolean;
  queuedAnimations: number;
  hasCurrentAnimation: boolean;
  previousEventLogCount: number;
  nextEventLogCount: number;
}): boolean {
  return args.isAnimating
    || args.queuedAnimations > 0
    || args.hasCurrentAnimation
    || args.nextEventLogCount > args.previousEventLogCount;
}

// ── Provider ──────────────────────────────────────────────────────────

export const AnimationProvider: React.FC<{
  children: React.ReactNode;
  currentG: TragedyGameState;
}> = ({ children, currentG }) => {
  const [queue, setQueue] = useState<AnimationEvent[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationEvent | null>(null);
  const [displayedG, setDisplayedG] = useState<TragedyGameState>(currentG);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const currentAnimationRef = useRef<AnimationEvent | null>(null);
  const queueRef = useRef<AnimationEvent[]>([]);

  // Keep ref in sync
  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    currentAnimationRef.current = currentAnimation;
  }, [currentAnimation]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const prevGRef = useRef<TragedyGameState>(currentG);
  const currentGRef = useRef<TragedyGameState>(currentG);
  currentGRef.current = currentG;

  // Playback engine — 使用 ref 管理 timer 避免 effect cleanup 竞态
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealedCardsByTargetRef = useRef<Map<string, OverlayPlayedCard[]>>(new Map());

  // processNextRef 用 ref 持有最新引用，避免 setTimeout 内闭包捕获旧函数
  const processNextRef = useRef<() => void>(() => {});

  const processNext = useCallback(() => {
    setQueue(prevQueue => {
      if (prevQueue.length === 0) return prevQueue;
      const [nextAnim, ...rest] = prevQueue;

      setCurrentAnimation(nextAnim);
      setIsAnimating(true);

      // 清理之前的 timer（安全）
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (nextAnim.onComplete) nextAnim.onComplete();
        setCurrentAnimation(null);

        // 还有剩余帧？通过 ref 调用最新版本的 processNext
        if (rest.length > 0) {
          requestAnimationFrame(() => processNextRef.current());
        } else {
          // 队列耗尽，同步到最终状态
          setIsAnimating(false);
          setDisplayedG(currentGRef.current);
        }
      }, nextAnim.durationMs);

      return rest;
    });
  }, []);

  // 保持 ref 指向最新 processNext
  processNextRef.current = processNext;

  // 当 queue 有新内容且当前没动画播放时，启动处理
  useEffect(() => {
    if (!currentAnimation && queue.length > 0) {
      processNext();
    }
  }, [queue.length, currentAnimation]);

  // 安全兜底：当没有动画在播且队列为空，确保 isAnimating 被重置
  useEffect(() => {
    if (!currentAnimation && (queue.length === 0) && isAnimating) {
      setIsAnimating(false);
      setDisplayedG(currentG);
    }
  }, [currentAnimation, queue.length, isAnimating, currentG]);

  // Diff engine (Detect changes between prevG and currentG)
  useEffect(() => {
    const prevG = prevGRef.current;
    const previousAnimationFeed = buildAnimationFeedFromGameState(prevG);
    const nextAnimationFeed = buildAnimationFeedFromGameState(currentG);
    const prevLen = previousAnimationFeed.length;
    const currLen = nextAnimationFeed.length;

    if (currLen > prevLen) {
      if (shouldSeedDisplayedSnapshotFromPreviousState({
        isAnimating: isAnimatingRef.current,
        queuedAnimations: queueRef.current.length,
        hasCurrentAnimation: currentAnimationRef.current != null,
      })) {
        // Fresh event logs are usually emitted after game logic already advanced
        // currentG (for example, resolve_cards clears playedCards immediately).
        // Rewind the rendered snapshot first so queued animations can reveal the
        // intermediate transition instead of skipping straight to the final state.
        setDisplayedG(prevG);
      }

      const newEvents = nextAnimationFeed.slice(prevLen);
      newEvents.forEach(e => {
        if (e.type === 'stat_change') {
          pushAnimation({
            type: 'stat_change',
            durationMs: 1200,
            payload: e.payload,
            onComplete: () => {
              setDisplayedG(curr => {
                const targetType = e.payload.targetType || 'character';
                if (targetType === 'character') {
                  return updateCharToken(curr, e.payload.targetId, e.payload.stat, e.payload.delta);
                } else {
                  return updateLocToken(curr, e.payload.targetId, e.payload.stat, e.payload.delta);
                }
              });
            }
          });
        }
        else if (e.type === 'move') {
          pushAnimation({
            type: 'char_move',
            durationMs: 800,
            payload: e.payload,
            onComplete: () => {
              setDisplayedG(curr => updateCharLocation(curr, e.payload.charId, e.payload.to));
            }
          });
        }
        else if (e.type === 'card_flip') {
          pushAnimation({
            type: 'card_flip',
            durationMs: 1500,
            payload: e.payload,
            onComplete: () => {
              const cardIds = new Set((e.payload.cardIds || []) as string[]);
              setDisplayedG(curr => ({
                ...curr,
                v1: {
                  ...curr.v1,
                  playedCards: curr.v1.playedCards.map(c =>
                    cardIds.size === 0 || cardIds.has(c.id) ? { ...c, faceUp: true } : c
                  )
                }
              }));
            }
          });
        }
        // ── 全局翻牌 ──
        else if (e.type === 'resolve_flip_all') {
          pushAnimation({
            type: 'resolve_flip_all',
            durationMs: RESOLVE_FLIP_ALL_DURATION_MS,
            payload: e.payload,
            onComplete: () => {
              // 翻开所有已打出的牌
              const cardIds = new Set((e.payload.cardIds || []) as string[]);
              const revealedCards = new Map(
                ((e.payload.cards || []) as Array<TragedyGameState['v1']['playedCards'][number]>)
                  .map((card) => [card.id, card]),
              );
              // 为后续 resolve_effect/move 缓存卡面数据（按目标分组）
              for (const card of (e.payload.cards || []) as Array<TragedyGameState['v1']['playedCards'][number]>) {
                const targetKey = `${card.targetType}:${card.targetId}`;
                if (!revealedCardsByTargetRef.current.has(targetKey)) {
                  revealedCardsByTargetRef.current.set(targetKey, []);
                }
                revealedCardsByTargetRef.current.get(targetKey)!.push(card);
              }
              setDisplayedG(curr => ({
                ...curr,
                v1: {
                  ...curr.v1,
                  playedCards: curr.v1.playedCards.map(c =>
                    cardIds.has(c.id) ? { ...c, ...(revealedCards.get(c.id) || {}), faceUp: true } : c
                  )
                }
              }));
            }
          });
        }
        // ── 逐目标结算弹窗 ──
        else if (e.type === 'resolve_effect') {
          const payload = attachOverlayCardsToPayload(e.payload, revealedCardsByTargetRef.current);
          pushAnimation({
            type: 'resolve_effect',
            durationMs: 3000,
            payload,
            onComplete: () => {
              // 应用数值效果
              const COUNTER_MAP: Record<string, string> = {
                unease: 'paranoia', unease_plus: 'paranoia', unease_minus: 'paranoia',
                intrigue: 'intrigue', intrigue_plus: 'intrigue',
                goodwill: 'goodwill', goodwill_plus: 'goodwill',
              };
              setDisplayedG(curr => {
                let next = curr;
                for (const eff of (payload.effects || [])) {
                  if (eff.kind === 'counter') {
                    const { targetId, targetType } = payload;
                    const field = COUNTER_MAP[eff.counter] || COUNTER_MAP[eff.counter?.replace(/_plus$|_minus$/, '')];
                    if (field && targetType === 'character') {
                      next = updateCharToken(next, targetId, field, eff.delta);
                    } else if (field && targetType === 'location') {
                      next = updateLocToken(next, targetId, field, eff.delta);
                    }
                  }
                }
                return next;
              });
            }
          });
        }
        else if (e.type === 'resolve_move') {
          const payload = attachOverlayCardsToPayload(e.payload, revealedCardsByTargetRef.current);
          // 第一步：弹窗展示移动卡信息 3s
          pushAnimation({
            type: 'resolve_move',
            durationMs: 3000,
            payload,
          });
          // 第二步：弹窗结束后播放棋盘上的移动动画 800ms
          pushAnimation({
            type: 'char_move',
            durationMs: 800,
            payload,
            onComplete: () => {
              setDisplayedG(curr => updateCharLocation(curr, payload.charId, payload.to));
            }
          });
        }
        // ── 全局收牌 ──
        else if (e.type === 'resolve_dismiss_all') {
          pushAnimation({
            type: 'resolve_dismiss_all',
            durationMs: 1000,
            payload: e.payload,
            onComplete: () => {
              // 移除所有已结算的 playedCards
              const cardIds = new Set((e.payload.cardIds || []) as string[]);
              revealedCardsByTargetRef.current.clear();
              setDisplayedG(curr => ({
                ...curr,
                v1: {
                  ...curr.v1,
                  playedCards: curr.v1.playedCards.filter(c => !cardIds.has(c.id))
                }
              }));
            }
          });
        }
        else if (e.type === 'incident') {
          pushAnimation({
            type: 'incident_announce',
            durationMs: 2500,
            payload: e.payload,
          });
        }
        else if (e.type === 'ability_trigger') {
          pushAnimation({
            type: 'ability_announce',
            durationMs: e.payload?.resultType === 'goodwill' ? 3200 : 2500,
            payload: e.payload,
          });
        }
        else if (e.type === 'result') {
          pushAnimation({
            type: 'result_announce',
            durationMs: e.payload?.resultType === 'game_victory' || e.payload?.resultType === 'game_defeat' ? 3600 : 3200,
            payload: e.payload,
          });
        }
      });
    } else if (currLen < prevLen || prevG.loopIndex !== currentG.loopIndex) {
      // Loop reset or hard state reload
      setDisplayedG(currentG);
    } else if (!isAnimatingRef.current) {
      // Safe to sync UI state
      setDisplayedG(currentG);
    }

    prevGRef.current = currentG;
  }, [currentG]);

  const pushAnimation = (event: Omit<AnimationEvent, 'id'>) => {
    setQueue(q => [...q, { ...event, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const previousEventLogCount = buildAnimationFeedFromGameState(prevGRef.current).length;
  const nextEventLogCount = buildAnimationFeedFromGameState(currentG).length;
  const shouldUseDisplayedSnapshot = shouldRenderAnimatedSnapshot({
    isAnimating,
    queuedAnimations: queue.length,
    hasCurrentAnimation: currentAnimation != null,
    previousEventLogCount,
    nextEventLogCount,
  });

  return (
    <AnimationContext.Provider value={{
      isAnimating,
      displayedG: shouldUseDisplayedSnapshot ? displayedG : currentG,
      pushAnimation,
      currentAnimation,
      queuedAnimations: queue,
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) throw new Error('useAnimation must be used within AnimationProvider');
  return context;
};
