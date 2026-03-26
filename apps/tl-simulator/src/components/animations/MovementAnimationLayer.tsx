import React from 'react';

import { isBoardMovementAnimationEventType } from './animationEvents';
import { getCharImageSrc, getCharLabel } from '../board/boardHelpers';
import { useAnimation } from './AnimationContext';

type MoveAnimation = {
  id?: string;
  type?: string;
  durationMs?: number;
  payload?: {
    charId?: string;
    from?: string;
    to?: string;
  };
} | null | undefined;

export function getMovingCharacterId(animation: MoveAnimation): string | null {
  if (!animation) return null;
  if (!isBoardMovementAnimationEventType(animation.type || '')) return null;
  return typeof animation.payload?.charId === 'string' ? animation.payload.charId : null;
}

type MotionState = {
  charId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  width: number;
  height: number;
  durationMs: number;
};

function getElementRect(selector: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const element = document.querySelector(selector);
  return element instanceof HTMLElement ? element.getBoundingClientRect() : null;
}

function buildMotionState(animation: MoveAnimation): MotionState | null {
  const charId = getMovingCharacterId(animation);
  const toLocationId = animation?.payload?.to;
  if (!charId || !toLocationId) return null;

  const charRect = getElementRect(`[data-char-id="${charId}"]`);
  const targetRect = getElementRect(`[data-loc-id="${toLocationId}"]`);
  if (!charRect || !targetRect) return null;

  const width = charRect.width;
  const height = charRect.height;

  return {
    charId,
    fromX: charRect.left,
    fromY: charRect.top,
    toX: targetRect.left + (targetRect.width - width) / 2,
    toY: targetRect.top + Math.max(24, (targetRect.height - height) / 2),
    width,
    height,
    durationMs: animation?.durationMs ?? 800,
  };
}

export const MovementAnimationLayer: React.FC = () => {
  const { currentAnimation } = useAnimation();
  const [motion, setMotion] = React.useState<MotionState | null>(null);
  const [started, setStarted] = React.useState(false);

  React.useLayoutEffect(() => {
    const nextMotion = buildMotionState(currentAnimation);
    setMotion(nextMotion);
    setStarted(false);

    if (!nextMotion) return;
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, [currentAnimation?.id]);

  if (!motion) return null;

  return (
    <div className="fixed inset-0 z-[7200] pointer-events-none">
      <div
        className="absolute rounded-3xl border border-blood-500/50 bg-blood-500/12 shadow-[0_0_40px_rgba(225,29,72,0.28)]"
        style={{
          left: motion.toX - 18,
          top: motion.toY - 18,
          width: motion.width + 36,
          height: motion.height + 36,
        }}
      />
      <div
        className="absolute overflow-hidden rounded-2xl border border-white/20 bg-obsidian-950/90 shadow-[0_18px_48px_rgba(0,0,0,0.6)]"
        style={{
          left: motion.fromX,
          top: motion.fromY,
          width: motion.width,
          height: motion.height,
          transform: started
            ? `translate(${motion.toX - motion.fromX}px, ${motion.toY - motion.fromY}px) scale(1.02)`
            : 'translate(0px, 0px) scale(1)',
          transition: `transform ${motion.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        <img
          src={getCharImageSrc(motion.charId)}
          alt={motion.charId}
          className="h-full w-full object-cover object-top opacity-95"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 py-2 text-center">
          <span className="text-xs font-black tracking-widest text-slate-100">{getCharLabel(motion.charId)}</span>
        </div>
      </div>
    </div>
  );
};
