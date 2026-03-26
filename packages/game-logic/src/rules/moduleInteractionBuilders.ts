import { CHARACTERS } from '@tragedy/domain';

import type { TargetSlot, TragedyGameState } from '../game';
import type { ModuleAbilityTargetSlotContext } from './moduleInteraction';
import { getEffectiveRoleId } from './ahrEffectiveRoles';
import { getMovementDestination } from '../data/boardGraph';

function isAhrIllusionProtected(G: TragedyGameState, characterId: string): boolean {
  return G.scriptOpen?.tragedySetId === 'another_horizon_revised'
    && getEffectiveRoleId(G, characterId) === 'illusion'
    && (G.v1.activeRuleDefinitions || []).some(
      rule => rule.ruleId === 'ahr_illusion_unease_limit' && rule.characterId === characterId,
    );
}

function filterProtectedAbilityTargets(
  G: TragedyGameState,
  characterIds: string[],
): string[] {
  return characterIds.filter(characterId => !isAhrIllusionProtected(G, characterId));
}

function getAliveCharacterIdsAtLocation(
  G: TragedyGameState,
  locationId: string,
  options?: {
    excludeCharacterIds?: string[];
    requireParanoiaAtLeast?: number;
  },
): string[] {
  const excluded = new Set(options?.excludeCharacterIds || []);
  const minParanoia = options?.requireParanoiaAtLeast ?? 0;

  return Object.entries(G.v1.characters)
    .filter(([id, character]) =>
      !excluded.has(id)
      && character.alive
      && character.locationId === locationId
      && (character.tokens.paranoia || 0) >= minParanoia)
    .map(([id]) => id);
}

function getDeadCharacterIdsAtLocation(
  G: TragedyGameState,
  locationId: string,
  options?: {
    excludeCharacterIds?: string[];
  },
): string[] {
  const excluded = new Set(options?.excludeCharacterIds || []);
  return Object.entries(G.v1.characters)
    .filter(([id, character]) =>
      !excluded.has(id)
      && !character.alive
      && character.locationId === locationId)
    .map(([id]) => id);
}

function getAllAliveCharacterIds(
  G: TragedyGameState,
  options?: {
    excludeCharacterIds?: string[];
  },
): string[] {
  const excluded = new Set(options?.excludeCharacterIds || []);
  return Object.entries(G.v1.characters)
    .filter(([id, character]) => !excluded.has(id) && character.alive)
    .map(([id]) => id);
}

function getAllDeadCharacterIds(G: TragedyGameState): string[] {
  return Object.entries(G.v1.characters)
    .filter(([_, character]) => !character.alive)
    .map(([id]) => id);
}

function getAliveStudentIdsAtLocation(
  G: TragedyGameState,
  locationId: string,
  options?: {
    excludeCharacterIds?: string[];
  },
): string[] {
  return getAliveCharacterIdsAtLocation(G, locationId, options).filter((characterId) => {
    const definition = CHARACTERS[characterId];
    return !!definition && definition.traits.includes('student');
  });
}

function getOverLimitCharacterIds(
  G: TragedyGameState,
  characterIds: string[],
): string[] {
  return characterIds.filter((characterId) => {
    const character = G.v1.characters[characterId];
    const definition = CHARACTERS[characterId];
    return !!character
      && !!definition
      && (character.tokens.paranoia || 0) >= definition.uneaseLimit;
  });
}

export function buildBrainIntrigueAbilityTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  return [{
    slotId: 'target',
    label: '选择目标',
    kind: 'character_or_location',
    eligibleCharacterIds: filterProtectedAbilityTargets(
      G,
      getAliveCharacterIdsAtLocation(G, character.locationId),
    ),
    eligibleLocationIds: [character.locationId],
  }];
}

export function buildConspiracyTheoristTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds: filterProtectedAbilityTargets(
      G,
      getAliveCharacterIdsAtLocation(G, character.locationId),
    ),
  }];
}

export function buildDoctorGoodwillTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  const eligibleCharacterIds = filterProtectedAbilityTargets(
    G,
    getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
  );

  if (eligibleCharacterIds.length === 0) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds,
  }, {
    slotId: 'mode',
    label: '选择效果',
    kind: 'choice',
    eligibleChoices: [{
      id: 'place',
      label: '放置 1 不安',
    }, {
      id: 'remove',
      label: '移除 1 不安',
    }],
  }];
}

