import type { TragedyGameState } from '../game';
import { ensureExState } from './incidentEx';

const AHR_WORLD_SHIFT_KEY = '__ahr_world_shift_today';

function ensureMarker(G: TragedyGameState) {
  if (!G.v1.loopState.abilityUsage[AHR_WORLD_SHIFT_KEY]) {
    G.v1.loopState.abilityUsage[AHR_WORLD_SHIFT_KEY] = {
      usedToday: false,
      usedThisLoop: false,
    };
  }
  return G.v1.loopState.abilityUsage[AHR_WORLD_SHIFT_KEY];
}

export function isAhrWorldShiftEnabled(G: TragedyGameState): boolean {
  return G.scriptOpen?.tragedySetId === 'another_horizon_revised' && !!ensureExState(G).enabled;
}

export function isBackWorld(G: TragedyGameState): boolean {
  const ex = ensureExState(G);
  return !!ex.enabled && ex.gauge % 2 === 1;
}

export function isFrontWorld(G: TragedyGameState): boolean {
  return !isBackWorld(G);
}

export function usesReversedEmotionRules(G: TragedyGameState): boolean {
  return isAhrWorldShiftEnabled(G) && isBackWorld(G);
}

export function markWorldShiftThisDay(G: TragedyGameState, source: string): void {
  if (!isAhrWorldShiftEnabled(G)) return;

  const marker = ensureMarker(G);
  marker.usedToday = true;
  marker.usedThisLoop = true;
  G.fullLog.push(`[AHR] world shift queued by ${source}`);
}

export function flushWorldShiftAtDayEnd(G: TragedyGameState): void {
  if (!isAhrWorldShiftEnabled(G)) return;

  const marker = ensureMarker(G);
  if (!marker.usedToday) return;

  const ex = ensureExState(G);
  ex.gauge = Math.max(0, ex.gauge + 1);
  ex.changedThisLoop = true;
  marker.usedToday = false;
  G.publicLog.push(`🌀 世界移动使 Ex +1（当前 ${ex.gauge}）`);
  G.fullLog.push(`[AHR] world shift flushed at day_end: Ex=${ex.gauge}`);
}
