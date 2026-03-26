import React, { useEffect, useMemo, useState } from 'react';
import type { TragedyGameState } from '@tragedy/game-logic';
import { getIncidentLabel } from '@tragedy/game-logic';
import { getRolesForSet } from '@tragedy/domain';

type BoardMoves = {
  createMastermindSnapshot: (label?: string) => void;
  restoreMastermindSnapshot: () => void;
  setLoopAndDay: (loopIndex: number, day: number) => void;
  setLeader: (leaderSeat: string) => void;
  setExState: (patch: {
    enabled: boolean;
    gauge: number;
    changedThisLoop: boolean;
    lastLoopEndGauge: number;
  }) => void;
  setHiddenRole: (characterId: string, roleId: string | null) => void;
  setIncidentCulprit: (day: number, incidentId: string, culpritId: string | null) => void;
  jumpToPhase: (phase: string, preserveCurrentSnapshot?: boolean) => void;
  setPlayerCount?: (count: 2 | 3 | 4) => void;
};

interface MastermindConsoleProps {
  isOpen: boolean;
  isMastermind: boolean;
  currentPhase: string;
  G: TragedyGameState;
  moves: BoardMoves;
  onClose: () => void;
}

const PHASE_OPTIONS = [
  'time_spiral',
  'loop_setup',
  'day_start',
  'mastermind_plan',
  'protagonist_plan',
  'resolve_cards',
  'mastermind_abilities',
  'goodwill_window',
  'incidents',
  'day_end',
  'loop_end_check',
  'final_guess',
  'match_end',
];

