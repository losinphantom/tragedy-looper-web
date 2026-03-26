/**
 * Transitional compatibility catalog for live role processors.
 *
 * New rule objects should prefer `rules/roles/*RoleDefinition.ts` and
 * manifest `roleIds` assembly-by-reference. This catalog stays in place only
 * while the runtime still needs processor registration compatibility.
 */

import type { RuleProcessor, RuleContext } from '../ruleEngine';
import { triggerProtagonistDeath, triggerImmediateLoss } from '../lossConditions';
import { getCharacterLabel } from '../data/translationService';
import { addToken, getToken } from '../utils/tokenHelpers';
import { getCharVal } from '../utils/effectiveValues';
import { getEffectiveGoodwill } from '../utils/effectiveValues';
import { CHARACTERS } from '@tragedy/domain';
import { recordRevealedRole, wasRoleRevealedBefore } from '../revealTracker';
import { factorHadCityKeyPersonDeathSnapshot } from './deathSnapshots';
import { applyCharacterTokenDelta } from './ahrState';
import { getEffectiveRoleId } from './ahrEffectiveRoles';
import {
  allAliveAtLocation,
  allOtherAliveAtLocation,
  charsAtSameLocation,
  countDistinctTokenTypes,
  getAdjacentLocations,
  getInitialLocation,
  hasLoopAbilityUsed,
  killCharacter,
  markLoopAbilityUsed,
  ok,
} from './shared';

/** 中文角色名快捷方法 */
const cn = (id: string) => getCharacterLabel(id);

// ── 辅助函数 ──────────────────────────────────────────────────────────────────

const POISONER_KILL_USAGE_KEY_PREFIX = 'mc_poisoner_kill';
const AHR_MAGICIAN_TELEPORT_USAGE_KEY = 'ahr_magician_teleport';
const AHR_LULLABY_PLACE_TOKEN_USAGE_KEY = 'ahr_lullaby_place_token';
const AHR_PIED_PIPER_DAY_END_KILL_USAGE_KEY = '__ahr_pied_piper_day_end_kill';
const ROLE_KILL_OPTIONS = {
  applyDeathLink: true,
  applyEvangelistDeath: true,
  enforceSecretKeyCardLimit: true,
} as const;

function getPoisonerKillUsageKey(charId: string): string {
  return `${POISONER_KILL_USAGE_KEY_PREFIX}:${charId}`;
}

function pickPoisonerKillTarget(
  ctx: RuleContext,
  poisonerId: string,
  candidates: string[],
): string | undefined {
  const selectedTarget = ctx.selectedTargets?.target;
  if (selectedTarget && candidates.includes(selectedTarget)) {
    return selectedTarget;
  }

  const serialKillerTargets = candidates
    .filter(targetId => ctx.G.v1.hiddenRoles?.[targetId] === 'serial_killer')
    .sort();
  if (serialKillerTargets.length > 0) {
    return serialKillerTargets[0];
  }

  const poisoner = ctx.G.v1.characters[poisonerId];
  if (poisonerId === 'boss' && poisoner?.territoryLocationId && ctx.G.v1.ex?.enabled && ctx.G.v1.ex.gauge >= 2) {
    const territoryTargets = candidates
      .filter(targetId => targetId !== poisonerId && ctx.G.v1.characters[targetId]?.locationId === poisoner.territoryLocationId)
      .sort();
    if (territoryTargets.length > 0) {
      return territoryTargets[0];
    }
  }

  const nonSelfCandidates = candidates
    .filter(targetId => targetId !== poisonerId)
    .sort();
  if (nonSelfCandidates.length > 0) {
    return nonSelfCandidates[0];
  }

  return [...candidates].sort()[0];
}

function getPoisonerKillCandidates(ctx: RuleContext, poisonerId: string): string[] {
  const poisoner = ctx.G.v1.characters[poisonerId];
  if (!poisoner || !poisoner.alive) return [];

  const candidateLocations = new Set<string>([poisoner.locationId]);
  if (poisonerId === 'boss' && ctx.G.v1.ex?.enabled && ctx.G.v1.ex.gauge >= 2 && poisoner.territoryLocationId) {
    candidateLocations.add(poisoner.territoryLocationId);
  }

  return Object.entries(ctx.G.v1.characters)
    .filter(([_, c]) => c.alive && candidateLocations.has(c.locationId))
    .map(([id]) => id);
}

function wasCharacterDeadLastLoop(ctx: RuleContext, charId: string): boolean {
  if (ctx.G.v1.loopState?.abilityUsage?.[`__ahr_fragment_dead_last_loop:${charId}`]?.usedThisLoop) {
    return true;
  }
  if (ctx.G.v1.loopState?.abilityUsage?.__ahr_fragment_dead_last_loop?.usedThisLoop) {
    return true;
  }
  const legacy = (ctx.G.v1 as any).lastLoopDeadCharacters;
  return Array.isArray(legacy) && legacy.includes(charId);
}

// ══════════════════════════════════════════════════════════════════════════════
// FS 身份处理器
// ══════════════════════════════════════════════════════════════════════════════

