/**
 * Transitional compatibility catalog for live incident processors.
 *
 * New incident objects should prefer `rules/incidents/*IncidentDefinition.ts`
 * and manifest `incidentIds` assembly-by-reference. Keep this catalog only for
 * runtime compatibility while legacy processor registration still exists.
 */

import type { RuleProcessor, RuleContext } from '../ruleEngine';
import { CHARACTERS } from '@tragedy/domain';
import { triggerProtagonistDeath } from '../lossConditions';
import { getCharacterLabel } from '../data/translationService';
import { ALL_LOCATIONS } from '../data/boardGraph';
import { addToken, getToken } from '../utils/tokenHelpers';
import { getCharVal } from '../utils/effectiveValues';

import {
  blockLocationUntilDay,
  canCharacterMoveBetween,
  lockCharacterMovementOnDay,
} from '../runtime/movementRestrictions';
import { getIncidentLocationId, getPossibleBlockadeLocationIds } from '../runtime/incidents';
import { recordRevealedRole } from '../revealTracker';
import { applyCharacterTokenDelta } from './ahrState';
import { markWorldShiftThisDay } from './ahrWorldShift';
import { getEffectiveRoleId, hasEffectiveRole } from './ahrEffectiveRoles';
import { syncMidnightZoneExKeyPersons } from './mzExKeyPersons';
import { hasLoopUsageFlag, killCharacter, ok } from './shared';

const cn = (id: string) => getCharacterLabel(id);
const LOC_CN: Record<string, string> = { hospital: '医院', shrine: '神社', city: '都市', school: '学校' };
const INCIDENT_KILL_OPTIONS = {
  recordDeadCharactersAtLeastOnce: true,
} as const;

function isRemovedFromBoard(ctx: RuleContext, charId: string): boolean {
  return hasLoopUsageFlag(ctx, `__removed_from_board_${charId}`);
}

function isAliveOnBoard(ctx: RuleContext, charId: string): boolean {
  const character = ctx.G.v1.characters[charId];
  if (!character || !character.alive) return false;
  return !isRemovedFromBoard(ctx, charId);
}

function countDistinctCharacterTokenTypes(character: { tokens: Record<string, number> }): number {
  return ['paranoia', 'intrigue', 'goodwill', 'hope', 'despair', 'guard']
    .filter(tokenType => (character.tokens?.[tokenType] ?? 0) > 0)
    .length;
}

function shouldAbortIncident(ctx: RuleContext): boolean {
  return !!(ctx.G.v1.loopLost || ctx.G.v1.protagonistKilled);
}

function markAhrTragedyDeath(ctx: RuleContext, deadCharIds: string[]): void {
  if (ctx.G.scriptOpen?.tragedySetId !== 'another_horizon_revised') return;
  const incidentId = ctx.incident?.incidentId;
  if (incidentId !== 'serial_murder' && incidentId !== 'bizarre_murder') return;
  const hasNonIllusionDeath = deadCharIds.some(charId => !hasEffectiveRole(ctx.G, charId, 'illusion'));
  if (!hasNonIllusionDeath) return;
  if (!ctx.G.v1.loopState.abilityUsage.__ahr_tragedy_of_reincarnation_death) {
    ctx.G.v1.loopState.abilityUsage.__ahr_tragedy_of_reincarnation_death = {
      usedToday: true,
      usedThisLoop: true,
    };
    return;
  }
  ctx.G.v1.loopState.abilityUsage.__ahr_tragedy_of_reincarnation_death.usedToday = true;
  ctx.G.v1.loopState.abilityUsage.__ahr_tragedy_of_reincarnation_death.usedThisLoop = true;
}

function shouldSkipIncidentByImmunity(ctx: RuleContext): boolean {
  const culpritId = ctx.incident?.culpritId;
  if (!culpritId) return false;

  const immuneKey = `__incident_immune_${culpritId}`;
  if (!hasLoopUsageFlag(ctx, immuneKey)) return false;

  ctx.G.publicLog.push(`🛡️ ${cn(culpritId)} 的事件被友好能力免疫`);
  ctx.G.fullLog.push(`[友好能力] ${cn(culpritId)} 事件免疫，跳过 ${ctx.incident?.incidentId || 'unknown_incident'}`);
  return true;
}

function shouldSkipIncidentByRemoval(ctx: RuleContext): boolean {
  const culpritId = ctx.incident?.culpritId;
  if (!culpritId) return false;

  const removedKey = `__removed_from_board_${culpritId}`;
  if (!hasLoopUsageFlag(ctx, removedKey)) return false;

  ctx.G.publicLog.push(`👻 ${cn(culpritId)} 已被移出版图，事件不发生`);
  ctx.G.fullLog.push(`[友好能力] ${cn(culpritId)} 已被移出版图，跳过 ${ctx.incident?.incidentId || 'unknown_incident'}`);
  return true;
}

/** 获取同区域存活角色（排除指定角色） */
function aliveCharsAtLocation(ctx: RuleContext, locationId: string, excludeId?: string): string[] {
  return Object.entries(ctx.G.v1.characters)
    .filter(([id, c]) =>
      c.locationId === locationId
      && c.alive
      && !isRemovedFromBoard(ctx, id)
      && id !== excludeId
    )
    .map(([id]) => id);
}

function getIncidentLocation(ctx: RuleContext, culpritId: string): string | undefined {
  return getIncidentLocationId(ctx.G, culpritId) ?? ctx.G.v1.characters[culpritId]?.locationId;
}

function aliveCharsAtIncidentLocation(
  ctx: RuleContext,
  culpritId: string,
  options?: {
    includeCulprit?: boolean;
    excludeId?: string;
  },
): string[] {
  const incidentLocation = getIncidentLocation(ctx, culpritId);
  if (!incidentLocation) return [];

  const ids = Object.entries(ctx.G.v1.characters)
    .filter(([id, c]) =>
      c.locationId === incidentLocation
      && c.alive
      && !isRemovedFromBoard(ctx, id)
      && id !== options?.excludeId
    )
    .map(([id]) => id);

  if (options?.includeCulprit && isAliveOnBoard(ctx, culpritId) && culpritId !== options.excludeId) {
    ids.push(culpritId);
  }

  return [...new Set(ids)];
}

function aliveCharsAffectedByLiteralLocation(
  ctx: RuleContext,
  locationId: string,
  culpritId: string,
): string[] {
  const ids = aliveCharsAtLocation(ctx, locationId, culpritId);
  if (getIncidentLocation(ctx, culpritId) === locationId && isAliveOnBoard(ctx, culpritId)) {
    ids.push(culpritId);
  }
  return [...new Set(ids)];
}

function applyIncidentDeathLinks(ctx: RuleContext, deadCharIds: string[]): void {
  if (deadCharIds.length === 0) return;

  const deadSet = new Set(deadCharIds);
  for (const deadCharId of deadCharIds) {
    const deadRole = ctx.G.v1.hiddenRoles?.[deadCharId];
    if (!deadRole) continue;

    let partnerRole: string | undefined;
    if (deadRole === 'loved_one') partnerRole = 'lover';
    else if (deadRole === 'lover') partnerRole = 'loved_one';
    else continue;

    for (const [cid, role] of Object.entries(ctx.G.v1.hiddenRoles || {})) {
      if (role !== partnerRole || cid === deadCharId || deadSet.has(cid)) continue;
      const partner = ctx.G.v1.characters[cid];
      if (!partner || !partner.alive) continue;

      applyCharacterTokenDelta(ctx.G, cid, 'paranoia', 6);
      ctx.G.publicLog.push(`💔 ${cn(cid)} 突然变得极度不安 (+6 不安)`);
      ctx.G.fullLog.push(`[身份能力] ${partnerRole} ${cid} 因 ${deadRole} ${deadCharId} 死亡获得 6 不安`);
    }
  }
}