function formatSnapshotTime(value: string): string {
  return value;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export const MastermindConsole: React.FC<MastermindConsoleProps> = ({
  isOpen,
  isMastermind,
  currentPhase,
  G,
  moves,
  onClose,
}) => {
  const setId = G.scriptOpen?.tragedySetId || '';
  const roleOptions = useMemo(() => (setId ? getRolesForSet(setId) : []), [setId]);
  const scheduledIncidents = useMemo(() => {
    const seen = new Set<string>();
    return (G.v1.scheduledIncidents || []).filter(incident => {
      const key = `${incident.day}_${incident.incidentId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [G.v1.scheduledIncidents]);

  const characterIds = Object.keys(G.v1.characters || {});
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [jumpPhase, setJumpPhase] = useState(currentPhase || 'time_spiral');
  const [loopIndex, setLoopIndex] = useState(G.loopIndex);
  const [day, setDay] = useState(G.day);
  const [leader, setLeader] = useState(G.v1.leader || '1');
  const [exEnabled, setExEnabled] = useState(!!G.v1.ex.enabled);
  const [exGauge, setExGauge] = useState(G.v1.ex.gauge || 0);
  const [exChanged, setExChanged] = useState(!!G.v1.ex.changedThisLoop);
  const [exLastLoop, setExLastLoop] = useState(G.v1.ex.lastLoopEndGauge || 0);
  const [selectedCharId, setSelectedCharId] = useState(characterIds[0] || '');
  const [selectedRoleId, setSelectedRoleId] = useState(
    characterIds[0] ? (G.v1.hiddenRoles[characterIds[0]] || '') : ''
  );
  const [culpritDay, setCulpritDay] = useState(scheduledIncidents[0]?.day || 1);
  const [culpritIncidentId, setCulpritIncidentId] = useState(scheduledIncidents[0]?.incidentId || '');
  const [culpritCharId, setCulpritCharId] = useState(
    scheduledIncidents[0]
      ? (G.v1.incidentCulprits[`${scheduledIncidents[0].day}_${scheduledIncidents[0].incidentId}`] || '')
      : ''
  );

  useEffect(() => {
    if (!isOpen) return;
    setJumpPhase(currentPhase || 'time_spiral');
    setLoopIndex(G.loopIndex);
    setDay(G.day);
    setLeader(G.v1.leader || '1');
    setExEnabled(!!G.v1.ex.enabled);
    setExGauge(G.v1.ex.gauge || 0);
    setExChanged(!!G.v1.ex.changedThisLoop);
    setExLastLoop(G.v1.ex.lastLoopEndGauge || 0);
  }, [isOpen, currentPhase, G.loopIndex, G.day, G.v1.leader, G.v1.ex]);

  useEffect(() => {
    if (!selectedCharId && characterIds[0]) {
      setSelectedCharId(characterIds[0]);
      setSelectedRoleId(G.v1.hiddenRoles[characterIds[0]] || '');
    }
  }, [selectedCharId, characterIds, G.v1.hiddenRoles]);

  useEffect(() => {
    if (!selectedCharId) return;
    setSelectedRoleId(G.v1.hiddenRoles[selectedCharId] || '');
  }, [selectedCharId, G.v1.hiddenRoles]);

  useEffect(() => {
    if (!scheduledIncidents.length) return;
    const first = scheduledIncidents[0];
    const hasMatch = scheduledIncidents.some(
      incident => incident.day === culpritDay && incident.incidentId === culpritIncidentId,
    );
    if (!hasMatch) {
      setCulpritDay(first.day);
      setCulpritIncidentId(first.incidentId);
      setCulpritCharId(G.v1.incidentCulprits[`${first.day}_${first.incidentId}`] || '');
    }
  }, [scheduledIncidents, culpritDay, culpritIncidentId, G.v1.incidentCulprits]);

  useEffect(() => {
    if (!culpritIncidentId) return;
    setCulpritCharId(G.v1.incidentCulprits[`${culpritDay}_${culpritIncidentId}`] || '');
  }, [culpritDay, culpritIncidentId, G.v1.incidentCulprits]);

  if (!isOpen || !isMastermind) return null;

  const snapshot = G.v1.mastermindConsole?.lastSnapshot ?? null;
  const restorePhaseMismatch = !!snapshot && (snapshot.phase || '') !== (currentPhase || '');
  const maxLoopIndex = Math.max(G.maxLoops - 1, 0);
  const maxDay = Math.max(G.daysPerLoop, 0);
  const canQuickAdjustTime = !!G.scriptOpen && currentPhase === 'time_spiral';

  const applyTimeDraft = (nextLoopIndex = loopIndex, nextDay = day) => {
    const clampedLoopIndex = clampNumber(nextLoopIndex, 0, maxLoopIndex);
    const clampedDay = clampNumber(nextDay, 0, maxDay);
    setLoopIndex(clampedLoopIndex);
    setDay(clampedDay);
    moves.setLoopAndDay(clampedLoopIndex, clampedDay);
  };

  const adjustTimeDraft = (loopDelta: number, dayDelta: number) => {
    applyTimeDraft(loopIndex + loopDelta, day + dayDelta);
  };

  const applyExDraft = (nextGauge = exGauge) => {
    const clampedGauge = Math.max(0, Math.trunc(Number.isFinite(nextGauge) ? nextGauge : 0));
    const clampedLastLoop = Math.max(0, Math.trunc(Number.isFinite(exLastLoop) ? exLastLoop : 0));
    setExGauge(clampedGauge);
    setExLastLoop(clampedLastLoop);
    moves.setExState({
      enabled: exEnabled,
      gauge: clampedGauge,
      changedThisLoop: exChanged,
      lastLoopEndGauge: clampedLastLoop,
    });
  };

  const adjustExGauge = (delta: number) => {
    applyExDraft(exGauge + delta);
  };

  return (
    <div className="fixed inset-0 z-[180] bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute right-4 top-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-blood-900/40 bg-obsidian-950/95 shadow-[0_20px_80px_rgba(0,0,0,0.65)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-blood-950/60 to-obsidian-950">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-blood-400 font-black">Mastermind Console</div>
            <div className="text-sm text-slate-300 font-semibold">剧作家控制台</div>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-2 py-1 transition-colors"
          >
            关闭
          </button>
        </div>

        <div className="h-full overflow-y-auto px-5 py-4 pb-10 space-y-5 text-sm text-slate-200">
          <section className="rounded-xl border border-white/5 bg-obsidian-900/70 p-4 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-loop-400">快照 / 回退</div>
            <div className="flex gap-2">
              <input
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="快照名"
                className="flex-1 rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 text-sm outline-none focus:border-loop-500"
              />
              <button
                onClick={() => moves.createMastermindSnapshot(snapshotLabel || undefined)}
                className="rounded-lg border border-loop-700/60 bg-loop-950/40 px-3 py-2 text-loop-300 font-bold hover:bg-loop-900/60"
              >
                保存
              </button>
            </div>
            <button
              onClick={() => moves.restoreMastermindSnapshot()}
              disabled={!snapshot || restorePhaseMismatch}
              className="w-full rounded-lg border border-gold-700/60 bg-gold-950/30 px-3 py-2 text-gold-300 font-bold disabled:opacity-40"
            >
              回退到快照
            </button>
            {snapshot ? (
              <div className="text-xs text-slate-400 leading-relaxed">
                <div>{snapshot.label}</div>
                <div>{snapshot.phase || 'unknown'} · {formatSnapshotTime(snapshot.capturedAt)}</div>
                {restorePhaseMismatch && (
                  <div className="mt-2 space-y-2">
                    <div className="text-amber-400">
                      当前 phase 不一致。请先跳回 {snapshot.phase || 'unknown'} 再恢复快照。
                    </div>
                    <button
                      onClick={() => snapshot.phase && moves.jumpToPhase(snapshot.phase, true)}
                      className="w-full rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-amber-300 font-bold"
                    >
                      跳到快照阶段
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">当前没有快照。</div>
            )}
          </section>

          <section className="rounded-xl border border-white/5 bg-obsidian-900/70 p-4 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400">时间 / 阶段</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => adjustTimeDraft(0, 1)}
                disabled={!canQuickAdjustTime || day >= maxDay}
                className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-40"
              >
                天数 +1
              </button>
              <button
                onClick={() => adjustTimeDraft(0, -1)}
                disabled={!canQuickAdjustTime || day <= 0}
                className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-40"
              >
                天数 -1
              </button>
              <button
                onClick={() => adjustTimeDraft(1, 0)}
                disabled={!canQuickAdjustTime || loopIndex >= maxLoopIndex}
                className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-40"
              >
                轮回 +1
              </button>
              <button
                onClick={() => adjustTimeDraft(-1, 0)}
                disabled={!canQuickAdjustTime || loopIndex <= 0}
                className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-40"
              >
                轮回 -1
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <div className="text-[11px] text-slate-500">轮回索引</div>
                <input
                  type="number"
                  min={0}
                  max={maxLoopIndex}
                  value={loopIndex}
                  onChange={(e) => setLoopIndex(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-500">天数</div>
                <input
                  type="number"
                  min={0}
                  max={G.daysPerLoop}
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <button
              onClick={() => applyTimeDraft()}
              className="w-full rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 font-bold text-emerald-300"
            >
              应用时间调整
            </button>
            <div className="flex gap-2">
              <select
                value={jumpPhase}
                onChange={(e) => setJumpPhase(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-emerald-500"
              >
                {PHASE_OPTIONS.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
              <button
                onClick={() => moves.jumpToPhase(jumpPhase)}
                className="rounded-lg border border-blood-700/60 bg-blood-950/30 px-3 py-2 font-bold text-blood-300"
              >
                跳转
              </button>
            </div>
            <div className="text-xs text-slate-500">阶段跳转会自动保存一份快照。</div>
          </section>

          <section className="rounded-xl border border-white/5 bg-obsidian-900/70 p-4 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-orange-400">人数模式</div>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map(count => (
                <button
                  key={count}
                  onClick={() => moves.setPlayerCount?.(count)}
                  className={`flex-1 rounded-lg border px-3 py-2 font-bold transition-all ${
                    G.v1.settings.playerCount === count
                      ? 'border-orange-500 bg-orange-950/60 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                      : 'border-slate-700 bg-obsidian-950 text-slate-400 hover:border-orange-700/50 hover:text-orange-400'
                  }`}
                >
                  {count}人
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500">
              {G.v1.settings.playerCount === 2 ? '⚡ 1剧作+1主角，主角出3张' : G.v1.settings.playerCount === 3 ? '⚡ 1剧作+2主角，队长出2张' : '⚡ 标准模式'}
            </div>
          </section>

          <section className="rounded-xl border border-white/5 bg-obsidian-900/70 p-4 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-cyan-400">队长 / Ex</div>
            <div className="flex gap-2">
              <select
                value={leader}
                onChange={(e) => setLeader(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-cyan-500"
              >
                <option value="1">主角 1</option>
                <option value="2">主角 2</option>
                <option value="3">主角 3</option>
              </select>
              <button
                onClick={() => moves.setLeader(leader)}
                className="rounded-lg border border-cyan-700/60 bg-cyan-950/30 px-3 py-2 font-bold text-cyan-300"
              >
                调整队长
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => adjustExGauge(1)}
                className="rounded-lg border border-cyan-700/60 bg-cyan-950/30 px-3 py-2 text-xs font-bold text-cyan-300"
              >
                EX 槽 +1
              </button>
              <button
                onClick={() => adjustExGauge(-1)}
                disabled={exGauge <= 0}
                className="rounded-lg border border-cyan-700/60 bg-cyan-950/30 px-3 py-2 text-xs font-bold text-cyan-300 disabled:opacity-40"
              >
                EX 槽 -1
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <div className="text-[11px] text-slate-500">Ex 槽</div>
                <input
                  type="number"
                  min={0}
                  value={exGauge}
                  onChange={(e) => setExGauge(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </label>
              <label className="space-y-1">
                <div className="text-[11px] text-slate-500">上轮结束 Ex</div>
                <input
                  type="number"
                  min={0}
                  value={exLastLoop}
                  onChange={(e) => setExLastLoop(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={exEnabled} onChange={(e) => setExEnabled(e.target.checked)} />
              Ex 系统启用
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={exChanged} onChange={(e) => setExChanged(e.target.checked)} />
              本轮已变动
            </label>
            <button
              onClick={() => applyExDraft()}
              className="w-full rounded-lg border border-cyan-700/60 bg-cyan-950/30 px-3 py-2 font-bold text-cyan-300"
            >
              应用 Ex 调整
            </button>
          </section>

          <section className="rounded-xl border border-white/5 bg-obsidian-900/70 p-4 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-fuchsia-400">隐藏身份</div>
            <select
              value={selectedCharId}
              onChange={(e) => setSelectedCharId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-fuchsia-500"
            >
              {characterIds.map(charId => (
                <option key={charId} value={charId}>{charId}</option>
              ))}
            </select>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-fuchsia-500"
            >
              <option value="">清除隐藏身份</option>
              {roleOptions.map(role => (
                <option key={role.id} value={role.id}>
                  {role.label['zh-CN'] || role.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => moves.setHiddenRole(selectedCharId, selectedRoleId || null)}
              disabled={!selectedCharId}
              className="w-full rounded-lg border border-fuchsia-700/60 bg-fuchsia-950/30 px-3 py-2 font-bold text-fuchsia-300 disabled:opacity-40"
            >
              应用身份调整
            </button>
          </section>

          <section className="rounded-xl border border-white/5 bg-obsidian-900/70 p-4 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-400">事件当事人</div>
            <select
              value={`${culpritDay}_${culpritIncidentId}`}
              onChange={(e) => {
                const [nextDay, nextIncident] = e.target.value.split('_');
                setCulpritDay(Number(nextDay));
                setCulpritIncidentId(nextIncident);
              }}
              className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-amber-500"
            >
              {scheduledIncidents.map(incident => (
                <option
                  key={`${incident.day}_${incident.incidentId}`}
                  value={`${incident.day}_${incident.incidentId}`}
                >
                  D{incident.day} · {getIncidentLabel(incident.incidentId)}
                </option>
              ))}
            </select>
            <select
              value={culpritCharId}
              onChange={(e) => setCulpritCharId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-obsidian-950 px-3 py-2 outline-none focus:border-amber-500"
            >
              <option value="">清除当事人</option>
              {characterIds.map(charId => (
                <option key={charId} value={charId}>{charId}</option>
              ))}
            </select>
            <button
              onClick={() => moves.setIncidentCulprit(culpritDay, culpritIncidentId, culpritCharId || null)}
              disabled={!culpritIncidentId}
              className="w-full rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 font-bold text-amber-300 disabled:opacity-40"
            >
              应用当事人调整
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