export function buildNurseGoodwillTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  const eligibleCharacterIds = filterProtectedAbilityTargets(
    G,
    getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
  ).filter((targetId) => {
    const target = G.v1.characters[targetId];
    const targetDefinition = target ? CHARACTERS[targetId] : null;
    return !!target
      && !!targetDefinition
      && (target.tokens.paranoia || 0) > 0
      && (target.tokens.paranoia || 0) >= targetDefinition.uneaseLimit;
  });

  if (eligibleCharacterIds.length === 0) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds,
  }];
}

export function buildMikoGoodwillTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  const eligibleCharacterIds = filterProtectedAbilityTargets(
    G,
    getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
  );

  if (eligibleCharacterIds.length === 0) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds,
  }];
}

export function buildHigherBeingGoodwillTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  const eligibleCharacterIds = filterProtectedAbilityTargets(
    G,
    getAliveCharacterIdsAtLocation(G, character.locationId),
  );

  if (eligibleCharacterIds.length === 0) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds,
  }, {
    slotId: 'token',
    label: '选择指示物',
    kind: 'choice',
    eligibleChoices: [{
      id: 'hope',
      label: '放置1希望',
    }, {
      id: 'despair',
      label: '放置1绝望',
    }],
  }];
}

export function buildMcParanoiacTargetSlots(): TargetSlot[] {
  return [{
    slotId: 'tokenType',
    label: '选择指示物类型',
    kind: 'token_type',
    eligibleTokenTypes: ['paranoia', 'intrigue'],
  }];
}

export function buildMcPsychiatristHealTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds: filterProtectedAbilityTargets(
      G,
      getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
    ),
  }];
}

export function buildAhrMagicianTeleportTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  const eligibleCharacterIds = filterProtectedAbilityTargets(
    G,
    getAliveCharacterIdsAtLocation(G, character.locationId, { requireParanoiaAtLeast: 1 }),
  );
  const eligibleLocationIds = [character.locationId].flatMap((locationId) => {
    switch (locationId) {
      case 'hospital':
        return ['city', 'shrine'];
      case 'shrine':
        return ['hospital', 'school'];
      case 'city':
        return ['hospital', 'school'];
      case 'school':
        return ['city', 'shrine'];
      default:
        return [];
    }
  });

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds,
  }, {
    slotId: 'location',
    label: '选择相邻版图',
    kind: 'location',
    eligibleLocationIds,
  }];
}

export function buildAhrStorytellerShiftTokenTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  const eligibleCharacterIds = filterProtectedAbilityTargets(
    G,
    getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
  );

  return [{
    slotId: 'fromCharacter',
    label: '选择移出角色',
    kind: 'character',
    eligibleCharacterIds,
  }, {
    slotId: 'toCharacter',
    label: '选择移入角色',
    kind: 'character',
    eligibleCharacterIds,
  }, {
    slotId: 'tokenType',
    label: '选择指示物类型',
    kind: 'token_type',
    eligibleTokenTypes: ['paranoia', 'intrigue', 'goodwill'],
  }];
}

export function buildAhrLullabyTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds: filterProtectedAbilityTargets(
      G,
      getAliveCharacterIdsAtLocation(G, character.locationId),
    ),
  }, {
    slotId: 'tokenType',
    label: '选择指示物类型',
    kind: 'token_type',
    eligibleTokenTypes: ['paranoia', 'goodwill'],
  }];
}

export function buildAhrEvangelistTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds: filterProtectedAbilityTargets(
      G,
      getAliveCharacterIdsAtLocation(G, character.locationId),
    ),
  }];
}

export function buildAhrPiedPiperKillTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  return [{
    slotId: 'target',
    label: '选择角色',
    kind: 'character',
    eligibleCharacterIds: getAliveCharacterIdsAtLocation(
      G,
      character.locationId,
      { excludeCharacterIds: [characterId] },
    ).sort(),
  }];
}

