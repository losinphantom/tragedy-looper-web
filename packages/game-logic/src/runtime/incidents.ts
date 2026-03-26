import { CHARACTERS } from '@tragedy/domain';

import { ALL_LOCATIONS, getMovementDestination, type LocationId } from '../data/boardGraph';
import type { TargetSlot, TragedyGameState } from '../game';
import { getToken } from '../utils/tokenHelpers';
import { getEffectiveGoodwill } from '../utils/effectiveValues';
import { getIncidentTriggerEmotionValue } from '../rules/ahrTokenSemantics';
import { getEffectiveRoleId } from '../rules/ahrEffectiveRoles';

function hasActiveRule(
  G: TragedyGameState,
  ruleId: string,
  characterId?: string,
): boolean {
  return (G.v1.activeRuleDefinitions || []).some(rule =>
    rule.ruleId === ruleId && (characterId == null || rule.characterId === characterId)
  );
}

export function isTwinsIncidentCulprit(
  G: TragedyGameState,
  culpritId: string,
): boolean {
  return hasActiveRule(G, 'mc_twins_incident', culpritId) || G.v1.hiddenRoles?.[culpritId] === 'twins';
}

export function getIncidentLocationId(
  G: TragedyGameState,
  culpritId: string,
): string | undefined {
  const culprit = G.v1.characters[culpritId];
  if (!culprit) return undefined;
  if (!isTwinsIncidentCulprit(G, culpritId)) return culprit.locationId;

  const diagonal = getMovementDestination(culprit.locationId as LocationId, 'diagonal');
  return diagonal ?? culprit.locationId;
}

export function getPossibleBlockadeLocationIds(
  G: TragedyGameState,
  culpritId: string,
): string[] {
  const culprit = G.v1.characters[culpritId];
  if (!culprit) return [];

  const locations = new Set<string>();
  if (!isTwinsIncidentCulprit(G, culpritId)) {
    locations.add(culprit.locationId);
    return [...locations];
  }

  const addDiagonalLocation = (locationId?: string) => {
    if (!locationId) return;
    const diagonal = getMovementDestination(locationId as LocationId, 'diagonal');
    if (diagonal) {
      locations.add(diagonal);
    } else {
      locations.add(locationId);
    }
  };

  addDiagonalLocation(culprit.locationId);
  addDiagonalLocation(culprit.territoryLocationId);
  return [...locations];
}

export function getIncidentTriggerThreshold(
  G: TragedyGameState,
  incidentId: string,
  culpritId: string,
): number {
  let baseLimit = CHARACTERS[culpritId as keyof typeof CHARACTERS]?.uneaseLimit ?? 3;

  // 仙人 GW3 被动：本轮不安临界视为 0
  const immortalKey = `__immortal_zero_unease_limit:${culpritId}`;
  if (G.v1.loopState?.abilityUsage?.[immortalKey]?.usedThisLoop) {
    baseLimit = 0;
  }

  let threshold = baseLimit;
  if (incidentId === 'impulse_murder') threshold = Math.max(0, baseLimit - 1);
  else if (incidentId === 'omen') threshold = Math.max(0, baseLimit - 1);
  else if (incidentId === 'bizarre_murder') threshold = baseLimit + 1;

  // MZ 灭亡讴歌：当事人为平民(person) + 场上有存活预言家 → 不安限度-1
  if (hasActiveRule(G, 'song_of_destruction_prophet_unease_down')) {
    const culpritRole = getEffectiveRoleId(G, culpritId) || G.v1.hiddenRoles?.[culpritId];
    const isPerson = !culpritRole || culpritRole === 'person';
    const hasAliveProphet = Object.entries(G.v1.characters).some(([charId, c]) =>
      c.alive && getEffectiveRoleId(G, charId) === 'prophet'
    );
    if (isPerson && hasAliveProphet) {
      threshold = Math.max(0, threshold - 1);
    }
  }

  return threshold;
}