export const roleProcessors: RuleProcessor[] = [

  // ── 关键人物 (Key Person) ──────────────────────────────────────────────────
  {
    ruleId: 'key_person_death_loss',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      return ok(c != null && !c.alive, '关键人物死亡 → 主人公立即败北');
    },
    execute(ctx) {
      triggerImmediateLoss(ctx.G, `关键人物 ${ctx.characterId} 死亡`);
    },
  },

  // ── 主谋 (Brain) ───────────────────────────────────────────────────────────
  // 【任意能力：剧作家能力阶段】同区域角色或版图 +1 密谋
  {
    ruleId: 'brain_intrigue_ability',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, '主谋可在同区域放置 1 密谋', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const c = ctx.G.v1.characters[charId];
      const loc = c.locationId;
      const selectedTarget = ctx.selectedTargets?.target;
      const selectableCharacters = allAliveAtLocation(ctx, loc);
      if (selectedTarget && selectableCharacters.includes(selectedTarget)) {
        const targetId = selectedTarget;
        addToken(ctx.G.v1.characters[targetId], 'intrigue', 1);
        ctx.G.publicLog.push(`📋 ${cn(targetId)} 获得了 1 枚密谋`);
        ctx.G.fullLog.push(`[身份能力] 主谋 ${cn(charId)} → ${cn(targetId)} +1 密谋`);
        return;
      }

      if (selectedTarget === loc || selectableCharacters.length === 0) {
        // 放在版图上
        const location = ctx.G.v1.locations[loc];
        if (location) {
          addToken(location, 'intrigue', 1);
          ctx.G.publicLog.push(`📋 版图 ${loc} 获得了 1 枚密谋`);
          ctx.G.fullLog.push(`[身份能力] 主谋 ${cn(charId)} → 版图 ${loc} +1 密谋`);
        }
        return;
      }

      if (selectableCharacters.length > 0) {
        const targetId = selectableCharacters[0];
        addToken(ctx.G.v1.characters[targetId], 'intrigue', 1);
        ctx.G.publicLog.push(`📋 ${cn(targetId)} 获得了 1 枚密谋`);
        ctx.G.fullLog.push(`[身份能力] 主谋 ${cn(charId)} → ${cn(targetId)} +1 密谋`);
      }
    },
  },

  // ── 杀手 (Killer) ─────────────────────────────────────────────────────────
  // 【任意能力：回合结束】同区域关键人物密谋≥2→死亡
  {
    ruleId: 'killer_day_end_key_person',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const killer = ctx.G.v1.characters[charId];
      if (!killer || !killer.alive) return ok(false);

      const colocated = charsAtSameLocation(ctx, charId);
      for (const cid of colocated) {
        const c = ctx.G.v1.characters[cid];
        const role = ctx.G.v1.hiddenRoles?.[cid];
        if (role === 'key_person' && c && getCharVal(c, 'intrigue') >= 2) {
          return ok(true, `杀手可杀死关键人物 ${cid}（密谋 ≥ 2）`, true);
        }
      }
      return ok(false);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const colocated = charsAtSameLocation(ctx, charId);
      for (const cid of colocated) {
        const c = ctx.G.v1.characters[cid];
        const role = ctx.G.v1.hiddenRoles?.[cid];
        if (role === 'key_person' && c && getCharVal(c, 'intrigue') >= 2) {
          killCharacter(ctx, cid, ROLE_KILL_OPTIONS);
          ctx.G.fullLog.push(`[身份能力] 杀手 ${cn(charId)} 杀死了关键人物 ${cn(cid)}`);
          break;
        }
      }
    },
  },

  // 【任意能力：回合结束】自身密谋≥4→主人公死亡
  {
    ruleId: 'killer_day_end_protagonists',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const killer = ctx.G.v1.characters[charId];
      if (!killer || !killer.alive) return ok(false);
      if (getCharVal(killer, 'intrigue') < 4) return ok(false);
      return ok(true, `杀手密谋 ≥ 4，可杀死主人公`, true);
    },
    execute(ctx) {
      triggerProtagonistDeath(ctx.G, `杀手 ${ctx.characterId} 密谋 ≥ 4`);
      ctx.G.fullLog.push(`[身份能力] 杀手 ${ctx.characterId} 杀死了主人公`);
    },
  },

  // ── 邪教徒 (Cultist) ——— 必定无视友好 ─────────────────────────────────────
  // 【任意能力：行动结算】无效化同区域禁止密谋
  {
    ruleId: 'cultist_ignore_forbid_intrigue',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, '邪教徒可无视禁止密谋效果');
    },
    execute(ctx) {
      // 实际设置免疫标记，cardResolver 会读取跳过对应禁止
      ctx.G.v1.cardResolveImmunities.push({
        characterId: ctx.characterId!,
        immuneToForbid: 'forbid_intrigue',
      });
      ctx.G.fullLog.push(`[身份能力] 邪教徒 ${ctx.characterId} 无视了禁止密谋`);
    },
  },

  // ── 亲友 (Friend) ─────────────────────────────────────────────────────────
  // 【败北条件：轮回结束】死亡→公开身份+败北
  {
    ruleId: 'friend_dead_reveal_loss',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      return ok(c != null && !c.alive, '亲友死亡 → 公开身份，轮回结束时败北');
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      // 公开身份
      recordRevealedRole(ctx.G, charId, 'friend');
      ctx.G.v1.loopLost = true;
      ctx.G.publicLog.push(`💀 ${cn(charId)} 的身份是亲友，主人公败北！`);
    },
  },

  // 【强制：轮回开始】身份曾公开→+1 友好
  {
    ruleId: 'friend_revealed_loop_start_goodwill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      // 检查身份是否已在之前的轮回中公开
      return ok(wasRoleRevealedBefore(ctx.G, charId), '亲友身份已公开，获得 1 友好');
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const c = ctx.G.v1.characters[charId];
      if (c) {
        addToken(c, 'goodwill', 1);
        ctx.G.publicLog.push(`📋 ${cn(charId)} 获得了 1 枚友好`);
        ctx.G.fullLog.push(`[身份能力] 亲友 ${cn(charId)} 因身份已公开获得 1 友好`);
      }
    },
  },

  // ── 愚者 (Fool) ────────────────────────────────────────────────────────────
  // 【强制：剧本制作时】必须成为某事件当事人（注册型，无运行期效果）
  {
    ruleId: 'mc_fool_incident_target',
    check() {
      return ok(false, '剧本制作期约束，仅作注册');
    },
    execute() {},
  },
  // 【强制：担任当事人的事件结算后】移除自身所有不安
  {
    ruleId: 'mc_fool_incident_recovery',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      if (ctx.G.v1.loopLost || ctx.G.v1.protagonistKilled) return ok(false);
      const inc = ctx.incident;
      if (!inc || inc.culpritId !== charId) return ok(false);
      return ok(true, '愚者结算后移除自身所有不安');
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const c = ctx.G.v1.characters[charId];
      if (!c) return;
      const current = getCharVal(c, 'paranoia');
      if (current > 0) {
        addToken(c, 'paranoia', -current);
        ctx.G.publicLog.push(`🧘 愚者平复：${cn(charId)} 移除所有不安`);
        ctx.G.fullLog.push(`[身份能力] 愚者 ${cn(charId)} 事件后不安清零`);
      }
    },
  },

  // ── 暴徒 (Curmudgeon) ——— 无视友好（纯特性，无主动能力）────────────────────
  // 不需要 execute，特性通过 goodwillRefusal: 'optional' 在 domain 层表达

  // ── 杀人狂 (Serial Killer) ────────────────────────────────────────────────
  // 【强制：回合结束】仅有 1 名角色与之同区域→那名角色死亡
  {
    ruleId: 'serial_killer_day_end_kill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const sk = ctx.G.v1.characters[charId];
      if (!sk || !sk.alive) return ok(false);

      const others = charsAtSameLocation(ctx, charId);
      if (others.length === 1) {
        return ok(true, `杀人狂与 ${others[0]} 独处 → 强制杀死`);
      }
      return ok(false);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const others = charsAtSameLocation(ctx, charId);
      if (others.length === 1) {
        const targetId = others[0];
        killCharacter(ctx, targetId, ROLE_KILL_OPTIONS);
        ctx.G.fullLog.push(`[身份能力] 杀人狂 ${cn(charId)} 杀死了 ${cn(targetId)}`);
      }
    },
  },

  // ── 投毒者 (Poisoner) ──────────────────────────────────────────────────────
  // 【强制：回合结束】Ex≥2 → 同区域 1 名角色死亡（每轮限 1 次）
  {
    ruleId: 'mc_poisoner_kill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const poisoner = ctx.G.v1.characters[charId];
      if (!poisoner || !poisoner.alive) return ok(false);
      if (!ctx.G.v1.ex?.enabled || ctx.G.v1.ex.gauge < 2) return ok(false);

      const usageKey = getPoisonerKillUsageKey(charId);
      if (hasLoopAbilityUsed(ctx, usageKey)) return ok(false);

      const candidates = getPoisonerKillCandidates(ctx, charId);
      if (candidates.length === 0) return ok(false);

      return ok(true, `投毒者可使同区域 1 名角色死亡（本轮限 1 次）`);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const poisoner = ctx.G.v1.characters[charId];
      if (!poisoner) return;

      const usageKey = getPoisonerKillUsageKey(charId);
      const candidates = getPoisonerKillCandidates(ctx, charId);
      const targetId = pickPoisonerKillTarget(ctx, charId, candidates);
      if (targetId) {
        killCharacter(ctx, targetId, ROLE_KILL_OPTIONS);
        ctx.G.fullLog.push(`[身份能力] 投毒者 ${cn(charId)} 使 ${cn(targetId)} 死亡`);
      }
      markLoopAbilityUsed(ctx, usageKey);
      // TODO: 手动交互模式需要更完善的信号机制（pendingAbilities推送）
    },
  },

  // 【强制：回合结束】Ex≥4 → 主人公死亡
  {
    ruleId: 'mc_poisoner_protagonist_kill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const poisoner = ctx.G.v1.characters[charId];
      if (!poisoner || !poisoner.alive) return ok(false);
      if (!ctx.G.v1.ex?.enabled || ctx.G.v1.ex.gauge < 4) return ok(false);
      return ok(true, '投毒者 Ex≥4，主人公死亡');
    },
    execute(ctx) {
      triggerProtagonistDeath(ctx.G, `投毒者 ${ctx.characterId} 触发 Ex≥4`);
      ctx.G.fullLog.push(`[身份能力] 投毒者 ${ctx.characterId} 杀死了主人公`);
    },
  },

  // ── 偏执狂 (Paranoiac) ─────────────────────────────────────────────────────
  // 【任意能力：剧作家能力阶段】自身 +1 密谋或 +1 不安
  {
    ruleId: 'mc_paranoiac_intrigue_or_unease',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, '偏执狂：自身 +1 密谋或 +1 不安', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const tokenType = ctx.selectedTargets?.tokenType === 'paranoia' ? 'paranoia' : 'intrigue';
      addToken(ctx.G.v1.characters[charId], tokenType, 1);
      ctx.G.publicLog.push(`📋 ${cn(charId)} 获得了 1 枚${tokenType === 'intrigue' ? '密谋' : '不安'}`);
      ctx.G.fullLog.push(`[身份能力] 偏执狂 ${cn(charId)} +1 ${tokenType}`);
    },
  },

  // ── 心理医生 (Psychiatrist) ────────────────────────────────────────────────
  // 【强制：剧作家能力阶段】Ex≥1 → 同区其他 1 名角色 -1 不安（可无现象）
  {
    ruleId: 'mc_psychiatrist_heal',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      if (!ctx.G.v1.ex?.enabled || ctx.G.v1.ex.gauge < 1) return ok(false);
      const targets = charsAtSameLocation(ctx, charId);
      if (targets.length === 0) return ok(false);
      return ok(true, '心理医生可移除同区其他角色 1 枚不安', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const targets = charsAtSameLocation(ctx, charId);
      if (targets.length === 0) return;

      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && targets.includes(selectedTarget)
        ? selectedTarget
        : targets[0];
      const target = ctx.G.v1.characters[targetId];
      if (!target) return;

      if (getCharVal(target, 'paranoia') > 0) {
        addToken(target, 'paranoia', -1);
        ctx.G.publicLog.push(`🩺 ${cn(targetId)} 移除了 1 枚不安`);
        ctx.G.fullLog.push(`[身份能力] 心理医生 ${cn(charId)} → ${cn(targetId)} -1 不安`);
      } else {
        ctx.G.publicLog.push(`🩺 ${cn(targetId)} 尝试移除不安但没有现象`);
        ctx.G.fullLog.push(`[身份能力] 心理医生 ${cn(charId)} 指定 ${cn(targetId)}，但其不安为 0`);
      }
    },
  },

  // ── 侦探 (Detective) ──────────────────────────────────────────────────────
  // 该 ruleId 的运行时效果由公共判定管线实现：
  // - 不死：killCharacter() 内统一检查 detective
  // - 不能成为事件当事人：getIncidentTriggerStatus() 统一拦截
  {
    ruleId: 'mc_detective_undead_no_incident',
    check() {
      return ok(false, '侦探不死/当事人限制由公共判定管线处理');
    },
    execute() {},
  },

  // Ex=0 且侦探与当事人同区时事件必定发生：
  // 该判定在 getIncidentTriggerStatus() 统一处理，覆盖手动/自动事件路径。
  {
    ruleId: 'mc_detective_force_incident',
    check() {
      return ok(false, '侦探强制触发由事件触发判定处理');
    },
    execute() {},
  },

  // 双胞胎在事件结算时视为位于对角版图。
  // 实际位置换算由公共事件运行时统一处理，这里仅注册 ruleId。
  {
    ruleId: 'mc_twins_incident',
    check() {
      return ok(false, '双胞胎事件位置换算由公共事件运行时处理');
    },
    execute() {},
  },

  // MC 强迫症：必须成为事件当事人 + 事件必定发生
  // 运行时效果由 autoResolve.ts getIncidentTriggerStatus() 统一处理
  // （getEffectiveRoleId === 'compulsive' → shouldTrigger: true）
  {
    ruleId: 'mc_compulsive_force_incident',
    check() {
      return ok(false, '强迫症当事人+事件必发由 getIncidentTriggerStatus 统一处理');
    },
    execute() {},
  },

  // ── 鬼魂 (Ghost) ────────────────────────────────────────────────────────────
  // 【强制：剧作家能力阶段】死亡后仍可发动：当前所在或初始版图中 1 名角色 +1 不安
  {
    ruleId: 'hsa_ghost_unease',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c) return ok(false);
      if (c.alive) return ok(false); // 仅在死亡后触发
      return ok(true, '鬼魂（死亡后）可在当前或初始区域指定1名角色 +1 不安', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const c = ctx.G.v1.characters[charId];
      if (!c) return;

      const initialLoc = getInitialLocation(charId);
      const candidateLocations = new Set<string>([
        c.locationId,
        ...(initialLoc ? [initialLoc] : []),
      ].filter(Boolean));

      const candidates = Object.entries(ctx.G.v1.characters)
        .filter(([_id, ch]) => ch.alive && candidateLocations.has(ch.locationId));

      if (candidates.length === 0) {
        ctx.G.publicLog.push('📋 鬼魂：无可选目标');
        return;
      }

      const selected = ctx.selectedTargets?.target;
      const targetId = selected && candidates.some(([id]) => id === selected)
        ? selected
        : candidates[0][0];

      if (!targetId) {
        ctx.G.publicLog.push('📋 鬼魂：目标无效');
        return;
      }

      applyCharacterTokenDelta(ctx.G, targetId, 'paranoia', 1);
      ctx.G.publicLog.push(`📋 ${cn(targetId)} 获得了 1 枚不安`);
      ctx.G.fullLog.push(`[身份能力] 鬼魂 ${cn(charId)} → ${cn(targetId)} +1 不安`);
    },
  },

  // ── 胆小鬼 (Coward) ─────────────────────────────────────────────────────────
  // 【强制：剧作家能力阶段】自身不安≥2 时可移动到相邻版图（允许指定非法目标以取消移动）
  {
    ruleId: 'hsa_coward_escape',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      if (getCharVal(c, 'paranoia') < 2) return ok(false);
      return ok(true, '胆小鬼不安≥2，可移动到相邻版图', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const c = ctx.G.v1.characters[charId];
      if (!c) return;

      const neighbors = new Set<string>(getAdjacentLocations(c.locationId));
      const forbidden = new Set(CHARACTERS[charId as keyof typeof CHARACTERS]?.forbiddenLocations || []);

      const dest = ctx.selectedTargets?.location;
      const chosen = dest && neighbors.has(dest) && !forbidden.has(dest) ? dest : null;

      if (!chosen) {
        ctx.G.publicLog.push('📋 胆小鬼：取消移动');
        const reason = dest
          ? `（目标 ${dest} 无效或为禁行区域）`
          : '';
        ctx.G.fullLog.push(`[身份能力] 胆小鬼 ${cn(charId)} 选择不移动${reason}`);
        return;
      }

      c.locationId = chosen;
      ctx.G.publicLog.push(`📍 ${cn(charId)} 移动到 ${chosen}`);
      ctx.G.fullLog.push(`[身份能力] 胆小鬼 ${cn(charId)} 移动至 ${chosen}`);
    },
  },

  // ── 传谣人 (Conspiracy Theorist) ──────────────────────────────────────────
  // 【任意能力：剧作家能力阶段】同区域 1 名角色 +1 不安
  {
    ruleId: 'conspiracy_theorist_unease_ability',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, '传谣人可在同区域角色放置 1 不安', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const locationId = ctx.G.v1.characters[charId]?.locationId;
      const targets = locationId ? allAliveAtLocation(ctx, locationId) : [];
      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && targets.includes(selectedTarget)
        ? selectedTarget
        : targets[0];
      if (targetId) {
        applyCharacterTokenDelta(ctx.G, targetId, 'paranoia', 1);
        ctx.G.publicLog.push(`📋 ${cn(targetId)} 获得了 1 枚不安`);
        ctx.G.fullLog.push(`[身份能力] 传谣人 ${cn(charId)} → ${cn(targetId)} +1 不安`);
      }
    },
  },

  // ── 不可触者 (Untouchable) — AHR ──────────────────────────────────────────
  // 【强制：剧作家能力阶段】同区域 1 名角色 +1 不安
  {
    ruleId: 'ahr_untouchable_add_unease',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, '不可触者可令同区域角色获得 1 不安', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const locationId = ctx.G.v1.characters[charId]?.locationId;
      const targets = locationId ? allAliveAtLocation(ctx, locationId) : [];
      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && targets.includes(selectedTarget)
        ? selectedTarget
        : targets[0];
      if (targetId) {
        applyCharacterTokenDelta(ctx.G, targetId, 'paranoia', 1);
        ctx.G.publicLog.push(`📋 ${cn(targetId)} 获得了 1 枚不安`);
        ctx.G.fullLog.push(`[身份能力] 不可触者 ${cn(charId)} → ${cn(targetId)} +1 不安`);
      }
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // BTX 新增身份处理器
  // ══════════════════════════════════════════════════════════════════════════════

  // ── 魔女 (Witch) ——— 必定无视友好（纯特性，无主动能力）──────────────────────
  // 不需要处理器，特性通过 goodwillRefusal: 'mandatory' 在 domain 层表达

  // ── 时间旅者 (Time Traveler) ——— 不死 ──────────────────────────────────────
  // 【强制：常驻】不死；真实判定由 hasImmortality() 统一处理
  {
    ruleId: 'time_traveler_cannot_die',
    check() {
      return ok(false, '时间旅者不死由 hasImmortality 统一处理');
    },
    execute() {},
  },

  // 【强制：行动结算】无视该角色身上的禁止友好
  {
    ruleId: 'time_traveler_ignore_forbid_goodwill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, '时间旅者无视禁止友好');
    },
    execute(ctx) {
      // 实际设置免疫标记，cardResolver 会读取跳过对应禁止
      ctx.G.v1.cardResolveImmunities.push({
        characterId: ctx.characterId!,
        immuneToForbid: 'forbid_goodwill',
      });
      ctx.G.fullLog.push(`[身份能力] 时间旅者 ${ctx.characterId} 无视了禁止友好`);
    },
  },

  // 【任意能力：最终日回合结束】友好≤2→主人公失败
  {
    ruleId: 'time_traveler_end_of_last_day_loss',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      if (getCharVal(c, 'goodwill') <= 2) {
        return ok(true, `时间旅者最终日友好 ${getCharVal(c, 'goodwill')} ≤ 2 → 主人公败北`);
      }
      return ok(false);
    },
    execute(ctx) {
      triggerImmediateLoss(ctx.G, `时间旅者 ${ctx.characterId} 最终日友好 ≤ 2`);
      ctx.G.fullLog.push(`[身份能力] 时间旅者 ${ctx.characterId} 最终日友好不足，主人公败北`);
    },
  },

  // ── 心上人 (Loved One) ────────────────────────────────────────────────────
  // 【强制：求爱者死亡时】+6 不安
  // 死亡联动已在 killCharacter → triggerDeathLink 中处理，此处理器作为 ruleEngine 注册入口
  {
    ruleId: 'loved_one_partner_death',
    check() {
      // 联动由 killCharacter 内部触发，此处理器仅用于 ruleEngine 注册
      return ok(false);
    },
    execute() {},
  },

  // 【任意能力：回合结束】不安≥3 + 密谋≥1 → 可杀死主人公
  {
    ruleId: 'loved_one_day_end_protagonists',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      if (getCharVal(c, 'intrigue') >= 1 && getCharVal(c, 'paranoia') >= 3) {
        return ok(true, `心上人密谋≥1且不安≥3 → 可杀死主人公`, true);
      }
      return ok(false);
    },
    execute(ctx) {
      triggerProtagonistDeath(ctx.G, `心上人 ${ctx.characterId} 密谋≥1且不安≥3`);
      ctx.G.fullLog.push(`[身份能力] 心上人 ${ctx.characterId} 杀死了主人公`);
    },
  },

  // ── 求爱者 (Suitor) ───────────────────────────────────────────────────────
  // 【强制：心上人死亡时】+6 不安
  {
    ruleId: 'lover_loved_one_dies_unease',
    check() {
      return ok(false); // 联动由 killCharacter 内部触发
    },
    execute() {},
  },

  // 【任意能力：回合结束】密谋≥1 且 不安≥3 → 主人公死亡
  {
    ruleId: 'lover_day_end_protagonists',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      if (getCharVal(c, 'intrigue') >= 1 && getCharVal(c, 'paranoia') >= 3) {
        return ok(true, `求爱者密谋≥1且不安≥3 → 可杀死主人公`, true);
      }
      return ok(false);
    },
    execute(ctx) {
      triggerProtagonistDeath(ctx.G, `求爱者 ${ctx.characterId} 密谋≥1且不安≥3`);
      ctx.G.fullLog.push(`[身份能力] 求爱者 ${ctx.characterId} 杀死了主人公`);
    },
  },

  // ── 不安定因子 (Factor of Unrest) ——— 无视友好 ─────────────────────────────
  // 【强制：常驻】学校 2+ 密谋→获传谣人能力
  {
    ruleId: 'factor_school_conspiracy',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const school = ctx.G.v1.locations['school'];
      if (!school || getToken(school, 'intrigue') < 2) return ok(false);
      return ok(true, '不安定因子获得传谣人能力（学校密谋≥2）');
    },
    execute(ctx) {
      // 沙盒模式：自动执行传谣人能力（同区域角色 +1 不安）
      const charId = ctx.characterId!;
      const targets = charsAtSameLocation(ctx, charId);
      if (targets.length > 0) {
        const targetId = targets[0];
        applyCharacterTokenDelta(ctx.G, targetId, 'paranoia', 1);
        ctx.G.publicLog.push(`📋 ${cn(targetId)} 获得了 1 枚不安`);
        ctx.G.fullLog.push(`[身份能力] 不安定因子(传谣人) ${cn(charId)} → ${cn(targetId)} +1 不安`);
      }
    },
  },

  // 【强制：常驻】都市 2+ 密谋→获关键人物能力（死亡时败北）
  {
    ruleId: 'factor_city_key_person',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      // 条件：角色已死且都市密谋≥2 → 触发关键人物效果
      if (!c) return ok(false);
      if (!c.alive && factorHadCityKeyPersonDeathSnapshot(ctx.G, charId)) {
        return ok(true, '不安定因子（关键人物）死亡 → 主人公败北');
      }
      return ok(false);
    },
    execute(ctx) {
      triggerImmediateLoss(ctx.G, `不安定因子 ${ctx.characterId} 在都市密谋≥2时死亡（关键人物）`);
    },
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // HSA 新增身份处理器
  // ══════════════════════════════════════════════════════════════════════════════

  // ── 梦魇 (Nightmare) ───────────────────────────────────────────────────────
  // 不死：由 hasImmortality() 统一处理
  {
    ruleId: 'hsa_nightmare_undead',
    check() {
      return ok(false, '梦魇不死由 hasImmortality 统一处理');
    },
    execute() {},
  },

  // 【任意能力：回合结束】同区域 1 名角色死亡
  {
    ruleId: 'hsa_nightmare_kill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const others = charsAtSameLocation(ctx, charId);
      if (others.length === 0) return ok(false);
      return ok(true, `梦魇可杀死同区域 1 名角色`, true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const others = charsAtSameLocation(ctx, charId);
      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && others.includes(selectedTarget)
        ? selectedTarget
        : others[0];
      if (targetId) {
        killCharacter(ctx, targetId, ROLE_KILL_OPTIONS);
        ctx.G.fullLog.push(`[身份能力] 梦魇 ${cn(charId)} 杀死了 ${cn(targetId)}`);
      }
    },
  },

  // 【任意能力：回合结束】所有尸体密谋总数≥3 → 主人公死亡
  {
    ruleId: 'hsa_nightmare_strangle',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      // 统计所有尸体上的密谋总数
      let totalIntrigue = 0;
      for (const [_, ch] of Object.entries(ctx.G.v1.characters)) {
        if (!ch.alive) {
          totalIntrigue += getCharVal(ch, 'intrigue');
        }
      }
      if (totalIntrigue >= 3) {
        return ok(true, `尸体密谋总数=${totalIntrigue}≥3，可杀死主人公`, true);
      }
      return ok(false);
    },
    execute(ctx) {
      let totalIntrigue = 0;
      for (const [_, ch] of Object.entries(ctx.G.v1.characters)) {
        if (!ch.alive) totalIntrigue += getCharVal(ch, 'intrigue');
      }
      triggerProtagonistDeath(ctx.G, `梦魇：尸体密谋总数=${totalIntrigue}≥3`);
      ctx.G.fullLog.push(`[身份能力] 梦魇 ${ctx.characterId} 尸体密谋≥3，主人公死亡`);
    },
  },

  // ── 吸血鬼 (Vampire) ───────────────────────────────────────────────────────
  // 不死：由 hasImmortality() 统一处理
  {
    ruleId: 'hsa_vampire_undead',
    check() {
      return ok(false, '吸血鬼不死由 hasImmortality 统一处理');
    },
    execute() {},
  },

  // 【任意能力：回合结束】同区域关键人物密谋≥2 → 关键人物死亡
  {
    ruleId: 'hsa_vampire_kill_key_person',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const vamp = ctx.G.v1.characters[charId];
      if (!vamp || !vamp.alive) return ok(false);

      const colocated = charsAtSameLocation(ctx, charId);
      for (const cid of colocated) {
        const c = ctx.G.v1.characters[cid];
        const role = ctx.G.v1.hiddenRoles?.[cid];
        if (role === 'key_person' && c && getCharVal(c, 'intrigue') >= 2) {
          return ok(true, `吸血鬼可杀死关键人物 ${cid}（密谋≥2）`, true);
        }
      }
      return ok(false);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const colocated = charsAtSameLocation(ctx, charId);
      for (const cid of colocated) {
        const c = ctx.G.v1.characters[cid];
        const role = ctx.G.v1.hiddenRoles?.[cid];
        if (role === 'key_person' && c && getCharVal(c, 'intrigue') >= 2) {
          killCharacter(ctx, cid, ROLE_KILL_OPTIONS);
          ctx.G.fullLog.push(`[身份能力] 吸血鬼 ${cn(charId)} 杀死了关键人物 ${cn(cid)}`);
          break;
        }
      }
    },
  },

  // 【任意能力：回合结束】初始区域尸体≥2 → 主人公死亡
  {
    ruleId: 'hsa_vampire_curse',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const initialLoc = getInitialLocation(charId);
      if (!initialLoc) return ok(false);
      // 统计初始区域的尸体数
      let corpseCount = 0;
      for (const [_, ch] of Object.entries(ctx.G.v1.characters)) {
        if (!ch.alive && ch.locationId === initialLoc) {
          corpseCount++;
        }
      }
      if (corpseCount >= 2) {
        return ok(true, `吸血鬼初始区域(${initialLoc})有${corpseCount}具尸体≥2，可杀死主人公`, true);
      }
      return ok(false);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const initialLoc = getInitialLocation(charId);
      triggerProtagonistDeath(ctx.G, `吸血鬼 ${cn(charId)} 初始区域尸体≥2`);
      ctx.G.fullLog.push(`[身份能力] 吸血鬼 ${cn(charId)} 初始区域(${initialLoc})尸体≥2，主人公死亡`);
    },
  },

  // ── 狼人 (Werewolf) ────────────────────────────────────────────────────────
  // 【任意能力：回合结束】本回合发生过疯狂之夜 → 主人公死亡
  {
    ruleId: 'hsa_werewolf_night_of_madness_loss',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      // 检查本回合是否发生过疯狂之夜
      const history = ctx.G.v1.loopState?.incidentHistory || [];
      const currentDay = ctx.G.day ?? 0;
      const nightOfMadness = history.some(
        h => h.day === currentDay && h.incidentId === 'night_of_madness'
      );
      if (nightOfMadness) {
        return ok(true, '本回合发生过疯狂之夜，可杀死主人公', true);
      }
      return ok(false);
    },
    execute(ctx) {
      triggerProtagonistDeath(ctx.G, `狼人：本回合发生过疯狂之夜`);
      ctx.G.fullLog.push(`[身份能力] 狼人 ${ctx.characterId} 疯狂之夜→主人公死亡`);
    },
  },

  // 【强制：常驻】剧作家不可出行动卡到该角色（接线 cardValidator）
  {
    ruleId: 'hsa_werewolf_no_cards',
    check() {
      return ok(false, '狼人行动卡限制由 cardValidator 统一处理');
    },
    execute() {},
  },

  // ── 丧尸 (Zombie) ──────────────────────────────────────────────────────────
  // 【强制：回合结束】丧尸数>非丧尸存活角色数的版图→杀 1 名角色（每日限1次）
  // FAQ: 丧尸的身份能力死后也能发动
  {
    ruleId: 'hsa_zombie_kill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      // 丧尸能力死后也能发动，不检查 alive
      // 检查每日限 1 次
      const usageKey = 'hsa_zombie_kill_daily';
      if (ctx.G.v1.loopState?.abilityUsage?.[usageKey]?.usedToday) return ok(false);
      // 找符合条件的版图
      const locationStats: Record<string, { zombies: number; nonZombiesAlive: number }> = {};
      for (const [cid, ch] of Object.entries(ctx.G.v1.characters)) {
        const loc = ch.locationId;
        if (!locationStats[loc]) locationStats[loc] = { zombies: 0, nonZombiesAlive: 0 };
        const role = ctx.G.v1.hiddenRoles?.[cid];
        if (role === 'zombie' && !ch.alive) {
          locationStats[loc].zombies++;
        } else if (ch.alive) {
          if (role === 'zombie') {
            // 活着的丧尸是活人（FAQ），同时也是丧尸
            locationStats[loc].zombies++;
            locationStats[loc].nonZombiesAlive++; // 活丧尸算 non-zombie alive for the count
          } else {
            locationStats[loc].nonZombiesAlive++;
          }
        }
      }
      // FAQ: 活丧尸(outsider)所在区域只有他一个→可选该版图（丧尸数>非丧尸角色数）
      // 重新统计：丧尸数(含尸体)应>非丧尸存活角色数，且至少1名角色存活
      for (const [loc, stats] of Object.entries(locationStats)) {
        const zombieCount = stats.zombies;
        // 非丧尸存活角色数 = 总存活 - 丧尸存活
        const aliveAtLoc = Object.entries(ctx.G.v1.characters)
          .filter(([_, ch]) => ch.locationId === loc && ch.alive);
        const nonZombieAlive = aliveAtLoc.filter(([cid]) => ctx.G.v1.hiddenRoles?.[cid] !== 'zombie').length;
        if (zombieCount > nonZombieAlive && aliveAtLoc.length > 0) {
          return ok(true, `丧尸可在版图 ${loc} 杀死 1 名角色`, true);
        }
      }
      return ok(false);
    },
    execute(ctx) {
      // 标记每日使用
      const usageKey = 'hsa_zombie_kill_daily';
      if (!ctx.G.v1.loopState.abilityUsage[usageKey]) {
        ctx.G.v1.loopState.abilityUsage[usageKey] = { usedToday: true, usedThisLoop: false };
      } else {
        ctx.G.v1.loopState.abilityUsage[usageKey].usedToday = true;
      }
      // 选择目标版图和角色
      const selectedLocation = ctx.selectedTargets?.location;
      const selectedTarget = ctx.selectedTargets?.target;
      // 找符合条件的版图
      const validLocations: string[] = [];
      for (const loc of Object.keys(ctx.G.v1.locations)) {
        let zombieCount = 0;
        const aliveAtLoc = Object.entries(ctx.G.v1.characters)
          .filter(([_, ch]) => ch.locationId === loc && ch.alive);
        for (const [cid, ch] of Object.entries(ctx.G.v1.characters)) {
          if (ch.locationId === loc && ctx.G.v1.hiddenRoles?.[cid] === 'zombie') {
            zombieCount++;
          }
        }
        const nonZombieAlive = aliveAtLoc.filter(([cid]) => ctx.G.v1.hiddenRoles?.[cid] !== 'zombie').length;
        if (zombieCount > nonZombieAlive && aliveAtLoc.length > 0) {
          validLocations.push(loc);
        }
      }
      const targetLoc = selectedLocation && validLocations.includes(selectedLocation)
        ? selectedLocation
        : validLocations[0];
      if (!targetLoc) return;
      const aliveAtTarget = Object.entries(ctx.G.v1.characters)
        .filter(([_, ch]) => ch.locationId === targetLoc && ch.alive)
        .map(([id]) => id);
      const targetId = selectedTarget && aliveAtTarget.includes(selectedTarget)
        ? selectedTarget
        : aliveAtTarget[0];
      if (targetId) {
        killCharacter(ctx, targetId, ROLE_KILL_OPTIONS);
        ctx.G.publicLog.push(`💀 丧尸在 ${targetLoc} 杀死了 1 名角色`);
        ctx.G.fullLog.push(`[身份能力] 丧尸 → ${cn(targetId)} 在 ${targetLoc} 死亡`);
      }
    },
  },

  // 【任意能力：回合结束】移动 1 具丧尸尸体到相邻版图（每日限 1 次）
  // FAQ: 丧尸尸体可进入角色禁行区域
  {
    ruleId: 'hsa_zombie_move',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const usageKey = 'hsa_zombie_move_daily';
      if (ctx.G.v1.loopState?.abilityUsage?.[usageKey]?.usedToday) return ok(false);
      // 找死亡丧尸
      const deadZombies = Object.entries(ctx.G.v1.characters)
        .filter(([cid, ch]) => !ch.alive && ctx.G.v1.hiddenRoles?.[cid] === 'zombie');
      if (deadZombies.length === 0) return ok(false);
      return ok(true, '可移动 1 具丧尸尸体到相邻版图', true);
    },
    execute(ctx) {
      const usageKey = 'hsa_zombie_move_daily';
      if (!ctx.G.v1.loopState.abilityUsage[usageKey]) {
        ctx.G.v1.loopState.abilityUsage[usageKey] = { usedToday: true, usedThisLoop: false };
      } else {
        ctx.G.v1.loopState.abilityUsage[usageKey].usedToday = true;
      }
      const selectedTarget = ctx.selectedTargets?.target;
      const selectedLocation = ctx.selectedTargets?.location;
      const deadZombies = Object.entries(ctx.G.v1.characters)
        .filter(([cid, ch]) => !ch.alive && ctx.G.v1.hiddenRoles?.[cid] === 'zombie');
      const zombieId = selectedTarget && deadZombies.some(([id]) => id === selectedTarget)
        ? selectedTarget
        : deadZombies[0]?.[0];
      if (!zombieId) return;
      const zombie = ctx.G.v1.characters[zombieId];
      const neighbors = getAdjacentLocations(zombie.locationId);
      // FAQ: 丧尸尸体移动不受禁行限制
      const dest = selectedLocation && neighbors.includes(selectedLocation)
        ? selectedLocation
        : neighbors[0];
      if (dest) {
        zombie.locationId = dest;
        ctx.G.publicLog.push(`🧟 丧尸尸体移动到 ${dest}`);
        ctx.G.fullLog.push(`[身份能力] 丧尸尸体 ${cn(zombieId)} 移动至 ${dest}`);
      }
    },
  },

  // ── 纸老虎 (Paper Tiger) ──────────────────────────────────────────────────
  // 不死：不安<2 时有不死特性
  {
    ruleId: 'hsa_paper_tiger_undead',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c) return ok(false);
      // 纸老虎不死在不安<2时生效（由 hasImmortality 动态检查）
      return ok(false, getCharVal(c, 'paranoia') < 2 ? '纸老虎不死有效' : '纸老虎不安≥2，失去不死');
    },
    execute() {},
  },
  // 不安≥2 → 失去不死 + 获得必定无视友好
  {
    ruleId: 'hsa_paper_tiger_scared',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const scared = getCharVal(c, 'paranoia') >= 2;
      return ok(scared, scared ? '纸老虎恐惧状态：失去不死+必定无视友好' : '纸老虎正常状态');
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      ctx.G.fullLog.push(`[身份特性] 纸老虎 ${cn(charId)} 不安≥2：失去不死，获得必定无视友好`);
    },
  },
];

