import type { RuleContext } from '../../ruleEngine';
import { CHARACTERS } from '@tragedy/domain';
import { triggerImmediateLoss, triggerProtagonistDeath } from '../../lossConditions';
import { getCharacterLabel } from '../../data/translationService';
import { addToken, getToken } from '../../utils/tokenHelpers';
import { recordRevealedRole } from '../../revealTracker';
import { recordDeathSnapshots } from '../deathSnapshots';
import { applyCharacterTokenDelta } from '../ahrState';
import { getEffectiveRoleId, hasEffectiveRole } from '../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../ahrWorldShift';
import { syncPendingInteractionsFromLegacyState } from '../../runtime/interactions';

const cn = (id: string) => getCharacterLabel(id);
const AHR_EVANGELIST_WORLD_SHIFT_PENDING_ID_PREFIX = 'ahr_evangelist_world_shift';

type KillCharacterOptions = {
  recordDeadCharactersAtLeastOnce?: boolean;
  applyDeathLink?: boolean;
  applyEvangelistDeath?: boolean;
  enforceSecretKeyCardLimit?: boolean;
};

export function hasImmortality(ctx: RuleContext, charId: string): boolean {
  const role = getEffectiveRoleId(ctx.G, charId);
  const immortalRoles = [
    'time_traveler',
    'detective',
    'nightmare',
    'vampire',
    'immortal',
    'god',
    'ai',
    'black_cat',
    'illusion',
    'storyteller',
    'dimension_traveler',
    'sacrifice',
    'faceless',
    'watcher',
    'eccentric',
  ];
  if (!role) return false;
  if (role === 'paper_tiger') {
    const c = ctx.G.v1.characters[charId];
    return !!c && getToken(c, 'paranoia') < 2;
  }
  return immortalRoles.includes(role);
}

export function triggerSecretKeyPenalty(
  ctx: RuleContext,
  charId: string,
  options?: { enforceCardLimit?: boolean },
): void {
  const loopIndex = ctx.G.loopIndex ?? 0;
  if (loopIndex > 1) return;
  triggerProtagonistDeath(ctx.G, `密钥 ${cn(charId)} 在第${loopIndex + 1}轮被公开`);
  ctx.G.fullLog.push(`[身份能力] 密钥 ${cn(charId)} 第${loopIndex + 1}轮公开→主人公死亡`);
  if (!options?.enforceCardLimit) return;

  const limitKey = '__secret_key_card_limit';
  if (!ctx.G.v1.loopState.abilityUsage[limitKey]) {
    ctx.G.v1.loopState.abilityUsage[limitKey] = { usedToday: false, usedThisLoop: false };
  }
  ctx.G.v1.loopState.abilityUsage[limitKey].usedToday = true;
  ctx.G.fullLog.push('[身份能力] 密钥惩罚：剧作家下一天限出1张行动牌');
}

export function triggerDeathLink(ctx: RuleContext, deadCharId: string): void {
  const deadRole = ctx.G.v1.hiddenRoles?.[deadCharId];
  if (!deadRole) return;

  let partnerRole: string | undefined;
  if (deadRole === 'loved_one') partnerRole = 'lover';
  else if (deadRole === 'lover') partnerRole = 'loved_one';
  else return;

  for (const [cid, role] of Object.entries(ctx.G.v1.hiddenRoles || {})) {
    if (role === partnerRole && cid !== deadCharId) {
      const partner = ctx.G.v1.characters[cid];
      if (partner && partner.alive) {
        applyCharacterTokenDelta(ctx.G, cid, 'paranoia', 6);
        ctx.G.publicLog.push(`💔 ${cn(cid)} 突然变得极度不安 (+6 不安)`);
        ctx.G.fullLog.push(`[身份能力] ${partnerRole} ${cid} 因 ${deadRole} ${deadCharId} 死亡获得 6 不安`);
      }
    }
  }
}

