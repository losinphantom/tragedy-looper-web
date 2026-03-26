import { type FormEvent, useState } from 'react';
import {
  TRAGEDY_SETS,
  getAllScripts,
} from '@tragedy/domain';
import type { ScriptRegistryEntry } from '@tragedy/domain';
import { getLocalizedTerm, getCharacterLabel } from '@tragedy/game-logic';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const SCRIPT_ENCYCLOPEDIA_PASSWORD = 'shenmidaozhuoyou';

/** 获取标题（兼容 ScriptRegistryEntry 和 def，兼容 string 和 LocalizedText） */
function getTitle(entry: ScriptRegistryEntry | ScriptRegistryEntry['def']): string {
  const def = 'def' in entry ? entry.def : entry;
  const t = def.title;
  if (!t) return ('id' in entry ? (entry as ScriptRegistryEntry).id : '') || '(未命名)';
  if (typeof t === 'string') return t;
  return t['zh-CN'] || t.en || '';
}

/** 获取循环数 */
function getLoops(entry: ScriptRegistryEntry | ScriptRegistryEntry['def']): string {
  const def = 'def' in entry ? entry.def : entry;
  const l = def.loops;
  if (typeof l === 'number') return String(l);
  return String((l as any).recommended ?? l);
}

export function ScriptEncyclopediaModal({ isOpen, onClose }: Props) {
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isOpen) return null;

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.trim() === SCRIPT_ENCYCLOPEDIA_PASSWORD) {
      setIsUnlocked(true);
      setPassword('');
      setPasswordError('');
      return;
    }

    setPasswordError('密码错误，请重试。');
  };

  const handleClose = () => {
    setPassword('');
    setPasswordError('');
    onClose();
  };

  const allScripts = getAllScripts();
  const moduleIds = Object.keys(TRAGEDY_SETS);

  // Filter
  const filtered = allScripts.filter(s => {
    if (selectedModule !== 'all' && s.def.tragedySetId !== selectedModule) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const title = getTitle(s).toLowerCase();
      return title.includes(q) || s.id.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedScript = selectedScriptId
    ? allScripts.find(s => s.id === selectedScriptId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-full bg-obsidian-900 border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-obsidian-950/50">
          <div>
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              剧本百科 <span className="text-gold-400">Scripts</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1 uppercase tracking-wide">
              {!isUnlocked
                ? '请输入访问密码'
                : selectedScript
                  ? getTitle(selectedScript)
                  : `${allScripts.length} Scripts Available`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isUnlocked && selectedScript && (
              <button
                onClick={() => setSelectedScriptId(null)}
                className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
              >
                ← 返回列表
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors"
              title="关闭"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {!isUnlocked ? (
            <ScriptEncyclopediaAccessGate
              password={password}
              passwordError={passwordError}
              onPasswordChange={setPassword}
              onSubmit={handleUnlock}
            />
          ) : !selectedScript ? (
            <ScriptListView
              scripts={filtered}
              moduleIds={moduleIds}
              selectedModule={selectedModule}
              search={search}
              onSelectModule={setSelectedModule}
              onSearch={setSearch}
              onSelect={setSelectedScriptId}
            />
          ) : (
            <ScriptDetailView script={selectedScript} />
          )}
        </div>
      </div>
    </div>
  );
}

function ScriptEncyclopediaAccessGate({
  password,
  passwordError,
  onPasswordChange,
  onSubmit,
}: {
  password: string;
  passwordError: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit = password.trim().length > 0;

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-black/30 border border-gold-500/20 rounded-2xl p-6 shadow-2xl"
      >
        <div className="w-14 h-14 rounded-full bg-gold-950/60 border border-gold-500/30 flex items-center justify-center text-2xl mb-4">
          🔒
        </div>
        <h3 className="text-xl font-black text-white">请输入访问密码</h3>
        <p className="text-sm text-slate-400 mt-2">
          输入正确密码后才能进入剧本百科。
        </p>
        <input
          type="password"
          value={password}
          onChange={e => onPasswordChange(e.target.value)}
          placeholder="请输入密码"
          autoFocus
          className="w-full mt-5 px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-gold-500/50"
        />
        <p className={`mt-3 text-xs ${passwordError ? 'text-rose-400' : 'text-slate-500'}`}>
          {passwordError || '验证通过后可浏览全部剧本内容。'}
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`mt-5 w-full px-4 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all ${
            canSubmit
              ? 'bg-gold-600 hover:bg-gold-500 text-white'
              : 'bg-white/5 text-slate-500 cursor-not-allowed'
          }`}
        >
          进入剧本百科
        </button>
      </form>
    </div>
  );
}

/* ── Script List ── */

function ScriptListView({ scripts, moduleIds, selectedModule, search, onSelectModule, onSearch, onSelect }: {
  scripts: ScriptRegistryEntry[];
  moduleIds: string[];
  selectedModule: string;
  search: string;
  onSelectModule: (id: string) => void;
  onSearch: (q: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 items-center shrink-0">
        <input
          type="text"
          placeholder="搜索剧本名称..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="bg-slate-900 border border-slate-700 focus:border-gold-500/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none w-48"
        />
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => onSelectModule('all')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded ${
              selectedModule === 'all'
                ? 'bg-gold-600 text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            全部
          </button>
          {moduleIds.map(id => (
            <button
              key={id}
              onClick={() => onSelectModule(id)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded ${
                selectedModule === id
                  ? 'bg-gold-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {TRAGEDY_SETS[id]?.label?.['zh-CN'] || id}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-500 ml-auto tracking-widest">
          {scripts.length} 个剧本
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-2">
          {scripts.map(s => {
            const setLabel = TRAGEDY_SETS[s.def.tragedySetId]?.label?.['zh-CN'] || s.def.tragedySetId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="w-full text-left bg-black/30 border border-white/5 hover:border-gold-500/40 hover:bg-gold-950/10 rounded-xl p-4 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-gold-300 transition-colors truncate">
                      {getTitle(s)}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 shrink-0">
                        {setLabel}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {s.def.daysPerLoop}天 · {getLoops(s)}轮
                      </span>
                      {s.source && (
                        <span className="text-[10px] text-slate-600">{s.source}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-600 group-hover:text-gold-400 text-lg shrink-0 ml-2">▶</span>
                </div>
              </button>
            );
          })}
          {scripts.length === 0 && (
            <div className="text-center text-slate-500 py-12 text-sm">
              没有匹配的剧本
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Script Detail ── */

function ScriptDetailView({ script }: { script: ScriptRegistryEntry }) {
  const def = script.def;
  const setLabel = TRAGEDY_SETS[def.tragedySetId]?.label?.['zh-CN'] || def.tragedySetId;

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
      {/* Basic Info */}
      <div className="bg-black/30 border border-white/5 rounded-xl p-5">
        <h3 className="text-xl font-black text-gold-300 mb-3">{getTitle(script)}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <StatBox label="模组" value={setLabel} />
          <StatBox label="天数" value={`${def.daysPerLoop} 天`} />
          <StatBox label="循环数" value={`${getLoops(script)} 轮`} />
          <StatBox label="角色数" value={`${def.cast.length} 人`} />
        </div>
      </div>

      {/* Plots */}
      <div className="bg-black/30 border border-loop-800/30 rounded-xl p-5">
        <h4 className="text-sm font-bold text-loop-400 uppercase tracking-widest mb-3">规则 (Plots)</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-loop-950 text-loop-300 border border-loop-800/50">主规则</span>
            <span className="text-white font-bold">{getLocalizedTerm(def.mainPlotId)}</span>
          </div>
          {def.subplotIds.map(sub => (
            <div key={sub} className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-800 text-slate-300 border border-white/10">副规则</span>
              <span className="text-slate-300">{getLocalizedTerm(sub)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cast */}
      <div className="bg-black/30 border border-fuchsia-800/30 rounded-xl p-5">
        <h4 className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest mb-3">角色分配 (Cast)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {def.cast.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-obsidian-800/50 px-3 py-2 rounded-lg border border-white/5">
              <span className="text-white font-bold text-sm">{getCharacterLabel(c.characterId)}</span>
              <span className="text-fuchsia-400 text-xs font-bold">
                {c.roleId ? getLocalizedTerm(c.roleId) : '无身份'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Incidents */}
      <div className="bg-black/30 border border-amber-800/30 rounded-xl p-5">
        <h4 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">事件发生表 (Incidents)</h4>
        <div className="space-y-2">
          {def.incidents.map((inc, i) => (
            <div key={i} className="flex items-center gap-3 bg-obsidian-800/40 px-3 py-2 rounded-lg border border-white/5">
              <span className="text-gold-500 font-black text-sm w-[40px] shrink-0">D{inc.day}</span>
              <span className="text-amber-300 font-bold flex-1">{getLocalizedTerm(inc.incidentId)}</span>
              <span className="text-blood-400 text-xs font-bold bg-blood-950/30 px-2 py-0.5 rounded border border-blood-900/30 shrink-0">
                {getCharacterLabel(inc.culpritCharacterId)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Special Rules */}
      {def.specialRules?.length > 0 && (
        <div className="bg-black/30 border border-purple-800/30 rounded-xl p-5">
          <h4 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3">特殊规则</h4>
          <div className="space-y-1.5">
            {def.specialRules.map((rule: any, i: number) => (
              <div key={i} className="text-xs text-slate-300 bg-white/3 rounded p-2 border border-white/5">
                {typeof rule === 'string' ? getLocalizedTerm(rule) : (rule.label?.['zh-CN'] || rule.id)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-black text-white">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}
