import React from 'react';
import { getCharLabel, getTokenTypeLabel, LOCATION_LABELS_MAP } from './boardHelpers';
import { InteractionDock, InteractionNotice } from './InteractionDock';
import type { GoodwillPanelViewModel } from './runtimeInteractionView';

export interface GoodwillPanelProps {
  viewModel: GoodwillPanelViewModel;
  isMastermind: boolean;
  isLeader: boolean;
  moves: Record<string, (...args: any[]) => void>;
}

// ── Component ────────────────────────────────────────────────────────────────

export const GoodwillPanel: React.FC<GoodwillPanelProps> = ({
  viewModel, isMastermind, isLeader, moves,
}) => {
  const [selectedTargets, setSelectedTargets] = React.useState<Record<string, Record<string, string>>>({});
  const gi = viewModel;
  if (!gi.visible) return null;
  if (!gi || gi.phase === 'idle' || gi.phase === 'done') return null;

  const getAbilityKey = (characterId: string, abilityId: string) => `${characterId}_${abilityId}`;
  const getRelevantTargetSlots = (
    targetSlots: NonNullable<GoodwillPanelViewModel['eligibleAbilities'][number]['targetSlots']>,
    selections?: Record<string, string>,
  ) => {
    const selectedValues = new Set(Object.values(selections || {}));
    return (targetSlots || []).filter((slot) => {
      if (!slot.slotId.includes('::')) return true;
      return Array.from(selectedValues).some((value) => slot.slotId.startsWith(`${value}::`));
    });
  };
  const getOptionLabel = (
    slot: NonNullable<GoodwillPanelViewModel['eligibleAbilities'][number]['targetSlots']>[number],
    selected: string,
  ) =>
    (slot.eligibleCharacterIds || []).includes(selected)
      ? getCharLabel(selected)
      : (slot.eligibleLocationIds || []).includes(selected)
        ? (LOCATION_LABELS_MAP[selected] || selected)
        : (slot.eligibleTokenTypes || []).includes(selected as any)
          ? getTokenTypeLabel(selected as any)
          : slot.eligibleChoices?.find(choice => choice.id === selected)?.label || selected;
  const renderTargetSlot = (
    ability: GoodwillPanelViewModel['eligibleAbilities'][number],
    slot: NonNullable<GoodwillPanelViewModel['eligibleAbilities'][number]['targetSlots']>[number],
  ) => {
    const abilityKey = getAbilityKey(ability.characterId, ability.abilityId);
    const current = selectedTargets[abilityKey]?.[slot.slotId];
    const options = [
      ...((slot.kind === 'character' || slot.kind === 'character_or_location')
        ? (slot.eligibleCharacterIds || []).map(id => ({ id, label: getCharLabel(id) }))
        : []),
      ...((slot.kind === 'location' || slot.kind === 'character_or_location')
        ? (slot.eligibleLocationIds || []).map(id => ({ id, label: LOCATION_LABELS_MAP[id] || id }))
        : []),
      ...((slot.kind === 'token_type')
        ? (slot.eligibleTokenTypes || []).map(token => ({
          id: token,
          label: getTokenTypeLabel(token),
        }))
        : []),
      ...((slot.kind === 'choice')
        ? (slot.eligibleChoices || []).map(choice => ({
          id: choice.id,
          label: choice.label,
        }))
        : []),
    ];

    return (
      <div key={`${abilityKey}:${slot.slotId}`} className="mt-2">
        <div className="text-[10px] text-loop-300 font-bold uppercase mb-1">{slot.label}</div>
        <div className="flex flex-wrap gap-1.5">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => setSelectedTargets(prev => ({
                ...prev,
                [abilityKey]: { ...(prev[abilityKey] || {}), [slot.slotId]: option.id },
              }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                current === option.id
                  ? 'bg-loop-700 border-loop-500 text-white'
                  : 'bg-obsidian-700 border-slate-600/50 text-slate-400 hover:bg-obsidian-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  };
  const canDeclare = (ability: GoodwillPanelViewModel['eligibleAbilities'][number]) => {
    const abilityKey = getAbilityKey(ability.characterId, ability.abilityId);
    const relevantSlots = getRelevantTargetSlots(ability.targetSlots || [], selectedTargets[abilityKey] || {});
    return relevantSlots.every(slot => !!selectedTargets[abilityKey]?.[slot.slotId]);
  };

  // ── 非队长、非剧作家视角：等待 ──
  if (!isMastermind && !isLeader) {
    return (
      <InteractionNotice
        tone="loop"
        title="友好能力处理中"
        detail="队长与剧作家正在交互，盘面与目标高亮保持可见。"
      />
    );
  }

  // ── 队长视角：选择使用哪个能力（单人模式下队长=剧作家，跳过此分支，直接走剧作家视角） ──
  if (isLeader && !isMastermind && gi.phase === 'leader_choosing') {
    const unusedAbilities = gi.eligibleAbilities.filter(a => !a.used);
    return (
      <InteractionDock
        tone="loop"
        title="友好能力"
        badge="队长选择"
        subtitle="选择要宣告的友好能力。盘面不会被遮挡，目标高亮会持续辅助判断。"
        footer={(
          <div className="flex justify-end">
            <button
              onClick={() => moves.skipAllAbilities()}
              className="rounded-xl border border-slate-600/50 bg-obsidian-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-obsidian-600"
            >
              全部跳过 ▶
            </button>
          </div>
        )}
      >
        <div className="space-y-3">
          {unusedAbilities.map(a => (
            <div
              key={`${a.characterId}_${a.abilityId}`}
              className="rounded-2xl border border-loop-800/30 bg-obsidian-900/80 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{getCharLabel(a.characterId)}</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-400">{a.label}</div>
                  {getRelevantTargetSlots(a.targetSlots || [], selectedTargets[getAbilityKey(a.characterId, a.abilityId)] || {})
                    .map(slot => renderTargetSlot(a, slot))}
                </div>
                <button
                  onClick={() => moves.declareAbility(
                    a.characterId,
                    a.abilityId,
                    selectedTargets[getAbilityKey(a.characterId, a.abilityId)] || {},
                  )}
                  disabled={!canDeclare(a)}
                  className="shrink-0 rounded-xl border border-loop-500/50 bg-loop-700 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-loop-600 hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  使用
                </button>
              </div>
            </div>
          ))}
        </div>
      </InteractionDock>
    );
  }

  // ── 队长视角：等待剧作家裁定 ──
  if (isLeader && !isMastermind && gi.phase === 'mastermind_resolving') {
    return (
      <InteractionNotice
        tone="loop"
        title="等待剧作家裁定"
        detail={gi.currentDeclaration ? `已声明 ${getCharLabel(gi.currentDeclaration.characterId)}` : '已提交声明，等待裁定结果。'}
      />
    );
  }

  // ── 剧作家视角：裁定友好能力 ──
  if (isMastermind && gi.phase === 'mastermind_resolving' && gi.currentDeclaration) {
    const { characterId } = gi.currentDeclaration;
    const ability = gi.eligibleAbilities.find(
      a => a.characterId === characterId && a.abilityId === gi.currentDeclaration!.abilityId
    );

    return (
      <InteractionDock
        tone="blood"
        title="裁定友好能力"
        badge="剧作家"
        subtitle="声明内容固定在侧栏中，盘面保持可见，方便核对当前局势。"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-obsidian-900/75 px-4 py-3">
            <div className="text-sm font-bold text-white">{getCharLabel(characterId)}</div>
            <div className="mt-1 text-[11px] text-slate-400">{ability?.label || ''}</div>
            {ability && getRelevantTargetSlots(
              ability.targetSlots || [],
              gi.currentDeclaration.selectedTargets || {},
            )
              .filter(slot => !!gi.currentDeclaration?.selectedTargets?.[slot.slotId])
              .map(slot => (
                <div key={slot.slotId} className="mt-2 text-[11px] text-slate-300">
                  {slot.label}：{getOptionLabel(slot, gi.currentDeclaration!.selectedTargets![slot.slotId])}
                </div>
              ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => moves.resolveAbility(true)}
              className="flex-1 rounded-xl border border-emerald-600/50 bg-emerald-800 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-emerald-700 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              允许
            </button>
            <button
              onClick={() => moves.resolveAbility(false)}
              className="flex-1 rounded-xl border border-blood-600/50 bg-blood-800 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-blood-700 hover:shadow-[0_0_15px_rgba(225,29,72,0.4)]"
            >
              拒绝
            </button>
          </div>
        </div>
      </InteractionDock>
    );
  }

  // ── 剧作家视角：等待队长选择 ──
  if (isMastermind && gi.phase === 'leader_choosing') {
    return (
      <InteractionNotice
        tone="loop"
        title="等待队长选择友好能力"
        detail="棋盘保持可见，可继续观察高亮目标与当前站位。"
      />
    );
  }

  return null;
};
