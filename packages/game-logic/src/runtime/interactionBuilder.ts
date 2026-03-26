import type { RuntimeInteraction, TragedyGameState } from '../game';
import { buildIncidentTargetSlots } from './incidents';
import { buildIncidentInstanceKey } from '../scriptLoader';
import { findIncidentById } from '@tragedy/domain';
import { getToken } from '../utils/tokenHelpers';
import { ALL_LOCATIONS } from '../data/boardGraph';

export function buildIncidentResolutionInteractions(
  G: TragedyGameState,
): Array<Extract<RuntimeInteraction, { kind: 'incident_resolution' }>> {
  const todayIncidents = G.v1.scheduledIncidents.filter(incident => incident.day === G.day);
  const incidentOccurrences = new Map<string, number>();

  return todayIncidents.map(incident => {
    const occurrenceKey = `${incident.day}:${incident.incidentId}`;
    const occurrenceIndex = incidentOccurrences.get(occurrenceKey) ?? 0;
    incidentOccurrences.set(occurrenceKey, occurrenceIndex + 1);

    const culpritKey = buildIncidentInstanceKey(G.day, incident.incidentId, occurrenceIndex);
    const culpritId = G.v1.incidentCulprits[culpritKey] || '';

    // ── 群众事件特殊处理 ──
    const incidentDef = findIncidentById(incident.incidentId);
    if (incidentDef?.isCrowdIncident) {
      let corpseCount = Object.values(G.v1.characters).filter(c => !c.alive).length;
      const hasSacrificesRule = (G.v1.activeRuleDefinitions || []).some(
        r => r.ruleId === 'the_sacrifices_intrigue_is_corpse'
      );
      if (hasSacrificesRule) {
        for (const loc of Object.values(G.v1.locations)) {
          corpseCount += getToken(loc, 'intrigue');
        }
      }
      const required = incidentDef.requiredCorpses ?? 0;
      const canTrigger = corpseCount >= required;
      return {
        id: `incident:${culpritKey}`,
        kind: 'incident_resolution' as const,
        actorSeat: '0',
        phase: 'incidents' as const,
        blocking: true,
        sourceId: culpritKey,
        day: G.day,
        incidentId: incident.incidentId,
        culpritId: '',
        description: `群众事件裁定：${incident.incidentId}（尸体${corpseCount}/${required}${canTrigger ? ' ✅ 可触发' : ' ❌ 不足'}）`,
        targetSlots: buildCrowdIncidentTargetSlots(G, incident.incidentId),
      };
    }

    return {
      id: `incident:${culpritKey}`,
      kind: 'incident_resolution' as const,
      actorSeat: '0',
      phase: 'incidents' as const,
      blocking: true,
      sourceId: culpritKey,
      day: G.day,
      incidentId: incident.incidentId,
      culpritId,
      description: `事件裁定：${incident.incidentId}`,
      targetSlots: culpritId ? buildIncidentTargetSlots(G, incident.incidentId, culpritId) : [],
    };
  });
}

export function buildRuntimeInteractions(
  G: TragedyGameState,
  _phase: string,
): RuntimeInteraction[] {
  const interactions: RuntimeInteraction[] = [];

  interactions.push(...(G.v1.pendingAbilities || []).map(ability => ({
    id: `ability:${ability.id}`,
    kind: 'mastermind_ability' as const,
    actorSeat: '0',
    phase: ability.phase || 'mastermind_abilities' as const,
    blocking: true,
    sourceId: ability.id,
    ruleId: ability.ruleId,
    characterId: ability.characterId,
    mandatory: ability.mandatory,
    description: ability.description,
    targetSlots: ability.targetSlots,
  })));

  if (G.v1.goodwillInteraction.phase !== 'idle') {
    const currentDeclaration = G.v1.goodwillInteraction.currentDeclaration;
    interactions.push({
      id: `goodwill:${G.v1.goodwillInteraction.phase}`,
      kind: 'goodwill',
      actorSeat: G.v1.goodwillInteraction.phase === 'leader_choosing' ? G.v1.leader : '0',
      phase: G.v1.goodwillInteraction.phase,
      blocking: G.v1.goodwillInteraction.phase !== 'done',
      sourceId: G.v1.goodwillInteraction.phase,
      description: `友好能力阶段：${G.v1.goodwillInteraction.phase}`,
      eligibleAbilities: G.v1.goodwillInteraction.eligibleAbilities,
      currentDeclaration,
      observerCharacterId: currentDeclaration?.characterId,
      observerAbilityId: currentDeclaration?.abilityId,
      observerSelectedTargets: currentDeclaration?.selectedTargets,
    });
  }

  return interactions;
}

// ── 群众事件 targetSlots 构建 ──────────────────────────────────────────────

import type { TargetSlot } from '../game';

function buildCrowdIncidentTargetSlots(
  G: TragedyGameState,
  incidentId: string,
): TargetSlot[] {
  switch (incidentId) {
    case 'overflowing_filth':
      // 污秽溢出：选 1 角色 +2 不安，选 1 版图 +1 密谋
      return [
        {
          slotId: 'paranoiaTarget',
          label: '获得不安',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
        {
          slotId: 'location',
          label: '获得密谋',
          kind: 'location',
          eligibleLocationIds: ALL_LOCATIONS.filter(l => G.v1.locations[l]),
        },
      ];
    // 其余群众事件（疯狂之夜/诅咒活化/死者默示录）自动结算，不需要选择
    default:
      return [];
  }
}
