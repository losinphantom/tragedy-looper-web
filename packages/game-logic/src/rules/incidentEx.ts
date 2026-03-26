import type { TragedyGameState } from '../game';

function initialExState(enabled: boolean): TragedyGameState['v1']['ex'] {
  return {
    enabled,
    gauge: 0,
    changedThisLoop: false,
    lastLoopEndGauge: 0,
  };
}

export function configureExForSet(G: TragedyGameState, tragedySetId?: string): void {
  const exSets = ['mystery_circle', 'weird_mythology', 'another_horizon_revised'];
  G.v1.ex = initialExState(!!tragedySetId && exSets.includes(tragedySetId));
}

export function ensureExState(G: TragedyGameState): TragedyGameState['v1']['ex'] {
  if (!G.v1.ex) {
    configureExForSet(G, G.scriptOpen?.tragedySetId);
  }
  return G.v1.ex;
}

export function resetExForNewLoop(G: TragedyGameState, tragedySetId?: string): void {
  const ex = ensureExState(G);
  // WM 旧日魔术规则：Ex 每轮不清零（仅清 changedThisLoop）
  const setId = tragedySetId || G.scriptOpen?.tragedySetId;
  if (setId !== 'weird_mythology') {
    ex.gauge = 0;
  }
  ex.changedThisLoop = false;

  for (const character of Object.values(G.v1.characters)) {
    character.exCardCount = 0;
  }
}

export function recordLoopEndExGauge(G: TragedyGameState): void {
  const ex = ensureExState(G);
  ex.lastLoopEndGauge = ex.gauge;
}

function getIncidentExDelta(incidentId: string, isBlackCatCulprit: boolean): number {
  // 黑猫为当事人时：事件无现象但 Ex 固定 +1
  if (isBlackCatCulprit) return 1;

  if (incidentId === 'bizarre_murder') return 2;
  if (incidentId === 'silver_bullet') return 0;
  return 1;
}

export function applyIncidentExDelta(G: TragedyGameState, incidentId: string, culpritId?: string): number {
  const ex = ensureExState(G);
  if (!ex.enabled) return 0;

  const isBlackCat = !!culpritId && (G.v1.hiddenRoles?.[culpritId] === 'black_cat');
  const delta = getIncidentExDelta(incidentId, isBlackCat);
  ex.gauge = Math.max(0, ex.gauge + delta);
  if (delta !== 0) {
    ex.changedThisLoop = true;
  }
  return delta;
}

/**
 * WM 旧日魔术：友好能力被拒绝时 Ex+1
 * 只在 weird_mythology 模组中生效
 */
export function applyWmGoodwillRefusalEx(G: TragedyGameState): void {
  if (G.scriptOpen?.tragedySetId !== 'weird_mythology') return;
  const ex = ensureExState(G);
  if (!ex.enabled) return;
  ex.gauge = Math.max(0, ex.gauge + 1);
  ex.changedThisLoop = true;
}

