/**
 * ScriptSelectorScreen — Displayed to the Mastermind (player 0)
 * before game start, allowing them to choose which script to run.
 * 
 * 支持 300+ 剧本的筛选：模组筛选、来源筛选、标题搜索、分页显示
 */
import React, { useEffect, useState, useMemo } from 'react';
import { getAllScripts, getTragedySetById, TRAGEDY_SETS } from '@tragedy/domain';
import { getScriptPlayability } from '@tragedy/game-logic';
import type { ScriptRegistryEntry } from '@tragedy/domain';

// ── Script display entry ──────────────────────────────────────────────────────

interface ScriptEntry {
  id: string;
  label: string;
  subtitle: string;
  module: string;
  moduleId: string;
  days: number;
  loops: number;
  characters: number;
  incidents: number;
  difficulty: string;
  source: string;
  accentColor: string;
  playable: boolean;
  coveragePercent: number;
  missingCount: number;
}

// Accent color per tragedy set
const SET_ACCENT: Record<string, string> = {
  first_steps: 'from-loop-600 to-blue-700',
  basic_tragedy: 'from-blood-600 to-rose-700',
  midnight_zone: 'from-purple-600 to-indigo-700',
  mystery_circle: 'from-emerald-600 to-teal-700',
  haunted_stage_again: 'from-orange-600 to-amber-700',
  weird_mythology: 'from-violet-600 to-fuchsia-700',
  another_horizon_revised: 'from-cyan-600 to-sky-700',
  last_liar: 'from-red-700 to-pink-700',
  // 旧版模组
  basic_tragedy_old: 'from-rose-700 to-red-800',
  haunted_stage: 'from-amber-600 to-orange-800',
  another_horizon: 'from-sky-600 to-cyan-800',
  // 同人 & 英文模组
  supernatural_tragedy: 'from-indigo-600 to-violet-800',
  echoing_love_a: 'from-pink-500 to-rose-700',
  old_fashion: 'from-yellow-600 to-amber-800',
  sin_city: 'from-slate-500 to-zinc-700',
  unheard_malice: 'from-red-600 to-stone-800',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  '入门': 'text-emerald-400 border-emerald-700 bg-emerald-950/40',
  '练习': 'text-emerald-400 border-emerald-700 bg-emerald-950/40',
  '初级': 'text-loop-400 border-loop-700 bg-loop-950/40',
  '容易': 'text-loop-400 border-loop-700 bg-loop-950/40',
  '中级': 'text-gold-400 border-gold-700 bg-gold-950/40',
  '普通': 'text-gold-400 border-gold-700 bg-gold-950/40',
  '高级': 'text-blood-400 border-blood-700 bg-blood-950/40',
  '困难': 'text-blood-400 border-blood-700 bg-blood-950/40',
  '鬼畜': 'text-purple-400 border-purple-700 bg-purple-950/40',
};

// Difficulty inference
function inferDifficulty(days: number, cast: number, rawDifficulty?: string): string {
  if (rawDifficulty) return rawDifficulty;
  if (days <= 4 && cast <= 5) return '入门';
  if (days <= 5 && cast <= 7) return '初级';
  if (days <= 7 && cast <= 9) return '中级';
  return '高级';
}

// Source label
const SOURCE_LABELS: Record<string, string> = {
  manual: '手动',
  default: '默认',
  en: '英文',
};

const FILTER_SELECT = 'bg-obsidian-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-loop-500/60 transition-colors cursor-pointer';

const PAGE_SIZE = 30;

interface Props {
  isMastermind: boolean;
  onSelectScript: (scriptId: string) => void;
  onBack?: () => void;
}