export function buildAhrPiedPiperCorpseTargetSlots(
  { G, characterId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  return [{
    slotId: 'target',
    label: '选择尸体',
    kind: 'character',
    eligibleCharacterIds: Object.entries(G.v1.characters)
      .filter(([_, target]) => !target.alive && target.locationId === character.locationId)
      .map(([id]) => id)
      .sort(),
  }];
}

export function buildGenericGoodwillTargetSlots(
  { G, characterId, ruleId }: ModuleAbilityTargetSlotContext,
): TargetSlot[] {
  if (!characterId) return [];
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  switch (ruleId) {
    case 'boy_student_gw1':
    case 'pop_idol_gw3':
    case 'transfer_student_gw2': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] })
          .filter((targetId) => (G.v1.characters[targetId]?.tokens.paranoia || 0) > 0),
      );
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'young_lady_gw3':
    case 'pop_idol_gw4':
    case 'soldier_gw2':
    case 'police_gw5':
    case 'temp_worker_question_gw2':
    case 'alien_gw4': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
      );
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'alien_gw5': {
      const eligibleCharacterIds = getDeadCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] });
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择尸体',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'follower_gw2': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAllAliveCharacterIds(G, { excludeCharacterIds: [characterId] }),
      );
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'cult_leader_gw3': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getOverLimitCharacterIds(G, getAllAliveCharacterIds(G, { excludeCharacterIds: [characterId] })),
      );
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'cult_leader_gw4': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getOverLimitCharacterIds(
          G,
          getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
        ).filter((targetId) => !!getEffectiveRoleId(G, targetId) && !G.v1.loopState.revealedRoles[targetId]),
      );
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'teacher_gw3':
    case 'teacher_gw4': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveStudentIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }).filter((targetId) => (
          ruleId !== 'teacher_gw4' || (!!getEffectiveRoleId(G, targetId) && !G.v1.loopState.revealedRoles[targetId])
        )),
      );
      if (eligibleCharacterIds.length === 0) return [];
      if (ruleId === 'teacher_gw3') {
        return [{
          slotId: 'target',
          label: '选择学生',
          kind: 'character',
          eligibleCharacterIds,
        }, {
          slotId: 'mode',
          label: '选择效果',
          kind: 'choice',
          eligibleChoices: [
            { id: 'remove', label: '移除1不安' },
            { id: 'place', label: '放置1不安' },
          ],
        }];
      }
      return [{
        slotId: 'target',
        label: '选择学生',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'forensic_scientist_gw2': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
      );
      const fromCandidates = eligibleCharacterIds.filter((targetId) => {
        const target = G.v1.characters[targetId];
        return ['paranoia', 'intrigue', 'goodwill'].some((tokenType) => ((target?.tokens as Record<string, number>)[tokenType] || 0) > 0);
      });
      if (eligibleCharacterIds.length < 2 || fromCandidates.length === 0) return [];

      const targetSlots: TargetSlot[] = [{
        slotId: 'fromCharacter',
        label: '选择移出角色',
        kind: 'character',
        eligibleCharacterIds: fromCandidates,
      }, {
        slotId: 'toCharacter',
        label: '选择移入角色',
        kind: 'character',
        eligibleCharacterIds,
      }];

      for (const fromCharacterId of fromCandidates) {
        const source = G.v1.characters[fromCharacterId];
        const eligibleChoices = ['paranoia', 'intrigue', 'goodwill']
          .filter((tokenType) => (((source?.tokens as Record<string, number>)?.[tokenType]) || 0) > 0)
          .map((tokenType) => ({
            id: tokenType,
            label: tokenType === 'paranoia' ? '不安' : tokenType === 'intrigue' ? '密谋' : '友好',
          }));
        if (eligibleChoices.length > 0) {
          targetSlots.push({
            slotId: `${fromCharacterId}::tokenType`,
            label: '选择指示物',
            kind: 'choice',
            eligibleChoices,
          });
        }
      }

      return targetSlots;
    }
    case 'forensic_scientist_gw5': {
      const eligibleCharacterIds = getAllDeadCharacterIds(G).filter((targetId) => (
        !!G.v1.hiddenRoles?.[targetId] && !G.v1.loopState.revealedRoles[targetId]
      ));
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择尸体',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'illusion_gw3': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
      );
      const eligibleLocationIds = Object.keys(G.v1.locations).filter((locationId) => locationId !== character.locationId);
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }, {
        slotId: 'destination',
        label: '选择版图',
        kind: 'location',
        eligibleLocationIds,
      }];
    }
    case 'immortal_gw1': {
      const eligibleLocationIds = Object.keys(G.v1.locations)
        .filter((locationId) => locationId !== character.locationId)
        .filter((locationId) => getDeadCharacterIdsAtLocation(G, locationId, { excludeCharacterIds: [characterId] }).length > 0);
      if (eligibleLocationIds.length === 0) return [];

      const targetSlots: TargetSlot[] = [{
        slotId: 'destination',
        label: '选择版图',
        kind: 'location',
        eligibleLocationIds,
      }];
      for (const locationId of eligibleLocationIds) {
        const eligibleCharacterIds = getDeadCharacterIdsAtLocation(G, locationId, { excludeCharacterIds: [characterId] });
        if (eligibleCharacterIds.length > 0) {
          targetSlots.push({
            slotId: `${locationId}::target`,
            label: '选择尸体',
            kind: 'character',
            eligibleCharacterIds,
          });
        }
      }
      return targetSlots;
    }
    case 'informant_gw5': {
      const eligibleChoices = (G.v1.activePlots || []).map((plotId) => ({ id: plotId, label: plotId }));
      return eligibleChoices.length === 0 ? [] : [{
        slotId: 'rule',
        label: '选择声明规则',
        kind: 'choice',
        eligibleChoices,
      }];
    }
    case 'journalist_gw2_paranoia': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAllAliveCharacterIds(G, { excludeCharacterIds: [characterId] }),
      );
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'journalist_gw2_intrigue': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
      );
      return [{
        slotId: 'target',
        label: '选择角色或版图',
        kind: 'character_or_location',
        eligibleCharacterIds,
        eligibleLocationIds: [character.locationId],
      }];
    }
    case 'little_girl_gw3': {
      const definition = CHARACTERS[characterId];
      const eligibleLocationIds = (['vertical', 'horizontal', 'diagonal'] as const).flatMap((axis) => {
        const locationId = getMovementDestination(character.locationId as any, axis);
        return locationId && !definition?.forbiddenLocations.includes(locationId)
          ? [locationId]
          : [];
      });
      return eligibleLocationIds.length === 0 ? [] : [{
        slotId: 'destination',
        label: '选择相邻版图',
        kind: 'location',
        eligibleLocationIds,
      }];
    }
    case 'rich_man_gw4': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] })
          .filter((targetId) => !!G.v1.hiddenRoles?.[targetId] && !G.v1.loopState.revealedRoles[targetId]),
      );
      return eligibleCharacterIds.length === 0 ? [] : [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
    }
    case 'deity_gw3':
    case 'police_gw4': {
      const incidentHistory = (G.v1.loopState.incidentHistory || [])
        .filter((entry) => ruleId !== 'police_gw4' || (entry.loop === G.loopIndex && !entry.wasImmune));
      const eligibleChoices = incidentHistory.map((entry) => ({
        id: `${entry.day}_${entry.incidentId}`,
        label: `D${entry.day} ${entry.incidentId}`,
      }));
      if (eligibleChoices.length === 0 && ruleId === 'deity_gw3') {
        eligibleChoices.push(...(G.v1.scheduledIncidents || []).map((entry) => ({
          id: `${entry.day}_${entry.incidentId}`,
          label: `D${entry.day} ${entry.incidentId}`,
        })));
      }
      return eligibleChoices.length === 0 ? [] : [{
        slotId: 'event',
        label: '选择事件',
        kind: 'choice',
        eligibleChoices,
      }];
    }
    case 'deity_gw5': {
      const eligibleCharacterIds = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] })
          .filter((targetId) => (G.v1.characters[targetId]?.tokens.intrigue || 0) > 0),
      );
      const eligibleLocationIds = (G.v1.locations[character.locationId]?.tokens.intrigue || 0) > 0
        ? [character.locationId]
        : [];
      return (eligibleCharacterIds.length === 0 && eligibleLocationIds.length === 0) ? [] : [{
        slotId: 'target',
        label: '选择角色或版图',
        kind: 'character_or_location',
        eligibleCharacterIds,
        eligibleLocationIds,
      }];
    }
    case 'vlogger_gw2_move_paranoia': {
      const allLocal = filterProtectedAbilityTargets(
        G,
        getAliveCharacterIdsAtLocation(G, character.locationId, { excludeCharacterIds: [characterId] }),
      );
      const primaryTargets = allLocal.filter((targetId) => (G.v1.characters[targetId]?.tokens.paranoia || 0) > 0);
      const eligibleCharacterIds = primaryTargets.length > 0 ? primaryTargets : allLocal;
      if (eligibleCharacterIds.length === 0) return [];
      const targetSlots: TargetSlot[] = [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds,
      }];
      for (const targetId of eligibleCharacterIds) {
        const exReceivers = allLocal.filter((candidateId) => candidateId !== targetId);
        if ((((G.v1.characters[targetId]?.tokens as Record<string, number>)?.ex) || 0) > 0 && exReceivers.length > 0) {
          targetSlots.push({
            slotId: `${targetId}::exReceiver`,
            label: '选择 Ex 转移目标',
            kind: 'character',
            eligibleCharacterIds: exReceivers,
          });
        }
      }
      return targetSlots;
    }
    default:
      return [];
  }
}