export const incidentProcessors: RuleProcessor[] = [
  // ── 谋杀 (Murder) ─────────────────────────────────────────────────────────
  {
    ruleId: 'incident_murder_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culprit = ctx.G.v1.characters[ctx.incident.culpritId];
      if (!culprit || !isAliveOnBoard(ctx, ctx.incident.culpritId)) return ok(false, '当事人已死亡');
      const others = aliveCharsAtIncidentLocation(ctx, ctx.incident.culpritId, { excludeId: ctx.incident.culpritId });
      if (others.length === 0) return ok(true, '谋杀事件发生但无可杀目标');
      return ok(true, `谋杀事件：${others.length} 名潜在被害者`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const others = aliveCharsAtIncidentLocation(ctx, ctx.incident!.culpritId, { excludeId: ctx.incident!.culpritId });
      const targetId = ctx.selectedTargets?.target && others.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : others[0];
      if (targetId) {
        const deaths: string[] = [];
        if (killCharacter(ctx, targetId, INCIDENT_KILL_OPTIONS)) deaths.push(targetId);
        applyIncidentDeathLinks(ctx, deaths);
        markAhrTragedyDeath(ctx, deaths);
        ctx.G.fullLog.push(`[事件] 谋杀：${cn(targetId)} 被杀害`);
      } else {
        ctx.G.publicLog.push('📋 谋杀事件发生但没有现象');
      }
    },
  },

  // ── 医院事故 (Hospital Incident) ──────────────────────────────────────────
  {
    ruleId: 'incident_hospital_incident_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const hospital = ctx.G.v1.locations['hospital'];
      if (!hospital) return ok(false);
      if (getToken(hospital, 'intrigue') < 1) {
        return ok(true, '医院密谋不足，事件发生但无现象');
      }
      return ok(true, `医院密谋 ≥ ${getToken(hospital, 'intrigue') >= 2 ? 2 : 1}，事件触发`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const hospital = ctx.G.v1.locations['hospital'];
      if (!hospital) return;

      if (getToken(hospital, 'intrigue') < 1) {
        ctx.G.publicLog.push('📋 医院恐惧事件发生但没有现象');
        return;
      }

      // 医院所有人死亡
      const culpritId = ctx.incident?.culpritId || '';
      const deaths: string[] = [];
      for (const id of aliveCharsAffectedByLiteralLocation(ctx, 'hospital', culpritId)) {
        if (killCharacter(ctx, id, INCIDENT_KILL_OPTIONS)) deaths.push(id);
      }
      applyIncidentDeathLinks(ctx, deaths);

      // ≥ 2 密谋 → 主人公也死亡
      if (getToken(hospital, 'intrigue') >= 2) {
        triggerProtagonistDeath(ctx.G, '医院恐惧（密谋 ≥ 2）');
      }
    },
  },

  // ── 自杀 (Suicide) ────────────────────────────────────────────────────────
  {
    ruleId: 'incident_suicide_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      const c = ctx.G.v1.characters[culpritId];
      if (!c || !isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      return ok(true, `${cn(culpritId)} 自杀事件触发`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const deaths: string[] = [];
      if (killCharacter(ctx, culpritId, INCIDENT_KILL_OPTIONS)) deaths.push(culpritId);
      applyIncidentDeathLinks(ctx, deaths);
      ctx.G.fullLog.push(`[事件] 自杀：${cn(culpritId)} 死亡`);
    },
  },

  // ── 失踪 (Missing Person) ────────────────────────────────────────────────
  {
    ruleId: 'incident_missing_person_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const c = ctx.G.v1.characters[ctx.incident.culpritId];
      if (!c || !isAliveOnBoard(ctx, ctx.incident.culpritId)) return ok(false, '当事人已死亡');
      return ok(true, '失踪事件：移动当事人并放置密谋');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const c = ctx.G.v1.characters[culpritId];
      if (!c) return;

      const forbiddenLocations = new Set(
        CHARACTERS[culpritId as keyof typeof CHARACTERS]?.forbiddenLocations || [],
      );
      const legalLocations = Object.keys(ctx.G.v1.locations)
        .filter(locationId => locationId === c.locationId || !forbiddenLocations.has(locationId));
      const target = ctx.selectedTargets?.location && legalLocations.includes(ctx.selectedTargets.location)
        ? ctx.selectedTargets.location
        : legalLocations.includes(c.locationId)
          ? c.locationId
          : legalLocations[0] ?? c.locationId;
      c.locationId = target;
      ctx.G.publicLog.push(`📍 ${cn(culpritId)} 被移动到 ${LOC_CN[target] || target}`);

      // 在目标版图放 1 密谋
      const loc = ctx.G.v1.locations[target];
      if (loc) {
        addToken(loc, 'intrigue', 1);
        ctx.G.publicLog.push(`🔮 ${LOC_CN[target] || target} 获得 1 密谋`);
      }
      ctx.G.fullLog.push(`[事件] 失踪：${cn(culpritId)} 移动到 ${LOC_CN[target] || target}，放置 1 密谋`);
    },
  },

  // ── 散播 (Spreading) ──────────────────────────────────────────────────────
  {
    ruleId: 'incident_spreading_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '散播事件：移除 2 友好 + 给予 2 友好');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const chars = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id));
      if (chars.length < 2) {
        ctx.G.publicLog.push('📋 散播事件发生但角色不足');
        return;
      }
      const selectedFrom = ctx.selectedTargets?.fromCharacter;
      const selectedTo = ctx.selectedTargets?.toCharacter;
      const idA = selectedFrom && ctx.G.v1.characters[selectedFrom]?.alive ? selectedFrom : chars[0][0];
      const idB = selectedTo && ctx.G.v1.characters[selectedTo]?.alive && selectedTo !== idA
        ? selectedTo
        : chars.find(([id]) => id !== idA)?.[0];
      if (!idA || !idB || idA === idB) {
        ctx.G.publicLog.push('📋 散播事件目标无效');
        return;
      }
      const charA = ctx.G.v1.characters[idA];
      const charB = ctx.G.v1.characters[idB];

      const removed = Math.min(getToken(charA, 'goodwill'), 2);
      addToken(charA, 'goodwill', -removed);
      addToken(charB, 'goodwill', 2);
      ctx.G.publicLog.push(`💔 散播：${cn(idA)} -${removed} 友好，${cn(idB)} +2 友好`);
      ctx.G.fullLog.push(`[事件] 散播：${cn(idA)} → ${cn(idB)}`);
    },
  },

  // ── 不安扩散 (Increasing Unease) ──────────────────────────────────────────
  {
    ruleId: 'incident_increasing_unease_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '不安扩散事件：2不安 + 1密谋');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const chars = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id));
      if (chars.length < 1) return;

      const selectedParanoia = ctx.selectedTargets?.paranoiaTarget;
      const selectedIntrigue = ctx.selectedTargets?.intrigueTarget;
      const idA = selectedParanoia && ctx.G.v1.characters[selectedParanoia]?.alive
        ? selectedParanoia
        : chars[0][0];
      const idB = selectedIntrigue && ctx.G.v1.characters[selectedIntrigue]?.alive && selectedIntrigue !== idA
        ? selectedIntrigue
        : chars.find(([id]) => id !== idA)?.[0];
      if (!idA) return;
      applyCharacterTokenDelta(ctx.G, idA, 'paranoia', 2);
      ctx.G.publicLog.push(`😰 不安扩散：${cn(idA)} +2 不安`);

      if (idB) {
        addToken(ctx.G.v1.characters[idB], 'intrigue', 1);
        ctx.G.publicLog.push(`🔮 不安扩散：${cn(idB)} +1 密谋`);
      }
      ctx.G.fullLog.push(`[事件] 不安扩散完成`);
    },
  },

  // ── 远距离杀人 (Faraway Murder) ───────────────────────────────────────────
  {
    ruleId: 'incident_faraway_murder_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      // 查找有 ≥2 密谋的存活角色
      const targets = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id) && getCharVal(c, 'intrigue') >= 2);
      if (targets.length === 0) {
        return ok(true, '远距离杀人事件发生但无合格目标');
      }
      return ok(true, `远距离杀人事件：${targets.length} 名合格目标`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const targets = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id) && getCharVal(c, 'intrigue') >= 2);
      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && targets.some(([id]) => id === selectedTarget)
        ? selectedTarget
        : targets[0]?.[0];
      if (targetId) {
        const deaths: string[] = [];
        if (killCharacter(ctx, targetId, INCIDENT_KILL_OPTIONS)) deaths.push(targetId);
        applyIncidentDeathLinks(ctx, deaths);
        ctx.G.fullLog.push(`[事件] 远距离杀人：${cn(targetId)} 被杀害`);
      } else {
        ctx.G.publicLog.push('📋 远距离杀人事件发生但没有现象');
      }
    },
  },

  // ── MC：伪装自杀 (Faked Suicide) ───────────────────────────────────────────
  {
    ruleId: 'mc_incident_faked_suicide',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人不在场');
      return ok(true, `${cn(culpritId)} 获得 1 个 Ex 牌`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;
      const character = ctx.G.v1.characters[culpritId];
      if (!character || !character.alive) return;
      character.exCardCount = (character.exCardCount ?? 0) + 1;
      syncMidnightZoneExKeyPersons(ctx.G);
      ctx.G.publicLog.push(`🃏 ${cn(culpritId)} 获得了 1 个 Ex 牌`);
      ctx.G.fullLog.push(`[事件] 伪装自杀：${cn(culpritId)} Ex 牌 +1`);
    },
  },

  // ── MC：前兆 (Omen) ────────────────────────────────────────────────────────
  {
    ruleId: 'mc_incident_omen',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人不在场');
      return ok(true, '前兆：同区域 1 名角色获得 1 不安');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const candidates = aliveCharsAtIncidentLocation(ctx, culpritId, { includeCulprit: true });
      const targetId = ctx.selectedTargets?.target && candidates.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : candidates[0];
      if (!targetId) return;

      applyCharacterTokenDelta(ctx.G, targetId, 'paranoia', 1);
      ctx.G.publicLog.push(`😨 前兆：${cn(targetId)} +1 不安`);
      ctx.G.fullLog.push(`[事件] 前兆：${cn(targetId)} +1 不安`);
    },
  },

  // ── MC：猎奇杀人 (Bizarre Murder) ─────────────────────────────────────────
  {
    ruleId: 'mc_incident_bizarre_murder',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人不在场');
      return ok(true, '猎奇杀人：连续杀人后结算不安扩散');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const murderTargets = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
      const selectedMurderTarget = ctx.selectedTargets?.murderTarget;
      const murderTargetId = selectedMurderTarget && murderTargets.includes(selectedMurderTarget)
        ? selectedMurderTarget
        : murderTargets[0];
      if (murderTargetId) {
        const deaths: string[] = [];
        if (killCharacter(ctx, murderTargetId, INCIDENT_KILL_OPTIONS)) deaths.push(murderTargetId);
        applyIncidentDeathLinks(ctx, deaths);
        markAhrTragedyDeath(ctx, deaths);
      }

      const aliveCharacters = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id))
        .map(([id]) => id);
      const paranoiaTarget = ctx.selectedTargets?.paranoiaTarget && aliveCharacters.includes(ctx.selectedTargets.paranoiaTarget)
        ? ctx.selectedTargets.paranoiaTarget
        : aliveCharacters[0];
      const intrigueTarget = ctx.selectedTargets?.intrigueTarget
        && aliveCharacters.includes(ctx.selectedTargets.intrigueTarget)
        && ctx.selectedTargets.intrigueTarget !== paranoiaTarget
        ? ctx.selectedTargets.intrigueTarget
        : aliveCharacters.find(id => id !== paranoiaTarget);

      if (paranoiaTarget) {
        applyCharacterTokenDelta(ctx.G, paranoiaTarget, 'paranoia', 2);
      }
      if (intrigueTarget) {
        addToken(ctx.G.v1.characters[intrigueTarget], 'intrigue', 1);
      }

      ctx.G.publicLog.push('🩸 猎奇杀人：已结算连续杀人与不安扩散');
      ctx.G.fullLog.push(`[事件] 猎奇杀人：kill=${murderTargetId || 'none'}, paranoia=${paranoiaTarget || 'none'}, intrigue=${intrigueTarget || 'none'}`);
    },
  },

  // ── MC：恐怖袭击 (Terrorist Attack) ───────────────────────────────────────
  {
    ruleId: 'mc_incident_terrorist_attack',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '恐怖袭击：都市密谋 1/2 触发死亡与主人公败北');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const city = ctx.G.v1.locations.city;
      if (!city) return;

      const intrigue = getToken(city, 'intrigue');
      if (intrigue < 1) {
        ctx.G.publicLog.push('📋 恐怖袭击发生但没有现象');
        return;
      }

      const culpritId = ctx.incident?.culpritId || '';
      const deaths: string[] = [];
      for (const id of aliveCharsAffectedByLiteralLocation(ctx, 'city', culpritId)) {
        if (killCharacter(ctx, id, INCIDENT_KILL_OPTIONS)) deaths.push(id);
        if (shouldAbortIncident(ctx)) return;
      }
      applyIncidentDeathLinks(ctx, deaths);

      if (intrigue >= 2) {
        triggerProtagonistDeath(ctx.G, '恐怖袭击（都市密谋 ≥ 2）');
      }
    },
  },

  // ── MC：可疑信件 (Suspicious Letter) ──────────────────────────────────────
  {
    ruleId: 'mc_incident_suspicious_letter',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人不在场');
      return ok(true, '可疑信件：移动 1 名同区域角色');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const candidates = aliveCharsAtIncidentLocation(ctx, culpritId, { includeCulprit: true });
      const targetId = ctx.selectedTargets?.target && candidates.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : candidates[0];
      if (!targetId) return;

      const target = ctx.G.v1.characters[targetId];
      if (!target) return;
      const destination = ctx.selectedTargets?.location || target.locationId;
      const forbiddenLocations = new Set(
        CHARACTERS[targetId as keyof typeof CHARACTERS]?.forbiddenLocations || [],
      );
      if (forbiddenLocations.has(destination)) {
        ctx.G.publicLog.push(`🚫 ${cn(targetId)} 不能移动到 ${LOC_CN[destination] || destination}`);
        return;
      }
      if (!canCharacterMoveBetween(ctx.G, targetId, target.locationId, destination)) {
        ctx.G.publicLog.push(`🚫 ${cn(targetId)} 当前无法移动到 ${LOC_CN[destination] || destination}`);
        return;
      }

      const previousLocation = target.locationId;
      target.locationId = destination;
      if (destination !== previousLocation) {
        const blockedDay = (ctx.incident?.day ?? ctx.G.day ?? 0) + 1;
        lockCharacterMovementOnDay(ctx.G, targetId, blockedDay);
      }

      ctx.G.publicLog.push(`📮 可疑信件：${cn(targetId)} 被移动到 ${LOC_CN[destination] || destination}`);
      ctx.G.fullLog.push(`[事件] 可疑信件：${cn(targetId)} ${previousLocation} -> ${destination}`);
    },
  },

  // ── MC：银色子弹 (Silver Bullet) ─────────────────────────────────────────
  {
    ruleId: 'mc_incident_silver_bullet',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '银色子弹：本轮轮回在本阶段结束时终止');
    },
    execute(ctx) {
      ctx.G.v1.loopLost = true;
      ctx.G.publicLog.push('🔫 银色子弹：本轮轮回提前结束');
      ctx.G.fullLog.push('[事件] 银色子弹：标记当前轮回结束');
    },
  },

  // ── MC：封锁 (Blockade) ───────────────────────────────────────────────────
  {
    ruleId: 'mc_incident_blockade',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人不在场');
      return ok(true, '封锁：指定区域在接下来 3 天内无法进出');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const eligibleLocations = getPossibleBlockadeLocationIds(ctx.G, culpritId);
      const targetLocation = ctx.selectedTargets?.location && eligibleLocations.includes(ctx.selectedTargets.location)
        ? ctx.selectedTargets.location
        : eligibleLocations[0];
      if (!targetLocation) return;

      const untilDay = (ctx.incident?.day ?? ctx.G.day ?? 0) + 2;
      blockLocationUntilDay(ctx.G, targetLocation, untilDay);
      ctx.G.publicLog.push(`🚧 ${LOC_CN[targetLocation] || targetLocation} 被封锁至第 ${untilDay} 天结束`);
      ctx.G.fullLog.push(`[事件] 封锁：${targetLocation} blockedUntilDay=${untilDay}`);
    },
  },

  // ── BTX 新增事件
  // ══════════════════════════════════════════════════════════════════════════════

  // ── HSA：疯狂之夜 (Night of Madness) ──────────────────────────────────────
  // 群众事件（必要尸体数0）。事件发生时标记 incidentHistory，供狼人 day_end 读取。
  // 事件本身的效果：如果场上有 6 具或以上丧尸，狼人在 day_end 会杀死主人公。
  // 事件处理器只需标记"疯狂之夜已发生"——具体的主人公杀死由 hsa_werewolf_night_of_madness_loss 处理。
  {
    ruleId: 'hsa_incident_night_of_madness',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      // 群众事件（必要尸体数0），总是可以触发
      return ok(true, '疯狂之夜事件：标记本回合已发生');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      // 事件效果：标记本回合发生了疯狂之夜（incidentHistory 由 moves.ts 统一写入）
      // 具体的"6具丧尸→主人公死亡"判定由狼人身份处理器在 day_end 执行
      ctx.G.publicLog.push('🌙 疯狂之夜降临！');
      ctx.G.fullLog.push('[事件] 疯狂之夜发生');
    },
  },

  // ── 蝴蝶效应 (Butterfly Effect) ───────────────────────────────────────────
  {
    ruleId: 'btx_incident_butterfly_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culprit = ctx.G.v1.characters[ctx.incident.culpritId];
      if (!culprit || !isAliveOnBoard(ctx, ctx.incident.culpritId)) return ok(false, '当事人已死亡');
      const targets = aliveCharsAtLocation(ctx, culprit.locationId);
      return ok(true, `蝴蝶效应：同区域 ${targets.length} 名角色可选`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culprit = ctx.G.v1.characters[ctx.incident!.culpritId];
      if (!culprit) return;
      // 选择同区域 1 名角色（含犯人自身）
      const targets = aliveCharsAtLocation(ctx, culprit.locationId);
      if (targets.length === 0) {
        ctx.G.publicLog.push('📋 蝴蝶效应：无可选角色');
        return;
      }
      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && targets.includes(selectedTarget)
        ? selectedTarget
        : targets[0];
      const target = ctx.G.v1.characters[targetId];
      // 沙盒模式：默认放密谋（实际应三选一：友好/不安/密谋）
      addToken(target, 'intrigue', 1);
      ctx.G.publicLog.push(`🦋 蝴蝶效应：${cn(targetId)} +1 密谋`);
      ctx.G.fullLog.push(`[事件] 蝴蝶效应：${cn(targetId)} +1 密谋`);

      // 标记本轮蝴蝶效应已触发（改变未来 plot 用）
      if (ctx.G.v1.loopState) {
        ctx.G.v1.loopState.butterflyEffectTriggered = true;
      }
    },
  },

  {
    ruleId: 'ahr_incident_butterfly_effect',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culprit = ctx.G.v1.characters[ctx.incident.culpritId];
      if (!culprit || !isAliveOnBoard(ctx, ctx.incident.culpritId)) return ok(false, '当事人已死亡');
      return ok(true, '蝴蝶效应：可选择同区域角色或当事人所在版图');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culprit = ctx.G.v1.characters[ctx.incident!.culpritId];
      if (!culprit) return;

      const selectedTarget = ctx.selectedTargets?.target;
      const tokenType = ctx.selectedTargets?.tokenType as 'goodwill' | 'paranoia' | 'intrigue' | undefined;
      const characterTargets = aliveCharsAtLocation(ctx, culprit.locationId);
      const locationTarget = culprit.locationId;

      if (selectedTarget === locationTarget) {
        const location = ctx.G.v1.locations[locationTarget];
        if (location) {
          addToken(location, tokenType || 'intrigue', 1);
          ctx.G.publicLog.push(`🦋 蝴蝶效应：${LOC_CN[locationTarget] || locationTarget} +1 ${tokenType || 'intrigue'}`);
          ctx.G.fullLog.push(`[事件] 蝴蝶效应：版图 ${locationTarget} +1 ${tokenType || 'intrigue'}`);
        }
      } else {
        const targetId = selectedTarget && characterTargets.includes(selectedTarget)
          ? selectedTarget
          : characterTargets[0];
        if (!targetId) {
          ctx.G.publicLog.push('📋 蝴蝶效应：无可选目标');
          return;
        }
        addToken(ctx.G.v1.characters[targetId], tokenType || 'intrigue', 1);
        ctx.G.publicLog.push(`🦋 蝴蝶效应：${cn(targetId)} +1 ${tokenType || 'intrigue'}`);
        ctx.G.fullLog.push(`[事件] 蝴蝶效应：${cn(targetId)} +1 ${tokenType || 'intrigue'}`);
      }

      if (ctx.G.v1.loopState) {
        ctx.G.v1.loopState.butterflyEffectTriggered = true;
      }
    },
  },

  // ── 邪气污染 (Foul Evil) ──────────────────────────────────────────────────
  {
    ruleId: 'btx_incident_foul_evil',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '邪气污染：在神社放置 2 密谋');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const shrine = ctx.G.v1.locations['shrine'];
      if (shrine) {
        addToken(shrine, 'intrigue', 2);
        ctx.G.publicLog.push('👿 邪气污染：神社 +2 密谋');
      } else {
        ctx.G.publicLog.push('📋 邪气污染：神社不存在');
      }
      ctx.G.fullLog.push(`[事件] 邪气污染完成`);
    },
  },
];