export function triggerAhrEvangelistDeath(ctx: RuleContext, deadCharId: string): void {
  if (ctx.G.scriptOpen?.tragedySetId !== 'another_horizon_revised') return;
  if (!hasEffectiveRole(ctx.G, deadCharId, 'evangelist')) return;

  const deadCharacter = ctx.G.v1.characters[deadCharId];
  if (!deadCharacter) return;

  const candidateLocations = new Set<string>([deadCharacter.locationId]);
  if (deadCharId === 'boss' && deadCharacter.territoryLocationId) {
    candidateLocations.add(deadCharacter.territoryLocationId);
  }

  const targetIds = Object.entries(ctx.G.v1.characters)
    .filter(([id, character]) => (
      id !== deadCharId
      && character.alive
      && candidateLocations.has(character.locationId)
    ))
    .map(([id]) => id)
    .sort();
  const targetId = targetIds[0];
  if (!targetId) return;
  if (ctx.G.v1.settings.autoResolve) {
    addToken(ctx.G.v1.characters[targetId], 'despair', 1);
    ctx.G.fullLog.push(`[身份能力] 布道者 ${cn(deadCharId)} 死亡时，为 ${cn(targetId)} 放置了 1 绝望`);
    markWorldShiftThisDay(ctx.G, `role:${deadCharId}.ahr_evangelist_death_despair_and_world_shift`);
    return;
  }

  const pendingId = `${AHR_EVANGELIST_WORLD_SHIFT_PENDING_ID_PREFIX}:${deadCharId}`;
  if ((ctx.G.v1.pendingAbilities || []).some(ability => ability.id === pendingId)) return;

  ctx.G.v1.pendingAbilities.push({
    id: pendingId,
    ruleId: 'ahr_evangelist_death_despair_and_world_shift',
    characterId: deadCharId,
    mandatory: false,
    description: '布道者死亡后：可以进行世界移动',
    targetSlots: [
      {
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds: targetIds,
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
    ],
  });

  const phase = ctx.timing === 'incident_resolve' ? 'incidents' : ctx.timing;
  syncPendingInteractionsFromLegacyState(ctx.G, phase);
}

export function killCharacter(
  ctx: RuleContext,
  charId: string,
  options: KillCharacterOptions = {},
): boolean {
  const c = ctx.G.v1.characters[charId];
  if (!c || !c.alive) return false;
  if (hasImmortality(ctx, charId)) {
    ctx.G.fullLog.push(`[不死] ${cn(charId)} 因不死特性免疫死亡`);
    return false;
  }

  const guardCount = getToken(c, 'guard' as any);
  if (guardCount > 0) {
    addToken(c, 'guard' as any, -1);
    ctx.G.publicLog.push(`🛡️ ${cn(charId)} 护卫指示物消耗，免疫死亡`);
    ctx.G.fullLog.push(`[护卫] ${cn(charId)} 消耗 guard token，免死一次`);
    return false;
  }

  recordDeathSnapshots(ctx.G, charId);
  c.alive = false;
  ctx.G.v1.loopState.deathFlagCount = (ctx.G.v1.loopState.deathFlagCount || 0) + 1;
  if (options.recordDeadCharactersAtLeastOnce && !ctx.G.v1.loopState.deadCharactersAtLeastOnce.includes(charId)) {
    ctx.G.v1.loopState.deadCharactersAtLeastOnce.push(charId);
  }

  if (hasEffectiveRole(ctx.G, charId, 'magician')) {
    addToken(c, 'paranoia', -getToken(c, 'paranoia'));
    ctx.G.fullLog.push(`[身份能力] 魔术师 ${cn(charId)} 死亡时移除了所有不安`);
  }
  ctx.G.publicLog.push(`💀 ${cn(charId)} 死亡`);

  const role = getEffectiveRoleId(ctx.G, charId);
  if (role === 'key_person') {
    triggerImmediateLoss(ctx.G, `关键人物 ${cn(charId)} 死亡`);
  }

  if (role === 'influencer') {
    const startLocs = CHARACTERS[charId as keyof typeof CHARACTERS]?.startingLocations;
    if (startLocs?.[0]) {
      const startLoc = startLocs[0];
      for (const [otherId, otherChar] of Object.entries(ctx.G.v1.characters)) {
        if (otherId === charId || !otherChar.alive) continue;
        const otherStart = CHARACTERS[otherId as keyof typeof CHARACTERS]?.startingLocations?.[0];
        if (otherStart === startLoc) {
          applyCharacterTokenDelta(ctx.G, otherId, 'paranoia', 1);
          ctx.G.fullLog.push(`[身份能力] 网络名流死亡：${cn(otherId)} +1 不安`);
        }
      }
    }
  }

  if (role === 'secret_key') {
    recordRevealedRole(ctx.G, charId, 'secret_key');
    ctx.G.publicLog.push(`🔑 ${cn(charId)} 的身份（密钥）被公开`);
    triggerSecretKeyPenalty(ctx, charId, {
      enforceCardLimit: options.enforceSecretKeyCardLimit,
    });
  }

  if (options.applyDeathLink) {
    triggerDeathLink(ctx, charId);
  }
  if (options.applyEvangelistDeath) {
    triggerAhrEvangelistDeath(ctx, charId);
  }
  return true;
}
