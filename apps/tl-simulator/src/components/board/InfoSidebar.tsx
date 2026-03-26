import React, { useEffect } from 'react';
import { getCharLabel, t } from './boardHelpers';
import { findIncidentById, TRAGEDY_SETS } from '@tragedy/domain';
import { buildPublicHistoryProjection, buildSeatHistoryProjection, type TimelineFact } from '@tragedy/game-logic';
import type { AbilityPanelViewModel, ModuleSurfaceTone, ModuleSurfaceViewModel, GoodwillPanelViewModel, IncidentPanelViewModel, ButterflyChoicePanelViewModel, LoopResultPanelViewModel } from './runtimeInteractionView';
import { PublicInteractionPanels } from './sidebar/PublicInteractionPanels';
import { type SidebarInteractionMoves } from './sidebar/sidebarInteractionHelpers';
import { SecretCastPanel } from './sidebar/SecretCastPanel';
import { formatLogText } from './logTextFormatter';

import { cn } from '../../lib/utils';


// ── G prop 精确子类型 ────────────────────────────────────────────────

export interface SidebarScriptOpen {
  tragedySetId: string;
  specialRules?: (string | { id: string })[];
}

export interface SidebarScriptSecret {
  mainPlotId: string;
  subplotIds?: string[];
  cast: { characterId: string; roleId?: string | null }[];
  incidents: { day: number; incidentId: string; culpritCharacterId: string }[];
}

export interface SidebarGameState {
  scriptOpen: SidebarScriptOpen | null;
  scriptSecret: SidebarScriptSecret | null;
  day: number;
  daysPerLoop: number;
  v1: {
    scheduledIncidents: { day: number; incidentId: string }[];
    incidentHistory?: Array<{ loop: number; day: number; incidentId: string; wasImmune: boolean }>;
    timeline?: {
      facts: TimelineFact[];
    };
  };
}

export interface AbilityMoves {
  confirmAbility: (abilityId: string, targets: Record<string, string>) => void;
  skipAbility: (abilityId: string) => void;
  finishAbilities: () => void;
}

export interface InfoSidebarProps {
  activeTab: 'public' | 'log' | 'secret';
  setActiveTab: (tab: 'public' | 'log' | 'secret') => void;
  isMastermind: boolean;
  isLeader: boolean;
  leaderMode: boolean;
  currentTurnSeatId: string | null;
  viewerSeatId: string | null;
  phase: string;
  moduleSurface: ModuleSurfaceViewModel | null;
  abilityPanel: AbilityPanelViewModel;
  abilityMoves: AbilityMoves;
  goodwillPanel: GoodwillPanelViewModel;
  incidentPanel: IncidentPanelViewModel;
  butterflyPanel: ButterflyChoicePanelViewModel;
  loopResultPanel: LoopResultPanelViewModel;
  interactionMoves: SidebarInteractionMoves;

  G: SidebarGameState;
  onShowReferenceSheet: () => void;
  onDeclareLoopLoss: () => void;
  logEndRef: React.RefObject<HTMLDivElement>;
}

