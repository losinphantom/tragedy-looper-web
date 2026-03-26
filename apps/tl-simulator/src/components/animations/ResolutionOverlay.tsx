import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAnimation } from './AnimationContext';
import { getOverlayCardsFromPayload } from './AnimationContext';
import { FloatingNumber, type FloatingNumberType } from './FloatingNumber';
import { buildResolutionOverlayModel } from './resolutionOverlayModel';
import { getCardLabel, getCharImageSrc, getCharLabel, getPlayedCardRenderUrl } from '../board/boardHelpers';
import { cn } from '../../lib/utils';

export const OVERLAY_ENTER_SECONDS = 0.22;
export const OVERLAY_EXIT_SECONDS = 0.18;

function getSummaryTone(summary: string): string {
  if (summary.includes('友好')) return 'text-pink-300 drop-shadow-[0_0_18px_rgba(244,114,182,0.55)]';
  if (summary.includes('不安')) return 'text-violet-300 drop-shadow-[0_0_18px_rgba(167,139,250,0.55)]';
  if (summary.includes('密谋')) return 'text-yellow-300 drop-shadow-[0_0_18px_rgba(253,224,71,0.45)]';
  return 'text-slate-100';
}

function renderSubjectPanel(
  model: NonNullable<ReturnType<typeof buildResolutionOverlayModel>>,
  frameClass: string,
  stageClass: string,
  placeholderClass: string,
) {
  const charId = model.subjectCharacterId;
  if (!charId) {
    return (
      <div className={cn('flex h-[320px] w-[220px] items-center justify-center rounded-[24px] border text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)]', frameClass, placeholderClass)}>
        <div>
          <div className={cn('text-[10px] font-black uppercase tracking-[0.3em]', stageClass)}>{model.stageLabel}</div>
          <div className="mt-3 text-2xl font-black text-slate-50">{model.targetLabel || model.title}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-[220px] overflow-hidden rounded-[24px] border bg-obsidian-900 shadow-[0_20px_50px_rgba(0,0,0,0.6)]', frameClass)}>
      <img
        src={getCharImageSrc(charId)}
        alt={charId}
        className="h-[320px] w-full object-cover object-top"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-4 py-4">
        <div className={cn('text-[10px] font-black uppercase tracking-[0.3em]', stageClass)}>{model.stageLabel}</div>
        <div className="mt-1 text-lg font-black tracking-wide text-slate-50">{getCharLabel(charId)}</div>
      </div>
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

/**
 * 统一承接阻塞式结果提醒和行动卡结算步骤提示。
 */
export const ResolutionOverlay: React.FC = () => {
  const { currentAnimation } = useAnimation();

  if (!currentAnimation) return null;
  const model = buildResolutionOverlayModel(currentAnimation);
  if (!model) return null;
  const overlayKey = `${currentAnimation.id}:${currentAnimation.type}`;

  if (model.variant === 'announce') {
    const palette = model.accentTone === 'pink'
      ? {
          frame: 'border-pink-500/45 bg-[#170913]/96',
          beam: 'via-pink-500/70',
          stage: 'text-pink-300',
          chip: 'text-pink-300',
          card: 'border-pink-400/20',
          placeholder: 'bg-gradient-to-br from-pink-950/70 via-obsidian-900 to-[#1a0c18]',
        }
      : model.accentTone === 'gold'
        ? {
            frame: 'border-gold-500/45 bg-[#161109]/96',
            beam: 'via-gold-400/80',
            stage: 'text-gold-300',
            chip: 'text-gold-300',
            card: 'border-gold-400/20',
            placeholder: 'bg-gradient-to-br from-gold-950/70 via-obsidian-900 to-[#1c1408]',
          }
      : {
          frame: 'border-blood-500/35 bg-obsidian-950/96',
          beam: 'via-blood-500/70',
          stage: 'text-blood-300',
          chip: 'text-blood-300',
          card: 'border-white/10',
          placeholder: 'bg-gradient-to-br from-blood-950/60 via-obsidian-900 to-obsidian-950',
        };
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={overlayKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: OVERLAY_ENTER_SECONDS }}
          data-resolution-overlay="announce-modal"
          className={cn('fixed inset-0 z-[7100] flex items-center justify-center bg-black/50 backdrop-blur-[2px]')}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ duration: OVERLAY_ENTER_SECONDS, ease: 'easeOut' }}
            className={cn('relative w-[min(760px,94vw)] overflow-hidden rounded-[28px] border p-8 shadow-[0_30px_90px_rgba(0,0,0,0.72)]', palette.frame)}
          >
            <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent', palette.beam)} />
            <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:items-center">
                <motion.div
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06, duration: OVERLAY_ENTER_SECONDS }}
                  className="flex justify-center md:justify-start"
                >
                {renderSubjectPanel(model, palette.card, palette.stage, palette.placeholder)}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: OVERLAY_ENTER_SECONDS }}
                className="min-w-0"
              >
                <div className={cn('mb-3 text-[11px] font-black uppercase tracking-[0.32em]', palette.stage)}>{model.stageLabel}</div>
                <div className="mb-3 text-3xl font-black tracking-wide text-slate-50">{model.title}</div>
                <div className="text-base leading-7 text-slate-200">{model.summary}</div>
                {model.detail && <div className="mt-3 text-sm leading-6 text-slate-400">{model.detail}</div>}
                <div className="mt-5 flex flex-wrap gap-3">
                  {model.targetLabel && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                      <span className={cn(palette.chip)}>{model.targetKindLabel}</span>
                      <span className="font-bold">{model.targetLabel}</span>
                    </div>
                  )}
                  {model.locationLabel && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                      <span className={cn(palette.chip)}>地点</span>
                      <span className="font-bold">{model.locationLabel}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const sequenceCards = getOverlayCardsFromPayload(currentAnimation.payload);

  // 从 payload.effects 提取 counter 变化，用于 FloatingNumber
  const counterEffects: { type: FloatingNumberType; delta: number }[] = [];
  const COUNTER_TYPE_MAP: Record<string, FloatingNumberType> = {
    paranoia: 'paranoia', unease: 'paranoia', unease_plus: 'paranoia', unease_minus: 'paranoia',
    goodwill: 'goodwill', goodwill_plus: 'goodwill',
    intrigue: 'intrigue', intrigue_plus: 'intrigue',
    ex: 'ex',
  };
  if (Array.isArray(currentAnimation.payload?.effects)) {
    for (const eff of currentAnimation.payload.effects) {
      if (eff.kind === 'counter' && typeof eff.delta === 'number') {
        const counterKey = (eff.counter || '').replace(/_plus$|_minus$/, '');
        const floatType = COUNTER_TYPE_MAP[eff.counter] || COUNTER_TYPE_MAP[counterKey];
        if (floatType) counterEffects.push({ type: floatType, delta: eff.delta });
      }
    }
  }

  const charId = model.subjectCharacterId
    || (currentAnimation.payload?.targetType === 'character' && currentAnimation.payload?.targetId ? currentAnimation.payload.targetId : undefined)
    || currentAnimation.payload?.charId
    || undefined;
  const isResolveEffect = currentAnimation.type === 'resolve_effect';
  const emphasizeSummary = isResolveEffect && counterEffects.length > 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={overlayKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: OVERLAY_EXIT_SECONDS, ease: 'easeOut' }}
        data-resolution-overlay="sequence-modal"
        className="fixed inset-0 z-[7100] flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: OVERLAY_ENTER_SECONDS, ease: 'easeOut' }}
          className="relative w-[min(760px,94vw)] overflow-hidden rounded-[30px] border border-loop-400/30 bg-[#08131b]/96 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.72)]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-loop-400/80 to-transparent" />

          <div className="grid gap-6 md:grid-cols-[320px_minmax(0,1fr)] md:items-start">
            {/* ── 左侧：角色卡面 + Token 动画 ── */}
            <div className="flex justify-center md:justify-start">
              {charId ? (
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="relative w-[320px] overflow-hidden rounded-[24px] border border-loop-400/25 bg-obsidian-900 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                >
                  <img
                    src={getCharImageSrc(charId)}
                    alt={getCharLabel(charId)}
                    className="h-[440px] w-full object-cover object-top"
                  />
                  {/* Token 增减浮动数字 */}
                  {counterEffects.map((ce, idx) => (
                    <FloatingNumber
                      key={`${overlayKey}-float-${idx}`}
                      id={`${overlayKey}-float-${idx}`}
                      value={ce.delta}
                      type={ce.type}
                      delay={idx * 300}
                      onComplete={() => {}}
                    />
                  ))}
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                </motion.div>
              ) : (
                <div className="flex h-[320px] w-[320px] items-center justify-center rounded-[24px] border border-loop-400/25 bg-gradient-to-br from-loop-950/60 via-obsidian-900 to-[#07141a] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                  <div>
                    <div className="text-2xl font-black text-slate-50">{model.targetLabel || model.title}</div>
                  </div>
                </div>
              )}
            </div>

            {/* ── 右侧：结算结果 + 卡牌缩略图 ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08, duration: OVERLAY_ENTER_SECONDS }}
              className="min-w-0"
            >
              {!emphasizeSummary && (
                <div className="mb-3 text-3xl font-black tracking-wide text-slate-50">{model.title}</div>
              )}
              <div
                className={cn(
                  emphasizeSummary
                    ? 'mb-2 text-5xl font-black tracking-wide leading-none'
                    : 'text-base leading-7 text-slate-200',
                  emphasizeSummary ? getSummaryTone(model.summary) : '',
                )}
              >
                {model.summary}
              </div>

              {/* 卡牌缩略图 */}
              {sequenceCards.length > 0 && (
                <div className="mt-5 rounded-[16px] border border-white/10 bg-black/15 p-3">
                  <div className="flex items-start gap-3 overflow-x-auto py-1">
                    {sequenceCards.map((playedCard) => {
                      const isInvalid = model.invalidCardIds.includes(playedCard.id);
                      // 结算弹窗中所有卡牌都应该显示正面
                      const cardSrc = getPlayedCardRenderUrl({ ...playedCard, faceUp: true });
                      return (
                        <div
                          key={playedCard.id}
                          className={cn(
                            'relative w-[128px] flex-shrink-0 overflow-hidden rounded-[14px] border bg-obsidian-950/85',
                            isInvalid ? 'border-zinc-700/60 opacity-60' : 'border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.4)]',
                          )}
                        >
                          <div className="aspect-[2/3] w-full">
                            <img
                              src={cardSrc}
                              alt={getCardLabel(playedCard.cardTemplateId)}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {isInvalid && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 pointer-events-none">
                              <div className="-rotate-12 border border-red-500/80 bg-red-950/40 px-2 py-0.5">
                                <span className="text-xs font-black tracking-[0.15em] text-red-500">无效</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