const ahrDimensionTravelerEndOfLastDayLoss: RuleProcessor = {
  ruleId: 'ahr_dimension_traveler_end_of_last_day_loss',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const character = ctx.G.v1.characters[charId];
    if (!character || !character.alive) return ok(false);
    const distinctTokenTypes = countDistinctTokenTypes(character);
    return ok(
      distinctTokenTypes <= 2,
      distinctTokenTypes <= 2
        ? `次元旅者 ${cn(charId)} 只有 ${distinctTokenTypes} 种指示物 → 主人公死亡`
        : `次元旅者 ${cn(charId)} 拥有 ${distinctTokenTypes} 种指示物`,
    );
  },
  execute(ctx) {
    triggerProtagonistDeath(ctx.G, `次元旅者 ${ctx.characterId} 在最终日只有 2 种或以下不同指示物`);
    ctx.G.fullLog.push(`[身份能力] 次元旅者 ${ctx.characterId} 在最终日触发主人公死亡`);
  },
};

const ahrStorytellerLoopStartHope: RuleProcessor = {
  ruleId: 'ahr_storyteller_loop_start_hope',
  check(ctx) {
    const ex = ctx.G.v1.ex;
    const lastLoopEndGauge = ex?.lastLoopEndGauge ?? 0;
    return ok(
      lastLoopEndGauge >= 3,
      lastLoopEndGauge >= 3
        ? `叙述者记录到上轮 Ex=${lastLoopEndGauge}，主人公获得希望`
        : `上轮 Ex=${lastLoopEndGauge}<3，不触发叙述者希望`,
    );
  },
  execute(ctx) {
    addToken(ctx.G.v1.protagonists, 'hope', 1);
    ctx.G.fullLog.push(`[身份能力] 叙述者 ${ctx.characterId} 因上轮 Ex≥3 令主人公获得 1 希望`);
  },
};