// ── Component ────────────────────────────────────────────────────────────────
export const InfoSidebar: React.FC<InfoSidebarProps> = ({
  activeTab, setActiveTab, isMastermind, isLeader, leaderMode: _leaderMode, currentTurnSeatId: _currentTurnSeatId, viewerSeatId, phase, G,
  moduleSurface, abilityPanel, abilityMoves,
  goodwillPanel, incidentPanel, butterflyPanel, loopResultPanel, interactionMoves,
  onShowReferenceSheet, onDeclareLoopLoss, logEndRef,
}) => {
  const hasMandatoryPending = abilityPanel.phase === 'mandatory';

  // ── Auto-focus: switch to secret tab and expand first mandatory cast ──
  useEffect(() => {
    if (!isMastermind) return;
    if (abilityPanel.phase === 'mandatory' || abilityPanel.phase === 'optional') {
      setActiveTab('secret');
    }
  }, [abilityPanel.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-focus: switch to public tab when goodwill/incident interactions appear ──
  const hasPublicInteraction = goodwillPanel.visible || incidentPanel.visible || butterflyPanel.visible || loopResultPanel.visible;
  useEffect(() => {
    if (hasPublicInteraction) {
      setActiveTab('public');
    }
  }, [hasPublicInteraction]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectedLogEntries = (() => {
    const visibleFacts = G.v1.timeline?.facts || [];
    if (visibleFacts.length === 0) return [];

    const historyEntries = !isMastermind && viewerSeatId
      ? buildSeatHistoryProjection(visibleFacts, viewerSeatId)
      : buildPublicHistoryProjection(visibleFacts);
    return historyEntries.map(entry => entry.text);
  })();

  const canDeclareLoopLoss = isMastermind && [
    'day_start',
    'mastermind_plan',
    'protagonist_plan',
    'resolve_cards',
    'mastermind_abilities',
    'goodwill_window',
    'incidents',
    'day_end',
  ].includes(phase);

  const toneClasses: Record<ModuleSurfaceTone, {
    chip: string;
    text: string;
    dot: string;
    border: string;
    panel: string;
  }> = {
    blood: {
      chip: 'border-blood-500/30 bg-blood-950/40 text-blood-200',
      text: 'text-blood-300',
      dot: 'bg-blood-500',
      border: 'border-blood-900/40',
      panel: 'bg-blood-950/10',
    },
    loop: {
      chip: 'border-loop-500/30 bg-loop-950/40 text-loop-200',
      text: 'text-loop-300',
      dot: 'bg-loop-400',
      border: 'border-loop-900/40',
      panel: 'bg-loop-950/10',
    },
    gold: {
      chip: 'border-gold-500/30 bg-gold-950/40 text-gold-200',
      text: 'text-gold-300',
      dot: 'bg-gold-400',
      border: 'border-gold-900/40',
      panel: 'bg-gold-950/10',
    },
    violet: {
      chip: 'border-purple-500/30 bg-purple-950/40 text-purple-200',
      text: 'text-purple-300',
      dot: 'bg-purple-400',
      border: 'border-purple-900/40',
      panel: 'bg-purple-950/10',
    },
    emerald: {
      chip: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
      border: 'border-emerald-900/40',
      panel: 'bg-emerald-950/10',
    },
    slate: {
      chip: 'border-slate-500/30 bg-slate-900/60 text-slate-200',
      text: 'text-slate-300',
      dot: 'bg-slate-400',
      border: 'border-slate-800/60',
      panel: 'bg-slate-900/30',
    },
  };

  return (
    <aside className={cn('w-[260px] 2xl:w-[340px] shrink-0 bg-obsidian-900/40 backdrop-blur-3xl border-l border-white/5 flex flex-col overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-20 relative')}>
      {/* Tabs header */}
      <div className="flex text-[11px] font-black font-sans uppercase tracking-widest bg-obsidian-900 border-b border-white/5 relative z-10">
        <button onClick={() => setActiveTab('public')} className={`flex-1 py-3.5 transition-all relative ${activeTab === 'public' ? 'text-loop-400 bg-obsidian-800' : 'text-slate-500 hover:bg-obsidian-800/50 hover:text-slate-300'}`}>
          公开情报
          {activeTab === 'public' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-loop-500 shadow-glow-cyan"></div>}
        </button>
        <button onClick={() => setActiveTab('log')} className={`flex-1 py-3.5 transition-all relative ${activeTab === 'log' ? 'text-loop-400 bg-obsidian-800' : 'text-slate-500 hover:bg-obsidian-800/50 hover:text-slate-300'}`}>
          日 志
          {activeTab === 'log' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-loop-500 shadow-glow-cyan"></div>}
        </button>
        {isMastermind && G.scriptSecret && (
          <button onClick={() => setActiveTab('secret')} className={`flex-1 py-3.5 transition-all flex items-center justify-center gap-1.5 relative ${activeTab === 'secret' ? 'text-blood-500 bg-blood-950/20' : 'text-blood-700/60 hover:bg-blood-950/10 hover:text-blood-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'secret' ? 'bg-blood-500 animate-pulse shadow-glow-red' : 'bg-blood-700/50'}`}></span>
            剧本底牌
            {activeTab === 'secret' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blood-500 shadow-glow-red"></div>}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 text-sm scrollbar-thin scrollbar-thumb-slate-700/50 hover:scrollbar-thumb-slate-600 bg-gradient-to-b from-transparent to-obsidian-900/50">


        {/* 1. PUBLIC INFO TAB */}
        {activeTab === 'public' && G.scriptOpen && (
          <div className="space-y-6">
            <div className="bg-obsidian-800/60 border border-white/5 rounded-xl p-4 shadow-lg backdrop-blur-sm">
              <h3 className="text-loop-400 font-black mb-2 text-[10px] uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                <span className="w-1 h-3 bg-loop-500 rounded-full shadow-glow-cyan"></span>
                剧本信息
              </h3>
              <div className="flex justify-between items-center mb-1 mt-1">
                <div className="text-slate-400 text-xs font-sans">模组包：<span className="text-slate-300 font-bold">{TRAGEDY_SETS[G.scriptOpen.tragedySetId]?.label?.['zh-CN'] || TRAGEDY_SETS[G.scriptOpen.tragedySetId]?.label?.en || t(G.scriptOpen.tragedySetId)}</span></div>
                <button
                  onClick={onShowReferenceSheet}
                  className="flex items-center gap-1 text-[11px] font-bold text-loop-400 border border-loop-500/50 bg-loop-900/20 px-2 py-1 rounded hover:bg-loop-500 hover:text-white transition-colors flex-shrink-0"
                >
                  📖 模组参考表
                </button>
              </div>
              {(G.scriptOpen.specialRules?.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="text-[10px] text-gold-500 font-black tracking-widest uppercase mb-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-gold-500 rounded-full"></span> 特殊规则
                  </div>
                  <ul className="text-[13px] text-slate-300 list-disc pl-4 space-y-1 marker:text-gold-700">
                    {G.scriptOpen.specialRules?.map((rule, i) => <li key={i}>{t(typeof rule === 'string' ? rule : rule.id)}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {moduleSurface && (
              <div className={`rounded-xl border p-4 shadow-lg backdrop-blur-sm ${
                moduleSurface.emphasis === 'premium'
                  ? 'border-blood-900/40 bg-gradient-to-br from-blood-950/20 via-obsidian-900/70 to-obsidian-900/90'
                  : 'border-white/5 bg-obsidian-800/60'
              }`}>
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-blood-300">
                        模组状态
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300">
                        {moduleSurface.setCode}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-100">{moduleSurface.setName}</div>
                  </div>
                </div>

                {moduleSurface.badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moduleSurface.badges.map((badge) => {
                      const palette = toneClasses[badge.tone];
                      return (
                        <div
                          key={badge.id}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.18em] ${palette.chip}`}
                        >
                          {badge.label} · {badge.value}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {moduleSurface.sections.map((section) => {
                    const sectionPalette = toneClasses[section.tone];
                    return (
                      <section
                        key={section.id}
                        className={`rounded-xl border p-3 ${sectionPalette.border} ${sectionPalette.panel}`}
                      >
                        <div className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] ${sectionPalette.text}`}>
                          <span className={`h-2 w-2 rounded-full ${sectionPalette.dot}`}></span>
                          {section.title}
                        </div>
                        <div className="space-y-2">
                          {section.entries.map((entry) => {
                            const entryPalette = toneClasses[entry.tone || section.tone];
                            return (
                              <div key={entry.id} className="rounded-lg border border-white/5 bg-black/10 px-3 py-2">
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-[11px] font-black tracking-wide text-slate-200">{entry.label}</span>
                                  <span className={`text-right text-[11px] font-bold ${entryPalette.text}`}>{entry.value}</span>
                                </div>
                                {entry.detail && (
                                  <div className="mt-1 text-[11px] leading-5 text-slate-400">{entry.detail}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            <PublicInteractionPanels
              isMastermind={isMastermind}
              isLeader={isLeader}
              goodwillPanel={goodwillPanel}
              incidentPanel={incidentPanel}
              butterflyPanel={butterflyPanel}
              loopResultPanel={loopResultPanel}
              interactionMoves={interactionMoves}
            />


            <div className="relative">
              <h3 className="text-emerald-400 font-black mb-4 text-[10px] uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                <span className="w-1 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                事件发生表
              </h3>
              <div className="absolute left-[21px] top-[40px] bottom-4 w-px bg-slate-700/50 z-0"></div>
              <div className="space-y-4 relative z-10 w-full">
                {Array.from({ length: G.daysPerLoop }, (_, i) => i + 1).map(day => {
                  const incidents = G.v1.scheduledIncidents.filter(inc => inc.day === day);
                  const isPast = day < G.day;
                  const isToday = day === G.day;
                  const historyForDay = (G.v1.incidentHistory || []).filter(h => h.day === day);

                  const getIncidentStyle = (incidentId: string): string => {
                    if (isToday) return 'text-gold-300 drop-shadow-md';
                    if (!isPast) return 'text-rose-400';
                    const record = historyForDay.find(h => h.incidentId === incidentId);
                    if (record && !record.wasImmune) return 'text-blood-400 line-through decoration-black decoration-2';
                    return 'text-slate-500 line-through decoration-slate-600/60 decoration-2';
                  };

                  const getStatusLabel = (incidentId: string): string | null => {
                    if (!isPast) return null;
                    const record = historyForDay.find(h => h.incidentId === incidentId);
                    if (record && !record.wasImmune) return '已发生';
                    return null;
                  };

                  return (
                    <div key={day} className={`flex items-start gap-5 p-3 rounded-xl transition-all w-full border ${isToday ? 'bg-obsidian-800/80 border-gold-500/30 shadow-[inset_0_0_20px_rgba(217,119,6,0.1)]' : 'border-transparent hover:bg-obsidian-800/40 hover:border-white/5'}`}>
                      <div className={`flex flex-col items-center min-w-[30px] ${isPast ? 'opacity-50' : ''}`}>
                        <div className={`text-[9px] font-black tracking-widest mb-1 ${isToday ? 'text-gold-400' : 'text-slate-500'}`}>DAY</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${isToday ? 'bg-gold-500 text-obsidian-900 border-gold-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-110' : isPast ? 'bg-obsidian-900 border-slate-800 text-slate-600' : 'bg-obsidian-800 border-slate-600 justify-center text-slate-300'}`}>{day}</div>
                      </div>
                      <div className={`flex-1 pt-1.5 break-words overflow-hidden transition-opacity ${isPast ? 'opacity-70' : ''}`}>
                        {incidents.length > 0 ? (
                          <div className="flex flex-col">
                            {incidents.map((incident, index) => {
                              const statusLabel = getStatusLabel(incident.incidentId);
                              return (
                                <div key={`${day}:${incident.incidentId}:${index}`} className={`${index > 0 ? 'mt-1' : ''}`}>
                                  <span className={`font-bold font-serif text-sm tracking-wide leading-tight ${getIncidentStyle(incident.incidentId)}`}>
                                    {findIncidentById(incident.incidentId)?.label?.['zh-CN'] || t(incident.incidentId)}
                                  </span>
                                  {statusLabel && (
                                    <span className="ml-2 text-[9px] font-black tracking-widest uppercase text-blood-500/70">
                                      {statusLabel}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            <span className="text-[10px] text-slate-500 mt-1 tracking-widest font-sans">事件</span>
                          </div>
                        ) : (
                          <div className="text-slate-600 text-[11px] font-medium mt-1 tracking-widest">无事件</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. GAME LOG TAB */}
        {activeTab === 'log' && (
          <div className="space-y-1.5 text-[13px] leading-relaxed font-sans mt-2">
            {projectedLogEntries.map((entry, i) => {
              const isPhaseHeader = entry.startsWith('══') || entry.startsWith('---') || entry.startsWith('═══');
              const isAction = entry.startsWith('▶');
              const isWarning = entry.startsWith('⚠');
              const displayText = formatLogText(entry);

              return (
                <div key={i} className={`p-2 rounded-lg transition-colors ${
                  isPhaseHeader ? 'text-loop-300 font-bold mt-4 bg-loop-900/10 border-l-[3px] border-loop-500 text-xs tracking-wide' :
                  isAction ? 'text-cyan-100 font-medium mt-1 bg-obsidian-800/40 border border-white/5' :
                  isWarning ? 'text-gold-300 font-semibold bg-gold-900/10 border border-gold-900/30' :
                  'text-slate-400 border-b border-white/5 pb-2 hover:bg-white/[0.02]'
                }`}>
                  {displayText}
                </div>
              );
            })}
            <div ref={logEndRef as any} className="h-6" />
          </div>
        )}

        {/* 3. SECRET SCRIPT TAB */}
        {activeTab === 'secret' && G.scriptSecret && (
          <div className="space-y-3">
            {/* Plots — compact inline */}
            <div className="bg-obsidian-800/80 border border-blood-900/50 rounded-lg px-3 py-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 py-0.5 px-2 bg-blood-700 text-white text-[8px] font-black tracking-widest rounded-bl-lg">TOP SECRET</div>
              <h3 className="text-blood-500 font-black text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-2.5 bg-blood-500 rounded-full"></span>
                核心阴谋 (Plots)
              </h3>
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                <span className="text-blood-400 font-serif font-bold">{t(G.scriptSecret.mainPlotId)}</span>
                {G.scriptSecret.subplotIds?.map((sub: string) => (
                  <span key={sub} className="text-rose-400/80 font-serif text-[11px] before:content-['·'] before:text-slate-600 before:mr-1.5">{t(sub)}</span>
                ))}
              </div>
            </div>

            <SecretCastPanel
              cast={G.scriptSecret.cast}
              abilityEntries={abilityPanel.entries}
              hasMandatoryPending={hasMandatoryPending}
              abilityMoves={abilityMoves}
            />

            {/* Culprits — compact table */}
            <div>
              <h3 className="text-rose-600 font-black text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-2.5 bg-rose-600 rounded-full"></span>
                事件犯人 (Culprits)
              </h3>
              <div className="space-y-1">
                {G.scriptSecret.incidents.map((inc: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-obsidian-800/40 px-2 py-1.5 rounded border border-rose-950/40 text-[11px]">
                    <span className="text-gold-500 font-black text-[10px] w-[38px] shrink-0">D{inc.day}</span>
                    <span className="text-rose-400 font-serif font-bold flex-1 truncate">{t(inc.incidentId)}</span>
                    <span className="text-blood-400 font-black text-[10px] bg-blood-950/30 px-1.5 py-0.5 rounded border border-blood-900/30 shrink-0">{getCharLabel(inc.culpritCharacterId)}</span>
                  </div>
                ))}
              </div>
            </div>

            {canDeclareLoopLoss && (
              <div className="mt-4 pt-4 border-t border-blood-900/30">
                <button
                  onClick={() => { if (window.confirm('确认声明轮回失败？')) onDeclareLoopLoss(); }}
                  className="w-full group relative py-3 rounded-xl font-black transition-all duration-300 text-xs tracking-widest uppercase text-yellow-500/80 border border-yellow-500/30 hover:bg-yellow-950/40 hover:text-yellow-400 hover:border-yellow-400 flex items-center justify-center gap-2 shadow-inner bg-obsidian-900/50 backdrop-blur-md"
                  title="承认轮回失败"
                >
                  <span className="text-base leading-none drop-shadow-md">⚠️</span>
                  <span>LOOP LOSS — 声明轮回失败</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  );
};