// ── BTX 前缀别名 ──────────────────────────────────────────────────────────
// BTX 的 7 个共享事件与 FS 效果完全一致，只是 ruleId 不同
// 通过复用 FS 处理器的 check/execute 创建别名

const btxAliases: [string, string][] = [
  ['btx_incident_murder_effect',              'incident_murder_effect'],
  ['btx_incident_hospital_incident_effect',   'incident_hospital_incident_effect'],
  ['btx_incident_suicide_effect',             'incident_suicide_effect'],
  ['btx_incident_missing_person_effect',      'incident_missing_person_effect'],
  ['btx_incident_spreading_effect',           'incident_spreading_effect'],
  ['btx_incident_increasing_unease_effect',   'incident_increasing_unease_effect'],
  ['btx_incident_faraway_murder_effect',      'incident_faraway_murder_effect'],
];

for (const [btxId, fsId] of btxAliases) {
  const source = incidentProcessors.find(p => p.ruleId === fsId);
  if (source) {
    incidentProcessors.push({
      ruleId: btxId,
      check: source.check,
      execute: source.execute,
    });
  }
}

// ── 扩展模组共享事件别名（语义同 FS 基础版）────────────────────────────
const expansionAliases: [string, string][] = [
  // 第一波
  ['ahr_incident_missing_person',           'incident_missing_person_effect'],
  ['ll_incident_missing_person',            'incident_missing_person_effect'],
  ['ll_incident_increasing_unease',         'incident_increasing_unease_effect'],
  ['wm_incident_missing_person',            'incident_missing_person_effect'],
  ['wm_incident_increasing_unease',         'incident_increasing_unease_effect'],
  ['wm_incident_hospital_incident',         'incident_hospital_incident_effect'],
  // 第二波 - MC
  ['mc_incident_increasing_unease',         'incident_increasing_unease_effect'],
  ['mc_incident_hospital_incident',         'incident_hospital_incident_effect'],
  ['mc_incident_serial_murder',             'incident_murder_effect'],
  ['mc_incident_suicide',                   'incident_suicide_effect'],
  // 第二波 - HSA
  ['hsa_incident_increasing_unease',        'incident_increasing_unease_effect'],
  ['hsa_incident_missing_person',           'incident_missing_person_effect'],
  ['hsa_incident_foul_evil',                'btx_incident_foul_evil'],
  // HSA 独有事件：亵渎杀人/送葬/言灵/孤守/诅咒活化/污秽溢出/死者默示录 由 hsaIncidentProcessors 实现
  // 第一波 - AHR 补充（语义同 FS 基础版）
  ['ahr_incident_impulse_murder',          'incident_murder_effect'],
  ['ahr_incident_hospital_incident',       'incident_hospital_incident_effect'],
  ['ahr_incident_serial_murder',            'incident_murder_effect'],
  ['ahr_incident_spreading',                'incident_spreading_effect'],
  ['ahr_incident_increasing_unease',        'incident_increasing_unease_effect'],
  ['ahr_incident_faraway_murder',           'incident_faraway_murder_effect'],
  // MZ 共享事件别名
  ['mz_incident_serial_murder',             'incident_murder_effect'],
  ['mz_incident_suicide',                   'incident_suicide_effect'],
  ['mz_incident_hospital_incident',         'incident_hospital_incident_effect'],
  ['mz_incident_missing_person',            'incident_missing_person_effect'],
  ['mz_incident_increasing_unease',         'incident_increasing_unease_effect'],
  ['mz_incident_faked_suicide',             'mc_incident_faked_suicide'],
];

