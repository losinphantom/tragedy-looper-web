import { useState } from 'react';
import { CHARACTERS } from '@tragedy/domain';
import type { CharacterRecord } from '@tragedy/domain';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const LOCATION_LABELS: Record<string, string> = {
  hospital: '医院', shrine: '神社', city: '都市', school: '学校',
};

const TIMING_LABELS: Record<string, string> = {
  always: '常驻', loop_start: '轮回开始时', day_start: '回合开始阶段',
  mastermind_ability: '剧作家能力阶段', goodwill_window: '友好能力窗口',
  card_resolve: '行动结算阶段', incident_check: '事件判定',
  incident_resolve: '事件阶段', day_end: '回合结束阶段', loop_end: '轮回结束时',
  end_of_last_day: '最终日的回合结束阶段',
};

const TRAIT_LABELS: Record<string, string> = {
  student: '学生', boy: '男孩', girl: '少女', man: '男性', woman: '女性',
  adult: '成人', construct: '人造物', animal: '动物', fictional: '幻想',
  plant: '植物', sister: '妹妹',
};

function formatRuleTiming(timing: string, mandatory: boolean, visibility?: string): string {
  const timingText = TIMING_LABELS[timing] || timing;
  if (visibility === 'secret_cause' && (timing === 'loop_end' || timing === 'day_end' || timing === 'end_of_last_day')) {
    if (mandatory) return `【失败条件：${timingText}】`;
  }
  const prefix = mandatory ? '强制' : '任意能力';
  return `【${prefix}：${timingText}】`;
}