export function getIncidentTriggerValue(
  G: TragedyGameState,
  incidentId: string,
  culpritId: string,
): number {
  const culprit = G.v1.characters[culpritId];
  if (!culprit) return 0;

  if (incidentId === 'imaginary_incident') {
    return getToken(culprit, 'intrigue');
  }

  // WM 廷达罗斯之嗅：通过密谋指示物数量判定是否发生
  if (incidentId === 'scent_of_tindalos') {
    return getToken(culprit, 'intrigue');
  }

  // 十周年: 希望之光按友好度触发（而非不安度）
  if (incidentId === 'light_of_hope') {
    return getEffectiveGoodwill(G.v1.characters[culpritId]);
  }

  let triggerValue = getIncidentTriggerEmotionValue(G, culprit);
  // HSA 苦艾丁酊：serial_murder/suicide 时密谋计入不安
  if (
    (incidentId === 'serial_murder' || incidentId === 'suicide')
    && hasActiveRule(G, 'strychnine_tincture_intrigue_is_unease')
  ) {
    triggerValue += getToken(culprit, 'intrigue');
  }
  // WM 祭品：当事人 roleId=sacrifice 时，所有事件的密谋视为不安
  if (
    G.scriptOpen?.tragedySetId === 'weird_mythology'
    && getEffectiveRoleId(G, culpritId) === 'sacrifice'
  ) {
    triggerValue += getToken(culprit, 'intrigue');
  }
  return triggerValue;
}