for (const [aliasId, sourceId] of expansionAliases) {
  const source = incidentProcessors.find(p => p.ruleId === sourceId);
  if (source) {
    incidentProcessors.push({
      ruleId: aliasId,
      check: source.check,
      execute: source.execute,
    });
  }
}



const mzIncidentProcessors: RuleProcessor[] = [
  // ── 自白 (Confession) ────────────────────────────────────────────────
  // 当事人公开自己的身份
  {
    ruleId: 'mz_incident_confession',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡或离场');
      return ok(true, `自白：${cn(culpritId)} 将公开身份`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const roleId = getEffectiveRoleId(ctx.G, culpritId) || ctx.G.v1.hiddenRoles?.[culpritId] || 'person';
      recordRevealedRole(ctx.G, culpritId, roleId);
      ctx.G.publicLog.push(`📜 ${cn(culpritId)} 自白了自己的身份`);
      ctx.G.fullLog.push(`[事件] 自白：${cn(culpritId)} 公开身份为 ${ctx.G.v1.loopState.revealedRoles[culpritId]}`);
    },
  },

  // ── 破局 (Breaking the Board) ──────────────────────────────────────────
  // 队长选择 1 名角色或 1 块版图，移除最多 2 枚密谋
  {
    ruleId: 'mz_incident_breaking_the_board',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '破局：队长可选择角色或版图移除最多 2 密谋', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const target = ctx.selectedTargets?.target;
      const location = ctx.selectedTargets?.location;
      if (location) {
        // 从版图移除密谋
        const loc = ctx.G.v1.locations[location];
        if (loc) {
          const current = getToken(loc, 'intrigue');
          const remove = Math.min(2, current);
          addToken(loc, 'intrigue', -remove);
          ctx.G.publicLog.push(`🔨 破局：${LOC_CN[location] || location} 移除了 ${remove} 密谋`);
          ctx.G.fullLog.push(`[事件] 破局：${location} -${remove} 密谋`);
        }
      } else if (target) {
        // target 可能是角色 ID 或版图 ID（兼容传参方式）
        const character = ctx.G.v1.characters[target];
        const locByTarget = !character ? ctx.G.v1.locations[target] : undefined;
        if (character) {
          const current = getCharVal(character, 'intrigue');
          const remove = Math.min(2, current);
          addToken(character, 'intrigue', -remove);
          ctx.G.publicLog.push(`🔨 破局：${cn(target)} 移除了 ${remove} 密谋`);
          ctx.G.fullLog.push(`[事件] 破局：${cn(target)} -${remove} 密谋`);
        } else if (locByTarget) {
          const current = getToken(locByTarget, 'intrigue');
          const remove = Math.min(2, current);
          addToken(locByTarget, 'intrigue', -remove);
          ctx.G.publicLog.push(`🔨 破局：${LOC_CN[target] || target} 移除了 ${remove} 密谋`);
          ctx.G.fullLog.push(`[事件] 破局：${target} -${remove} 密谋`);
        }
      } else {
        // 自动结算：没有选择目标时不做任何事
        ctx.G.publicLog.push('📋 破局事件发生但未选择目标');
        ctx.G.fullLog.push('[事件] 破局：未选择目标，无现象');
      }
    },
  },

  // ── 伪造事件 (Forged Incident) ─────────────────────────────────────────
  // 当事人初始区域有 2+ 密谋 → 主人公死亡
  {
    ruleId: 'mz_incident_forged_incident',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      const startLoc = CHARACTERS[culpritId as keyof typeof CHARACTERS]?.startingLocations?.[0];
      if (!startLoc) return ok(true, '伪造事件：当事人无初始区域，事件发生但无现象');
      const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
      const triggered = locIntrigue >= 2;
      return ok(true, triggered
        ? `伪造事件：${cn(culpritId)} 初始区域(${startLoc})密谋=${locIntrigue}≥2，主人公将死亡`
        : `伪造事件：${cn(culpritId)} 初始区域(${startLoc})密谋=${locIntrigue}<2，无现象`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const startLoc = CHARACTERS[culpritId as keyof typeof CHARACTERS]?.startingLocations?.[0];
      if (!startLoc) {
        ctx.G.publicLog.push('📋 伪造事件发生但无现象');
        return;
      }
      const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
      if (locIntrigue >= 2) {
        triggerProtagonistDeath(ctx.G, `伪造事件：${cn(culpritId)} 初始区域密谋≥2`);
        ctx.G.fullLog.push(`[事件] 伪造事件：${cn(culpritId)} 初始区域(${startLoc}) 密谋=${locIntrigue}≥2，主人公死亡`);
      } else {
        ctx.G.publicLog.push('📋 伪造事件发生但无现象');
        ctx.G.fullLog.push(`[事件] 伪造事件：${cn(culpritId)} 初始区域(${startLoc}) 密谋=${locIntrigue}<2，无现象`);
      }
    },
  },

  // ── 暴乱 (Riot) ────────────────────────────────────────────────────────
  // 都市/学校有 1+ 密谋 → 对应地点所有角色死亡
  {
    ruleId: 'mz_incident_riot',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const cityIntrigue = getToken(ctx.G.v1.locations['city'], 'intrigue');
      const schoolIntrigue = getToken(ctx.G.v1.locations['school'], 'intrigue');
      const affectedLocations: string[] = [];
      if (cityIntrigue >= 1) affectedLocations.push('都市');
      if (schoolIntrigue >= 1) affectedLocations.push('学校');
      if (affectedLocations.length === 0) {
        return ok(true, '暴乱：都市和学校均无密谋，事件发生但无现象');
      }
      return ok(true, `暴乱：${affectedLocations.join('+')} 有密谋，角色将全部死亡`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const deaths: string[] = [];
      // 检查都市
      if (getToken(ctx.G.v1.locations['city'], 'intrigue') >= 1) {
        const victims = aliveCharsAtLocation(ctx, 'city');
        for (const victimId of victims) {
          if (killCharacter(ctx, victimId, INCIDENT_KILL_OPTIONS)) deaths.push(victimId);
        }
        if (victims.length > 0) {
          ctx.G.fullLog.push(`[事件] 暴乱：都市密谋≥1，${victims.map(cn).join(',')} 死亡`);
        }
      }
      // 检查学校
      if (getToken(ctx.G.v1.locations['school'], 'intrigue') >= 1) {
        const victims = aliveCharsAtLocation(ctx, 'school');
        for (const victimId of victims) {
          if (killCharacter(ctx, victimId, INCIDENT_KILL_OPTIONS)) deaths.push(victimId);
        }
        if (victims.length > 0) {
          ctx.G.fullLog.push(`[事件] 暴乱：学校密谋≥1，${victims.map(cn).join(',')} 死亡`);
        }
      }
      applyIncidentDeathLinks(ctx, deaths);
      if (deaths.length > 0) {
        ctx.G.publicLog.push(`💥 暴乱发生！${deaths.length} 名角色死亡`);
      } else {
        ctx.G.publicLog.push('📋 暴乱事件发生但无现象');
      }
    },
  },

  // ── 阴谋活动 (Conspiracy Activity) ─────────────────────────────────────
  // 结算方式由剧作家选择「连续杀人」或「失踪」效果
  {
    ruleId: 'mz_incident_conspiracy_activity',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '阴谋活动：剧作家选择连续杀人或失踪效果', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const choice = ctx.selectedTargets?.incidentChoice ?? 'serial_murder';
      if (choice === 'missing_person') {
        const c = ctx.G.v1.characters[culpritId];
        if (!c) return;
        const legalLocations = Object.keys(ctx.G.v1.locations);
        const targetLocation = ctx.selectedTargets?.location && legalLocations.includes(ctx.selectedTargets.location)
          ? ctx.selectedTargets.location
          : legalLocations.includes(c.locationId)
            ? c.locationId
            : legalLocations[0] ?? c.locationId;

        c.locationId = targetLocation;
        ctx.G.publicLog.push(`📍 ${cn(culpritId)} 被移动到 ${LOC_CN[targetLocation] || targetLocation}`);

        const loc = ctx.G.v1.locations[targetLocation];
        if (loc) {
          addToken(loc, 'intrigue', 1);
          ctx.G.publicLog.push(`🔮 ${LOC_CN[targetLocation] || targetLocation} 获得 1 密谋`);
        }
        ctx.G.fullLog.push(`[事件] 阴谋活动（失踪）：${cn(culpritId)} 移动到 ${LOC_CN[targetLocation] || targetLocation}，放置 1 密谋`);
      } else {
        // 连续杀人效果：同区域杀 1 名角色
        const others = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
        const targetId = ctx.selectedTargets?.target && others.includes(ctx.selectedTargets.target)
          ? ctx.selectedTargets.target
          : others[0];
        if (targetId) {
          const deaths: string[] = [];
          if (killCharacter(ctx, targetId, INCIDENT_KILL_OPTIONS)) deaths.push(targetId);
          applyIncidentDeathLinks(ctx, deaths);
          ctx.G.fullLog.push(`[事件] 阴谋活动（连续杀人）：${cn(targetId)} 被杀害`);
        } else {
          ctx.G.publicLog.push('📋 阴谋活动发生但无现象');
          ctx.G.fullLog.push('[事件] 阴谋活动（连续杀人）：无可杀目标');
        }
      }
    },
  },
];
incidentProcessors.push(...mzIncidentProcessors);