export function EncyclopediaModal({ isOpen, onClose }: Props) {
  const [activeSkin, setActiveSkin] = useState<'new' | 'color' | 'dr'>('color');
  const [selectedChar, setSelectedChar] = useState<CharacterRecord | null>(null);
  const [search, setSearch] = useState('');
  const [traitFilter, setTraitFilter] = useState<string>('all');

  if (!isOpen) return null;

  const characters = Object.values(CHARACTERS);

  // Filter characters
  const filtered = characters.filter(c => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!c.label['zh-CN'].toLowerCase().includes(q) && !(c.label.en || '').toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    }
    if (traitFilter !== 'all' && !c.traits.includes(traitFilter)) return false;
    return true;
  });

  const allTraits = Array.from(new Set(characters.flatMap(c => c.traits))).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-full bg-obsidian-900 border border-white/10 rounded-2xl flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-obsidian-950/50">
          <div>
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              角色百科 <span className="text-loop-400">Encyclopedia</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1 uppercase tracking-wide">
              {selectedChar
                ? `${selectedChar.label['zh-CN']} — ${selectedChar.label.en}`
                : `Tragedy Looper Character Database (${characters.length} Entries)`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {selectedChar && (
              <button
                onClick={() => setSelectedChar(null)}
                className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
              >
                ← 返回列表
              </button>
            )}
            {/* Skin Toggle */}
            {!selectedChar && (
              <div className="flex bg-obsidian-900 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setActiveSkin('new')}
                  className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded-md transition-all ${
                    activeSkin === 'new'
                      ? 'bg-loop-600 text-white shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  日式
                </button>
                <button
                  onClick={() => setActiveSkin('color')}
                  className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded-md transition-all ${
                    activeSkin === 'color'
                      ? 'bg-blood-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  彩色
                </button>
                <button
                  onClick={() => setActiveSkin('dr')}
                  className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded-md transition-all ${
                    activeSkin === 'dr'
                      ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DR联动
                </button>
              </div>
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
          {!selectedChar ? (
            /* ── Grid View ── */
            <>
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap gap-3 mb-5">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索角色名称..."
                  className="flex-1 min-w-[200px] px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-loop-500/50"
                />
                <select
                  value={traitFilter}
                  onChange={e => setTraitFilter(e.target.value)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-loop-500/50"
                >
                  <option value="all">全部特性</option>
                  {allTraits.map(t => (
                    <option key={t} value={t}>{TRAIT_LABELS[t] || t}</option>
                  ))}
                </select>
                <div className="text-xs text-slate-500 self-center">
                  {filtered.length} / {characters.length} 角色
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filtered.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className="group relative bg-black/40 border border-white/5 rounded-xl overflow-hidden hover:border-loop-500/50 transition-colors shadow-lg text-left"
                >
                <div className="aspect-[2/3] w-full bg-obsidian-950 relative">
                  {char.source?.alternateCardAssets?.[activeSkin] || char.source?.cardAssetPath ? (
                    <img
                      src={char.source.alternateCardAssets?.[activeSkin] || char.source.cardAssetPath}
                      alt={char.label['zh-CN']}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex w-full h-full items-center justify-center text-slate-600 text-xs">
                      No Image
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 translate-y-2 group-hover:translate-y-0 transition-transform">
                    <p className="text-white font-bold text-sm drop-shadow-md">
                      {char.label['zh-CN']}
                    </p>
                    <p className="text-loop-300 text-[10px] uppercase tracking-wider truncate">
                      {char.label.en}
                    </p>
                  </div>
                  {/* Unease Limit Badge */}
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-blood-700/90 border border-blood-500/50 flex items-center justify-center shadow-[0_0_8px_rgba(225,29,72,0.5)]">
                    <span className="text-white text-[11px] font-black">{char.uneaseLimit}</span>
                  </div>
                </div>
              </button>
              ))}
            </div>
            </>
          ) : (
            /* ── Detail View ── */
            <CharacterDetail char={selectedChar} activeSkin={activeSkin} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Character Detail Panel ── */

function CharacterDetail({ char, activeSkin }: { char: CharacterRecord; activeSkin: 'new' | 'color' | 'dr' }) {
  const imgSrc = char.source?.alternateCardAssets?.[activeSkin] || char.source?.cardAssetPath;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Card Image */}
      {imgSrc && (
        <div className="lg:w-[280px] shrink-0">
          <img
            src={imgSrc}
            alt={char.label['zh-CN']}
            className="w-full rounded-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 space-y-5">
        <div>
          <h3 className="text-2xl font-black text-white">{char.label['zh-CN']}</h3>
          <p className="text-sm text-slate-400 uppercase tracking-wider">{char.label.en}</p>
        </div>

        {/* Basic Stats */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4">
          <h4 className="text-xs font-bold text-loop-400 uppercase tracking-widest mb-3">基本属性</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-black text-white">{char.uneaseLimit}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">不安上限</div>
            </div>
            <div>
              <div className="text-lg font-black text-white">
                {char.startingLocations.map(l => LOCATION_LABELS[l] || l).join(', ')}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">初始位置</div>
            </div>
            <div>
              <div className="text-lg font-black text-white">
                {char.traits.length > 0 ? char.traits.map(t => TRAIT_LABELS[t] || t).join(', ') : '无'}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">特性</div>
            </div>
            <div>
              <div className="text-lg font-black text-white">
                {char.forbiddenLocations.length > 0
                  ? char.forbiddenLocations.map(l => LOCATION_LABELS[l] || l).join(', ')
                  : '无'}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">禁止地点</div>
            </div>
          </div>
        </div>

        {/* Goodwill Abilities */}
        {char.goodwillAbilities.length > 0 && (
          <div className="bg-black/30 border border-emerald-800/30 rounded-xl p-4">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
              友好能力 ({char.goodwillAbilities.length})
            </h4>
            <div className="space-y-2">
              {char.goodwillAbilities.map(ab => (
                <div key={ab.id} className="bg-obsidian-800/50 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-white font-bold text-sm">{ab.label['zh-CN']}</span>
                    {ab.goodwillCost != null && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                        友好 ≥ {ab.goodwillCost}
                      </span>
                    )}
                    {ab.oncePerDay && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-white/10">每日1次</span>
                    )}
                    {ab.oncePerLoop && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-800/50">每轮1次</span>
                    )}
                  </div>
                  {ab.rules.map(rule => (
                    <div key={rule.id} className="text-xs text-slate-400 mt-1">
                      <span className="text-emerald-500 font-bold mr-1">{formatRuleTiming(rule.timing, rule.mandatory, rule.visibility)}</span>
                      {rule.summary['zh-CN']}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passive Abilities */}
        {char.passiveAbilities.length > 0 && (
          <div className="bg-black/30 border border-purple-800/30 rounded-xl p-4">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">
              被动能力 ({char.passiveAbilities.length})
            </h4>
            <div className="space-y-2">
              {char.passiveAbilities.map(ab => (
                <div key={ab.id} className="bg-obsidian-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-white font-bold text-sm mb-1">{ab.label['zh-CN']}</div>
                  {ab.rules.map(rule => (
                    <div key={rule.id} className="text-xs text-slate-400 mt-1">
                      <span className="text-purple-400 font-bold mr-1">{formatRuleTiming(rule.timing, rule.mandatory, rule.visibility)}</span>
                      {rule.summary['zh-CN']}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Script Creation Rules */}
        {char.scriptCreationRules.length > 0 && (
          <div className="bg-black/30 border border-gold-800/30 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-3">
              剧本制作规则
            </h4>
            <div className="space-y-1.5">
              {char.scriptCreationRules.map(rule => (
                <div key={rule.id} className="text-xs text-slate-300 bg-white/3 rounded p-2 border border-white/5">
                  {rule.summary['zh-CN']}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