export function buildIncidentTargetSlots(
  G: TragedyGameState,
  incidentId: string,
  culpritId: string,
): TargetSlot[] {
  const culprit = G.v1.characters[culpritId];
  const setId = G.scriptOpen?.tragedySetId || '';
  const incidentLocationId = getIncidentLocationId(G, culpritId) ?? culprit?.locationId;

  switch (incidentId) {
    case 'murder':
    case 'impulse_murder':
      if (!incidentLocationId) return [];
      return [{
        slotId: 'target',
        label: '被害者',
        kind: 'character',
        eligibleCharacterIds: Object.entries(G.v1.characters)
          .filter(([id, c]) => id !== culpritId && c.alive && c.locationId === incidentLocationId)
          .map(([id]) => id),
      }];
    case 'faraway_murder':
      return [{
        slotId: 'target',
        label: '被害者',
        kind: 'character',
        eligibleCharacterIds: Object.entries(G.v1.characters)
          .filter(([_, c]) => c.alive && getToken(c, 'intrigue') >= 2)
          .map(([id]) => id),
      }];
    case 'missing_person': {
      const forbiddenLocations = new Set(
        CHARACTERS[culpritId as keyof typeof CHARACTERS]?.forbiddenLocations || [],
      );
      return [{
        slotId: 'location',
        label: '目的地',
        kind: 'location',
        eligibleLocationIds: ALL_LOCATIONS.filter(
          locationId => locationId === culprit?.locationId || !forbiddenLocations.has(locationId),
        ),
      }];
    }
    case 'conspiracy_activity': {
      const legalLocations = Object.keys(G.v1.locations);
      return [
        {
          slotId: 'incidentChoice',
          label: '结算事件',
          kind: 'choice',
          eligibleChoices: [
            { id: 'serial_murder', label: '连续杀人' },
            { id: 'missing_person', label: '失踪' },
          ],
        },
        {
          slotId: 'target',
          label: '被害者',
          kind: 'character',
          eligibleCharacterIds: incidentLocationId
            ? Object.entries(G.v1.characters)
              .filter(([id, c]) => id !== culpritId && c.alive && c.locationId === incidentLocationId)
              .map(([id]) => id)
            : [],
        },
        {
          slotId: 'location',
          label: '目的地',
          kind: 'location',
          eligibleLocationIds: legalLocations.length > 0 ? legalLocations : ALL_LOCATIONS,
        },
      ];
    }
    case 'breaking_the_board': {
      const legalLocations = Object.keys(G.v1.locations);
      return [{
        slotId: 'target',
        label: '选择角色或版图',
        kind: 'character_or_location',
        eligibleCharacterIds: Object.entries(G.v1.characters)
          .filter(([_, c]) => c.alive)
          .map(([id]) => id),
        eligibleLocationIds: legalLocations.length > 0 ? legalLocations : ALL_LOCATIONS,
      }];
    }
    case 'omen':
      if (!incidentLocationId) return [];
      return [{
        slotId: 'target',
        label: '获得不安',
        kind: 'character',
        eligibleCharacterIds: [...new Set([
          culpritId,
          ...Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive && c.locationId === incidentLocationId)
            .map(([id]) => id),
        ])],
      }];
    case 'bizarre_murder':
      if (!incidentLocationId) return [];
      return [
        {
          slotId: 'murderTarget',
          label: '被害者',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([id, c]) => id !== culpritId && c.alive && c.locationId === incidentLocationId)
            .map(([id]) => id),
        },
        {
          slotId: 'paranoiaTarget',
          label: '获得不安',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
        {
          slotId: 'intrigueTarget',
          label: '获得密谋',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
      ];
    case 'dimension_warp':
      return [
        {
          slotId: 'worldShiftChoice',
          label: '世界移动',
          kind: 'choice',
          eligibleChoices: [
            { id: 'shift', label: '进行世界移动' },
            { id: 'no_shift', label: '不进行世界移动' },
          ],
        },
        {
          slotId: 'paranoiaTarget',
          label: '获得不安',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
        {
          slotId: 'goodwillTarget',
          label: '获得友好',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
      ];
    case 'dimension_fault':
      return [{
        slotId: 'worldShiftChoice',
        label: '世界移动',
        kind: 'choice',
        eligibleChoices: [
          { id: 'shift', label: '进行世界移动' },
          { id: 'no_shift', label: '不进行世界移动' },
        ],
      }];
    case 'lost_item':
      if (!incidentLocationId) return [];
      return [
        {
          slotId: 'intrigueTarget',
          label: '获得密谋',
          kind: 'character',
          eligibleCharacterIds: [...new Set(
            Object.entries(G.v1.characters)
              .filter(([_, c]) => c.alive && c.locationId === incidentLocationId)
              .map(([id]) => id),
          )],
        },
        {
          slotId: 'location',
          label: '目的地',
          kind: 'location',
          eligibleLocationIds: ALL_LOCATIONS,
        },
      ];
    case 'imaginary_incident':
      if (!incidentLocationId) return [];
      return [
        {
          slotId: 'incidentChoice',
          label: '结算事件',
          kind: 'choice',
          eligibleChoices: [
            { id: 'impulse_murder', label: '冲动杀人' },
            { id: 'dimension_warp', label: '次元歪曲' },
            { id: 'lost_item', label: '遗失物' },
          ],
        },
        {
          slotId: 'murderTarget',
          label: '被害者',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([id, c]) => id !== culpritId && c.alive && c.locationId === incidentLocationId)
            .map(([id]) => id),
        },
        {
          slotId: 'worldShiftChoice',
          label: '世界移动',
          kind: 'choice',
          eligibleChoices: [
            { id: 'shift', label: '进行世界移动' },
            { id: 'no_shift', label: '不进行世界移动' },
          ],
        },
        {
          slotId: 'paranoiaTarget',
          label: '获得不安',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
        {
          slotId: 'goodwillTarget',
          label: '获得友好',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
        {
          slotId: 'intrigueTarget',
          label: '获得密谋',
          kind: 'character',
          eligibleCharacterIds: [...new Set(
            Object.entries(G.v1.characters)
              .filter(([_, c]) => c.alive && c.locationId === incidentLocationId)
              .map(([id]) => id),
          )],
        },
        {
          slotId: 'location',
          label: '目的地',
          kind: 'location',
          eligibleLocationIds: ALL_LOCATIONS,
        },
      ];
    case 'spreading':
      return [
        {
          slotId: 'fromCharacter',
          label: '移除友好',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
        {
          slotId: 'toCharacter',
          label: '获得友好',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
      ];
    case 'increasing_unease':
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
          slotId: 'intrigueTarget',
          label: '获得密谋',
          kind: 'character',
          eligibleCharacterIds: Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive)
            .map(([id]) => id),
        },
      ];
    case 'light_in_the_gap':
    case 'darkness_of_despair':
      return [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds: Object.entries(G.v1.characters)
          .filter(([_, c]) => c.alive)
          .map(([id]) => id),
      }];
    case 'suspicious_letter':
      if (!incidentLocationId) return [];
      return [
        {
          slotId: 'target',
          label: '移动角色',
          kind: 'character',
          eligibleCharacterIds: [...new Set([
            culpritId,
            ...Object.entries(G.v1.characters)
              .filter(([_, c]) => c.alive && c.locationId === incidentLocationId)
              .map(([id]) => id),
          ])],
        },
        {
          slotId: 'location',
          label: '目的地',
          kind: 'location',
          eligibleLocationIds: ALL_LOCATIONS,
        },
      ];
    case 'blockade':
      return [{
        slotId: 'location',
        label: '封锁区域',
        kind: 'location',
        eligibleLocationIds: getPossibleBlockadeLocationIds(G, culpritId),
      }];
    case 'butterfly_effect':
      if (!incidentLocationId) return [];
      return [{
        slotId: 'target',
        label: setId === 'another_horizon_revised' ? '受影响目标' : '受影响角色',
        kind: setId === 'another_horizon_revised' ? 'character_or_location' : 'character',
        eligibleCharacterIds: Object.entries(G.v1.characters)
          .filter(([_, c]) => c.alive && c.locationId === incidentLocationId)
          .map(([id]) => id),
        eligibleLocationIds: setId === 'another_horizon_revised'
          ? [incidentLocationId]
          : [],
      }];
    default:
      return [];
  }
}
