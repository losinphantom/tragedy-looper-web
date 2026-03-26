import type { TragedyGameState } from './game';
import { getProtagonistSeats, shouldRotateLeader } from './playerConfig';
import { autoResolve } from './engine/autoResolve';
import { manualPrompt } from './engine/manualFallback';
import { getToken } from './utils/tokenHelpers';
import { getProcessor, setActiveRules } from './ruleEngine';
import { buildModuleAbilityTargetSlots, isModuleCrossPhaseAbility } from './rules/moduleInteraction';
import { collectModulePendingGoodwillAbilities } from './rules/moduleGoodwill';
import { flushWorldShiftAtDayEnd } from './rules/ahrWorldShift';
import { buildActiveRules } from './scriptLoader';
import { clearPendingInteractions, syncPendingInteractionsFromLegacyState } from './runtime/interactions';

function refreshDynamicRolesBeforeDayEnd(G: TragedyGameState): void {
  const dynamicRuleId = (G.v1.activeRuleDefinitions || []).find(rule =>
    rule.ruleId === 'paranoia_virus_rule' || rule.ruleId === 'ahr_paranoia_virus_expanded_transform',
  )?.ruleId;
  if (!dynamicRuleId) return;

  const processor = getProcessor(dynamicRuleId);
  if (!processor) return;

  const before = JSON.stringify(G.v1.hiddenRoles || {});
  const check = processor.check({ G, timing: 'always' });
  if (!check.triggered) return;

  processor.execute({ G, timing: 'always' });
  const after = JSON.stringify(G.v1.hiddenRoles || {});
  if (before === after) return;

  const setId = G.scriptOpen?.tragedySetId;
  if (!setId) return;

  const rules = buildActiveRules(
    setId,
    G.v1.activePlots || [],
    G.v1.hiddenRoles || {},
    G.v1.scheduledIncidents || [],
    G.v1.ahrVariableRoles || {},
  );
  setActiveRules(G, rules);
}

function refreshBorrowedMastermindAbilities(G: TragedyGameState): void {
  const rules = [...(G.v1.activeRuleDefinitions || [])]
    .filter(rule => rule.source !== 'borrowed:factor_school_conspiracy');

  const factorRule = rules.find(
    rule => rule.ruleId === 'factor_school_intrigue_rule' || rule.ruleId === 'factor_school_conspiracy',
  );
  if (!factorRule?.characterId) {
    G.v1.activeRuleDefinitions = rules;
    return;
  }

  const factor = G.v1.characters[factorRule.characterId];
  const school = G.v1.locations.school;
  if (!factor || !factor.alive || !school || getToken(school, 'intrigue') < 2) {
    G.v1.activeRuleDefinitions = rules;
    return;
  }

  rules.push({
    ruleId: 'conspiracy_theorist_unease_ability',
    timing: 'mastermind_ability',
    mandatory: false,
    characterId: factorRule.characterId,
    source: 'borrowed:factor_school_conspiracy',
  });
  G.v1.activeRuleDefinitions = rules;
}

function buildPendingAbilitiesForTiming(
  G: TragedyGameState,
  timing: 'mastermind_ability' | 'day_end',
  phase: 'mastermind_abilities' | 'day_end',
): typeof G.v1.pendingAbilities {
  const matched = (G.v1.activeRuleDefinitions || [])
    .filter((rule) => {
      if (rule.timing !== timing) return false;
      if (timing !== 'day_end') return true;
      return rule.mandatory || isModuleCrossPhaseAbility(G, rule.ruleId);
    });

  const pending: typeof G.v1.pendingAbilities = [];

  for (const rule of matched) {
    const processor = getProcessor(rule.ruleId);
    if (!processor) continue;

    const check = processor.check({ G, timing, characterId: rule.characterId });
    if (!check.triggered) continue;

    pending.push({
      id: `${rule.ruleId}:${rule.characterId || 'global'}`,
      ruleId: rule.ruleId,
      characterId: rule.characterId || '',
      timing,
      phase,
      mandatory: rule.mandatory,
      description: check.message,
      targetSlots: (() => {
        const targetSlots = buildModuleAbilityTargetSlots(G, processor.ruleId, rule.characterId);
        return check.needsInput || targetSlots.length > 0 ? targetSlots : [];
      })(),
    });
  }

  return pending;
}

