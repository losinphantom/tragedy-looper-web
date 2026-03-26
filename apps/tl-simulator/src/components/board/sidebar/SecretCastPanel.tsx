import React, { useMemo, useState } from 'react';
import { findRoleById } from '@tragedy/domain';
import { getCharLabel, t } from '../boardHelpers';
import type { AbilityPanelEntryViewModel } from '../runtimeInteractionView';
import { buildSidebarSlotOptions } from './sidebarInteractionHelpers';

const TIMING_LABELS: Record<string, string> = {
  always: '常驻',
  loop_start: '轮回开始',
  day_start: '回合开始',
  mastermind_ability: '剧作家能力',
  goodwill_window: '友好窗口',
  card_resolve: '行动结算',
  incident_check: '事件判定',
  incident_resolve: '事件阶段',
  day_end: '回合结束',
  loop_end: '轮回结束',
  end_of_last_day: '最终日结束',
  loop_setup: '轮回准备',
  protagonist_plan: '主人公能力',
};

type SecretCastPanelProps = {
  cast: Array<{ characterId: string; roleId?: string | null }>;
  abilityEntries: AbilityPanelEntryViewModel[];
  hasMandatoryPending: boolean;
  abilityMoves: {
    confirmAbility: (abilityId: string, targets: Record<string, string>) => void;
    skipAbility: (abilityId: string) => void;
  };
};

