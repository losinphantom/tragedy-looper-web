import React from 'react';
import { getCharLabel, LOCATION_LABELS_MAP } from '../boardHelpers';
import { getIncidentLabel } from '@tragedy/domain';
import type { ButterflyChoicePanelViewModel, IncidentPanelViewModel } from '../runtimeInteractionView';
import {
  buildSidebarSlotOptions,
  type SidebarInteractionMoves,
  type SidebarTargetSelections,
} from './sidebarInteractionHelpers';

type IncidentResolutionPanelProps = {
  incidentPanel: IncidentPanelViewModel;
  butterflyPanel: ButterflyChoicePanelViewModel;
  isMastermind: boolean;
  incTargets: SidebarTargetSelections;
  setIncTargets: React.Dispatch<React.SetStateAction<SidebarTargetSelections>>;
  bfToken: 'goodwill' | 'paranoia' | 'intrigue' | null;
  setBfToken: React.Dispatch<React.SetStateAction<'goodwill' | 'paranoia' | 'intrigue' | null>>;
  interactionMoves: SidebarInteractionMoves;
};

const BUTTERFLY_TOKEN_STYLES = {
  goodwill: {
    label: '友好',
    selected: 'border-emerald-500 bg-emerald-700 text-white',
    idle: 'border-emerald-800/50 bg-obsidian-700 text-emerald-400 hover:bg-obsidian-600',
  },
  paranoia: {
    label: '不安',
    selected: 'border-amber-500 bg-amber-700 text-white',
    idle: 'border-amber-800/50 bg-obsidian-700 text-amber-400 hover:bg-obsidian-600',
  },
  intrigue: {
    label: '密谋',
    selected: 'border-red-500 bg-red-700 text-white',
    idle: 'border-red-800/50 bg-obsidian-700 text-red-400 hover:bg-obsidian-600',
  },
} as const;

export const IncidentResolutionPanel: React.FC<IncidentResolutionPanelProps> = ({
  incidentPanel,
  butterflyPanel,
  isMastermind,
  incTargets,
  setIncTargets,
  bfToken,
  setBfToken,
  interactionMoves,
}) => {
  if (!incidentPanel.visible && !butterflyPanel.visible) {
    return null;
  }

  return (
    <div className="rounded-xl border-2 border-red-500/60 bg-red-950/10 p-3 shadow-[0_0_16px_rgba(239,68,68,0.25)] animate-in fade-in duration-300">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"></span>
        <span className="text-[10px] font-black uppercase tracking-widest text-red-300">事件裁定</span>
      </div>

      {!isMastermind && incidentPanel.visible && (
        <div className="py-1 text-center text-[10px] text-slate-500">剧作家正在裁定事件…</div>
      )}

      {isMastermind && incidentPanel.visible && (
        <div className="space-y-2">
          {incidentPanel.entries.map((incident) => {
            const interactionId = incident.id;
            const missingTargets = (incident.targetSlots || []).some((slot) => !incTargets[interactionId]?.[slot.slotId]);
            return (
              <div key={interactionId} className="rounded-lg border border-red-800/30 bg-obsidian-900/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-bold text-white">{getIncidentLabel(incident.incidentId)}</span>
                    <div className="text-[9px] text-slate-500">犯人: {incident.culpritId ? getCharLabel(incident.culpritId) : '无'}</div>
                  </div>
                </div>
                {(incident.targetSlots || []).map((slot) => (
                  <div key={`${interactionId}:${slot.slotId}`} className="mt-1.5">
                    <div className="mb-1 text-[9px] font-bold text-red-300/70">{slot.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {buildSidebarSlotOptions(slot).map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setIncTargets((previous) => ({
                            ...previous,
                            [interactionId]: { ...(previous[interactionId] || {}), [slot.slotId]: option.id },
                          }))}
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-all ${
                            incTargets[interactionId]?.[slot.slotId] === option.id
                              ? 'border-red-500 bg-red-700 text-white'
                              : 'border-slate-600/50 bg-obsidian-700 text-slate-400 hover:bg-obsidian-600'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => interactionMoves.resolveIncident(interactionId, true, incTargets[interactionId] || {})}
                    disabled={missingTargets}
                    className="flex-1 rounded-lg border border-red-600/50 bg-red-800 py-1.5 text-[10px] font-black text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    触发
                  </button>
                  <button
                    onClick={() => interactionMoves.resolveIncident(interactionId, false)}
                    className="flex-1 rounded-lg border border-slate-600/50 bg-obsidian-700 py-1.5 text-[10px] font-black text-slate-300 transition-all hover:bg-obsidian-600"
                  >
                    不触发
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {butterflyPanel.visible && butterflyPanel.interaction && isMastermind && (
        <div className="mt-2 rounded-lg border border-red-800/30 bg-obsidian-900/60 px-3 py-2">
          <div className="mb-1 text-[12px] font-bold text-white">🦋 蝴蝶效应</div>
          <div className="mb-2 text-[10px] text-slate-400">
            目标: {butterflyPanel.interaction.targetKind === 'location' ? '📍' : '👤'}{' '}
            {butterflyPanel.interaction.targetKind === 'location'
              ? LOCATION_LABELS_MAP[butterflyPanel.interaction.targetId] || butterflyPanel.interaction.targetId
              : getCharLabel(butterflyPanel.interaction.targetId)}
          </div>
          <div className="flex gap-1.5">
            {(Object.entries(BUTTERFLY_TOKEN_STYLES) as Array<[keyof typeof BUTTERFLY_TOKEN_STYLES, (typeof BUTTERFLY_TOKEN_STYLES)[keyof typeof BUTTERFLY_TOKEN_STYLES]]>)
              .filter(([tokenId]) => butterflyPanel.interaction?.allowedTokens.includes(tokenId))
              .map(([tokenId, style]) => (
                <button
                  key={tokenId}
                  onClick={() => setBfToken(tokenId)}
                  className={`flex-1 rounded-lg border py-1.5 text-[10px] font-black transition-all ${
                    bfToken === tokenId ? style.selected : style.idle
                  }`}
                >
                  {style.label}
                </button>
              ))}
          </div>
          <button
            onClick={() => {
              if (bfToken) {
                interactionMoves.chooseButterflyToken(bfToken);
                setBfToken(null);
              }
            }}
            disabled={!bfToken}
            className="mt-2 w-full rounded-lg border border-purple-500/50 bg-purple-700 py-1.5 text-[10px] font-black text-white transition-all hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            放置指示物
          </button>
        </div>
      )}
    </div>
  );
};