const ahrStorytellerShiftToken: RuleProcessor = {
  ruleId: 'ahr_storyteller_shift_token',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const storyteller = ctx.G.v1.characters[charId];
    if (!storyteller || !storyteller.alive) return ok(false);
    const ex = ctx.G.v1.ex;
    if (!ex?.enabled || ex.gauge < 1) {
      return ok(false, 'Ex < 1，叙述者不能移动指示物');
    }

    const others = allOtherAliveAtLocation(ctx, charId);
    const tokenSources = others.filter(targetId => countDistinctTokenTypes(ctx.G.v1.characters[targetId]) > 0);
    return ok(
      others.length >= 2 && tokenSources.length > 0,
      others.length >= 2 && tokenSources.length > 0
        ? '叙述者可在同区域两名其他角色之间移动 1 枚指示物'
        : '叙述者缺少可用的两名其他角色或可移动指示物',
      true,
    );
  },
  execute(ctx) {
    const charId = ctx.characterId!;
    const storyteller = ctx.G.v1.characters[charId];
    if (!storyteller) return;

    const others = allOtherAliveAtLocation(ctx, charId);
    const fromCharacter = ctx.selectedTargets?.fromCharacter;
    const toCharacter = ctx.selectedTargets?.toCharacter;
    const tokenType = ctx.selectedTargets?.tokenType as
      | 'paranoia'
      | 'intrigue'
      | 'goodwill'
      | 'hope'
      | 'despair'
      | 'guard'
      | undefined;

    if (!fromCharacter || !toCharacter || !tokenType) return;
    if (fromCharacter === toCharacter) return;
    if (!others.includes(fromCharacter) || !others.includes(toCharacter)) return;
    if (getToken(ctx.G.v1.characters[fromCharacter], tokenType) < 1) return;

    if (tokenType === 'paranoia') {
      applyCharacterTokenDelta(ctx.G, fromCharacter, 'paranoia', -1);
      applyCharacterTokenDelta(ctx.G, toCharacter, 'paranoia', 1);
    } else {
      addToken(ctx.G.v1.characters[fromCharacter], tokenType, -1);
      addToken(ctx.G.v1.characters[toCharacter], tokenType, 1);
    }
    ctx.G.fullLog.push(`[身份能力] 叙述者 ${cn(charId)} 将 1 枚 ${tokenType} 从 ${cn(fromCharacter)} 移动到 ${cn(toCharacter)}`);
  },
};