// ── WM 事件处理器（对齐 docs/模组/Weird_Mythology.md） ─────────────────────

// 复用基础版的 WM 事件别名
const wmIncidentAliases: Array<[string, string]> = [
  ['wm_incident_serial_murder',          'incident_murder_effect'],          // 疯狂杀人 → 同区1名角色死亡
  ['wm_incident_increasing_unease',      'incident_increasing_unease_effect'], // 不安扩散
  ['wm_incident_missing_person',         'incident_missing_person_effect'],  // 失踪
  ['wm_incident_hospital_incident',      'incident_hospital_incident_effect'], // 医院事故
];
for (const [aliasId, sourceId] of wmIncidentAliases) {
  const source = incidentProcessors.find(p => p.ruleId === sourceId);
  if (source) {
    incidentProcessors.push({ ruleId: aliasId, check: source.check, execute: source.execute });
  }
}

// WM 独有事件处理器
const wmIncidentProcessors: RuleProcessor[] = [
  // ── 集体自杀：当事人有密谋→全区角色死亡
  {
    ruleId: 'wm_incident_collective_suicide',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      const culprit = ctx.G.v1.characters[culpritId];
      const hasIntrigue = getToken(culprit, 'intrigue') >= 1;
      if (!hasIntrigue) return ok(true, '集体自杀：当事人无密谋，事件发生但无现象');
      return ok(true, '集体自杀：当事人有密谋，全区角色将死亡');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const culprit = ctx.G.v1.characters[culpritId];
      if (!culprit || getToken(culprit, 'intrigue') < 1) {
        ctx.G.publicLog.push('📋 集体自杀事件发生但没有现象');
        return;
      }
      const deaths: string[] = [];
      const victims = aliveCharsAtIncidentLocation(ctx, culpritId, { includeCulprit: true });
      for (const victimId of victims) {
        if (killCharacter(ctx, victimId, INCIDENT_KILL_OPTIONS)) deaths.push(victimId);
      }
      applyIncidentDeathLinks(ctx, deaths);
      ctx.G.publicLog.push(`💀 集体自杀：${deaths.length}名角色死亡`);
      ctx.G.fullLog.push(`[事件] 集体自杀：${deaths.map(cn).join(',')}死亡`);
    },
  },

  // ── 邪气污染：神社+2密谋（复用 BTX 版）
  {
    ruleId: 'wm_incident_foul_evil',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '邪气污染：在神社放置 2 密谋');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const shrine = ctx.G.v1.locations['shrine'];
      if (shrine) {
        addToken(shrine, 'intrigue', 2);
        ctx.G.publicLog.push('👿 邪气污染：神社 +2 密谋');
      }
      ctx.G.fullLog.push('[事件] 邪气污染完成');
    },
  },

  // ── 暴乱：都市/学校有密谋→各自全员死（复用 MZ 版逻辑）
  {
    ruleId: 'wm_incident_riot',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const cityIntrigue = getToken(ctx.G.v1.locations['city'], 'intrigue');
      const schoolIntrigue = getToken(ctx.G.v1.locations['school'], 'intrigue');
      const affected: string[] = [];
      if (cityIntrigue >= 1) affected.push('都市');
      if (schoolIntrigue >= 1) affected.push('学校');
      if (affected.length === 0) return ok(true, '暴乱：都市和学校均无密谋，事件发生但无现象');
      return ok(true, `暴乱：${affected.join('+')}有密谋，角色将全部死亡`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const deaths: string[] = [];
      if (getToken(ctx.G.v1.locations['city'], 'intrigue') >= 1) {
        for (const id of aliveCharsAtLocation(ctx, 'city')) {
          if (killCharacter(ctx, id, INCIDENT_KILL_OPTIONS)) deaths.push(id);
        }
      }
      if (getToken(ctx.G.v1.locations['school'], 'intrigue') >= 1) {
        for (const id of aliveCharsAtLocation(ctx, 'school')) {
          if (killCharacter(ctx, id, INCIDENT_KILL_OPTIONS)) deaths.push(id);
        }
      }
      applyIncidentDeathLinks(ctx, deaths);
      if (deaths.length > 0) {
        ctx.G.publicLog.push(`💥 暴乱发生！${deaths.length}名角色死亡`);
      } else {
        ctx.G.publicLog.push('📋 暴乱事件发生但无现象');
      }
      ctx.G.fullLog.push(`[事件] 暴乱：${deaths.map(cn).join(',') || '无'}死亡`);
    },
  },

  // ── 灭绝之火：首次发生→全死
  {
    ruleId: 'wm_incident_extinction_fire',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const alreadyFired = !!ctx.G.v1.loopState?.abilityUsage?.['__wm_extinction_fire_global']?.usedThisLoop;
      if (alreadyFired) return ok(true, '灭绝之火：非首次发生，无现象');
      return ok(true, '灭绝之火：首次发生，全体角色和主人公死亡');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      // 检查是否为本局游戏首次发生（跨轮回追踪）
      const globalKey = '__wm_extinction_fire_global';
      if (ctx.G.v1.loopState?.abilityUsage?.[globalKey]?.usedThisLoop) {
        ctx.G.publicLog.push('📋 灭绝之火：非首次发生，无现象');
        return;
      }
      // 标记全局已发生
      if (!ctx.G.v1.loopState.abilityUsage[globalKey]) {
        ctx.G.v1.loopState.abilityUsage[globalKey] = { usedToday: true, usedThisLoop: true };
      }
      // 所有角色死亡
      const deaths: string[] = [];
      for (const [id, c] of Object.entries(ctx.G.v1.characters)) {
        if (c.alive) {
          if (killCharacter(ctx, id, INCIDENT_KILL_OPTIONS)) deaths.push(id);
        }
      }
      applyIncidentDeathLinks(ctx, deaths);
      // 主人公死亡
      triggerProtagonistDeath(ctx.G, '灭绝之火：首次发生');
      ctx.G.publicLog.push('🔥 灭绝之火：所有角色和主人公死亡！');
      ctx.G.fullLog.push(`[事件] 灭绝之火首次发生：${deaths.length}名角色+主人公死亡`);
    },
  },

  // ── 廷达罗斯之嗅：标记后续事件→主人公死
  {
    ruleId: 'wm_incident_scent_of_tindalos',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '廷达罗斯之嗅：标记本轮后续事件触发主人公死亡');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      // 标记：本轮后续事件发生→主人公死亡
      const key = '__wm_scent_of_tindalos_active';
      if (!ctx.G.v1.loopState.abilityUsage[key]) {
        ctx.G.v1.loopState.abilityUsage[key] = { usedToday: true, usedThisLoop: true };
      } else {
        ctx.G.v1.loopState.abilityUsage[key].usedThisLoop = true;
      }
      ctx.G.publicLog.push('👃 廷达罗斯之嗅：不祥的气息弥漫…');
      ctx.G.fullLog.push('[事件] 廷达罗斯之嗅：标记本轮后续事件→主人公死亡');
    },
  },

  // ── 发现：Ex+1
  {
    ruleId: 'wm_incident_discovery',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '发现：Ex槽增加1');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const ex = ctx.G.v1.ex;
      if (ex?.enabled) {
        ex.gauge = Math.max(0, ex.gauge + 1);
        ex.changedThisLoop = true;
      }
      ctx.G.publicLog.push('🔍 发现：Ex槽 +1');
      ctx.G.fullLog.push('[事件] 发现：Ex槽增加1');
    },
  },

  // ── 送葬：不安限度-1，队长选1名角色死亡
  {
    ruleId: 'wm_incident_funeral',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '送葬：队长选择1名角色死亡', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      // 选择目标角色
      const aliveTargets = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id))
        .map(([id]) => id);
      const targetId = ctx.selectedTargets?.target && aliveTargets.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : aliveTargets[0];
      if (targetId) {
        const deaths: string[] = [];
        if (killCharacter(ctx, targetId, INCIDENT_KILL_OPTIONS)) deaths.push(targetId);
        applyIncidentDeathLinks(ctx, deaths);
        ctx.G.publicLog.push(`⚰️ 送葬：${cn(targetId)} 死亡`);
        ctx.G.fullLog.push(`[事件] 送葬：${cn(targetId)} 死亡`);
      } else {
        ctx.G.publicLog.push('📋 送葬事件发生但无可选角色');
      }
    },
  },
];
incidentProcessors.push(...wmIncidentProcessors);

// ── AHR 独有事件空壳 ──────────────────────────────────────────────────────
// 这些事件语义独特，无法简单复用 FS 处理器，先注册空壳通过可玩性门禁