function buildEntry(entry: ScriptRegistryEntry): ScriptEntry {
  const def = entry.def as any;
  const title = typeof def.title === 'string' ? def.title : def.title?.['zh-CN'] || entry.id;
  const setId = def.tragedySetId || '';
  const setRecord = getTragedySetById(setId);
  const moduleName = setRecord?.label?.['zh-CN'] || setRecord?.label?.en || setId;
  const days = def.daysPerLoop || 0;
  const loops = typeof def.loops === 'number' ? def.loops : def.loops?.recommended || 0;
  const cast = def.cast?.length || 0;
  const incidents = def.incidents?.length || 0;

  const playability = getScriptPlayability(entry.id);

  return {
    id: entry.id,
    label: title,
    subtitle: typeof def.title === 'object' ? (def.title?.en || '') : (def.titleEN || ''),
    module: moduleName,
    moduleId: setId,
    days,
    loops,
    characters: cast,
    incidents,
    difficulty: inferDifficulty(days, cast, (entry as any).difficulty),
    source: (entry as any).source || 'manual',
    accentColor: SET_ACCENT[setId] || 'from-slate-600 to-slate-700',
    playable: playability.playable,
    coveragePercent: playability.coveragePercent,
    missingCount: playability.missing.length + playability.validationIssues.length,
  };
}

// Official module IDs (original rulebook modules)
const OFFICIAL_SETS = new Set([
  'first_steps', 'basic_tragedy', 'midnight_zone', 'mystery_circle',
  'haunted_stage_again', 'weird_mythology', 'another_horizon_revised', 'last_liar',
]);

type ScriptTab = 'official' | 'community';

