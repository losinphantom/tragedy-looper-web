import React, { useState, useMemo } from 'react';
import { getCharLabel, getCharImageSrc } from './boardHelpers';
import { getModuleData } from '@tragedy/domain';
import type { CharacterState, FinalGuessRecord, FinalGuessTarget } from '@tragedy/game-logic';

type FinalGuessDraft = {
  roleId?: string;
  frontRoleId?: string;
  backRoleId?: string;
};

function isDualGuessRecord(guess: FinalGuessRecord): guess is Extract<FinalGuessRecord, { guessedFrontRoleId: string }> {
  return 'guessedFrontRoleId' in guess;
}

interface FinalGuessOverlayProps {
  characters: Record<string, CharacterState>;
  tragedySetId: string;
  targets?: FinalGuessTarget[];
  guesses: FinalGuessRecord[];
  completed: boolean;
  winner?: 'mastermind' | 'protagonist' | 'betrayer_A' | 'betrayer_B' | 'betrayer_C';
  isMastermind: boolean;
  onSubmitGuess: (
    charId: string,
    guess: string | { frontRoleId: string; backRoleId: string }
  ) => void;
}

export const FinalGuessOverlay: React.FC<FinalGuessOverlayProps> = ({
  characters, tragedySetId, targets = [], guesses, completed, winner, isMastermind, onSubmitGuess,
}) => {
  const [draft, setDraft] = useState<Record<string, FinalGuessDraft>>({});
  // After user clicks "submit all", we submit one by one
  const [submitting, setSubmitting] = useState(false);

  const availableRoles = useMemo(() => {
    const moduleData = getModuleData(tragedySetId);
    if (!moduleData) return [];
    const roles = Object.values(moduleData.roles) as Array<{ id: string; label: Record<string, string> }>;
    const result = [{ id: 'person', label: '平民' }];
    for (const r of roles) {
      result.push({ id: r.id, label: r.label['zh-CN'] || r.id });
    }
    return result;
  }, [tragedySetId]);

  const charEntries = Object.entries(characters);
  const targetMap = new Map(targets.map(target => [target.charId, target]));
  const allFilled = charEntries.every(([charId]) => {
    const target = targetMap.get(charId);
    const draftEntry = draft[charId];
    if (target?.requiresDualGuess) {
      return !!draftEntry?.frontRoleId && !!draftEntry?.backRoleId;
    }
    return !!draftEntry?.roleId;
  });
  const guessedCharIds = new Set(guesses.map(g => g.charId));

  // Submit all guesses sequentially
  const handleSubmitAll = async () => {
    if (!allFilled || submitting) return;
    setSubmitting(true);
    for (const [charId] of charEntries) {
      // Already submitted by backend from a previous call
      if (guessedCharIds.has(charId)) continue;
      const target = targetMap.get(charId);
      const draftEntry = draft[charId];
      if (target?.requiresDualGuess) {
        if (!draftEntry?.frontRoleId || !draftEntry?.backRoleId) continue;
        onSubmitGuess(charId, {
          frontRoleId: draftEntry.frontRoleId,
          backRoleId: draftEntry.backRoleId,
        });
      } else {
        if (!draftEntry?.roleId) continue;
        onSubmitGuess(charId, draftEntry.roleId);
      }
      // Small delay so boardgame.io can process each move
      await new Promise(r => setTimeout(r, 100));
    }
    setSubmitting(false);
  };

  const updateDraft = (charId: string, partial: FinalGuessDraft) => {
    setDraft(prev => ({
      ...prev,
      [charId]: {
        ...prev[charId],
        ...partial,
      },
    }));
  };

  // Phase: drafting (filling in all guesses) vs results (after submit)
  const showResults = guesses.length > 0;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-obsidian-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-obsidian-900 via-purple-900/20 to-obsidian-900">
          <h2 className="text-2xl font-black tracking-widest text-center">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              🎯 最终猜测
            </span>
          </h2>
          <p className="text-center text-slate-400 text-sm mt-2">
            {isMastermind
              ? '等待主角团猜测每个角色的身份…'
              : completed
                ? winner === 'protagonist' ? '🏆 全部猜对！主角团获胜！' : '💀 猜测错误，剧作家获胜！'
                : showResults
                  ? '正在判定猜测结果…'
                  : '为每个角色选择身份，全部选完后一次性提交判定。'
            }
          </p>
        </div>

        {/* Character List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {charEntries.map(([charId, char]) => {
              const guess = guesses.find(g => g.charId === charId);
              const isGuessed = !!guess;
              const charLabel = getCharLabel(charId);
              const target = targetMap.get(charId);
              const draftEntry = draft[charId] || {};
              const draftRole = draftEntry.roleId || '';
              const draftFrontRole = draftEntry.frontRoleId || '';
              const draftBackRole = draftEntry.backRoleId || '';

              return (
                <div
                  key={charId}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                    isGuessed
                      ? guess.correct
                        ? 'border-emerald-500/60 bg-emerald-900/10'
                        : 'border-blood-500/60 bg-blood-900/10'
                      : (target?.requiresDualGuess
                        ? !!draftFrontRole && !!draftBackRole
                        : !!draftRole)
                        ? 'border-loop-400/40 bg-loop-900/5'
                        : 'border-white/10 bg-obsidian-800/50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                    <img
                      src={getCharImageSrc(charId)}
                      alt={charId}
                      className={`w-full h-full object-cover object-top ${!char.alive ? 'grayscale opacity-50' : ''}`}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>

                  {/* Name */}
                  <div className="flex-shrink-0 w-20">
                    <span className="text-sm font-bold text-white block truncate">{charLabel}</span>
                    {!char.alive && <span className="text-[10px] text-blood-500">已死亡</span>}
                  </div>

                  {/* Role Selection / Result */}
                  <div className="flex-1">
                    {isGuessed ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${guess.correct ? 'text-emerald-400' : 'text-blood-400'}`}>
                          {guess.correct ? '✅' : '❌'}
                        </span>
                        {isDualGuessRecord(guess) ? (
                          <>
                            <span className="text-sm text-slate-300">
                              表：{availableRoles.find(r => r.id === guess.guessedFrontRoleId)?.label || guess.guessedFrontRoleId}
                            </span>
                            <span className="text-sm text-slate-300">
                              里：{availableRoles.find(r => r.id === guess.guessedBackRoleId)?.label || guess.guessedBackRoleId}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-300">
                            {availableRoles.find(r => r.id === guess.guessedRole)?.label || guess.guessedRole}
                          </span>
                        )}
                      </div>
                    ) : target?.requiresDualGuess ? (
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={draftFrontRole}
                          onChange={(e) => updateDraft(charId, { frontRoleId: e.target.value })}
                          disabled={isMastermind || completed || submitting}
                          className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-loop-500/50 disabled:opacity-30"
                        >
                          <option value="">表世界身份…</option>
                          {availableRoles.map(r => (
                            <option key={`front:${r.id}`} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                        <select
                          value={draftBackRole}
                          onChange={(e) => updateDraft(charId, { backRoleId: e.target.value })}
                          disabled={isMastermind || completed || submitting}
                          className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-loop-500/50 disabled:opacity-30"
                        >
                          <option value="">里世界身份…</option>
                          {availableRoles.map(r => (
                            <option key={`back:${r.id}`} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <select
                        value={draftRole}
                        onChange={(e) => updateDraft(charId, { roleId: e.target.value })}
                        disabled={isMastermind || completed || submitting}
                        className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-loop-500/50 disabled:opacity-30"
                      >
                        <option value="">选择身份…</option>
                        {availableRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit All Button (protagonist only, before submission) */}
        {!isMastermind && !completed && !showResults && (
          <div className="p-4 border-t border-white/10 bg-obsidian-900/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {charEntries.filter(([charId]) => {
                const target = targetMap.get(charId);
                const draftEntry = draft[charId];
                if (target?.requiresDualGuess) {
                  return !!draftEntry?.frontRoleId && !!draftEntry?.backRoleId;
                }
                return !!draftEntry?.roleId;
              }).length} / {charEntries.length} 已填写
            </span>
            <button
              onClick={handleSubmitAll}
              disabled={!allFilled || submitting}
              className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black tracking-wider rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? '判定中…' : '🎯 提交全部猜测'}
            </button>
          </div>
        )}

        {/* Result banner */}
        {completed && (
          <div className={`p-4 text-center font-black text-lg tracking-widest ${
            winner === 'protagonist'
              ? 'bg-emerald-900/30 text-emerald-300 border-t border-emerald-500/30'
              : 'bg-blood-900/30 text-blood-300 border-t border-blood-500/30'
          }`}>
            {winner === 'protagonist' ? '🏆 全部正确 — 主角团获胜！' : '💀 猜测失败 — 剧作家获胜！'}
          </div>
        )}
      </div>
    </div>
  );
};