const ahrLullabyPlaceToken: RuleProcessor = {
  ruleId: 'ahr_lullaby_place_token',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const lullaby = ctx.G.v1.characters[charId];
    if (!lullaby || !lullaby.alive) return ok(false);
    if (hasLoopAbilityUsed(ctx, AHR_LULLABY_PLACE_TOKEN_USAGE_KEY)) {
      return ok(false, '童谣本轮已使用放置指示物能力');
    }
    const targets = allAliveAtLocation(ctx, lullaby.locationId);
    return ok(
      targets.length > 0,
      targets.length > 0 ? '童谣可在同区域放置不安或友好' : '童谣所在区域无可选目标',
      true,
    );
  },
  execute(ctx) {
    const charId = ctx.characterId!;
    const lullaby = ctx.G.v1.characters[charId];
    if (!lullaby) return;

    const target = ctx.selectedTargets?.target;
    const tokenType = ctx.selectedTargets?.tokenType as 'paranoia' | 'goodwill' | undefined;
    if (!target || !tokenType) return;
    if (!allAliveAtLocation(ctx, lullaby.locationId).includes(target)) return;

    if (tokenType === 'paranoia') {
      applyCharacterTokenDelta(ctx.G, target, 'paranoia', 1);
    } else {
      addToken(ctx.G.v1.characters[target], 'goodwill', 1);
    }
    markLoopAbilityUsed(ctx, AHR_LULLABY_PLACE_TOKEN_USAGE_KEY);
    ctx.G.fullLog.push(`[身份能力] 童谣 ${cn(charId)} 为 ${cn(target)} 放置了 1 枚 ${tokenType}`);
  },
};

const ahrLullabyDayEndLoss: RuleProcessor = {
  ruleId: 'ahr_lullaby_day_end_loss',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const lullaby = ctx.G.v1.characters[charId];
    if (!lullaby || !lullaby.alive) return ok(false);
    const tokenTypes = countDistinctTokenTypes(lullaby);
    return ok(
      tokenTypes >= 4,
      tokenTypes >= 4
        ? `童谣 ${cn(charId)} 身上共有 ${tokenTypes} 种指示物，主人公死亡`
        : `童谣 ${cn(charId)} 身上共有 ${tokenTypes} 种指示物`,
    );
  },
  execute(ctx) {
    triggerProtagonistDeath(ctx.G, `童谣 ${ctx.characterId} 在 day_end 拥有 4 种或以上不同指示物`);
    ctx.G.fullLog.push(`[身份能力] 童谣 ${ctx.characterId} 在回合结束时杀死了主人公`);
  },
};

const ahrPiedPiperDayEndKill: RuleProcessor = {
  ruleId: 'ahr_pied_piper_day_end_kill',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const piper = ctx.G.v1.characters[charId];
    if (!piper || !piper.alive) return ok(false);
    const ex = ctx.G.v1.ex;
    if (!ex?.enabled || ex.gauge < 2) {
      return ok(false, 'Ex < 2，魔笛手不能在 day_end 杀人');
    }
    if (hasLoopAbilityUsed(ctx, AHR_PIED_PIPER_DAY_END_KILL_USAGE_KEY)) {
      return ok(false, '魔笛手本轮已执行过 day_end 杀人');
    }
    const targets = allOtherAliveAtLocation(ctx, charId);
    return ok(
      targets.length > 0,
      targets.length > 0 ? '魔笛手可杀死同区域 1 名角色' : '魔笛手所在区域无其他存活角色',
    );
  },
  execute(ctx) {
    const charId = ctx.characterId!;
    const targets = allOtherAliveAtLocation(ctx, charId).sort();
    const selectedTarget = ctx.selectedTargets?.target;
    const targetId = selectedTarget && targets.includes(selectedTarget)
      ? selectedTarget
      : targets[0];
    if (!targetId) return;
    if (!killCharacter(ctx, targetId, ROLE_KILL_OPTIONS)) return;
    markLoopAbilityUsed(ctx, AHR_PIED_PIPER_DAY_END_KILL_USAGE_KEY);
    ctx.G.fullLog.push(`[身份能力] 魔笛手 ${cn(charId)} 在 day_end 杀死了 ${cn(targetId)}`);
  },
};

const ahrPiedPiperCorpseIntrigueAndLoss: RuleProcessor = {
  ruleId: 'ahr_pied_piper_corpse_intrigue_and_loss',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const piper = ctx.G.v1.characters[charId];
    if (!piper || !piper.alive) return ok(false);
    const sameAreaCorpses = Object.entries(ctx.G.v1.characters)
      .filter(([_, character]) => !character.alive && character.locationId === piper.locationId)
      .map(([id]) => id);
    const totalCorpseIntrigue = Object.values(ctx.G.v1.characters)
      .filter(character => !character.alive)
      .reduce((sum, character) => sum + getCharVal(character, 'intrigue'), 0);
    return ok(
      sameAreaCorpses.length > 0 || totalCorpseIntrigue >= 3,
      sameAreaCorpses.length > 0
        ? '魔笛手可向同区域尸体放置 1 密谋'
        : totalCorpseIntrigue >= 3
          ? '所有尸体上的密谋已达 3，魔笛手仍可触发败北'
          : '魔笛手所在区域无尸体，且所有尸体上的密谋不足 3',
    );
  },
  execute(ctx) {
    const charId = ctx.characterId!;
    const piper = ctx.G.v1.characters[charId];
    if (!piper) return;

    const sameAreaCorpses = Object.entries(ctx.G.v1.characters)
      .filter(([_, character]) => !character.alive && character.locationId === piper.locationId)
      .map(([id]) => id)
      .sort();
    const selectedTarget = ctx.selectedTargets?.target;
    const corpseId = selectedTarget && sameAreaCorpses.includes(selectedTarget)
      ? selectedTarget
      : sameAreaCorpses[0];
    if (corpseId) {
      addToken(ctx.G.v1.characters[corpseId], 'intrigue', 1);
      ctx.G.fullLog.push(`[身份能力] 魔笛手 ${cn(charId)} 向尸体 ${cn(corpseId)} 放置了 1 密谋`);
    }

    const totalCorpseIntrigue = Object.values(ctx.G.v1.characters)
      .filter(character => !character.alive)
      .reduce((sum, character) => sum + getCharVal(character, 'intrigue'), 0);
    if (totalCorpseIntrigue >= 3) {
      triggerProtagonistDeath(ctx.G, `魔笛手 ${charId} 使所有尸体上的密谋总数达到 ${totalCorpseIntrigue}`);
    }
  },
};

const ahrEvangelistGoodwillAbility: RuleProcessor = {
  ruleId: 'ahr_evangelist_goodwill_ability',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const evangelist = ctx.G.v1.characters[charId];
    if (!evangelist || !evangelist.alive) return ok(false);
    const targets = allAliveAtLocation(ctx, evangelist.locationId);
    return ok(
      targets.length > 0,
      targets.length > 0 ? '布道者可向同区域角色放置 1 友好' : '布道者所在区域无可选目标',
      true,
    );
  },
  execute(ctx) {
    const charId = ctx.characterId!;
    const evangelist = ctx.G.v1.characters[charId];
    if (!evangelist) return;

    const target = ctx.selectedTargets?.target;
    if (!target || !allAliveAtLocation(ctx, evangelist.locationId).includes(target)) return;
    addToken(ctx.G.v1.characters[target], 'goodwill', 1);
    ctx.G.fullLog.push(`[身份能力] 布道者 ${cn(charId)} 为 ${cn(target)} 放置了 1 友好`);
  },
};