incidentProcessors.push(
  {
    ruleId: 'ahr_incident_dimension_shift',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      return ok(true, '次元转换：当事人存活时，进行世界移动');
    },
    execute(ctx) {
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId || !isAliveOnBoard(ctx, culpritId)) return;

      markWorldShiftThisDay(ctx.G, `incident:dimension_shift:${culpritId}`);
      ctx.G.publicLog.push('🌀 次元转换：发生世界移动');
      ctx.G.fullLog.push(`[事件] 次元转换：${cn(culpritId)} 存活，记录当天 world shift`);
    },
  },
  {
    ruleId: 'ahr_incident_dimension_warp',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const aliveTargets = Object.entries(ctx.G.v1.characters)
        .filter(([_, character]) => character.alive)
        .map(([id]) => id);
      return ok(aliveTargets.length >= 2, '次元歪曲：选择是否世界移动，并为两名角色放置指示物', true);
    },
    execute(ctx) {
      const paranoiaTarget = ctx.selectedTargets?.paranoiaTarget;
      const goodwillTarget = ctx.selectedTargets?.goodwillTarget;
      if (!paranoiaTarget || !goodwillTarget || paranoiaTarget === goodwillTarget) return;

      if (ctx.selectedTargets?.worldShiftChoice === 'shift') {
        markWorldShiftThisDay(ctx.G, `incident:dimension_warp:${ctx.incident?.culpritId ?? 'unknown'}`);
        ctx.G.publicLog.push('🌀 次元歪曲：发生世界移动');
      }

      addToken(ctx.G.v1.characters[paranoiaTarget], 'paranoia', 2);
      addToken(ctx.G.v1.characters[goodwillTarget], 'goodwill', 2);
      ctx.G.fullLog.push(
        `[事件] 次元歪曲：${cn(paranoiaTarget)} +2 不安，${cn(goodwillTarget)} +2 友好，worldShift=${ctx.selectedTargets?.worldShiftChoice ?? 'no_shift'}`,
      );
    },
  },
  {
    ruleId: 'ahr_incident_dimension_fault',
    check(ctx) {
      if (!ctx.incident?.culpritId) return ok(false);
      return ok(true, '次元断层：选择是否世界移动，并检查当事人指示物种类数', true);
    },
    execute(ctx) {
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      if (ctx.selectedTargets?.worldShiftChoice === 'shift') {
        markWorldShiftThisDay(ctx.G, `incident:dimension_fault:${culpritId}`);
        ctx.G.publicLog.push('🌀 次元断层：发生世界移动');
      }

      const culprit = ctx.G.v1.characters[culpritId];
      if (!culprit) return;

      if (countDistinctCharacterTokenTypes(culprit) >= 3) {
        triggerProtagonistDeath(ctx.G, '次元断层（当事人有 3 种或以上不同指示物）');
        ctx.G.fullLog.push(`[事件] 次元断层：${cn(culpritId)} 指示物种类 >= 3，主人公死亡`);
      } else {
        ctx.G.fullLog.push(`[事件] 次元断层：${cn(culpritId)} 指示物种类不足 3`);
      }
    },
  },
  {
    ruleId: 'ahr_incident_lost_item',
    check(ctx) {
      if (!ctx.incident?.culpritId) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      const targets = aliveCharsAtIncidentLocation(ctx, culpritId, { includeCulprit: true });
      return ok(targets.length > 0, '遗失物：同区 1 名角色 +1 密谋，然后移动当事人', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const culprit = ctx.G.v1.characters[culpritId];
      if (!culprit) return;

      const intrigueTargets = aliveCharsAtIncidentLocation(ctx, culpritId, { includeCulprit: true });
      const intrigueTargetId = ctx.selectedTargets?.intrigueTarget && intrigueTargets.includes(ctx.selectedTargets.intrigueTarget)
        ? ctx.selectedTargets.intrigueTarget
        : intrigueTargets[0];
      if (intrigueTargetId) {
        addToken(ctx.G.v1.characters[intrigueTargetId], 'intrigue', 1);
      }

      const destination = typeof ctx.selectedTargets?.location === 'string' && ALL_LOCATIONS.includes(ctx.selectedTargets.location as any)
        ? ctx.selectedTargets.location
        : culprit.locationId;
      culprit.locationId = destination;

      ctx.G.publicLog.push(`🧳 遗失物：${cn(intrigueTargetId ?? culpritId)} +1 密谋，${cn(culpritId)} 移动到 ${LOC_CN[destination] || destination}`);
      ctx.G.fullLog.push(`[事件] 遗失物：${cn(intrigueTargetId ?? culpritId)} +1 密谋，${cn(culpritId)} -> ${LOC_CN[destination] || destination}`);
    },
  },
  {
    ruleId: 'ahr_incident_singularity',
    check(ctx) {
      if (!ctx.incident?.culpritId) return ok(false);
      return ok(true, '奇点：按表里世界与首次发生状态结算');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const wasFirstOccurrence = !ctx.G.v1.ahrSingularityOccurred;
      ctx.G.v1.ahrSingularityOccurred = true;
      const preIncidentGauge = Math.max(0, (ctx.G.v1.ex?.gauge ?? 0) - 1);
      const wasBackWorld = !!ctx.G.v1.ex?.enabled && preIncidentGauge % 2 === 1;

      if (!wasBackWorld) {
        if (wasFirstOccurrence) {
          triggerProtagonistDeath(ctx.G, '奇点（表世界首次发生）');
          ctx.G.fullLog.push(`[事件] 奇点：表世界首次发生，主人公死亡`);
          return;
        }

        markWorldShiftThisDay(ctx.G, `incident:singularity:${culpritId}`);
        ctx.G.publicLog.push('🌀 奇点：发生世界移动');
        ctx.G.fullLog.push(`[事件] 奇点：非首次表世界发生，记录当天 world shift`);
        return;
      }

      const initialLocation = CHARACTERS[culpritId as keyof typeof CHARACTERS]?.startingLocations?.[0];
      const initialIntrigue = initialLocation ? getToken(ctx.G.v1.locations[initialLocation], 'intrigue') : 0;
      if (initialIntrigue >= 1) {
        triggerProtagonistDeath(ctx.G, `奇点（里世界且 ${LOC_CN[initialLocation || ''] || initialLocation || '初始区域'} 有密谋）`);
        ctx.G.fullLog.push(`[事件] 奇点：里世界且 ${cn(culpritId)} 初始区域密谋 >= 1，主人公死亡`);
        return;
      }

      markWorldShiftThisDay(ctx.G, `incident:singularity:${culpritId}`);
      ctx.G.publicLog.push('🌀 奇点：发生世界移动');
      ctx.G.fullLog.push(`[事件] 奇点：里世界且初始区域无密谋，记录当天 world shift`);
    },
  },
  {
    ruleId: 'ahr_incident_imaginary_incident',
    check(ctx) {
      if (!ctx.incident?.culpritId) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      return ok(true, '空想事件：按所选子事件结算', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const branch = ctx.selectedTargets?.incidentChoice;
      if (branch === 'impulse_murder') {
        const murderTargets = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
        const targetId = ctx.selectedTargets?.murderTarget && murderTargets.includes(ctx.selectedTargets.murderTarget)
          ? ctx.selectedTargets.murderTarget
          : murderTargets[0];
        if (targetId) {
          const deaths: string[] = [];
          if (killCharacter(ctx, targetId, INCIDENT_KILL_OPTIONS)) deaths.push(targetId);
          applyIncidentDeathLinks(ctx, deaths);
          markAhrTragedyDeath(ctx, deaths);
          ctx.G.fullLog.push(`[事件] 空想事件→冲动杀人：${cn(targetId)} 被杀害`);
        } else {
          ctx.G.publicLog.push('📋 空想事件发生但所选冲动杀人没有现象');
        }
        return;
      }

      if (branch === 'dimension_warp') {
        const paranoiaTarget = ctx.selectedTargets?.paranoiaTarget;
        const goodwillTarget = ctx.selectedTargets?.goodwillTarget;
        if (!paranoiaTarget || !goodwillTarget || paranoiaTarget === goodwillTarget) return;

        if (ctx.selectedTargets?.worldShiftChoice === 'shift') {
          markWorldShiftThisDay(ctx.G, `incident:imaginary_incident:dimension_warp:${culpritId}`);
          ctx.G.publicLog.push('🌀 空想事件：发生世界移动');
        }

        addToken(ctx.G.v1.characters[paranoiaTarget], 'paranoia', 2);
        addToken(ctx.G.v1.characters[goodwillTarget], 'goodwill', 2);
        ctx.G.fullLog.push(`[事件] 空想事件→次元歪曲：${cn(paranoiaTarget)} +2 不安，${cn(goodwillTarget)} +2 友好`);
        return;
      }

      if (branch === 'lost_item') {
        const culprit = ctx.G.v1.characters[culpritId];
        if (!culprit) return;

        const intrigueTargets = aliveCharsAtIncidentLocation(ctx, culpritId, { includeCulprit: true });
        const intrigueTargetId = ctx.selectedTargets?.intrigueTarget && intrigueTargets.includes(ctx.selectedTargets.intrigueTarget)
          ? ctx.selectedTargets.intrigueTarget
          : intrigueTargets[0];
        if (intrigueTargetId) {
          addToken(ctx.G.v1.characters[intrigueTargetId], 'intrigue', 1);
        }

        const destination = typeof ctx.selectedTargets?.location === 'string' && ALL_LOCATIONS.includes(ctx.selectedTargets.location as any)
          ? ctx.selectedTargets.location
          : culprit.locationId;
        culprit.locationId = destination;

        ctx.G.publicLog.push(`🧠 空想事件：按遗失物结算，${cn(intrigueTargetId ?? culpritId)} +1 密谋，${cn(culpritId)} 移动到 ${LOC_CN[destination] || destination}`);
        ctx.G.fullLog.push(`[事件] 空想事件→遗失物：${cn(intrigueTargetId ?? culpritId)} +1 密谋，${cn(culpritId)} -> ${LOC_CN[destination] || destination}`);
      }
    },
  },
  {
    ruleId: 'ahr_incident_last_will',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      return ok(true, '遗言：当事人死亡，并在下轮轮回开始时给予主人公希望');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const deaths: string[] = [];
      if (killCharacter(ctx, culpritId, INCIDENT_KILL_OPTIONS)) {
        deaths.push(culpritId);
      }
      applyIncidentDeathLinks(ctx, deaths);
      ctx.G.v1.loopState.lastWillHopeNextLoop = true;
      ctx.G.publicLog.push('🕊️ 遗言：下轮轮回开始时，主人公将获得 1 希望');
      ctx.G.fullLog.push(`[事件] 遗言：${cn(culpritId)} 死亡，并记录下轮主人公 hope +1`);
    },
  },
  {
    ruleId: 'ahr_incident_light_in_the_gap',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const aliveTargets = Object.entries(ctx.G.v1.characters)
        .filter(([_, character]) => character.alive)
        .map(([id]) => id);
      return ok(aliveTargets.length > 0, '隙间的阳光：选择 1 名角色获得希望', aliveTargets.length > 0);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const aliveTargets = Object.entries(ctx.G.v1.characters)
        .filter(([_, character]) => character.alive)
        .map(([id]) => id);
      const targetId = ctx.selectedTargets?.target && aliveTargets.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : aliveTargets[0];
      if (!targetId) return;

      addToken(ctx.G.v1.characters[targetId], 'hope', 1);
      ctx.G.publicLog.push(`☀️ 隙间的阳光：${cn(targetId)} +1 希望`);
      ctx.G.fullLog.push(`[事件] 隙间的阳光：${cn(targetId)} +1 希望`);
    },
  },
  {
    ruleId: 'ahr_incident_darkness_of_despair',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const aliveTargets = Object.entries(ctx.G.v1.characters)
        .filter(([_, character]) => character.alive)
        .map(([id]) => id);
      return ok(aliveTargets.length > 0, '绝望之暗：选择 1 名角色获得绝望', aliveTargets.length > 0);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const aliveTargets = Object.entries(ctx.G.v1.characters)
        .filter(([_, character]) => character.alive)
        .map(([id]) => id);
      const targetId = ctx.selectedTargets?.target && aliveTargets.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : aliveTargets[0];
      if (!targetId) return;

      addToken(ctx.G.v1.characters[targetId], 'despair', 1);
      ctx.G.publicLog.push(`🌑 绝望之暗：${cn(targetId)} +1 绝望`);
      ctx.G.fullLog.push(`[事件] 绝望之暗：${cn(targetId)} +1 绝望`);
    },
  },
  {
    ruleId: 'ahr_incident_system_error',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culprit = ctx.G.v1.characters[ctx.incident.culpritId];
      if (!culprit || !culprit.alive) return ok(false, '当事人不在场');
      const intrigue = getToken(culprit, 'intrigue');
      return ok(intrigue > 0, intrigue > 0 ? '系统错误发生：当事人有密谋，死亡' : '系统错误不发生：当事人没有密谋');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;
      const culprit = ctx.G.v1.characters[culpritId];
      if (!culprit || getToken(culprit, 'intrigue') <= 0) return;
      killCharacter(ctx, culpritId, INCIDENT_KILL_OPTIONS);
      ctx.G.publicLog.push('💥 系统错误发生');
      ctx.G.fullLog.push(`[事件] 系统错误：${cn(culpritId)} 死亡`);
    },
  },
  {
    ruleId: 'ahr_incident_bizarre_murder',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人不在场');
      return ok(true, '猎奇杀人：连续杀人后结算不安扩散');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;

      const murderTargets = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
      const selectedMurderTarget = ctx.selectedTargets?.murderTarget;
      const murderTargetId = selectedMurderTarget && murderTargets.includes(selectedMurderTarget)
        ? selectedMurderTarget
        : murderTargets[0];
      if (murderTargetId) {
        const deaths: string[] = [];
        if (killCharacter(ctx, murderTargetId, INCIDENT_KILL_OPTIONS)) deaths.push(murderTargetId);
        applyIncidentDeathLinks(ctx, deaths);
      }

      const aliveCharacters = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id))
        .map(([id]) => id);
      const paranoiaTarget = ctx.selectedTargets?.paranoiaTarget && aliveCharacters.includes(ctx.selectedTargets.paranoiaTarget)
        ? ctx.selectedTargets.paranoiaTarget
        : aliveCharacters[0];
      const intrigueTarget = ctx.selectedTargets?.intrigueTarget
        && aliveCharacters.includes(ctx.selectedTargets.intrigueTarget)
        && ctx.selectedTargets.intrigueTarget !== paranoiaTarget
        ? ctx.selectedTargets.intrigueTarget
        : aliveCharacters.find(id => id !== paranoiaTarget);

      if (paranoiaTarget) {
        applyCharacterTokenDelta(ctx.G, paranoiaTarget, 'paranoia', 2);
      }
      if (intrigueTarget) {
        addToken(ctx.G.v1.characters[intrigueTarget], 'intrigue', 1);
      }

      ctx.G.publicLog.push('🩸 猎奇杀人：已结算连续杀人与不安扩散');
      ctx.G.fullLog.push(`[事件] 猎奇杀人：kill=${murderTargetId || 'none'}, paranoia=${paranoiaTarget || 'none'}, intrigue=${intrigueTarget || 'none'}`);
    },
  },
);

