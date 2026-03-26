import React, { useState, useLayoutEffect } from 'react';
import { getCardImageUrl, getCardBackUrl } from '../board/boardHelpers';

// ── Types ─────────────────────────────────────────────────────────────

export interface FlyingCardData {
  id: string;
  cardTemplateId: string;
  playedBySeat: string;
  /** 起始坐标 (手牌元素在屏幕上的位置) */
  fromRect: { x: number; y: number; width: number; height: number };
  /** 终点坐标 (目标卡牌渲染后在屏幕上的位置) — 由 Board 层预计算 */
  toRect: { x: number; y: number; width: number; height: number };
  /** 对应的目标 DOM 卡牌 ID，用于动画结束时恢复显示 */
  targetCardId?: string;
  faceMode?: 'front-to-back' | 'back-to-front' | 'front' | 'back';
}

// ── Component ─────────────────────────────────────────────────────────

export const FlyingCard: React.FC<{
  data: FlyingCardData;
  onComplete: () => void;
}> = ({ data, onComplete }) => {
  const [isFlying, setIsFlying] = useState(false);

  const faceSrc = getCardImageUrl(data.cardTemplateId, data.playedBySeat);
  const backSrc = getCardBackUrl(data.playedBySeat);
  const faceMode = data.faceMode ?? 'front-to-back';
  const startRotation = faceMode === 'back-to-front' || faceMode === 'back' ? 180 : 0;
  const endRotation = faceMode === 'front-to-back' ? 180 : faceMode === 'back-to-front' ? 360 : startRotation;

  useLayoutEffect(() => {
    // 下一帧启动 CSS 过渡
    const raf = requestAnimationFrame(() => {
      setIsFlying(true);
    });

    // 动画结束后通知 Board 移除本飞行卡（Board 的 flyingCardIds 会自动更新）
    const timer = setTimeout(() => {
      onComplete();
    }, 650);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [data.id, onComplete]);

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: isFlying ? data.toRect.x : data.fromRect.x,
        top: isFlying ? data.toRect.y : data.fromRect.y,
        width: isFlying ? data.toRect.width : data.fromRect.width,
        height: isFlying ? data.toRect.height : data.fromRect.height,
        transition: 'left 0.55s cubic-bezier(0.22, 1, 0.36, 1), top 0.55s cubic-bezier(0.22, 1, 0.36, 1), width 0.55s ease-out, height 0.55s ease-out',
        perspective: '600px',
      }}
    >
      {/* 3D 翻转容器 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease-in-out',
          transform: `rotateY(${isFlying ? endRotation : startRotation}deg)`,
        }}
      >
        {/* 正面（手牌可见面） */}
        <img
          src={faceSrc}
          alt="card front"
          style={{ backfaceVisibility: 'hidden' }}
          className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-[0_0_25px_rgba(56,189,248,0.5)] border-2 border-loop-400/60"
        />
        {/* 背面（盖牌） */}
        <img
          src={backSrc}
          alt="card back"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-[0_0_25px_rgba(56,189,248,0.5)] border-2 border-loop-400/60"
        />
      </div>
    </div>
  );
};

// ── Container for multiple flying cards ───────────────────────────────

export const FlyingCardLayer: React.FC<{
  flyingCards: FlyingCardData[];
  onCardComplete: (id: string) => void;
}> = ({ flyingCards, onCardComplete }) => {
  return (
    <>
      {flyingCards.map(fc => (
        <FlyingCard
          key={fc.id}
          data={fc}
          onComplete={() => onCardComplete(fc.id)}
        />
      ))}
    </>
  );
};