const ahrAliceLoopEndLoss: RuleProcessor = {
  ruleId: 'ahr_alice_loop_end_loss',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const alice = ctx.G.v1.characters[charId];
    const triggered = !!alice && !alice.alive;
    return ok(
      triggered,
      triggered ? `爱丽丝 ${cn(charId)} 已死亡，主人公败北` : `爱丽丝 ${cn(charId)} 仍存活`,
    );
  },
  execute(ctx) {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push(`[身份能力] 爱丽丝 ${ctx.characterId} 在轮回结束时死亡，主人公败北`);
  },
};

const ahrFragmentLoopStartDespair: RuleProcessor = {
  ruleId: 'ahr_fragment_loop_start_despair',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    return ok(
      wasCharacterDeadLastLoop(ctx, charId),
      wasCharacterDeadLastLoop(ctx, charId)
        ? `因果残片 ${cn(charId)} 上轮结束时死亡 → 剧作家获得绝望`
        : `因果残片 ${cn(charId)} 上轮结束时未死亡`,
    );
  },
  execute(ctx) {
    addToken(ctx.G.v1.mastermind, 'despair', 1);
    ctx.G.fullLog.push(`[身份能力] 因果残片 ${ctx.characterId} 上轮死亡，剧作家获得 1 绝望`);
  },
};

const ahrFragmentLoopStartHope: RuleProcessor = {
  ruleId: 'ahr_fragment_loop_start_hope',
  check(ctx) {
    const charId = ctx.characterId;
    if (!charId) return ok(false);
    const character = ctx.G.v1.characters[charId];
    if (!character || !character.alive) return ok(false);
    const goodwill = getCharVal(character, 'goodwill');
    return ok(
      goodwill >= 2,
      goodwill >= 2
        ? `因果残片 ${cn(charId)} 存活且友好 ${goodwill} ≥ 2 → 主人公获得希望`
        : `因果残片 ${cn(charId)} 友好 ${goodwill} < 2`,
    );
  },
  execute(ctx) {
    addToken(ctx.G.v1.protagonists, 'hope', 1);
    ctx.G.fullLog.push(`[身份能力] 因果残片 ${ctx.characterId} 存活且友好足够，主人公获得 1 希望`);
  },
};

roleProcessors.push(
  ahrDimensionTravelerEndOfLastDayLoss,
  ahrStorytellerLoopStartHope,
  ahrStorytellerShiftToken,
  ahrLullabyPlaceToken,
  ahrLullabyDayEndLoss,
  ahrPiedPiperDayEndKill,
  ahrPiedPiperCorpseIntrigueAndLoss,
  ahrEvangelistGoodwillAbility,
  ahrAliceLoopEndLoss,
  ahrFragmentLoopStartDespair,
  ahrFragmentLoopStartHope,
);

const roleAliases: Array<[string, string]> = [
  ['time_traveler_final_day_loss', 'time_traveler_end_of_last_day_loss'],
  ['ahr_time_traveler_end_loss', 'time_traveler_end_of_last_day_loss'],
  ['ahr_time_traveler_ignore_forbid_goodwill', 'time_traveler_ignore_forbid_goodwill'],
  ['suitor_loved_one_death', 'lover_loved_one_dies_unease'],
  ['suitor_day_end_protagonist_death', 'lover_day_end_protagonists'],
  ['factor_school_intrigue_rule', 'factor_school_conspiracy'],
  ['factor_city_intrigue_rule', 'factor_city_key_person'],
  ['mc_friend_death_reveal', 'friend_dead_reveal_loss'],
  ['hsa_lover_kill', 'lover_day_end_protagonists'],
  // MZ 别名
  ['mz_factor_school_intrigue', 'factor_school_conspiracy'],
  ['mz_factor_city_intrigue', 'factor_city_key_person'],
  // WM 别名
  ['wm_key_person_death_loss', 'key_person_death_loss'],
  ['wm_serial_killer_day_end_kill', 'serial_killer_day_end_kill'],
  ['wm_conspiracy_theorist_unease_ability', 'conspiracy_theorist_unease_ability'],
  ['wm_paranoiac_intrigue_or_unease', 'mc_paranoiac_intrigue_or_unease'],
  ['wm_time_traveler_undead', 'time_traveler_cannot_die'],
  ['wm_time_traveler_ignore_forbid_goodwill', 'time_traveler_ignore_forbid_goodwill'],
  ['wm_time_traveler_last_day_loss', 'time_traveler_end_of_last_day_loss'],
  ['wm_cultist_ignore_forbid_intrigue', 'cultist_ignore_forbid_intrigue'],
  // LL 别名 — 共享角色通过前缀剥离自动回退，此处仅注册语义一致的显式别名
  ['ll_key_person_death_loss', 'key_person_death_loss'],
  ['ll_brain_intrigue_ability', 'brain_intrigue_ability'],
  ['ll_killer_day_end_key_person', 'killer_day_end_key_person'],
  ['ll_killer_day_end_protagonists', 'killer_day_end_protagonists'],
  ['ll_serial_killer_day_end_kill', 'serial_killer_day_end_kill'],
  ['ll_conspiracy_theorist_unease_ability', 'conspiracy_theorist_unease_ability'],
  ['ll_factor_school_intrigue', 'factor_school_conspiracy'],
  ['ll_factor_city_intrigue', 'factor_city_key_person'],
];

// ── MZ 独有身份处理器 ────────────────────────────────────────────────────

const mzRoleProcessors: RuleProcessor[] = [
  // 强迫症：剧本制作约束（必须成为某事件当事人）
  { ruleId: 'mz_compulsive_incident_target', check() { return ok(false, '剧本制作约束，无运行期效果'); }, execute() {} },

  // 强迫症：当事人为该角色的事件必定发生
  // ✅ 强迫症当事人事件必发：已在 autoResolve.ts:L100-108 实现（isCompulsive 分支）
  // FAQ: 强迫症死亡后能力失效；强迫症+预言家同区域时预言家优先阻止
  { ruleId: 'mz_compulsive_incident_guarantee', check() { return ok(false, '强迫症必发逻辑已在 autoResolve.ts:L100-108 实现'); }, execute() {} },

  // 魔术师瞬移：复用 AHR 魔术师传送实现（所有魔术师合计每轮限 1 次）
  {
    ruleId: 'mz_magician_teleport',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const magician = ctx.G.v1.characters[charId];
      if (!magician || !magician.alive) return ok(false);
      if (hasLoopAbilityUsed(ctx, AHR_MAGICIAN_TELEPORT_USAGE_KEY)) {
        return ok(false, '魔术师瞬移本轮已使用');
      }
      const targets = allAliveAtLocation(ctx, magician.locationId)
        .filter(targetId => getCharVal(ctx.G.v1.characters[targetId], 'paranoia') >= 1);
      if (targets.length === 0) return ok(false, '同区域无带不安角色');
      return ok(true, '魔术师可将同区域带有不安的角色移动到相邻版图', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const magician = ctx.G.v1.characters[charId];
      if (!magician) return;
      const targets = allAliveAtLocation(ctx, magician.locationId)
        .filter(targetId => getCharVal(ctx.G.v1.characters[targetId], 'paranoia') >= 1);
      const targetId = ctx.selectedTargets?.target && targets.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : targets[0];
      if (!targetId) return;
      const target = ctx.G.v1.characters[targetId];
      const neighbors = new Set<string>(getAdjacentLocations(target.locationId));
      const forbidden = new Set(CHARACTERS[targetId as keyof typeof CHARACTERS]?.forbiddenLocations || []);
      const destination = ctx.selectedTargets?.location;
      const chosen = destination && neighbors.has(destination) && !forbidden.has(destination)
        ? destination
        : Array.from(neighbors).find(locationId => !forbidden.has(locationId));
      if (!chosen) return;
      target.locationId = chosen;
      markLoopAbilityUsed(ctx, AHR_MAGICIAN_TELEPORT_USAGE_KEY);
      ctx.G.publicLog.push(`📍 ${cn(targetId)} 移动到 ${chosen}`);
      ctx.G.fullLog.push(`[身份能力] 魔术师 ${cn(charId)} 将 ${cn(targetId)} 移动到 ${chosen}`);
    },
  },

  // 魔术师死亡时清不安：已由 killCharacter() 统一处理（L183-186 hasEffectiveRole 'magician' 检查）
  { ruleId: 'mz_magician_death_clear_unease', check() { return ok(false, '魔术师死亡清不安由 killCharacter 统一处理'); }, execute() {} },

  // ── 忍者暗杀 ──────────────────────────────────────────────────────────────
  // 【任意能力：回合结束阶段】同一区域 1 名角色身上有 2 枚或以上密谋 → 那名角色死亡
  {
    ruleId: 'mz_ninja_assassinate',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const ninja = ctx.G.v1.characters[charId];
      if (!ninja || !ninja.alive) return ok(false);
      // 找同区域密谋≥2 的角色
      const candidates = charsAtSameLocation(ctx, charId)
        .filter(targetId => getCharVal(ctx.G.v1.characters[targetId], 'intrigue') >= 2);
      if (candidates.length === 0) return ok(false, '同区域无密谋≥2 的角色');
      return ok(true, `忍者可暗杀同区域密谋≥2 的角色: ${candidates.join(',')}`, true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const candidates = charsAtSameLocation(ctx, charId)
        .filter(targetId => getCharVal(ctx.G.v1.characters[targetId], 'intrigue') >= 2);
      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && candidates.includes(selectedTarget)
        ? selectedTarget
        : candidates[0];
      if (!targetId) return;
      if (killCharacter(ctx, targetId, ROLE_KILL_OPTIONS)) {
        ctx.G.fullLog.push(`[身份能力] 忍者 ${cn(charId)} 暗杀了 ${cn(targetId)}（密谋≥2）`);
      }
    },
  },

  // 忍者虚假宣称：已在 revealTracker.ts recordRevealedRole 中接线
  { ruleId: 'mz_ninja_false_claim', check() { return ok(false, '忍者虚假宣称已在 revealTracker 接线'); }, execute() {} },

  // 预言家：剧作家不可以往该角色身上设置任何行动牌
  // 已由 cardValidator / setActionCards move 校验处理
  { ruleId: 'mz_prophet_no_cards', check() { return ok(false, '预言家禁牌由 cardValidator 处理'); }, execute() {} },

  // 预言家：与该角色位于同一区域的其他角色不会触发事件
  // ✅ 预言家阻止事件：已在 autoResolve.ts:L87-98 实现（prophetBlocksCulprit 分支）
  // FAQ: 预言家自己能触发事件；强迫症+预言家同区域 → 不能引发
  { ruleId: 'mz_prophet_prevent_incidents', check() { return ok(false, '预言家阻止事件已在 autoResolve.ts:L87-98 实现'); }, execute() {} },

  // 永生者：不死特性，已由 hasImmortality() 统一处理
  { ruleId: 'mz_immortal_cannot_die', check() { return ok(false, '永生者不死由 hasImmortality 统一处理'); }, execute() {} },
];
roleProcessors.push(...mzRoleProcessors);