// ── HSA 独有事件处理器 ──────────────────────────────────────────────────────

const hsaIncidentProcessors: RuleProcessor[] = [
  // ── 亵渎杀人 (Blasphemy Murder) ──────────────────────────────────────────
  // 效果：杀同区另1角色 或 版图+1密谋（二选一）
  // FAQ: 无其他角色时必须选放密谋
  {
    ruleId: 'hsa_incident_blasphemy_murder',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      const others = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
      if (others.length === 0) {
        return ok(true, '亵渎杀人：无其他角色，必须放密谋');
      }
      return ok(true, '亵渎杀人：可选杀人或放密谋', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const others = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
      const choice = ctx.selectedTargets?.incidentChoice ?? (others.length === 0 ? 'intrigue' : 'kill');
      if (choice === 'intrigue' || others.length === 0) {
        // 放密谋到当事人所在版图
        const locationId = ctx.G.v1.characters[culpritId]?.locationId;
        if (locationId) {
          const loc = ctx.G.v1.locations[locationId];
          if (loc) addToken(loc, 'intrigue', 1);
          ctx.G.publicLog.push(`🔮 亵渎杀人：${LOC_CN[locationId] || locationId} +1 密谋`);
          ctx.G.fullLog.push(`[事件] 亵渎杀人：版图 ${locationId} +1 密谋`);
        }
      } else {
        // 杀同区另1角色
        const targetId = ctx.selectedTargets?.target && others.includes(ctx.selectedTargets.target)
          ? ctx.selectedTargets.target
          : others[0];
        if (targetId) {
          const deaths: string[] = [];
          if (killCharacter(ctx, targetId, INCIDENT_KILL_OPTIONS)) deaths.push(targetId);
          applyIncidentDeathLinks(ctx, deaths);
          ctx.G.fullLog.push(`[事件] 亵渎杀人：${cn(targetId)} 死亡`);
        }
      }
    },
  },

  // ── 送葬 (Funeral) ─────────────────────────────────────────────────────────
  // 效果：<当事人不安限度-1> 队长选1名角色死亡
  // 不安限度-1 意味着触发阈值比正常少 1
  {
    ruleId: 'hsa_incident_funeral',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '送葬事件：队长选 1 名角色死亡', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const aliveChars = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id))
        .map(([id]) => id);
      const targetId = ctx.selectedTargets?.target && aliveChars.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : aliveChars[0];
      if (targetId) {
        const deaths: string[] = [];
        if (killCharacter(ctx, targetId, INCIDENT_KILL_OPTIONS)) deaths.push(targetId);
        applyIncidentDeathLinks(ctx, deaths);
        ctx.G.publicLog.push(`⚰️ 送葬：${cn(targetId)} 被选中死亡`);
        ctx.G.fullLog.push(`[事件] 送葬：队长选择 ${cn(targetId)} 死亡`);
      } else {
        ctx.G.publicLog.push('📋 送葬事件发生但无可选角色');
      }
    },
  },

  // ── 言灵诅咒 (Word Curse) ──────────────────────────────────────────────────
  // 效果：当事人+1 Ex 牌
  {
    ruleId: 'hsa_incident_word_curse',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      return ok(true, `言灵诅咒：${cn(culpritId)} 获得 1 张 Ex 牌`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;
      const character = ctx.G.v1.characters[culpritId];
      if (!character || !character.alive) return;
      character.exCardCount = (character.exCardCount ?? 0) + 1;
      ctx.G.publicLog.push(`🔮 言灵诅咒：${cn(culpritId)} 获得 1 张 Ex 牌（诅咒牌）`);
      ctx.G.fullLog.push(`[事件] 言灵诅咒：${cn(culpritId)} Ex 牌 +1`);
    },
  },

  // ── 孤守 (Isolation) ───────────────────────────────────────────────────────
  // 效果：同区域其他所有角色分别移动至其他任意版图
  // FAQ: 为每名角色分别指定版图后同时移动；可指定禁行区域取消移动
  {
    ruleId: 'hsa_incident_isolation',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人已死亡');
      const others = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
      if (others.length === 0) return ok(true, '孤守：无其他角色需要移动');
      return ok(true, `孤守：${others.length} 名角色将被移动`, true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const others = aliveCharsAtIncidentLocation(ctx, culpritId, { excludeId: culpritId });
      if (others.length === 0) {
        ctx.G.publicLog.push('📋 孤守事件发生但无角色需要移动');
        return;
      }
      // 沙盒模式：自动将每名角色移动到当前区域以外的其他版图
      const allLocs = [...ALL_LOCATIONS];
      for (const charId of others) {
        const c = ctx.G.v1.characters[charId];
        if (!c) continue;
        const currentLoc = c.locationId;
        // 选目标：优先用剧作家/队长选择，否则自动选第一个非当前版图
        const selKey = `isolation_${charId}`;
        const selectedLoc = (ctx.selectedTargets as any)?.[selKey];
        const forbiddenLocs = new Set(
          CHARACTERS[charId as keyof typeof CHARACTERS]?.forbiddenLocations || [],
        );
        // FAQ: 可指定禁行区域取消移动
        if (selectedLoc && forbiddenLocs.has(selectedLoc)) {
          ctx.G.publicLog.push(`🚫 ${cn(charId)} 指定禁行区域，取消移动`);
          ctx.G.fullLog.push(`[事件] 孤守：${cn(charId)} 指定禁行区域 ${selectedLoc}，取消移动`);
          continue;
        }
        const dest = selectedLoc && allLocs.includes(selectedLoc) && selectedLoc !== currentLoc
          ? selectedLoc
          : allLocs.find(l => l !== currentLoc && !forbiddenLocs.has(l)) || currentLoc;
        c.locationId = dest;
        ctx.G.fullLog.push(`[事件] 孤守：${cn(charId)} 移动至 ${LOC_CN[dest] || dest}`);
      }
      ctx.G.publicLog.push(`👁️ 孤守：${others.length} 名角色被分散移动`);
    },
  },

  // ── 诅咒活化 (Curse Activation) ────────────────────────────────────────────
  // <群众事件><必要尸体数1> 往当事人所在版图放置 Ex 牌
  {
    ruleId: 'hsa_incident_curse_activation',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '诅咒活化：往指定版图放置 Ex 牌（诅咒牌）');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      // 群众事件的当事人是版图，用 culpritId 推断版图
      const culpritId = ctx.incident!.culpritId;
      const locationId = ctx.G.v1.characters[culpritId]?.locationId || culpritId;
      // 增加版图的 Ex 牌（诅咒牌）计数
      const loc = ctx.G.v1.locations[locationId];
      if (loc) {
        loc.exCardCount = (loc.exCardCount ?? 0) + 1;
      }
      ctx.G.publicLog.push(`🔮 诅咒活化：${LOC_CN[locationId] || locationId} 放置 1 张诅咒牌`);
      ctx.G.fullLog.push(`[事件] 诅咒活化：${locationId} 诅咒牌 +1`);
    },
  },

  // ── 污秽溢出 (Overflowing Filth) ───────────────────────────────────────────
  // <群众事件><必要尸体数2> 任意角色+2不安，任意版图+1密谋
  {
    ruleId: 'hsa_incident_overflowing_filth',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '污秽溢出：+2不安 + 版图+1密谋', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      // 选目标角色放 2 不安
      const aliveChars = Object.entries(ctx.G.v1.characters)
        .filter(([id, c]) => c.alive && !isRemovedFromBoard(ctx, id))
        .map(([id]) => id);
      const paranoiaTarget = ctx.selectedTargets?.paranoiaTarget && aliveChars.includes(ctx.selectedTargets.paranoiaTarget)
        ? ctx.selectedTargets.paranoiaTarget
        : aliveChars[0];
      if (paranoiaTarget) {
        applyCharacterTokenDelta(ctx.G, paranoiaTarget, 'paranoia', 2);
        ctx.G.publicLog.push(`😰 污秽溢出：${cn(paranoiaTarget)} +2 不安`);
      }
      // 选目标版图放 1 密谋
      const allLocs = ALL_LOCATIONS.filter(l => ctx.G.v1.locations[l]);
      const intrigueLoc = ctx.selectedTargets?.location && allLocs.includes(ctx.selectedTargets.location as typeof allLocs[number])
        ? ctx.selectedTargets.location
        : allLocs[0];
      if (intrigueLoc) {
        const loc = ctx.G.v1.locations[intrigueLoc];
        if (loc) {
          addToken(loc, 'intrigue', 1);
          ctx.G.publicLog.push(`🔮 污秽溢出：${LOC_CN[intrigueLoc] || intrigueLoc} +1 密谋`);
        }
      }
      ctx.G.fullLog.push(`[事件] 污秽溢出：paranoia=${paranoiaTarget || 'none'}, intrigue_loc=${intrigueLoc || 'none'}`);
    },
  },

  // ── 死者默示录 (Apocalypse of the Dead) ────────────────────────────────────
  // <群众事件><必要尸体数2> 全区角色死亡，之后5具以上尸体→主人公死亡
  // FAQ: 先死人再判尸体数；关键人物死亡时轮回立即结束
  {
    ruleId: 'hsa_incident_apocalypse_of_the_dead',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '死者默示录：全区角色死亡 + 尸体判定');
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      // 群众事件：当事人可能是版图名或角色名
      const locationId = ctx.G.v1.characters[culpritId]?.locationId || culpritId;
      // 第一步：全区角色死亡
      const deaths: string[] = [];
      const victims = Object.entries(ctx.G.v1.characters)
        .filter(([_, c]) => c.locationId === locationId && c.alive)
        .map(([id]) => id);
      for (const victimId of victims) {
        if (killCharacter(ctx, victimId, INCIDENT_KILL_OPTIONS)) deaths.push(victimId);
        // FAQ: 关键人物死亡 → 轮回立即结束
        if (ctx.G.v1.loopLost) {
          ctx.G.publicLog.push(`💀 死者默示录：${deaths.length} 名角色死亡（轮回因关键人物结束）`);
          return;
        }
      }
      applyIncidentDeathLinks(ctx, deaths);
      ctx.G.publicLog.push(`💀 死者默示录：${deaths.length} 名角色在 ${LOC_CN[locationId] || locationId} 死亡`);

      // 第二步：判定尸体数
      const corpseCount = Object.values(ctx.G.v1.characters)
        .filter(c => c.locationId === locationId && !c.alive)
        .length;
      if (corpseCount >= 5) {
        triggerProtagonistDeath(ctx.G, `死者默示录：${LOC_CN[locationId] || locationId} 尸体数=${corpseCount}≥5`);
        ctx.G.publicLog.push(`💀 死者默示录：${LOC_CN[locationId] || locationId} 尸体 ${corpseCount} 具，主人公死亡`);
      }
      ctx.G.fullLog.push(`[事件] 死者默示录：${locationId} 杀死 ${deaths.length} 名角色，尸体总数=${corpseCount}`);
    },
  },
];

