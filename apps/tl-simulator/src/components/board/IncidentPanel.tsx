import React, { useState } from 'react';
import { getCharLabel, getTokenTypeLabel, LOCATION_LABELS_MAP } from './boardHelpers';
import { InteractionDock, InteractionNotice } from './InteractionDock';
import { getIncidentLabel } from '@tragedy/domain';
import type { IncidentPanelViewModel } from './runtimeInteractionView';

export interface IncidentPanelProps {
  viewModel: IncidentPanelViewModel;
  isMastermind: boolean;
  moves: Record<string, (...args: any[]) => void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function incidentKey(inc: IncidentPanelViewModel['entries'][number]): string {
  return inc.id;
}

// ── Component ────────────────────────────────────────────────────────────────

export const IncidentPanel: React.FC<IncidentPanelProps> = ({
  viewModel, isMastermind, moves,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<Record<string, Record<string, string>>>({});
  const { visible, entries } = viewModel;

  if (!visible) return null;
  if (entries.length === 0) return null;

  // ── 主角视角：等待提示 ──
  if (!isMastermind) {
    return (
      <InteractionNotice
        tone="gold"
        title="剧作家正在裁定事件"
        detail="盘面持续可见，可直接观察事件目标与现场状态。"
      />
    );
  }

  // ── 剧作家视角：事件裁定 ──
  return (
    <InteractionDock
      tone="gold"
      title="事件裁定"
      badge={`${entries.length} 个待处理`}
      subtitle="逐个裁定事件是否触发。需要目标的事件会在盘面上保持高亮。"
    >
      <div className="space-y-3">
        {entries.map((inc) => {
          const key = incidentKey(inc);
          return (
            <div
              key={key}
              className="rounded-2xl border border-gold-800/30 bg-obsidian-900/80 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">
                    {getIncidentLabel(inc.incidentId)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    犯人: {inc.culpritId ? getCharLabel(inc.culpritId) : '无'}
                  </div>
                </div>
              </div>

              {(inc.targetSlots || []).map(slot => {
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
                  <div key={`${key}:${slot.slotId}`} className="mt-3 flex flex-wrap gap-1.5">
                    <span className="w-full text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300">{slot.label}</span>
                    {options.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedTarget(prev => ({
                          ...prev,
                          [key]: { ...(prev[key] || {}), [slot.slotId]: option.id },
                        }))}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                          selectedTarget[key]?.[slot.slotId] === option.id
                            ? 'border-gold-500 bg-gold-700 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                            : 'border-slate-600/50 bg-obsidian-700 text-slate-400 hover:bg-obsidian-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                );
              })}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => moves.resolveIncident(key, true, selectedTarget[key] || {})}
                  disabled={(inc.targetSlots || []).some(slot => !selectedTarget[key]?.[slot.slotId])}
                  className="flex-1 rounded-xl border border-gold-600/50 bg-gold-800 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  触发
                </button>
                <button
                  onClick={() => moves.resolveIncident(key, false)}
                  className="flex-1 rounded-xl border border-slate-600/50 bg-obsidian-700 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-obsidian-600"
                >
                  不触发
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </InteractionDock>
  );
};
