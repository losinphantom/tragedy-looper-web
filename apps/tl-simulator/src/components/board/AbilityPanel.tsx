import React from 'react';
import { getCharLabel, getTokenTypeLabel, LOCATION_LABELS_MAP } from './boardHelpers';
import { InteractionDock, InteractionNotice } from './InteractionDock';
import type { AbilityPanelViewModel } from './runtimeInteractionView';

export interface AbilityPanelProps {
  viewModel: AbilityPanelViewModel;
  isMastermind: boolean;
  moves: Record<string, (...args: any[]) => void>;
}

// ── Component ────────────────────────────────────────────────────────────────

export const AbilityPanel: React.FC<AbilityPanelProps> = ({
  viewModel, isMastermind, moves,
}) => {
  const [selectedTargets, setSelectedTargets] = React.useState<Record<string, Record<string, string>>>({});
  const { visible, phase, entries } = viewModel;

  if (!visible) return null;
  if (phase === 'idle' || phase === 'done') return null;
  if (entries.length === 0) return null;

  // ── 主角视角：等待提示 ──
  if (!isMastermind) {
    return (
      <InteractionNotice
        tone="blood"
        title="剧作家能力处理中"
        detail="盘面保持可见，等待剧作家完成裁定。"
      />
    );
  }

  // ── 剧作家视角：能力队列面板 ──
  const mandatory = entries.filter(a => a.mandatory);
  const optional = entries.filter(a => !a.mandatory);
  const showOptional = phase === 'optional';

  const renderTargetSlot = (ability: AbilityPanelViewModel['entries'][number], slot: AbilityPanelViewModel['entries'][number]['targetSlots'][number]) => {
    const current = selectedTargets[ability.id]?.[slot.slotId];
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
      <div key={`${ability.id}:${slot.slotId}`} className="mt-2">
        <div className="text-[10px] text-loop-300 font-bold uppercase mb-1">{slot.label}</div>
        <div className="flex flex-wrap gap-1.5">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => setSelectedTargets(prev => ({
                ...prev,
                [ability.id]: { ...(prev[ability.id] || {}), [slot.slotId]: option.id },
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

  const canConfirm = (ability: AbilityPanelViewModel['entries'][number]) =>
    (ability.targetSlots || []).every(slot => !!selectedTargets[ability.id]?.[slot.slotId]);

  return (
    <InteractionDock
      tone="blood"
      title="剧作家能力"
      badge={phase === 'mandatory' ? '强制阶段' : '可选阶段'}
      subtitle={phase === 'mandatory'
        ? '逐个确认强制能力。盘面目标会持续高亮，便于对照局势。'
        : '可选能力不会遮住棋盘，确认前可以继续观察场面。'}
      footer={showOptional && optional.length > 0 ? (
        <div className="flex justify-end">
          <button
            onClick={() => moves.finishAbilities()}
            className="rounded-xl border border-slate-600/50 bg-obsidian-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-obsidian-600"
          >
            全部跳过 ▶
          </button>
        </div>
      ) : null}
    >
      <div className="space-y-3">
        {mandatory.length > 0 && (
          <>
            <div className="px-1 text-[10px] font-black uppercase tracking-[0.24em] text-blood-300">
              强制能力 ({mandatory.length})
            </div>
            {mandatory.map(a => (
              <div key={a.id} className="rounded-2xl border border-blood-800/30 bg-obsidian-900/80 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{getCharLabel(a.characterId) || '???'}</div>
                    <div className="mt-1 text-[11px] leading-5 text-slate-400">{a.description}</div>
                    {(a.targetSlots || []).map(slot => renderTargetSlot(a, slot))}
                  </div>
                  <button
                    onClick={() => moves.confirmAbility(a.id, selectedTargets[a.id] || {})}
                    disabled={!canConfirm(a)}
                    className="shrink-0 rounded-xl border border-blood-500/50 bg-blood-700 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-blood-600 hover:shadow-[0_0_15px_rgba(225,29,72,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✓ 确认
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {optional.length > 0 && (
          <>
            <div className={`px-1 text-[10px] font-black uppercase tracking-[0.24em] ${showOptional ? 'text-loop-300' : 'text-slate-600'}`}>
              可选能力 ({optional.length})
            </div>
            {optional.map(a => (
              <div key={a.id} className={`rounded-2xl border px-4 py-3 transition-all ${
                showOptional
                  ? 'border-loop-800/30 bg-obsidian-900/80'
                  : 'border-slate-800/20 bg-obsidian-950/55 opacity-55'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{getCharLabel(a.characterId) || '???'}</div>
                    <div className="mt-1 text-[11px] leading-5 text-slate-400">{a.description}</div>
                    {(a.targetSlots || []).map(slot => renderTargetSlot(a, slot))}
                  </div>
                  {showOptional && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => moves.confirmAbility(a.id, selectedTargets[a.id] || {})}
                        disabled={!canConfirm(a)}
                        className="rounded-xl border border-loop-600/50 bg-loop-800 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:bg-loop-700"
                      >
                        使用
                      </button>
                      <button
                        onClick={() => moves.skipAbility(a.id)}
                        className="rounded-xl border border-slate-600/50 bg-obsidian-700 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-obsidian-600"
                      >
                        跳过
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </InteractionDock>
  );
};