const legacyHsaIncidentAliases: Array<[string, string]> = [
  ['hs_incident_blasphemy', 'hsa_incident_blasphemy_murder'],
];

for (const [aliasId, sourceId] of legacyHsaIncidentAliases) {
  const source = hsaIncidentProcessors.find(processor => processor.ruleId === sourceId);
  if (source) {
    hsaIncidentProcessors.push({
      ruleId: aliasId,
      check: source.check,
      execute: source.execute,
    });
  }
}

incidentProcessors.push(...hsaIncidentProcessors);

// ── LL 事件处理器（对齐 docs/模组/Last_Liar.md）─────────────────────────────

// 共享事件别名（语义同基础版）
const llIncidentAliases: Array<[string, string]> = [
  ['ll_incident_murder',              'incident_murder_effect'],
  ['ll_incident_hospital_incident',   'incident_hospital_incident_effect'],
  ['ll_incident_spreading',           'incident_spreading_effect'],
  ['ll_incident_confession',          'mz_incident_confession'],
];

for (const [aliasId, sourceId] of llIncidentAliases) {
  const source = incidentProcessors.find(p => p.ruleId === sourceId);
  if (source) {
    incidentProcessors.push({ ruleId: aliasId, check: source.check, execute: source.execute });
  }
}

// LL 独有事件处理器
const llIncidentProcessors: RuleProcessor[] = [
  // ── 代行者 (Proxy) ────────────────────────────────────────────────────────
  {
    ruleId: 'll_incident_proxy',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '代行者：剧作家选择1名主人公，主人公选1名角色死亡', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const target = ctx.selectedTargets?.target;
      if (!target) {
        ctx.G.publicLog.push('📋 代行者事件发生但未选择目标');
        return;
      }
      const deaths: string[] = [];
      if (killCharacter(ctx, target, INCIDENT_KILL_OPTIONS)) deaths.push(target);
      applyIncidentDeathLinks(ctx, deaths);
      ctx.G.publicLog.push(`⚔️ 代行者：${cn(target)} 死亡`);
      ctx.G.fullLog.push(`[事件] 代行者：${cn(target)} 被主人公选择死亡`);
    },
  },

  // ── 骤变 (Sudden Change) ──────────────────────────────────────────────────
  {
    ruleId: 'll_incident_sudden_change',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      const startLoc = CHARACTERS[culpritId as keyof typeof CHARACTERS]?.startingLocations?.[0];
      if (!startLoc) return ok(true, '骤变：当事人无初始区域');
      const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
      return ok(true, locIntrigue >= 2
        ? `骤变：当事人初始区域(${startLoc})密谋=${locIntrigue}≥2→主人公死亡`
        : `骤变：当事人初始区域(${startLoc})密谋=${locIntrigue}<2→+2密谋`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const startLoc = CHARACTERS[culpritId as keyof typeof CHARACTERS]?.startingLocations?.[0];
      if (!startLoc) {
        ctx.G.publicLog.push('📋 骤变事件发生但无现象');
        return;
      }
      const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
      if (locIntrigue >= 2) {
        triggerProtagonistDeath(ctx.G, `骤变：${cn(culpritId)} 初始区域密谋≥2`);
        ctx.G.publicLog.push(`⚡ 骤变：主人公死亡！`);
        ctx.G.fullLog.push(`[事件] 骤变：${startLoc} 密谋=${locIntrigue}≥2，主人公死亡`);
      } else {
        addToken(ctx.G.v1.locations[startLoc], 'intrigue', 2);
        ctx.G.publicLog.push(`⚡ 骤变：${LOC_CN[startLoc] || startLoc} +2 密谋`);
        ctx.G.fullLog.push(`[事件] 骤变：${startLoc} 密谋<2，放置 2 密谋`);
      }
    },
  },

  // ── 遗言 (Last Will) ──────────────────────────────────────────────────────
  {
    ruleId: 'll_incident_last_will',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      const culpritId = ctx.incident.culpritId;
      if (!isAliveOnBoard(ctx, culpritId)) return ok(false, '当事人不在场');
      return ok(true, `遗言：${cn(culpritId)} 死亡，下轮主人公获得希望`);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const culpritId = ctx.incident!.culpritId;
      const deaths: string[] = [];
      if (killCharacter(ctx, culpritId, INCIDENT_KILL_OPTIONS)) deaths.push(culpritId);
      applyIncidentDeathLinks(ctx, deaths);
      // 标记下轮轮回开始时主人公获得希望
      const lastWillKey = '__ll_last_will_hope';
      if (!ctx.G.v1.loopState.abilityUsage[lastWillKey]) {
        ctx.G.v1.loopState.abilityUsage[lastWillKey] = { usedToday: false, usedThisLoop: false };
      }
      ctx.G.v1.loopState.abilityUsage[lastWillKey].usedThisLoop = true;
      ctx.G.publicLog.push(`📜 遗言：${cn(culpritId)} 死亡`);
      ctx.G.fullLog.push(`[事件] 遗言：${cn(culpritId)} 死亡，下轮希望+1`);
    },
  },

  // ── 希望之光 (Light of Hope) ──────────────────────────────────────────────
  {
    ruleId: 'll_incident_light_of_hope',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '希望之光：队长选择1名角色放置1枚希望', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const target = ctx.selectedTargets?.target;
      if (!target || !ctx.G.v1.characters[target]) {
        ctx.G.publicLog.push('📋 希望之光事件发生但未选择目标');
        return;
      }
      addToken(ctx.G.v1.characters[target], 'hope', 1);
      ctx.G.publicLog.push(`✨ 希望之光：${cn(target)} 获得 1 希望`);
      ctx.G.fullLog.push(`[事件] 希望之光：${cn(target)} +1 希望`);
    },
  },

  // ── 绝望之暗 (Darkness of Despair) ───────────────────────────────────────
  {
    ruleId: 'll_incident_darkness_of_despair',
    check(ctx) {
      if (!ctx.incident) return ok(false);
      return ok(true, '绝望之暗：往任意1名角色放置1枚绝望', true);
    },
    execute(ctx) {
      if (shouldSkipIncidentByImmunity(ctx) || shouldSkipIncidentByRemoval(ctx)) return;
      const target = ctx.selectedTargets?.target;
      if (!target || !ctx.G.v1.characters[target]) {
        ctx.G.publicLog.push('📋 绝望之暗事件发生但未选择目标');
        return;
      }
      addToken(ctx.G.v1.characters[target], 'despair', 1);
      ctx.G.publicLog.push(`🌑 绝望之暗：${cn(target)} 获得 1 绝望`);
      ctx.G.fullLog.push(`[事件] 绝望之暗：${cn(target)} +1 绝望`);
    },
  },
];
incidentProcessors.push(...llIncidentProcessors);