export const ScriptSelectorScreen: React.FC<Props> = ({ isMastermind, onSelectScript, onBack }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');
  const [castFilter, setCastFilter] = useState<string>('all');
  const [incidentsFilter, setIncidentsFilter] = useState<string>('all');
  const [playableFilter, setPlayableFilter] = useState<string>('playable');
  const [page, setPage] = useState(0);
  const [scriptTab, setScriptTab] = useState<ScriptTab>('official');

  // 完整列表
  const allEntries = useMemo(() => getAllScripts().map(buildEntry), []);

  // Tab-scoped entries
  const tabEntries = useMemo(() => {
    return allEntries.filter(e => {
      const isOfficial = OFFICIAL_SETS.has(e.moduleId);
      return scriptTab === 'official' ? isOfficial : !isOfficial;
    });
  }, [allEntries, scriptTab]);

  // 可用模组列表
  const availableModules = useMemo(() => {
    const set = new Set(tabEntries.map(e => e.moduleId));
    return Array.from(set).filter(Boolean).sort();
  }, [tabEntries]);

  // 可用来源列表
  const availableSources = useMemo(() => {
    const set = new Set(tabEntries.map(e => e.source));
    return Array.from(set).sort();
  }, [tabEntries]);

  // 可用难度列表
  const availableDifficulties = useMemo(() => {
    const set = new Set(tabEntries.map(e => e.difficulty));
    return Array.from(set).sort();
  }, [tabEntries]);

  // 可用天数列表
  const availableDays = useMemo(() => {
    const set = new Set(tabEntries.map(e => e.days));
    return Array.from(set).filter(Boolean).sort((a, b) => a - b);
  }, [tabEntries]);

  // 可用角色数列表
  const availableCasts = useMemo(() => {
    const set = new Set(tabEntries.map(e => e.characters));
    return Array.from(set).filter(Boolean).sort((a, b) => a - b);
  }, [tabEntries]);

  // 可用事件数列表
  const availableIncidents = useMemo(() => {
    const set = new Set(tabEntries.map(e => e.incidents));
    return Array.from(set).filter(Boolean).sort((a, b) => a - b);
  }, [tabEntries]);

  // 过滤后列表 (based on tabEntries, not allEntries)
  const filtered = useMemo(() => {
    let list = tabEntries;
    if (moduleFilter !== 'all') {
      list = list.filter(e => e.moduleId === moduleFilter);
    }
    if (sourceFilter !== 'all') {
      list = list.filter(e => e.source === sourceFilter);
    }
    if (difficultyFilter !== 'all') {
      list = list.filter(e => e.difficulty === difficultyFilter);
    }
    if (daysFilter !== 'all') {
      list = list.filter(e => e.days === Number(daysFilter));
    }
    if (castFilter !== 'all') {
      list = list.filter(e => e.characters === Number(castFilter));
    }
    if (incidentsFilter !== 'all') {
      list = list.filter(e => e.incidents === Number(incidentsFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.label.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      );
    }
    if (playableFilter === 'playable') {
      list = list.filter(e => e.playable);
    } else if (playableFilter === 'unplayable') {
      list = list.filter(e => !e.playable);
    }
    return list;
  }, [tabEntries, moduleFilter, sourceFilter, difficultyFilter, daysFilter, castFilter, incidentsFilter, search, playableFilter]);

  const selectedEntry = useMemo(
    () => allEntries.find(entry => entry.id === selected) || null,
    [allEntries, selected],
  );

  useEffect(() => {
    if (!selected) return;
    const stillVisible = filtered.some(entry => entry.id === selected);
    if (!stillVisible) {
      setSelected(null);
    }
  }, [filtered, selected]);

  // 分页
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // 重置所有筛选
  const hasAnyFilter = moduleFilter !== 'all' || sourceFilter !== 'all' || difficultyFilter !== 'all' || daysFilter !== 'all' || castFilter !== 'all' || incidentsFilter !== 'all' || playableFilter !== 'playable' || search.trim() !== '';
  const resetFilters = () => {
    setModuleFilter('all'); setSourceFilter('all'); setDifficultyFilter('all');
    setDaysFilter('all'); setCastFilter('all'); setIncidentsFilter('all');
    setPlayableFilter('playable'); setSearch(''); setPage(0);
  };

  if (!isMastermind) {
    return (
      <div className="flex-1 flex items-center justify-center bg-obsidian-900 text-slate-400 flex-col gap-4">
        <div className="w-16 h-16 border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center">
          <span className="text-3xl animate-pulse">⏳</span>
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest">等待剧本家选择剧本…</p>
        <p className="text-xs text-slate-600 max-w-xs text-center">
          WAITING FOR MASTERMIND TO SELECT SCRIPT
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-obsidian-900 relative min-h-0">
    {/* ── 可滚动内容区 ── */}
    <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto relative hide-scrollbar min-h-0">
      {/* ── Ambient background glow ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blood-900/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-loop-900/15 rounded-full blur-[120px]" />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 text-center pt-10 pb-4">
        <p className="text-[11px] text-blood-400 uppercase tracking-[0.3em] font-bold mb-2">
          📜 SCRIPT SELECTION
        </p>
        <h1 className="text-4xl font-black font-serif tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-gold-400 via-blood-400 to-gold-500 drop-shadow-[0_0_20px_rgba(225,29,72,0.5)]">
          选择剧本
        </h1>
        <p className="text-slate-500 text-sm mt-2 tracking-wide max-w-md mx-auto">
          共 {allEntries.length} 个剧本 · 自动结算可用 {allEntries.filter(e => e.playable).length} 个 · 筛选出 {filtered.length} 个
        </p>
      </div>

      {/* ── Back + Tab Bar ── */}
      <div className="relative z-10 w-full max-w-4xl px-6 mb-2 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-4 py-2.5 bg-obsidian-800 hover:bg-obsidian-700 transition-colors flex items-center gap-2 shrink-0"
          >
            ← 返回大厅
          </button>
        )}
        <div className="flex gap-1 bg-obsidian-800 border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => { setScriptTab('official'); setModuleFilter('all'); setPage(0); }}
            className={`px-5 py-2 rounded-md text-sm font-bold tracking-wide transition-all ${
              scriptTab === 'official'
                ? 'bg-blood-700 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-obsidian-700'
            }`}
          >
            📜 官方模组
          </button>
          <button
            onClick={() => { setScriptTab('community'); setModuleFilter('all'); setPage(0); }}
            className={`px-5 py-2 rounded-md text-sm font-bold tracking-wide transition-all ${
              scriptTab === 'community'
                ? 'bg-violet-700 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-obsidian-700'
            }`}
          >
            🌐 民间 / 旧版模组
          </button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="relative z-10 w-full max-w-4xl px-6 mb-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder="🔍  搜索剧本标题…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 min-w-[200px] bg-obsidian-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-loop-500/60 transition-colors"
        />

        {/* Module filter */}
        <select value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(0); }} className={FILTER_SELECT}>
          <option value="all">📦 全部模组</option>
          {availableModules.map(m => {
            const rec = TRAGEDY_SETS[m];
            const label = rec?.label?.['zh-CN'] || rec?.label?.en || m;
            return <option key={m} value={m}>{label}</option>;
          })}
        </select>

        {/* Difficulty filter */}
        <select value={difficultyFilter} onChange={e => { setDifficultyFilter(e.target.value); setPage(0); }} className={FILTER_SELECT}>
          <option value="all">⭐ 全部难度</option>
          {availableDifficulties.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Days filter */}
        <select value={daysFilter} onChange={e => { setDaysFilter(e.target.value); setPage(0); }} className={FILTER_SELECT}>
          <option value="all">📅 全部天数</option>
          {availableDays.map(d => <option key={d} value={d}>{d}天</option>)}
        </select>

        {/* Cast filter */}
        <select value={castFilter} onChange={e => { setCastFilter(e.target.value); setPage(0); }} className={FILTER_SELECT}>
          <option value="all">👥 全部角色数</option>
          {availableCasts.map(c => <option key={c} value={c}>{c}人</option>)}
        </select>

        {/* Incidents filter */}
        <select value={incidentsFilter} onChange={e => { setIncidentsFilter(e.target.value); setPage(0); }} className={FILTER_SELECT}>
          <option value="all">⚡ 全部事件数</option>
          {availableIncidents.map(n => <option key={n} value={n}>{n}个事件</option>)}
        </select>

        {/* Source filter */}
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(0); }} className={FILTER_SELECT}>
          <option value="all">🌐 全部来源</option>
          {availableSources.map(s => (
            <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>
          ))}
        </select>

        {/* Playability filter */}
        <select value={playableFilter} onChange={e => { setPlayableFilter(e.target.value); setPage(0); }} className={FILTER_SELECT}>
          <option value="playable">✅ 自动结算可用</option>
          <option value="all">🔓 全部</option>
          <option value="unplayable">🔒 仅手动模式</option>
        </select>

        {/* Reset */}
        {hasAnyFilter && (
          <button onClick={resetFilters} className="text-xs text-blood-400 hover:text-blood-300 border border-blood-800/50 rounded-lg px-3 py-2.5 bg-blood-950/30 hover:bg-blood-950/50 transition-colors">
            ✕ 重置
          </button>
        )}
      </div>

      {/* ── Script Cards ── */}
      <div className="relative z-10 w-full max-w-4xl px-6 pb-4 grid grid-cols-1 gap-3">
        {pageItems.map((script) => {
          const isSelected = selected === script.id;
          return (
            <button
              key={script.id}
              title={!script.playable ? `当前不能完整自动结算：存在 ${script.missingCount} 个处理器缺口或剧本约束问题` : undefined}
              className={`relative group w-full text-left rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer
                ${!script.playable ? 'opacity-80' : ''}
                ${isSelected
                  ? 'border-gold-500 shadow-[0_0_30px_rgba(234,179,8,0.3)] bg-obsidian-800'
                  : 'border-slate-800/80 bg-obsidian-900/60 hover:border-slate-500 hover:bg-obsidian-800/80 hover:-translate-y-0.5'
                }
              `}
              onClick={() => setSelected(script.id)}
            >
              {/* Gradient accent strip */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${script.accentColor}`} />

              <div className="pl-5 pr-5 py-3.5 flex gap-4 items-center">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-white truncate">{script.label}</span>
                    {script.subtitle && (
                      <>
                        <span className="text-slate-600 text-xs">/</span>
                        <span className="text-slate-500 text-xs truncate">{script.subtitle}</span>
                      </>
                    )}
                    {script.difficulty && (
                      <span className={`ml-auto shrink-0 text-[10px] font-black px-2 py-0.5 rounded border tracking-wider ${DIFFICULTY_COLOR[script.difficulty] || 'text-slate-400 border-slate-600 bg-slate-800/40'}`}>
                        {script.difficulty}
                      </span>
                    )}
                    {!script.playable && (
                      <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded border tracking-wider text-red-400 border-red-800 bg-red-950/40" title={`当前只能走桌游模拟/主持裁定：存在 ${script.missingCount} 个处理器缺口或剧本约束问题（处理器覆盖率 ${script.coveragePercent}%）`}>
                        🔒 {script.coveragePercent}%
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-bold text-slate-400 bg-obsidian-800 px-2 py-0.5 rounded border border-slate-700/50">
                      {script.module}
                    </span>
                    <span className="text-[10px] font-bold text-loop-400/80 bg-loop-950/20 px-2 py-0.5 rounded border border-loop-800/40">
                      {script.days}天
                    </span>
                    <span className="text-[10px] font-bold text-gold-400/80 bg-gold-950/20 px-2 py-0.5 rounded border border-gold-900/40">
                      {script.loops}轮
                    </span>
                    <span className="text-[10px] font-bold text-purple-400/80 bg-purple-950/20 px-2 py-0.5 rounded border border-purple-900/40">
                      {script.characters}人
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {SOURCE_LABELS[script.source] || script.source}
                    </span>
                  </div>
                </div>

                {/* Selection indicator */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                  ${isSelected ? 'border-gold-400 bg-gold-500/20 shadow-[0_0_12px_rgba(234,179,8,0.5)]' : 'border-slate-700 bg-obsidian-800'}
                `}>
                  {isSelected && <span className="text-gold-400 text-xs font-black">✓</span>}
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="w-full text-center py-12">
            <p className="text-slate-500 text-sm">未找到匹配的剧本</p>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="relative z-10 flex items-center gap-3 pb-4">
          <button
            disabled={currentPage <= 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            className="text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-default px-3 py-1.5 border border-slate-700 rounded-lg bg-obsidian-800 transition-colors"
          >
            ← 上一页
          </button>
          <span className="text-xs text-slate-500 tabular-nums">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            className="text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-default px-3 py-1.5 border border-slate-700 rounded-lg bg-obsidian-800 transition-colors"
          >
            下一页 →
          </button>
        </div>
      )}

    </div>

    {/* ── Confirm Button（固定在 overflow 容器外部） ── */}
    {selectedEntry && filtered.some(entry => entry.id === selectedEntry.id) && (
      <div className="shrink-0 flex justify-center py-4 bg-obsidian-900 border-t border-slate-800/50">
        <button
          className={`relative overflow-hidden group px-12 py-4 rounded-xl font-black text-sm tracking-widest uppercase text-white border transition-all duration-300 hover:-translate-y-1 ${
            selectedEntry.playable
              ? 'bg-blood-900/80 hover:bg-blood-700 border-blood-500/50 shadow-glow-red'
              : 'bg-amber-900/70 hover:bg-amber-800 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
          }`}
          onClick={() => {
            onSelectScript(selectedEntry.id);
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <span className="relative z-10 flex items-center gap-2">
            {selectedEntry.playable ? '📜 确认选择 · 自动/手动均可' : '🏖️ 确认选择 · 仅手动模式'}
          </span>
        </button>
      </div>
    )}
    </div>
  );
};
