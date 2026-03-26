import { useState } from 'react';
import {
  TRAGEDY_SETS,
  getModuleData,
} from '@tragedy/domain';
import type { PlotRecord, RoleRecord, IncidentRecord } from '@tragedy/domain';
import { getLocalizedTerm } from '@tragedy/game-logic';

const TIMING_LABELS: Record<string, string> = {
  always: '常驻', loop_start: '轮回开始时', day_start: '回合开始阶段',
  mastermind_ability: '剧作家能力阶段', goodwill_window: '友好能力窗口',
  card_resolve: '行动结算阶段', incident_check: '事件判定',
  incident_resolve: '事件阶段', day_end: '回合结束阶段', loop_end: '轮回结束时',
  end_of_last_day: '最终日的回合结束阶段',
};

/** 格式化规则时序标签，与模组纸面格式一致：【强制/任意能力/失败条件：时序】 */
function formatRuleTiming(timing: string, mandatory: boolean, visibility?: string): string {
  const timingText = TIMING_LABELS[timing] || timing;
  // 失败条件特殊处理
  if (visibility === 'secret_cause' && (timing === 'loop_end' || timing === 'day_end' || timing === 'end_of_last_day')) {
    if (mandatory) return `【失败条件：${timingText}】`;
  }
  const prefix = mandatory ? '强制' : '任意能力';
  return `【${prefix}：${timingText}】`;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type ModuleDataView = {
  plots: Record<string, PlotRecord>;
  roles: Record<string, RoleRecord>;
  incidents: Record<string, IncidentRecord>;
} | undefined;

type Tab = 'overview' | 'plots' | 'roles' | 'incidents' | 'special';

export function TragedySetEncyclopediaModal({ isOpen, onClose }: Props) {
  const sets = Object.values(TRAGEDY_SETS);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!isOpen) return null;

  const selectedSet = selectedSetId ? TRAGEDY_SETS[selectedSetId] : null;

  // 根据 TRAGEDY_SETS 中声明的 available*Ids 过滤，避免展示多余角色/规则/事件
  const moduleData: ModuleDataView = (() => {
    if (!selectedSetId) return undefined;
    const raw = getModuleData(selectedSetId);
    if (!raw) return undefined;
    const set = TRAGEDY_SETS[selectedSetId];
    if (!set) return raw;
    const plotIds = new Set(set.availablePlotIds ?? []);
    const roleIds = new Set(set.availableRoleIds ?? []);
    const incidentIds = new Set(set.availableIncidentIds ?? []);
    const filter = <T extends Record<string, { id: string }>>(
      rec: T, ids: Set<string>
    ): T => {
      if (ids.size === 0) return rec;
      return Object.fromEntries(
        Object.entries(rec).filter(([, v]) => ids.has(v.id))
      ) as T;
    };
    return {
      plots: filter(raw.plots, plotIds),
      roles: filter(raw.roles, roleIds),
      incidents: filter(raw.incidents, incidentIds),
    };
  })();

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'overview', label: '概览', show: true },
    { key: 'plots', label: '规则', show: true },
    { key: 'roles', label: '身份', show: true },
    { key: 'incidents', label: '事件', show: true },
    { key: 'special', label: '特殊机制', show: !!selectedSet?.specialRules?.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-full bg-obsidian-900 border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-obsidian-950/50">
          <div>
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              模组百科 <span className="text-emerald-400">Tragedy Sets</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1 uppercase tracking-wide">
              {selectedSet
                ? `${selectedSet.label['zh-CN']} — ${selectedSet.label.en}`
                : `${sets.length} Modules Available`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedSet && (
              <button
                onClick={() => { setSelectedSetId(null); setActiveTab('overview'); }}
                className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
              >
                ← 返回列表
              </button>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors"
              title="关闭 Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          {!selectedSet ? (
            /* ── Module Grid ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {sets.map((ts) => {
                const plotCount = ts.availablePlotIds?.length ?? 0;
                const roleCount = ts.availableRoleIds?.length ?? 0;
                const incidentCount = ts.availableIncidentIds?.length ?? 0;
                const hasSpecial = !!ts.specialRules?.length;

                return (
                  <button
                    key={ts.id}
                    onClick={() => { setSelectedSetId(ts.id); setActiveTab('overview'); }}
                    className="group text-left bg-black/40 border border-white/5 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all"
                  >
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {ts.label['zh-CN']}
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
                      {ts.label.en}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-loop-950 text-loop-300 border border-loop-800/50">
                        {plotCount} Plots
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blood-950 text-blood-300 border border-blood-800/50">
                        {roleCount} Roles
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                        {incidentCount} Incidents
                      </span>
                      {hasSpecial && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                          Special
                        </span>
                      )}
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
                      <p>子规则数: {ts.subplotCount} · 最终决战: {ts.supportsFinalGuess ? '✓' : '✗'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Module Detail ── */
            <div>
              {/* Tab Bar */}
              <div className="flex gap-1 mb-6 bg-black/30 rounded-lg p-1 border border-white/5">
                {tabs.filter(t => t.show).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-xs font-bold tracking-widest uppercase rounded-md transition-all ${
                      activeTab === tab.key
                        ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && moduleData && (
                <OverviewPanel set={selectedSet} data={moduleData} />
              )}
              {activeTab === 'plots' && moduleData && (
                <PlotsPanel plots={moduleData.plots} />
              )}
              {activeTab === 'roles' && moduleData && (
                <RolesPanel roles={moduleData.roles} />
              )}
              {activeTab === 'incidents' && moduleData && (
                <IncidentsPanel incidents={moduleData.incidents} />
              )}
              {activeTab === 'special' && selectedSet?.specialRules && (
                <SpecialRulesPanel rules={selectedSet.specialRules} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-panels ── */

function OverviewPanel({ set, data }: {
  set: typeof TRAGEDY_SETS[string];
  data: { plots: Record<string, PlotRecord>; roles: Record<string, RoleRecord>; incidents: Record<string, IncidentRecord> };
}) {
  const mainPlots = Object.values(data.plots).filter(p => p.kind === 'main');
  const subPlots = Object.values(data.plots).filter(p => p.kind === 'subplot');

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3">基本信息</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="子规则数" value={String(set.subplotCount)} />
          <Stat label="最终决战" value={set.supportsFinalGuess ? '支持' : '不支持'} />
          <Stat label="支持人数" value={set.supportedPlayerCounts.join(', ') + '人'} />
          <Stat label="特殊机制" value={set.specialRules?.length ? `${set.specialRules.length} 项` : '无'} />
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="主要规则"
          color="loop"
          items={mainPlots.map(p => p.label['zh-CN'])}
        />
        <SummaryCard
          title="副规则"
          color="loop"
          items={subPlots.map(p => p.label['zh-CN'])}
        />
        <SummaryCard
          title="身份"
          color="blood"
          items={Object.values(data.roles).map(r => r.label['zh-CN'])}
        />
      </div>

      <SummaryCard
        title="事件"
        color="amber"
        items={Object.values(data.incidents).map(i => i.label['zh-CN'])}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

function SummaryCard({ title, color, items }: { title: string; color: string; items: string[] }) {
  const colorMap: Record<string, string> = {
    loop: 'text-loop-400 border-loop-800/30',
    blood: 'text-blood-400 border-blood-800/30',
    amber: 'text-amber-400 border-amber-800/30',
  };
  return (
    <div className={`bg-black/30 border ${colorMap[color] || 'border-white/5'} rounded-xl p-4`}>
      <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${colorMap[color]?.split(' ')[0] || 'text-white'}`}>
        {title} ({items.length})
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="px-2 py-0.5 text-[11px] text-slate-300 bg-white/5 rounded">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlotsPanel({ plots }: { plots: Record<string, PlotRecord> }) {
  const mainPlots = Object.values(plots).filter(p => p.kind === 'main');
  const subPlots = Object.values(plots).filter(p => p.kind === 'subplot');

  return (
    <div className="space-y-6">
      <PlotGroup title="主要规则" items={mainPlots} accent="emerald" />
      <PlotGroup title="副规则" items={subPlots} accent="loop" />
    </div>
  );
}

function PlotGroup({ title, items, accent }: { title: string; items: PlotRecord[]; accent: string }) {
  return (
    <div>
      <h3 className={`text-sm font-bold text-${accent}-400 uppercase tracking-widest mb-3`}>{title}</h3>
      <div className="space-y-3">
        {items.map((plot) => (
          <div key={plot.id} className="bg-black/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-bold text-white">
                {plot.label['zh-CN']}
                {plot.label.en && <span className="text-xs text-slate-500 ml-2 font-normal">{plot.label.en}</span>}
              </h4>
            </div>
            {/* Role Requirements */}
            {plot.roleRequirements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {plot.roleRequirements.map((req, i) => (
                  <span key={i} className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-blood-950 text-blood-300 border border-blood-800/50">
                    {getLocalizedTerm(req.roleId)} ×{typeof req.count === 'number' ? req.count : `${req.count.min}-${req.count.max}`}
                  </span>
                ))}
              </div>
            )}
            {/* Rules */}
            {plot.rules.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {plot.rules.map((rule) => (
                  <div key={rule.id} className="text-xs text-slate-400 bg-white/3 rounded p-2 border border-white/5">
                    {rule.timing && <span className="text-emerald-500 font-bold mr-2">{formatRuleTiming(rule.timing, rule.mandatory, rule.visibility)}</span>}
                    {rule.summary['zh-CN']}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesPanel({ roles }: { roles: Record<string, RoleRecord> }) {
  const roleList = Object.values(roles);
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-blood-400 uppercase tracking-widest mb-3">
        身份列表 ({roleList.length})
      </h3>
      {roleList.map((role) => (
        <div key={role.id} className="bg-black/30 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-base font-bold text-white">
              {role.label['zh-CN']}
              {role.label.en && <span className="text-xs text-slate-500 ml-2 font-normal">{role.label.en}</span>}
            </h4>
            <div className="flex gap-1.5">
              {role.maxCopies !== null && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-800 text-slate-300 border border-white/10">
                  上限: {role.maxCopies}
                </span>
              )}
              {role.goodwillRefusal !== 'none' && (
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                  role.goodwillRefusal === 'mandatory'
                    ? 'bg-blood-950 text-blood-300 border-blood-800/50'
                    : 'bg-amber-950 text-amber-300 border-amber-800/50'
                }`}>
                  {role.goodwillRefusal === 'mandatory' ? '绝对无视友好' : '可选无视友好'}
                </span>
              )}
            </div>
          </div>
          {role.rules.length > 0 && (
            <div className="space-y-1.5">
              {role.rules.map((rule) => (
                <div key={rule.id} className="text-xs text-slate-400 bg-white/3 rounded p-2 border border-white/5">
                  {rule.timing && <span className="text-blood-400 font-bold mr-2">{formatRuleTiming(rule.timing, rule.mandatory, rule.visibility)}</span>}
                  {rule.summary['zh-CN']}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IncidentsPanel({ incidents }: { incidents: Record<string, IncidentRecord> }) {
  const list = Object.values(incidents);
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
        事件列表 ({list.length})
      </h3>
      {list.map((inc) => (
        <div key={inc.id} className="bg-black/30 border border-white/5 rounded-xl p-4">
          <h4 className="text-base font-bold text-white mb-2">
            {inc.label['zh-CN']}
            {inc.label.en && <span className="text-xs text-slate-500 ml-2 font-normal">{inc.label.en}</span>}
          </h4>
          {inc.rules.length > 0 && (
            <div className="space-y-1.5">
              {inc.rules.map((rule) => (
                <div key={rule.id} className="text-xs text-slate-400 bg-white/3 rounded p-2 border border-white/5">
                  {rule.timing && <span className="text-amber-400 font-bold mr-2">{formatRuleTiming(rule.timing, rule.mandatory, rule.visibility)}</span>}
                  {rule.summary['zh-CN']}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SpecialRulesPanel({ rules }: { rules: Array<{ title: { 'zh-CN': string; en?: string }; rules: Array<{ id: string; timing?: string; summary: { 'zh-CN': string } }> }> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3">
        特殊机制 ({rules.length} 项)
      </h3>
      {rules.map((group: { title: { 'zh-CN': string; en?: string }; rules: Array<{ id: string; timing?: string; summary: { 'zh-CN': string } }> }, gi: number) => (
        <div key={gi} className="bg-black/30 border border-purple-800/30 rounded-xl p-4">
          <h4 className="text-base font-bold text-purple-300 mb-3">
            {group.title['zh-CN']}
            {group.title.en && <span className="text-xs text-slate-500 ml-2 font-normal">{group.title.en}</span>}
          </h4>
          <div className="space-y-2">
            {group.rules.map((rule) => (
              <div key={rule.id} className="text-xs text-slate-400 bg-white/3 rounded p-3 border border-white/5 whitespace-pre-wrap">
                {rule.timing && <span className="text-purple-400 font-bold mr-2">{formatRuleTiming(rule.timing, (rule as any).mandatory ?? true, (rule as any).visibility)}</span>}
                {rule.summary['zh-CN']}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