// ── WM 独有身份处理器（对齐 docs/模组/Weird_Mythology.md）──────────────────
const wmRoleProcessors: RuleProcessor[] = [
  // ── 祭品 (Sacrifice) ──────────────────────────────────────────────────────
  // 不死（已在 hasImmortality IMMORTAL_ROLES 中添加 'sacrifice'）
  { ruleId: 'wm_sacrifice_undead', check() { return ok(false, '祭品不死由 hasImmortality 统一处理'); }, execute() {} },

  // 【任意能力：回合结束阶段】2密谋+2不安→全死
  {
    ruleId: 'wm_sacrifice_mass_kill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const intrigue = getCharVal(c, 'intrigue');
      const paranoia = getCharVal(c, 'paranoia');
      if (intrigue >= 2 && paranoia >= 2) {
        return ok(true, `祭品(${cn(charId)})有${intrigue}密谋+${paranoia}不安→可触发全死`, true);
      }
      return ok(false);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      // 所有角色死亡
      for (const [id, c] of Object.entries(ctx.G.v1.characters)) {
        if (c.alive) killCharacter(ctx, id, ROLE_KILL_OPTIONS);
      }
      // 主人公死亡
      triggerProtagonistDeath(ctx.G, `祭品 ${cn(charId)} 触发：2密谋+2不安→全死`);
      ctx.G.fullLog.push(`[身份能力] 祭品 ${cn(charId)} 全体死亡（密谋≥2且不安≥2）`);
    },
  },

  // ✅ 祭品密谋视为不安：已在 runtime/incidents.ts getIncidentTriggerValue() L130-136 实现
  { ruleId: 'wm_sacrifice_intrigue_as_paranoia', check() { return ok(false, '祭品密谋视为不安已在 getIncidentTriggerValue 统一处理'); }, execute() {} },

  // 剧本制作约束
  { ruleId: 'wm_sacrifice_must_be_culprit', check() { return ok(false, '剧本制作约束，无运行期效果'); }, execute() {} },

  // ── 永生者 (Immortal) ─────────────────────────────────────────────────────
  { ruleId: 'wm_immortal_undead', check() { return ok(false, '永生者不死由 hasImmortality 统一处理'); }, execute() {} },

  // ── 深潜者 (Deep One) ─────────────────────────────────────────────────────
  // 【任意能力：剧作家能力阶段】同区角色/版图+1密谋
  {
    ruleId: 'wm_deep_one_intrigue_ability',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, `深潜者(${cn(charId)})可往同区角色/版图放1密谋`, true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const c = ctx.G.v1.characters[charId];
      if (!c) return;
      const target = ctx.selectedTargets?.target;
      const location = ctx.selectedTargets?.location;
      if (location && ctx.G.v1.locations[location]) {
        addToken(ctx.G.v1.locations[location], 'intrigue', 1);
        ctx.G.fullLog.push(`[身份能力] 深潜者 ${cn(charId)} 在版图 ${location} 放置 1 密谋`);
      } else if (target && ctx.G.v1.characters[target]?.locationId === c.locationId) {
        addToken(ctx.G.v1.characters[target], 'intrigue', 1);
        ctx.G.fullLog.push(`[身份能力] 深潜者 ${cn(charId)} 在 ${cn(target)} 身上放置 1 密谋`);
      } else {
        // 自动模式：默认往版图放
        const locId = c.locationId;
        if (ctx.G.v1.locations[locId]) {
          addToken(ctx.G.v1.locations[locId], 'intrigue', 1);
          ctx.G.fullLog.push(`[身份能力] 深潜者 ${cn(charId)} 在版图 ${locId} 放置 1 密谋`);
        }
      }
    },
  },

  // 【强制：该角色死亡时】公开身份，Ex+1
  {
    ruleId: 'wm_deep_one_death_reveal_ex',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || c.alive) return ok(false);
      return ok(true, `深潜者(${cn(charId)})已死亡→公开身份+Ex+1`);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const roleId = ctx.G.v1.hiddenRoles?.[charId] || 'deep_one';
      recordRevealedRole(ctx.G, charId, roleId);
      const ex = ctx.G.v1.ex;
      if (ex?.enabled) {
        ex.gauge = Math.max(0, ex.gauge + 1);
        ex.changedThisLoop = true;
      }
      ctx.G.publicLog.push(`🔮 ${cn(charId)} 的身份被公开 — Ex+1`);
      ctx.G.fullLog.push(`[身份能力] 深潜者 ${cn(charId)} 死亡，揭示身份，Ex+1`);
    },
  },

  // ── 巫师 (Spellcaster) ────────────────────────────────────────────────────
  // 【失败条件：轮回结束时】死亡→败北
  {
    ruleId: 'wm_spellcaster_death_loss',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      const triggered = !!c && !c.alive;
      return ok(
        triggered,
        triggered ? `巫师(${cn(charId)})已死亡，主人公败北` : `巫师(${cn(charId)})仍存活`,
      );
    },
    execute(ctx) {
      ctx.G.v1.loopLost = true;
      ctx.G.fullLog.push(`⛔ 巫师 ${ctx.characterId} 在轮回结束时死亡，主人公败北`);
    },
  },

  // 【强制：结算友好能力后】公开身份+队长可选Ex+1
  // ✅ 已在 goodwillResolver.ts resolveGoodwillPhase() 中实现（autoResolve 路径）
  { ruleId: 'wm_spellcaster_goodwill_reveal_ex', check() { return ok(false, '巫师友好后揭示+Ex 已在 goodwillResolver 实现'); }, execute() {} },

  // ── 目击者 (Witness) ──────────────────────────────────────────────────────
  // 【强制：回合结束阶段】4不安→死+Ex
  {
    ruleId: 'wm_witness_paranoia_death_ex',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const paranoia = getCharVal(c, 'paranoia');
      if (paranoia >= 4) {
        return ok(true, `目击者(${cn(charId)})不安=${paranoia}≥4→死亡+Ex+1`);
      }
      return ok(false);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      killCharacter(ctx, charId, ROLE_KILL_OPTIONS);
      const ex = ctx.G.v1.ex;
      if (ex?.enabled) {
        ex.gauge = Math.max(0, ex.gauge + 1);
        ex.changedThisLoop = true;
      }
      ctx.G.fullLog.push(`[身份能力] 目击者 ${cn(charId)} 不安≥4→死亡，Ex+1`);
    },
  },

  // ── 无面者 (Faceless) ─────────────────────────────────────────────────────
  // 不死+无视友好（已在 hasImmortality 添加 'faceless'）
  { ruleId: 'wm_faceless_undead', check() { return ok(false, '无面者不死+无视友好由 hasImmortality + domain 层 goodwillRefusal 配置'); }, execute() {} },

  // 【强制：常驻】Ex≤1→传谣人能力（同区角色+1不安）
  {
    ruleId: 'wm_faceless_low_ex_conspiracy',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const ex = ctx.G.v1.ex;
      if (!ex?.enabled || ex.gauge > 1) return ok(false, `Ex=${ex?.gauge ?? 0}>1，无面者不获得传谣人能力`);
      return ok(true, `无面者(${cn(charId)}) Ex≤1 → 传谣人能力：同区角色+1不安`, true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const locationId = ctx.G.v1.characters[charId]?.locationId;
      const targets = locationId ? allAliveAtLocation(ctx, locationId) : [];
      const selectedTarget = ctx.selectedTargets?.target;
      const targetId = selectedTarget && targets.includes(selectedTarget)
        ? selectedTarget
        : targets[0];
      if (targetId) {
        applyCharacterTokenDelta(ctx.G, targetId, 'paranoia', 1);
        ctx.G.publicLog.push(`📋 ${cn(targetId)} 获得了 1 枚不安`);
        ctx.G.fullLog.push(`[身份能力] 无面者(传谣人) ${cn(charId)} → ${cn(targetId)} +1 不安`);
      }
    },
  },

  // 【强制：常驻】Ex≥2→深潜者能力（同区角色/版图+1密谋）
  {
    ruleId: 'wm_faceless_high_ex_deep_one',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const ex = ctx.G.v1.ex;
      if (!ex?.enabled || ex.gauge < 2) return ok(false, `Ex=${ex?.gauge ?? 0}<2，无面者不获得深潜者能力`);
      return ok(true, `无面者(${cn(charId)}) Ex≥2 → 深潜者能力：同区+1密谋`, true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const c = ctx.G.v1.characters[charId];
      if (!c) return;
      const target = ctx.selectedTargets?.target;
      const location = ctx.selectedTargets?.location;
      if (location && ctx.G.v1.locations[location]) {
        addToken(ctx.G.v1.locations[location], 'intrigue', 1);
        ctx.G.fullLog.push(`[身份能力] 无面者(深潜者) ${cn(charId)} 在版图 ${location} 放置 1 密谋`);
      } else if (target && ctx.G.v1.characters[target]?.locationId === c.locationId) {
        addToken(ctx.G.v1.characters[target], 'intrigue', 1);
        ctx.G.fullLog.push(`[身份能力] 无面者(深潜者) ${cn(charId)} 在 ${cn(target)} 身上放置 1 密谋`);
      } else {
        // 自动模式：默认往版图放
        const locId = c.locationId;
        if (ctx.G.v1.locations[locId]) {
          addToken(ctx.G.v1.locations[locId], 'intrigue', 1);
          ctx.G.fullLog.push(`[身份能力] 无面者(深潜者) ${cn(charId)} 在版图 ${locId} 放置 1 密谋`);
        }
      }
    },
  },
];
roleProcessors.push(...wmRoleProcessors);

for (const [aliasId, sourceId] of roleAliases) {
  const source = roleProcessors.find(p => p.ruleId === sourceId);
  if (source) {
    roleProcessors.push({
      ruleId: aliasId,
      check: source.check,
      execute: source.execute,
    });
  }
}

// ── AHR 独有身份空壳处理器 ────────────────────────────────────────────────
// 这些角色有独特语义（表/里世界、傀儡无视等），先注册空壳通过可玩性门禁
// 不死空壳统一返回 triggered=false（需 hasImmortality 扩展才能真正生效）

