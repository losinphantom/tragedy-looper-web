import React from 'react';
import { getCharLabel, t } from '../boardHelpers';
import type { GoodwillPanelViewModel } from '../runtimeInteractionView';
import {
  buildSidebarSelectionSummary,
  buildSidebarSlotOptions,
  filterRelevantSidebarSlots,
  type SidebarInteractionMoves,
  type SidebarTargetSelections,
} from './sidebarInteractionHelpers';

type GoodwillInteractionPanelProps = {
  panel: GoodwillPanelViewModel;
  isMastermind: boolean;
  isLeader: boolean;
  gwTargets: SidebarTargetSelections;
  setGwTargets: React.Dispatch<React.SetStateAction<SidebarTargetSelections>>;
  interactionMoves: SidebarInteractionMoves;
};

export const GoodwillInteractionPanel: React.FC<GoodwillInteractionPanelProps> = ({
  panel,
  isMastermind,
  isLeader,
  gwTargets,
  setGwTargets,
  interactionMoves,
}) => {
  if (!panel.visible || panel.phase === 'idle' || panel.phase === 'done') {
    return null;
  }

  const declarationAbility = panel.currentDeclaration
    ? panel.eligibleAbilities.find(
        (ability) => ability.characterId === panel.currentDeclaration?.characterId
          && ability.abilityId === panel.currentDeclaration?.abilityId,
      )
    : null;
  const declarationSummary = buildSidebarSelectionSummary(
    declarationAbility?.targetSlots || [],
    panel.currentDeclaration?.selectedTargets,
  );
  const gwKey = (characterId: string, abilityId: string) => `${characterId}_${abilityId}`;
  const canUse = (ability: GoodwillPanelViewModel['eligibleAbilities'][number]) => {
    const key = gwKey(ability.characterId, ability.abilityId);
    return filterRelevantSidebarSlots(ability.targetSlots || [], gwTargets[key]).every(
      (slot) => !!gwTargets[key]?.[slot.slotId],
    );
  };
  const observerCharacterId = panel.observerCharacterId ?? panel.currentDeclaration?.characterId;
  const observerAbilityId = panel.observerAbilityId ?? panel.currentDeclaration?.abilityId;
  const observerSelectedTargets = panel.observerSelectedTargets || panel.currentDeclaration?.selectedTargets;
  const observerAbility = (observerCharacterId && observerAbilityId)
    ? panel.eligibleAbilities.find(
        (ability) => ability.characterId === observerCharacterId && ability.abilityId === observerAbilityId,
      )
    : null;
  const observerTargetSummary = Object.entries(observerSelectedTargets || {}).map(([slotId, targetId]) => ({
    id: slotId,
    label: t(slotId),
    value: t(targetId),
  }));

  return (
    <div className="rounded-xl border-2 border-pink-500/60 bg-pink-950/10 p-3 shadow-[0_0_16px_rgba(236,72,153,0.25)] animate-in fade-in duration-300">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-1.5 rounded-full bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.6)]"></span>
        <span className="text-[10px] font-black uppercase tracking-widest text-pink-300">友好能力</span>
        <span className="ml-auto text-[9px] text-pink-400/60">
          {panel.phase === 'leader_choosing' ? '队长选择' : panel.phase === 'mastermind_resolving' ? '剧作家裁定' : '等待中'}
        </span>
      </div>

      {((isLeader && !isMastermind && panel.phase === 'leader_choosing') || (isMastermind && isLeader && panel.phase === 'leader_choosing')) && (
        <div className="space-y-2">
          {panel.eligibleAbilities.filter((ability) => !ability.used).map((ability) => {
            const key = gwKey(ability.characterId, ability.abilityId);
            const summary = buildSidebarSelectionSummary(ability.targetSlots || [], gwTargets[key]);
            return (
              <div key={key} className="rounded-lg border border-pink-800/30 bg-obsidian-900/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[12px] font-bold text-white">{getCharLabel(ability.characterId)}</span>
                    <div className="mt-0.5 text-[10px] leading-4 text-slate-400">{ability.label}</div>
                  </div>
                  <button
                    onClick={() => interactionMoves.declareAbility(ability.characterId, ability.abilityId, gwTargets[key] || {})}
                    disabled={!canUse(ability)}
                    className="shrink-0 rounded-lg border border-pink-500/50 bg-pink-700 px-3 py-1.5 text-[10px] font-black text-white transition-all hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    使用
                  </button>
                </div>
                {filterRelevantSidebarSlots(ability.targetSlots || [], gwTargets[key]).map((slot) => (
                  <div key={`${key}:${slot.slotId}`} className="mt-1.5">
                    <div className="mb-1 text-[9px] font-bold text-pink-300/70">{slot.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {buildSidebarSlotOptions(slot).map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setGwTargets((previous) => ({
                            ...previous,
                            [key]: { ...(previous[key] || {}), [slot.slotId]: option.id },
                          }))}
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-all ${
                            gwTargets[key]?.[slot.slotId] === option.id
                              ? 'border-pink-500 bg-pink-700 text-white'
                              : 'border-slate-600/50 bg-obsidian-700 text-slate-400 hover:bg-obsidian-600'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {summary.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {summary.map((entry) => (
                      <div
                        key={`${key}:${entry.id}:summary`}
                        className="rounded-full border border-pink-500/20 bg-pink-950/40 px-2 py-0.5 text-[9px] text-pink-200"
                      >
                        {entry.label}：{entry.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isMastermind && panel.phase === 'mastermind_resolving' && panel.currentDeclaration && (
        <div>
          <div className="mb-2 rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2">
            <div className="text-[12px] font-bold text-white">{getCharLabel(panel.currentDeclaration.characterId)}</div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              {declarationAbility?.label || ''}
            </div>
            {declarationSummary.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {declarationSummary.map((entry) => (
                  <div
                    key={`resolve:${entry.id}`}
                    className="rounded-full border border-pink-500/20 bg-pink-950/40 px-2 py-0.5 text-[9px] text-pink-200"
                  >
                    {entry.label}：{entry.value}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => interactionMoves.resolveAbility(true)}
              className="flex-1 rounded-lg border border-emerald-600/50 bg-emerald-800 py-2 text-[11px] font-black text-white transition-all hover:bg-emerald-700"
            >
              允许
            </button>
            <button
              onClick={() => interactionMoves.resolveAbility(false)}
              className="flex-1 rounded-lg border border-blood-600/50 bg-blood-800 py-2 text-[11px] font-black text-white transition-all hover:bg-blood-700"
            >
              拒绝
            </button>
          </div>
        </div>
      )}

      {!isMastermind && !isLeader && (
        <div className="rounded-lg border border-pink-800/20 bg-obsidian-900/50 px-3 py-2">
          <div className="text-center text-[10px] font-bold text-pink-300">仅观察（无操作权限）</div>
          {(observerCharacterId || observerAbilityId) ? (
            <div className="mt-2 space-y-1 text-[10px] text-slate-300">
              {observerCharacterId && (
                <div>角色：{getCharLabel(observerCharacterId)}</div>
              )}
              {observerAbilityId && (
                <div>能力：{observerAbility?.label || t(observerAbilityId) || observerAbilityId}</div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-center text-[10px] text-slate-500">友好能力处理中…</div>
          )}
          {observerTargetSummary.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {observerTargetSummary.map((entry) => (
                <div
                  key={`observer:${entry.id}`}
                  className="rounded-full border border-pink-500/20 bg-pink-950/40 px-2 py-0.5 text-[9px] text-pink-200"
                >
                  {entry.label}：{entry.value}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLeader && !isMastermind && panel.phase === 'mastermind_resolving' && (
        <div className="rounded-lg border border-pink-800/20 bg-obsidian-900/50 px-3 py-2 text-[10px] text-slate-400">
          <div className="text-center">等待剧作家裁定…</div>
          {declarationSummary.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {declarationSummary.map((entry) => (
                <div
                  key={`leader-wait:${entry.id}`}
                  className="rounded-full border border-pink-500/20 bg-pink-950/40 px-2 py-0.5 text-[9px] text-pink-200"
                >
                  {entry.label}：{entry.value}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isMastermind && !isLeader && panel.phase === 'leader_choosing' && (
        <div className="py-1 text-center text-[10px] text-slate-500">等待队长选择…</div>
      )}
    </div>
  );
};