function buildMastermindPendingAbilities(
  G: TragedyGameState,
): typeof G.v1.pendingAbilities {
  const pending = buildPendingAbilitiesForTiming(G, 'mastermind_ability', 'mastermind_abilities');

  pending.push(...collectModulePendingGoodwillAbilities({ G }).map(ability => ({
    ...ability,
    timing: 'mastermind_ability' as const,
    phase: 'mastermind_abilities' as const,
  })));

  return pending;
}

function buildDayEndPendingAbilities(
  G: TragedyGameState,
): typeof G.v1.pendingAbilities {
  return buildPendingAbilitiesForTiming(G, 'day_end', 'day_end');
}

function dispatchTiming(G: TragedyGameState, timing: string): void {
  if (G.v1.settings.autoResolve) {
    autoResolve(G, timing);
  } else {
    manualPrompt(G, timing);
  }
}

function queuePendingAbilities(
  G: TragedyGameState,
  pending: typeof G.v1.pendingAbilities,
  phase: 'mastermind_abilities' | 'day_end',
): void {
  if (pending.length === 0) {
    if (phase === 'mastermind_abilities') {
      G.v1.pendingAbilities = [];
      G.v1.abilityPhase = 'done';
    }
    clearPendingInteractions(G);
    return;
  }

  const mandatory = pending.filter((ability) => ability.mandatory);
  const optional = pending.filter((ability) => !ability.mandatory);
  G.v1.pendingAbilities = [...mandatory, ...optional];
  G.v1.abilityPhase = mandatory.length > 0 ? 'mandatory' : 'optional';
  syncPendingInteractionsFromLegacyState(G, phase);
}

export function beginMastermindAbilitiesPhase(G: TragedyGameState): void {
  G.publicLog.push('▶ 剧作家能力阶段');
  G.v1.pendingAbilities = [];
  G.v1.abilityPhase = 'idle';
  refreshBorrowedMastermindAbilities(G);

  if (G.v1.settings.autoResolve) {
    manualPrompt(G, 'mastermind_ability');
  }

  queuePendingAbilities(G, buildMastermindPendingAbilities(G), 'mastermind_abilities');
}

export function beginDayEndPhase(
  G: TragedyGameState,
  events: { setPhase: (phase: string) => void },
): void {
  flushWorldShiftAtDayEnd(G);
  clearPendingInteractions(G);
  G.v1.pendingAbilities = [];
  G.v1.abilityPhase = 'idle';

  if (shouldRotateLeader(G)) {
    const protagonistSeats = getProtagonistSeats(G);
    const currentIdx = protagonistSeats.indexOf(G.v1.leader);
    const nextIdx = (currentIdx + 1) % protagonistSeats.length;
    G.v1.leader = protagonistSeats[nextIdx];
    G.leaderSeat = G.v1.leader;
    G.publicLog.push(`🔄 队长交接 → 主角 ${G.v1.leader}`);
  }

  refreshDynamicRolesBeforeDayEnd(G);

  if (G.v1.loopLost || G.v1.protagonistKilled) {
    events.setPhase('loop_end_check');
    return;
  }

  if (G.v1.settings.autoResolve) {
    manualPrompt(G, 'day_end');
  }

  queuePendingAbilities(G, buildDayEndPendingAbilities(G), 'day_end');
}

export function runEndOfLastDayTiming(G: TragedyGameState): void {
  dispatchTiming(G, 'end_of_last_day');
  dispatchTiming(G, 'match_end');
}