const ahrRoleStubs: RuleProcessor[] = [
  // AI — 不死
  { ruleId: 'ahr_ai_undead', check() { return ok(false, 'AI 不死由 hasImmortality 统一处理'); }, execute() {} },
  // 时间旅者 — 不死 + 无视禁止友好
  { ruleId: 'ahr_time_traveler_undead', check() { return ok(false, '时间旅者不死需 hasImmortality 扩展，空壳'); }, execute() {} },
  {
    ruleId: 'ahr_time_traveler_ignore_forbid_goodwill',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      return ok(true, '时间旅者无视禁止友好');
    },
    execute(ctx) {
      ctx.G.v1.cardResolveImmunities.push({
        characterId: ctx.characterId!,
        immuneToForbid: 'forbid_goodwill',
      });
      ctx.G.fullLog.push(`[身份能力] 时间旅者 ${ctx.characterId} 无视了禁止友好`);
    },
  },
  // 不可触者 — 必定无视友好 + 强制放不安
  { ruleId: 'ahr_untouchable_ignore_goodwill', check() { return ok(false, '不可触者必定无视友好（domain层已配置）'); }, execute() {} },
  // 魔术师 — 传送 + 死亡清不安
  {
    ruleId: 'ahr_magician_teleport',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const magician = ctx.G.v1.characters[charId];
      if (!magician || !magician.alive) return ok(false);
      if (hasLoopAbilityUsed(ctx, AHR_MAGICIAN_TELEPORT_USAGE_KEY)) {
        return ok(false);
      }

      const targets = allAliveAtLocation(ctx, magician.locationId)
        .filter(targetId => getCharVal(ctx.G.v1.characters[targetId], 'paranoia') >= 1);
      if (targets.length === 0) return ok(false);

      return ok(true, '魔术师可将同区域带有不安的角色移动到相邻版图', true);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const magician = ctx.G.v1.characters[charId];
      if (!magician) return;

      const targets = allAliveAtLocation(ctx, magician.locationId)
        .filter(targetId => getCharVal(ctx.G.v1.characters[targetId], 'paranoia') >= 1);
      const targetId = ctx.selectedTargets?.target && targets.includes(ctx.selectedTargets.target)
        ? ctx.selectedTargets.target
        : targets[0];
      if (!targetId) return;

      const target = ctx.G.v1.characters[targetId];
      const neighbors = new Set<string>(getAdjacentLocations(target.locationId));
      const forbidden = new Set(CHARACTERS[targetId as keyof typeof CHARACTERS]?.forbiddenLocations || []);
      const destination = ctx.selectedTargets?.location;
      const chosen = destination && neighbors.has(destination) && !forbidden.has(destination)
        ? destination
        : Array.from(neighbors).find(locationId => !forbidden.has(locationId));
      if (!chosen) return;

      target.locationId = chosen;
      markLoopAbilityUsed(ctx, AHR_MAGICIAN_TELEPORT_USAGE_KEY);
      ctx.G.publicLog.push(`📍 ${cn(targetId)} 移动到 ${chosen}`);
      ctx.G.fullLog.push(`[身份能力] 魔术师 ${cn(charId)} 将 ${cn(targetId)} 移动到 ${chosen}`);
    },
  },
  { ruleId: 'ahr_magician_death_clear_unease', check() { return ok(false, '魔术师死亡清不安由 killCharacter 统一处理'); }, execute() {} },
  // 黑猫 — 不死（由 IMMORTAL_ROLES 统一处理）+ 移动反转（由 cardResolver applyEffects 处理）
  { ruleId: 'ahr_black_cat_undead', check() { return ok(false, '黑猫不死由 IMMORTAL_ROLES 列表统一处理'); }, execute() {} },
  { ruleId: 'ahr_black_cat_move', check() { return ok(false, '黑猫移动反转由 cardResolver applyEffects 处理'); }, execute() {} },
  // 吸血鬼 — 不死+无视友好 + 杀关键人物
  { ruleId: 'ahr_vampire_undead_and_ignore', check() { return ok(false, '吸血鬼不死+无视友好空壳'); }, execute() {} },
  {
    ruleId: 'ahr_vampire_kill_key_person',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const vampire = ctx.G.v1.characters[charId];
      if (!vampire || !vampire.alive) return ok(false);

      const colocated = charsAtSameLocation(ctx, charId);
      for (const cid of colocated) {
        const c = ctx.G.v1.characters[cid];
        const role = getEffectiveRoleId(ctx.G, cid);
        if (role === 'key_person' && c && getCharVal(c, 'intrigue') >= 2) {
          return ok(true, `吸血鬼可杀死关键人物 ${cid}（密谋≥2）`, true);
        }
      }
      return ok(false);
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      const colocated = charsAtSameLocation(ctx, charId);
      for (const cid of colocated) {
        const c = ctx.G.v1.characters[cid];
        const role = getEffectiveRoleId(ctx.G, cid);
        if (role === 'key_person' && c && getCharVal(c, 'intrigue') >= 2) {
          killCharacter(ctx, cid, ROLE_KILL_OPTIONS);
          ctx.G.fullLog.push(`[身份能力] 吸血鬼 ${cn(charId)} 杀死了关键人物 ${cn(cid)}`);
          break;
        }
      }
    },
  },
  // 幻影 — 不死 + 不安上限3
  { ruleId: 'ahr_illusion_undead', check() { return ok(false, '幻影不死需 hasImmortality 扩展，空壳'); }, execute() {} },
  {
    ruleId: 'ahr_illusion_unease_limit',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      const c = ctx.G.v1.characters[charId];
      if (!c || !c.alive) return ok(false);
      const paranoia = getCharVal(c, 'paranoia');
      return ok(
        paranoia >= 3,
        paranoia >= 3
          ? `幻影(${cn(charId)})不安=${paranoia}≥3，死亡`
          : `幻影(${cn(charId)})不安=${paranoia}<3`,
      );
    },
    execute(ctx) {
      const charId = ctx.characterId!;
      killCharacter(ctx, charId, ROLE_KILL_OPTIONS);
      ctx.G.fullLog.push(`[身份能力] 幻影 ${cn(charId)} 不安≥3，死亡`);
    },
  },

  // ── AHR goodwill_window 处理器（实际逻辑由 goodwillResolver.ts 统一执行）────
  // applyAhrMarionettePostGoodwill (goodwillResolver.ts:354): 友好结算后双标记类型 → 死亡+世界移动
  { ruleId: 'ahr_marionette_death_and_world_shift', check() { return ok(false, '提线木偶友好后死亡+世界移动由 goodwillResolver.applyAhrMarionettePostGoodwill 统一处理'); }, execute() {} },
  // applyAhrAlicePostGoodwill (goodwillResolver.ts:334): 友好结算后 Ex≥1 时同区角色+1[希望]（每轮限1次）
  { ruleId: 'ahr_alice_goodwill_hope', check() { return ok(false, '爱丽丝友好后同区+1希望由 goodwillResolver.applyAhrAlicePostGoodwill 统一处理'); }, execute() {} },
  // applyAhrLullabyPostGoodwill (goodwillResolver.ts:395): 友好结算后被指定对象死亡
  { ruleId: 'ahr_lullaby_kill_targets', check() { return ok(false, '童谣友好后指定对象死亡由 goodwillResolver.applyAhrLullabyPostGoodwill 统一处理'); }, execute() {} },
  // storyteller 已在 IMMORTAL_ROLES（roleProcessors.ts:162），此处仅注册 ruleId
  { ruleId: 'ahr_storyteller_undead', check() { return ok(false, '叙述者不死由 hasImmortality 统一处理（storyteller 在 IMMORTAL_ROLES）'); }, execute() {} },
];

roleProcessors.push(...ahrRoleStubs);

// ── LL 独有身份处理器（对齐 docs/模组/Last_Liar.md）─────────────────────────
const llRoleProcessors: RuleProcessor[] = [
  // ── 因果残片 (Causal Fragment) ─────────────────────────────────────────────
  // 【强制：轮回开始时】上轮死亡→剧作家绝望+1
  {
    ruleId: 'll_causal_fragment_death_despair',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      return ok(
        wasCharacterDeadLastLoop(ctx, charId),
        wasCharacterDeadLastLoop(ctx, charId)
          ? `因果残片 ${cn(charId)} 上轮死亡→剧作家获得绝望`
          : `因果残片 ${cn(charId)} 上轮未死亡`,
      );
    },
    execute(ctx) {
      addToken(ctx.G.v1.mastermind, 'despair', 1);
      ctx.G.fullLog.push(`[身份能力] 因果残片 ${ctx.characterId} 上轮死亡，剧作家获得 1 绝望`);
    },
  },
  // 【强制：轮回开始时】上轮存活且友好≥2→主人公希望+1
  {
    ruleId: 'll_causal_fragment_alive_hope',
    check(ctx) {
      const charId = ctx.characterId;
      if (!charId) return ok(false);
      if (wasCharacterDeadLastLoop(ctx, charId)) return ok(false, '上轮已死亡');
      const character = ctx.G.v1.characters[charId];
      if (!character) return ok(false);
      const goodwill = getEffectiveGoodwill(ctx.G.v1.characters[charId]);
      return ok(
        goodwill >= 2,
        goodwill >= 2
          ? `因果残片 ${cn(charId)} 上轮存活且友好=${goodwill}≥2→主人公希望+1`
          : `因果残片 ${cn(charId)} 友好=${goodwill}<2`,
      );
    },
    execute(ctx) {
      addToken(ctx.G.v1.protagonists, 'hope', 1);
      ctx.G.fullLog.push(`[身份能力] 因果残片 ${ctx.characterId} 上轮存活且友好≥2，主人公获得 1 希望`);
    },
  },

  // ── 监视者 (Watcher) ──────────────────────────────────────────────────────
  // 不死（需在 hasImmortality 中添加 'watcher'）
  // 【强制：事件阶段】同区域有绝望的角色必定触发事件
  // ✅ 监视者强制触发事件：已在 autoResolve.ts:L110-121 实现（hasWatcherForce 分支）
  { ruleId: 'll_watcher_forced_incident', check() { return ok(false, '监视者强制事件已在 autoResolve.ts:L110-121 实现'); }, execute() {} },

  // ── 网络名流 (Influencer) ─────────────────────────────────────────────────
  // ✅ 网络名流死亡效果：已在 killCharacter.ts:L189-202 实现
  { ruleId: 'll_influencer_death_unease', check() { return ok(false, '网络名流死亡效果已在 killCharacter 统一处理'); }, execute() {} },
  // ✅ 网络名流友好扩散：已在 goodwillResolver.ts applyInfluencerGoodwillSpread() 实现
  { ruleId: 'll_influencer_goodwill_spread', check() { return ok(false, '网络名流友好扩散已在 goodwillResolver 统一处理'); }, execute() {} },

  // ── 密钥 (Secret Key) ────────────────────────────────────────────────────
  // ✅ 密钥公开：死亡时由 killCharacter.ts:L204-210 实现，友好后由 goodwillResolver 统一处理
  { ruleId: 'll_secret_key_reveal', check() { return ok(false, '密钥公开已在 killCharacter 和 goodwillResolver 统一处理'); }, execute() {} },
  // ✅ 密钥早期惩罚：已在 killCharacter.ts triggerSecretKeyPenalty() 实现
  { ruleId: 'll_secret_key_early_reveal_penalty', check() { return ok(false, '密钥早期惩罚已在 triggerSecretKeyPenalty 统一处理'); }, execute() {} },

  // ── 怪杰 (Eccentric) ──────────────────────────────────────────────────────
  // 不死+必定无视友好（immortal+goodwillRefusal 已在 domain 层配置）
  // 【强制：常驻】天数为3的倍数→获得传谣人、主谋和杀人狂能力
  // ✅ 怪杰 Day3 能力注入：已在 plotProcessorCatalog.ts:L1778-1807 通过动态规则注入实现
  // 方式：day_start 时注入 ll_eccentric_as_rumormonger / ll_eccentric_as_conspiracy_theorist / ll_eccentric_as_serial_killer
  // 各自在对应时序阶段（mastermind_ability / day_end）独立触发，前端交互管线可正确处理
  { ruleId: 'll_eccentric_day3_abilities', check() { return ok(false, '怪杰Day3已在 plotProcessorCatalog 动态注入'); }, execute() {} },
  // 【强制：剧本制作时】必须成为某1个事件的当事人
  { ruleId: 'll_eccentric_must_be_culprit', check() { return ok(false, '剧本制作约束，无运行期效果'); }, execute() {} },
];
roleProcessors.push(...llRoleProcessors);