export const SecretCastPanel: React.FC<SecretCastPanelProps> = ({
  cast,
  abilityEntries,
  hasMandatoryPending,
  abilityMoves,
}) => {
  const [expandedCastId, setExpandedCastId] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Record<string, Record<string, string>>>({});

  const abilityByChar = useMemo(() => {
    const map: Record<string, AbilityPanelEntryViewModel[]> = {};
    for (const entry of abilityEntries) {
      if (!entry.characterId) continue;
      (map[entry.characterId] ??= []).push(entry);
    }
    return map;
  }, [abilityEntries]);
  const globalAbilities = useMemo(
    () => abilityEntries.filter((entry) => !entry.characterId),
    [abilityEntries],
  );
  const hasGlobalMandatory = globalAbilities.some((ability) => ability.mandatory);

  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-fuchsia-500">
        <span className="h-2.5 w-1 rounded-full bg-fuchsia-500"></span>
        暗中角色 (Cast)
      </h3>
      <div className="space-y-1">
        {globalAbilities.length > 0 && (
          <div className="mb-2 rounded border border-amber-600/40 bg-amber-950/20 p-2">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              全局能力
            </div>
            <div className="space-y-2">
              {globalAbilities.map((ability) => {
                const isDisabled = !ability.mandatory && hasMandatoryPending;
                const slots = ability.targetSlots || [];
                const myTargets = selectedTargets[ability.id] || {};
                const allSlotsFilled = slots.every((slot) => !!myTargets[slot.slotId]);
                return (
                  <div
                    key={ability.id}
                    className={`rounded-lg border p-2 text-[10px] leading-relaxed transition-all ${
                      ability.mandatory
                        ? 'border-red-600/60 bg-red-950/30'
                        : isDisabled
                          ? 'border-slate-700/40 bg-obsidian-900/50 opacity-50'
                          : 'border-amber-500/50 bg-amber-950/20'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="rounded border border-amber-700/40 bg-amber-900/50 px-1 py-0.5 text-[8px] font-black tracking-wider text-amber-300">
                        SYSTEM
                      </span>
                      <span className={`rounded px-1 py-0.5 text-[8px] font-black tracking-wider ${
                        ability.mandatory
                          ? 'border border-red-700/40 bg-red-900/50 text-red-300'
                          : 'border border-fuchsia-700/30 bg-fuchsia-900/30 text-fuchsia-300'
                      }`}>
                        {ability.mandatory ? '强制' : '可选'}
                      </span>
                    </div>
                    <div className="mb-1.5 font-medium text-slate-300">{ability.description}</div>

                    {slots.map((slot) => {
                      const current = myTargets[slot.slotId];
                      return (
                        <div key={`${ability.id}:${slot.slotId}`} className="mt-1">
                          <div className="mb-1 text-[9px] font-bold uppercase text-slate-500">{slot.label}</div>
                          <div className="flex flex-wrap gap-1">
                            {buildSidebarSlotOptions(slot).map((option) => (
                              <button
                                key={option.id}
                                disabled={isDisabled}
                                onClick={() => setSelectedTargets((previous) => ({
                                  ...previous,
                                  [ability.id]: { ...(previous[ability.id] || {}), [slot.slotId]: option.id },
                                }))}
                                className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-all ${
                                  current === option.id
                                    ? 'border-loop-500 bg-loop-700 text-white'
                                    : isDisabled
                                      ? 'cursor-not-allowed border-slate-700/30 bg-obsidian-800 text-slate-600'
                                      : 'border-slate-600/50 bg-obsidian-700 text-slate-400 hover:bg-obsidian-600'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="mt-2 flex gap-2">
                      <button
                        disabled={isDisabled || (slots.length > 0 && !allSlotsFilled)}
                        onClick={() => {
                          abilityMoves.confirmAbility(ability.id, myTargets);
                          setSelectedTargets((previous) => {
                            const next = { ...previous };
                            delete next[ability.id];
                            return next;
                          });
                        }}
                        className={`flex-1 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                          ability.mandatory
                            ? 'border-red-500/50 bg-red-700 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40'
                            : 'border-fuchsia-500/50 bg-fuchsia-800 text-white hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-40'
                        }`}
                      >
                        ✓ 确认
                      </button>
                      {!ability.mandatory && (
                        <button
                          disabled={isDisabled}
                          onClick={() => abilityMoves.skipAbility(ability.id)}
                          className="rounded-lg border border-slate-600/50 bg-obsidian-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-obsidian-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          跳过
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {hasGlobalMandatory && (
                <div className="text-[9px] text-red-300/90">存在强制全局能力，需先确认后才能跳过其他可选能力。</div>
              )}
            </div>
          </div>
        )}
        {cast.map((entry) => {
          const isExpanded = expandedCastId === entry.characterId;
          const hasRole = !!entry.roleId;
          const role = entry.roleId ? findRoleById(entry.roleId) : null;
          const hasRules = role && role.rules && role.rules.length > 0;
          const charAbilities = abilityByChar[entry.characterId] || [];
          const charMandatory = charAbilities.filter((ability) => ability.mandatory);
          const charOptional = charAbilities.filter((ability) => !ability.mandatory);
          const hasActiveMandatory = charMandatory.length > 0;
          const hasActiveOptional = charOptional.length > 0;

          const borderClass = hasActiveMandatory
            ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] bg-red-950/20'
            : hasActiveOptional && !hasMandatoryPending
              ? 'border-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.5)] bg-fuchsia-950/20'
              : hasActiveOptional && hasMandatoryPending
                ? 'border-fuchsia-700/40 bg-obsidian-800/50'
                : isExpanded
                  ? 'border-fuchsia-500/50 bg-fuchsia-950/40 shadow-glow-purple'
                  : hasRole
                    ? 'border-fuchsia-900/30 bg-obsidian-800/50 hover:border-fuchsia-500/40 hover:bg-obsidian-800/80'
                    : 'border-white/5 bg-obsidian-800/50';

          return (
            <div key={entry.characterId}>
              <button
                onClick={() => setExpandedCastId(isExpanded ? null : entry.characterId)}
                className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-[11px] transition-all duration-200 ${borderClass}`}
              >
                <span className="mr-1 truncate font-serif font-bold text-slate-300">{getCharLabel(entry.characterId)}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {role?.goodwillRefusal === 'optional' && (
                    <span className="rounded border border-amber-700/40 bg-amber-900/40 px-1 py-0.5 text-[7px] font-black tracking-wider text-amber-300">无视友好</span>
                  )}
                  {role?.goodwillRefusal === 'mandatory' && (
                    <span className="rounded border border-red-700/40 bg-red-900/40 px-1 py-0.5 text-[7px] font-black tracking-wider text-red-300">必定无视友好</span>
                  )}
                  <span className={`text-[10px] font-black tracking-wide ${hasRole ? 'text-fuchsia-400' : 'text-slate-600'}`}>
                    {t(entry.roleId || '无角色')}
                  </span>
                  {hasRole && <span className="text-[8px]">{isExpanded ? '▲' : '▼'}</span>}
                </span>
              </button>

              {isExpanded && hasRole && role && (
                <div className="mt-1 mb-2 ml-1 mr-1 animate-in slide-in-from-top-1 space-y-1.5 rounded-lg border border-fuchsia-900/40 bg-obsidian-900/80 p-2 duration-200">
                  {hasRules ? role.rules.map((rule) => {
                    const isMandatory = rule.mandatory;
                    return (
                      <div
                        key={rule.id}
                        className={`rounded border p-2 text-[10px] leading-relaxed ${
                          isMandatory
                            ? 'border-red-700/50 bg-red-950/20'
                            : 'border-fuchsia-900/30 bg-obsidian-800/40'
                        }`}
                      >
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <span className={`rounded px-1 py-0.5 text-[8px] font-black tracking-wider ${
                            isMandatory
                              ? 'border border-red-700/40 bg-red-900/50 text-red-300'
                              : 'border border-fuchsia-700/30 bg-fuchsia-900/30 text-fuchsia-300'
                          }`}>
                            {isMandatory ? '强制' : '可选'}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {TIMING_LABELS[rule.timing] || rule.timing}
                          </span>
                        </div>
                        <div className="font-medium text-slate-300">
                          {rule.summary?.['zh-CN'] || rule.summary?.en || '—'}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-[10px] italic text-slate-600">无特殊能力规则</div>
                  )}

                  {charAbilities.length > 0 && (
                    <div className="mt-2 space-y-2 border-t border-white/5 pt-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-blood-300">
                        可用能力
                      </div>
                      {charAbilities.map((ability) => {
                        const isDisabled = !ability.mandatory && hasMandatoryPending;
                        const slots = ability.targetSlots || [];
                        const myTargets = selectedTargets[ability.id] || {};
                        const allSlotsFilled = slots.every((slot) => !!myTargets[slot.slotId]);

                        return (
                          <div
                            key={ability.id}
                            className={`rounded-lg border p-2 text-[10px] leading-relaxed transition-all ${
                              ability.mandatory
                                ? 'border-red-600/60 bg-red-950/30'
                                : isDisabled
                                  ? 'border-slate-700/40 bg-obsidian-900/50 opacity-50'
                                  : 'border-fuchsia-600/50 bg-fuchsia-950/20'
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-1.5">
                              <span className={`rounded px-1 py-0.5 text-[8px] font-black tracking-wider ${
                                ability.mandatory
                                  ? 'border border-red-700/40 bg-red-900/50 text-red-300'
                                  : 'border border-fuchsia-700/30 bg-fuchsia-900/30 text-fuchsia-300'
                              }`}>
                                {ability.mandatory ? '强制' : '可选'}
                              </span>
                            </div>
                            <div className="mb-1.5 font-medium text-slate-300">{ability.description}</div>

                            {slots.map((slot) => {
                              const current = myTargets[slot.slotId];
                              return (
                                <div key={`${ability.id}:${slot.slotId}`} className="mt-1">
                                  <div className="mb-1 text-[9px] font-bold uppercase text-slate-500">{slot.label}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {buildSidebarSlotOptions(slot).map((option) => (
                                      <button
                                        key={option.id}
                                        disabled={isDisabled}
                                        onClick={() => setSelectedTargets((previous) => ({
                                          ...previous,
                                          [ability.id]: { ...(previous[ability.id] || {}), [slot.slotId]: option.id },
                                        }))}
                                        className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-all ${
                                          current === option.id
                                            ? 'border-loop-500 bg-loop-700 text-white'
                                            : isDisabled
                                              ? 'cursor-not-allowed border-slate-700/30 bg-obsidian-800 text-slate-600'
                                              : 'border-slate-600/50 bg-obsidian-700 text-slate-400 hover:bg-obsidian-600'
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            <div className="mt-2 flex gap-2">
                              <button
                                disabled={isDisabled || (slots.length > 0 && !allSlotsFilled)}
                                onClick={() => {
                                  abilityMoves.confirmAbility(ability.id, myTargets);
                                  setSelectedTargets((previous) => {
                                    const next = { ...previous };
                                    delete next[ability.id];
                                    return next;
                                  });
                                }}
                                className={`flex-1 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                                  ability.mandatory
                                    ? 'border-red-500/50 bg-red-700 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40'
                                    : 'border-fuchsia-500/50 bg-fuchsia-800 text-white hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-40'
                                }`}
                              >
                                ✓ 确认
                              </button>
                              {!ability.mandatory && (
                                <button
                                  disabled={isDisabled}
                                  onClick={() => abilityMoves.skipAbility(ability.id)}
                                  className="rounded-lg border border-slate-600/50 bg-obsidian-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-obsidian-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  跳过
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
