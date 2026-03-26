/**
 * Transitional compatibility catalog for live plot processors.
 *
 * Plot ownership is moving toward manifest `plotIds` plus plot definitions.
 * Keep this catalog readable for runtime compatibility, but treat it as a
 * legacy assembly surface rather than the preferred place for new plot growth.
 */

import type { RuleProcessor, RuleContext, RuleCheckResult } from '../ruleEngine';
import { triggerImmediateLoss, triggerProtagonistDeath } from '../lossConditions';
import { addToken, getToken } from '../utils/tokenHelpers';
import { getCharVal } from '../utils/effectiveValues';
import { ensureExState } from './incidentEx';
import { getEffectiveRoleId } from './ahrEffectiveRoles';
import { buildIncidentInstanceKey } from '../scriptLoader';
import {
  countDistinctTokenTypes,
  findCharByRole,
  findCharByRoleIncludingOriginal,
  getInitialLocation,
  hasImmortality,
  isFrontWorld,
  isPresentAtLoopStart,
  killCharacter,
} from './shared';

function buildLlDetectiveVictoryProcessor(ruleId: string): RuleProcessor {
  return {
    ruleId,
    check(ctx: RuleContext): RuleCheckResult {
      const guesses = ctx.G.v1.detectiveGuesses;
      if (!guesses) return { triggered: false, needsInput: false, message: '名侦探C尚未提交猜测' };

      const scheduled = ctx.G.v1.scheduledIncidents || [];
      const culprits = ctx.G.v1.incidentCulprits as Record<string, string> || {};

      let allCorrect = true;
      let checked = 0;
      const occurrenceCountByIncident = new Map<string, number>();
      for (const inc of scheduled) {
        const occurrenceKey = `${inc.day}:${inc.incidentId}`;
        const occurrenceIndex = occurrenceCountByIncident.get(occurrenceKey) || 0;
        occurrenceCountByIncident.set(occurrenceKey, occurrenceIndex + 1);
        const key = buildIncidentInstanceKey(inc.day, inc.incidentId, occurrenceIndex);
        const actual = culprits[key];
        if (!actual) continue;
        checked++;
        if (guesses[key] !== actual) { allCorrect = false; break; }
      }

      const triggered = checked > 0 && allCorrect;
      return { triggered, needsInput: false, message: triggered ? '名侦探C猜测全部正确' : '名侦探C猜测有误' };
    },
    execute(ctx: RuleContext) {
      ctx.G.v1.winner = 'betrayer_C';
      ctx.G.publicLog.push('🔍 名侦探C 正确推理了所有当事人，背叛者C勝利！');
    },
  };
}

// ── FS 主 Plot: 复仇的火种 — loop_end 败北 ──────────────────────────────────
// 主谋起始区域 ≥2 密谋 → 败北

const lightOfTheAvengerLoss: RuleProcessor = {
  ruleId: 'light_of_the_avenger_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const brainCharId = findCharByRole(ctx.G, 'brain');
    if (!brainCharId) return { triggered: false, needsInput: false, message: '无主谋' };

    const startLoc = getInitialLocation(brainCharId);
    if (!startLoc) return { triggered: false, needsInput: false, message: '主谋无初始区域' };

    const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
    const triggered = locIntrigue >= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `主谋(${brainCharId})初始区域(${startLoc})密谋=${locIntrigue}≥2，败北`
        : `主谋初始区域密谋=${locIntrigue}<2`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 复仇的火种：主谋初始区域密谋≥2，主人公败北');
  },
};

// ── FS 主 Plot: 守护此地 — loop_end 败北 ─────────────────────────────────────
// 学校 ≥2 密谋 → 败北

const aPlaceToProtectLoss: RuleProcessor = {
  ruleId: 'a_place_to_protect_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const schoolIntrigue = getToken(ctx.G.v1.locations['school'], 'intrigue');
    const triggered = schoolIntrigue >= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `学校密谋=${schoolIntrigue}≥2，败北`
        : `学校密谋=${schoolIntrigue}<2`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 守护此地：学校密谋≥2，主人公败北');
  },
};

// ── BTX 主 Plot: 被封印的邪灵 — loop_end 败北 ───────────────────────────────
// 神社 ≥2 密谋 → 败北

const theSealedItemLoss: RuleProcessor = {
  ruleId: 'the_sealed_item_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const shrineIntrigue = getToken(ctx.G.v1.locations['shrine'], 'intrigue');
    const triggered = shrineIntrigue >= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `神社密谋=${shrineIntrigue}≥2，败北`
        : `神社密谋=${shrineIntrigue}<2`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 被封印的邪灵：神社密谋≥2，主人公败北');
  },
};

// ── BTX 主 Plot: 和我签约吧！ — loop_end 败北 ───────────────────────────────
// 关键人物 ≥2 密谋 → 败北

const signWithMeLoss: RuleProcessor = {
  ruleId: 'sign_with_me_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const kpCharId = findCharByRole(ctx.G, 'key_person');
    if (!kpCharId) return { triggered: false, needsInput: false, message: '无关键人物' };

    const kpIntrigue = getCharVal(ctx.G.v1.characters[kpCharId], 'intrigue');
    const triggered = kpIntrigue >= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `关键人物(${kpCharId})密谋=${kpIntrigue}≥2，败北`
        : `关键人物密谋=${kpIntrigue}<2`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 和我签约吧：关键人物密谋≥2，主人公败北');
  },
};

// ── BTX 主 Plot: 改变未来 — loop_end 败北 ────────────────────────────────────
// 本轮蝴蝶效应发生过 → 败北

const changeOfFutureLoss: RuleProcessor = {
  ruleId: 'change_of_future_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const triggered = ctx.G.v1.loopState?.butterflyEffectTriggered ?? false;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? '本轮蝴蝶效应已触发，败北'
        : '本轮无蝴蝶效应',
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 改变未来：本轮蝴蝶效应发生，主人公败北');
  },
};

// ── BTX 主 Plot: 巨大定时炸弹X — loop_end 败北 ──────────────────────────────
// 魔女初始区域 ≥2 密谋 → 败北

const giantTimeBombLoss: RuleProcessor = {
  ruleId: 'giant_time_bomb_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const witchCharId = findCharByRole(ctx.G, 'witch');
    if (!witchCharId) return { triggered: false, needsInput: false, message: '无魔女' };

    const startLoc = getInitialLocation(witchCharId);
    if (!startLoc) return { triggered: false, needsInput: false, message: '魔女无初始区域' };

    const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
    const triggered = locIntrigue >= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `魔女(${witchCharId})初始区域(${startLoc})密谋=${locIntrigue}≥2，败北`
        : `魔女初始区域密谋=${locIntrigue}<2`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 巨大定时炸弹X：魔女初始区域密谋≥2，主人公败北');
  },
};

// ── MC 副 Plot: 火药的味道 — loop_end 败北 ──────────────────────────────────
// 所有存活角色不安总数 ≥ 12 → 败北

const smellOfGunpowderLoss: RuleProcessor = {
  ruleId: 'smell_of_gunpowder_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    let totalParanoia = 0;
    for (const [_, c] of Object.entries(ctx.G.v1.characters)) {
      if (c.alive) {
        totalParanoia += getCharVal(c, 'paranoia');
      }
    }
    const triggered = totalParanoia >= 12;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `存活角色不安总和=${totalParanoia}≥12，主人公败北`
        : `存活角色不安总和=${totalParanoia}<12`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 火药的味道：存活角色不安总和≥12，主人公败北');
  },
};

// ── MC 主 Plot: 事件交织的罗网 — loop_end 败北 ────────────────────────────────
// Ex 槽 ≥ 3 → 败北

const spiderwebOfIncidentsLoss: RuleProcessor = {
  ruleId: 'spiderweb_of_incidents_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const ex = ensureExState(ctx.G);
    if (!ex.enabled) return { triggered: false, needsInput: false, message: 'Ex 未启用' };
    const triggered = ex.gauge >= 3;
    return {
      triggered,
      needsInput: false,
      message: triggered ? `Ex 槽=${ex.gauge}≥3，主人公败北` : `Ex 槽=${ex.gauge}<3`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 事件交织的罗网：Ex 槽≥3，主人公败北');
  },
};

// ── MC 主 Plot: 命悬一线的计划 — loop_end 败北 ────────────────────────────────
// Ex 槽 ≤ 1 → 败北

const planOnATightropeLoss: RuleProcessor = {
  ruleId: 'plan_on_a_tightrope_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const ex = ensureExState(ctx.G);
    if (!ex.enabled) return { triggered: false, needsInput: false, message: 'Ex 未启用' };
    const triggered = ex.gauge <= 1;
    return {
      triggered,
      needsInput: false,
      message: triggered ? `Ex 槽=${ex.gauge}≤1，主人公败北` : `Ex 槽=${ex.gauge}>1`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 命悬一线的计划：Ex 槽≤1，主人公败北');
  },
};

// ── MC 主 Plot: 黑暗学园 — loop_end 败北 ────────────────────────────────────
// 学校密谋 ≥ 当前轮回数-1（loopIndex 为 0 基）→ 败北

const darkSchoolLoss: RuleProcessor = {
  ruleId: 'dark_school_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const intrigue = getToken(ctx.G.v1.locations.school, 'intrigue');
    const threshold = Math.max(0, ctx.G.loopIndex ?? 0);
    const triggered = intrigue >= threshold;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `学校密谋=${intrigue}≥${threshold}，主人公败北`
        : `学校密谋=${intrigue}<${threshold}`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 黑暗学园：学校密谋达到本轮阈值，主人公败北');
  },
};

// ── MC 主 Plot: 士的宁毒液 — incident_resolve 常驻 ─────────────────────────
// 实际触发判定在 autoResolve/getIncidentTriggerStatus 内处理，这里仅注册 ruleId。

const strychnineTinctureIntrigueIsUnease: RuleProcessor = {
  ruleId: 'strychnine_tincture_intrigue_is_unease',
  check(): RuleCheckResult {
    return {
      triggered: false,
      needsInput: false,
      message: '连续杀人与自杀的判定值由运行时统一换算',
    };
  },
  execute(): void {},
};

// ── MC 副 Plot: 隔离病房惊魂记 — loop_start ───────────────────────────────────
// 上轮结束 Ex 槽 ≤ 2 → 本轮 Ex 槽 +1

const panicInWardLoopStart: RuleProcessor = {
  ruleId: 'panic_in_ward_loop_start',
  check(ctx: RuleContext): RuleCheckResult {
    if ((ctx.G.loopIndex ?? 0) <= 0) {
      return { triggered: false, needsInput: false, message: '首轮轮回没有上轮 Ex 记录' };
    }
    const ex = ensureExState(ctx.G);
    if (!ex.enabled) return { triggered: false, needsInput: false, message: 'Ex 未启用' };
    const triggered = ex.lastLoopEndGauge <= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `上轮 Ex 槽=${ex.lastLoopEndGauge}≤2，本轮 Ex +1`
        : `上轮 Ex 槽=${ex.lastLoopEndGauge}>2`,
    };
  },
  execute(ctx: RuleContext): void {
    const ex = ensureExState(ctx.G);
    if (!ex.enabled) return;
    ex.gauge = Math.max(0, ex.gauge + 1);
    ex.changedThisLoop = true;
    ctx.G.publicLog.push('⚙️ 隔离病房惊魂记：Ex 槽 +1');
    ctx.G.fullLog.push(`🔧 [loop_start] panic_in_ward_loop_start: Ex 槽变为 ${ex.gauge}`);
  },
};

// ── BTX 副 Plot: 因果线 — loop_start ─────────────────────────────────────────
// 上轮结束时有友好的角色 → 获 2 不安

const threadsOfFateLoopStart: RuleProcessor = {
  ruleId: 'threads_of_fate_loop_start_rule',
  check(ctx: RuleContext): RuleCheckResult {
    const chars = ctx.G.v1.loopState?.lastLoopGoodwillChars ?? [];
    const triggered = chars.length > 0;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `${chars.length} 个角色上轮有友好，获 2 不安`
        : '上轮无角色有友好',
    };
  },
  execute(ctx: RuleContext): void {
    const chars = ctx.G.v1.loopState?.lastLoopGoodwillChars ?? [];
    for (const charId of chars) {
      // FAQ: "角色"指轮回开始时仍在场的存活角色；幻想保留到轮回开始前。
      if (isPresentAtLoopStart(ctx, charId)) {
        addToken(ctx.G.v1.characters[charId], 'paranoia', 2);
        ctx.G.publicLog.push(`📊 因果线：${charId} +2 不安（上轮有友好）`);
      }
    }
  },
};

const theLockedFutureFrontWorldLoss: RuleProcessor = {
  ruleId: 'ahr_the_locked_future_front_world_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const triggered = isFrontWorld(ctx);
    return {
      triggered,
      needsInput: false,
      message: triggered ? '轮回结束时仍为表世界，主人公败北' : '轮回结束时已在里世界',
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 闭锁的未来：轮回结束时仍处于表世界');
  },
};

const motherGooseMysteryCorpseLoss: RuleProcessor = {
  ruleId: 'ahr_mother_goose_mystery_corpse_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const corpseCount = Object.values(ctx.G.v1.characters).filter(character => !character.alive).length;
    const threshold = Math.min((ctx.G.loopIndex ?? 0) + 1, 3);
    const triggered = corpseCount >= threshold;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `尸体数=${corpseCount}≥${threshold}，主人公败北`
        : `尸体数=${corpseCount}<${threshold}`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 鹅妈妈神秘故事：轮回结束时尸体数达到阈值');
  },
};

const dimensionFusionLastWillOrLostItemLoss: RuleProcessor = {
  ruleId: 'ahr_dimension_fusion_last_will_or_lost_item_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const currentLoop = ctx.G.loopIndex ?? 0;
    const triggered = (ctx.G.v1.loopState?.incidentHistory || []).some(entry =>
      entry.loop === currentLoop && (entry.incidentId === 'last_will' || entry.incidentId === 'lost_item'),
    );
    return {
      triggered,
      needsInput: false,
      message: triggered ? '本轮发生过遗言或遗失物，主人公败北' : '本轮未发生遗言或遗失物',
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 次元融合计划：本轮发生过遗言或遗失物');
  },
};

const illusoryWorldObsessiveIntrigueLoss: RuleProcessor = {
  ruleId: 'ahr_illusory_world_obsessive_intrigue_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const obsessiveCharId = findCharByRoleIncludingOriginal(ctx.G, 'obsessive');
    if (!obsessiveCharId) {
      return {
        triggered: false,
        needsInput: false,
        message: '无强迫症',
      };
    }

    const obsessive = ctx.G.v1.characters[obsessiveCharId];
    if (!obsessive) {
      return {
        triggered: false,
        needsInput: false,
        message: '强迫症角色不存在',
      };
    }

    const ex = ensureExState(ctx.G);
    const total = getCharVal(obsessive, 'intrigue') + (ex.enabled ? ex.gauge : 0);
    const triggered = total >= 3;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `强迫症（或其尸体）密谋 + Ex = ${total} ≥ 3，主人公败北`
        : `强迫症（或其尸体）密谋 + Ex = ${total} < 3`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 虚幻世界：强迫症（或其尸体）密谋与 Ex 合计达到阈值');
  },
};

const beyondTheWorldLineLoopStartDespair: RuleProcessor = {
  ruleId: 'ahr_beyond_the_world_line_loop_start_despair',
  check(ctx: RuleContext): RuleCheckResult {
    const loopIndex = ctx.G.loopIndex ?? 0;
    // 规则书：偶数轮（第2、4、6轮…）触发。loopIndex 为 0 基，偶数轮 = (loopIndex+1) 为偶数
    const triggered = (loopIndex + 1) % 2 === 0;
    return {
      triggered,
      needsInput: false,
      message: triggered ? `第 ${loopIndex + 1} 轮为偶数轮起始，剧作家获得绝望` : '本轮开始时不触发绝望',
    };
  },
  execute(ctx: RuleContext): void {
    addToken(ctx.G.v1.mastermind, 'despair', 1);
    ctx.G.publicLog.push('🌘 超越世界线：绝望 +1');
    ctx.G.fullLog.push('🔧 [loop_start] 超越世界线：剧作家获得 1 绝望');
  },
};

const beyondTheWorldLineFinalLoopStartHope: RuleProcessor = {
  ruleId: 'ahr_beyond_the_world_line_final_loop_start_hope',
  check(ctx: RuleContext): RuleCheckResult {
    const maxLoops = ctx.G.maxLoops ?? 0;
    if (maxLoops <= 0) {
      return { triggered: false, needsInput: false, message: '未设置剧本轮回数' };
    }
    const triggered = (ctx.G.loopIndex ?? 0) >= maxLoops - 1;
    return {
      triggered,
      needsInput: false,
      message: triggered ? '最终轮开始，主人公获得希望' : '尚未到最终轮',
    };
  },
  execute(ctx: RuleContext): void {
    addToken(ctx.G.v1.protagonists, 'hope', 1);
    ctx.G.publicLog.push('✨ 超越世界线：主人公获得希望');
    ctx.G.fullLog.push('🔧 [loop_start] 超越世界线：最终轮开始，主人公获得 1 希望');
  },
};

const unspeakableMonsterDayEndLoss: RuleProcessor = {
  ruleId: 'ahr_unspeakable_monster_day_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const ex = ensureExState(ctx.G);
    const triggered = !!ex.enabled && ex.gauge >= 3;
    return {
      triggered,
      needsInput: false,
      message: triggered ? `Ex 槽=${ex.gauge}≥3，主人公死亡` : `Ex 槽=${ex.gauge}<3`,
    };
  },
  execute(ctx: RuleContext): void {
    triggerProtagonistDeath(ctx.G, '难以言喻的怪物：回合结束时 Ex 槽≥3');
    ctx.G.fullLog.push('🔧 [day_end] 难以言喻的怪物：Ex 槽达到 3，主人公死亡');
  },
};

const paranoiaVirusExpandedTransform: RuleProcessor = {
  ruleId: 'ahr_paranoia_virus_expanded_transform',
  check(ctx: RuleContext): RuleCheckResult {
    if (isFrontWorld(ctx)) {
      return {
        triggered: false,
        needsInput: false,
        message: '当前为表世界，不触发空想扩大病毒',
      };
    }

    const candidates: string[] = [];
    for (const [charId, char] of Object.entries(ctx.G.v1.characters)) {
      if (!char.alive) continue;
      const role = ctx.G.v1.hiddenRoles[charId];
      if (role && role !== 'person' && role !== 'fragment' && role !== 'serial_killer') continue;
      if (countDistinctTokenTypes(char) < 2) continue;

      const originalRole = ctx.G.v1.originalRoles?.[charId] || role || 'person';
      if (originalRole === 'person' || originalRole === 'fragment') {
        candidates.push(charId);
      }
    }

    return {
      triggered: candidates.length > 0,
      needsInput: false,
      message: candidates.length > 0
        ? `${candidates.join(',')} 在里世界中因 2+ 种指示物变为杀人狂`
        : '里世界中无平民/因果残片满足空想扩大病毒条件',
    };
  },
  execute(ctx: RuleContext): void {
    if (!ctx.G.v1.originalRoles) {
      ctx.G.v1.originalRoles = {};
    }

    const frontWorld = isFrontWorld(ctx);
    for (const [charId, char] of Object.entries(ctx.G.v1.characters)) {
      if (!char.alive) continue;

      const currentRole = ctx.G.v1.hiddenRoles[charId];
      const originalRole = ctx.G.v1.originalRoles[charId] || currentRole || 'person';
      const isEligibleBaseRole = originalRole === 'person' || originalRole === 'fragment';
      if (!isEligibleBaseRole) continue;

      if (!frontWorld && countDistinctTokenTypes(char) >= 2) {
        if (!ctx.G.v1.originalRoles[charId]) {
          ctx.G.v1.originalRoles[charId] = originalRole;
        }
        ctx.G.v1.hiddenRoles[charId] = 'serial_killer';
        ctx.G.fullLog.push(`🔄 空想扩大病毒：${charId} 在里世界中身份变为杀人狂`);
        continue;
      }

      if (currentRole === 'serial_killer') {
        if (originalRole === 'person') {
          ctx.G.v1.hiddenRoles[charId] = 'person';
        } else {
          ctx.G.v1.hiddenRoles[charId] = originalRole;
        }
        ctx.G.fullLog.push(`🔄 空想扩大病毒：${charId} 恢复为 ${originalRole}`);
      }
    }
  },
};

// ── BTX 副 Plot: 妄想扩大病毒 — always（day_end 检查） ───────────────────────
// 平民（无身份）≥3 不安 → 身份变杀人狂

const paranoiaVirusRule: RuleProcessor = {
  ruleId: 'paranoia_virus_rule',
  check(ctx: RuleContext): RuleCheckResult {
    // 找所有无身份（路人）且不安≥3的角色
    const candidates: string[] = [];
    for (const [charId, char] of Object.entries(ctx.G.v1.characters)) {
      const role = ctx.G.v1.hiddenRoles[charId];
      if ((!role || role === 'person') && getCharVal(char, 'paranoia') >= 3 && char.alive) {
        candidates.push(charId);
      }
    }
    return {
      triggered: candidates.length > 0,
      needsInput: false,
      message: candidates.length > 0
        ? `${candidates.join(',')} 不安≥3，变为杀人狂`
        : '无平民不安≥3',
    };
  },
  execute(ctx: RuleContext): void {
    for (const [charId, char] of Object.entries(ctx.G.v1.characters)) {
      const role = ctx.G.v1.hiddenRoles[charId];
      // FAQ: 不安降到3以下 → 变回平民（仅限由本规则变成的杀人狂）
      if (role === 'serial_killer' && getCharVal(char, 'paranoia') < 3
          && char.alive && ctx.G.v1.originalRoles?.[charId] === 'person') {
        ctx.G.v1.hiddenRoles[charId] = 'person';
        ctx.G.fullLog.push(`🔄 妄想扩大病毒：${charId} 不安<3，还原为平民`);
      }
      // 平民不安≥3 → 变为杀人狂
      if ((!role || role === 'person') && getCharVal(char, 'paranoia') >= 3 && char.alive) {
        // 记录原始身份以便还原
        if (!ctx.G.v1.originalRoles) ctx.G.v1.originalRoles = {};
        if (!ctx.G.v1.originalRoles[charId]) {
          ctx.G.v1.originalRoles[charId] = 'person';
        }
        ctx.G.v1.hiddenRoles[charId] = 'serial_killer';
        ctx.G.fullLog.push(`🔄 妄想扩大病毒：${charId} 不安≥3，身份变为杀人狂`);
      }
    }
  },
};

// ── 流言四起 — mastermind_ability（需要剧作家选目标） ──────────────────────────
// 往任意版图放 1 密谋（每轮 1 次）
// needsInput=true → 自动结算跳过，沙盒模式由手动操作

const unsettlingRumorFS: RuleProcessor = {
  ruleId: 'an_unsettling_rumor_once_per_loop',
  check(ctx: RuleContext): RuleCheckResult {
    const used = ctx.G.v1.loopState?.abilityUsage?.['an_unsettling_rumor_once_per_loop']?.usedThisLoop ?? false;
    return {
      triggered: !used,
      needsInput: true,
      message: used ? '本轮已使用' : '流言四起：可在任意版图放 1 密谋',
    };
  },
  execute(ctx: RuleContext): void {
    // 实际执行需剧作家选目标版图，此处仅标记已使用
    if (!ctx.G.v1.loopState.abilityUsage['an_unsettling_rumor_once_per_loop']) {
      ctx.G.v1.loopState.abilityUsage['an_unsettling_rumor_once_per_loop'] = {
        usedToday: true,
        usedThisLoop: true,
      };
    } else {
      ctx.G.v1.loopState.abilityUsage['an_unsettling_rumor_once_per_loop'].usedThisLoop = true;
    }
  },
};

const unsettlingRumorBTX: RuleProcessor = {
  ruleId: 'btx_unsettling_rumor_once_per_loop',
  check: unsettlingRumorFS.check,
  execute: unsettlingRumorFS.execute,
};

// ── HSA Plot 空壳处理器 ─────────────────────────────────────────────────────
// 这些规则或为剧本制作约束（无运行时效果）、或需要专项建模（诅咒牌/群众事件/
// 尸体变丧尸等），先注册空壳以通过可玩性检查。

const hsaPlotStubs: RuleProcessor[] = [
  // 高贵的血族：吸血鬼与关键人物必须互为异性（剧本制作约束）
  {
    ruleId: 'noble_bloodline_heterosexual',
    check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; },
    execute() {},
  },
  // ── 牺牲者：版图密谋视作平民尸体（timing: always 被动效果）──────────────────
  // 影响群众事件触发（尸体数统计）、丧尸/吸血鬼能力中的尸体判定
  {
    ruleId: 'the_sacrifices_intrigue_is_corpse',
    check(ctx) {
      // 统计全场版图密谋总数
      let totalIntrigue = 0;
      for (const loc of Object.values(ctx.G.v1.locations)) {
        totalIntrigue += getToken(loc, 'intrigue');
      }
      return {
        triggered: true,
        needsInput: false,
        message: totalIntrigue > 0
          ? `牺牲者：${totalIntrigue} 枚版图密谋视作平民尸体`
          : '牺牲者：暂无版图密谋',
      };
    },
    execute() {
      // 被动效果 — 不需要主动执行，由 getEffectiveCorpseCount 辅助函数在统计时注入
    },
  },
  // ── 古墓活尸：平民/胆小鬼/纸老虎的尸体身份变为丧尸 ──────────────────────────
  {
    ruleId: 'living_corpses_in_the_tomb_zombies',
    check(ctx) {
      const ZOMBIE_ELIGIBLE_ROLES = ['person', 'coward', 'paper_tiger'];
      const candidates = Object.entries(ctx.G.v1.characters)
        .filter(([charId, c]) => {
          if (c.alive) return false;
          const role = getEffectiveRoleId(ctx.G, charId);
          return !!role && ZOMBIE_ELIGIBLE_ROLES.includes(role);
        });
      return {
        triggered: candidates.length > 0,
        needsInput: false,
        message: candidates.length > 0
          ? `古墓活尸：${candidates.length} 具尸体可变丧尸`
          : '无可转变尸体',
      };
    },
    execute(ctx) {
      const ZOMBIE_ELIGIBLE_ROLES = ['person', 'coward', 'paper_tiger'];
      for (const [charId, c] of Object.entries(ctx.G.v1.characters)) {
        if (c.alive) continue;
        const role = getEffectiveRoleId(ctx.G, charId);
        if (!role || !ZOMBIE_ELIGIBLE_ROLES.includes(role)) continue;
        // 保存原始身份
        if (!ctx.G.v1.originalRoles) ctx.G.v1.originalRoles = {};
        if (!ctx.G.v1.originalRoles[charId]) {
          ctx.G.v1.originalRoles[charId] = ctx.G.v1.hiddenRoles?.[charId] || role;
        }
        if (ctx.G.v1.hiddenRoles) ctx.G.v1.hiddenRoles[charId] = 'zombie';
        ctx.G.fullLog.push(`🧟 古墓活尸：${charId}（${role}）尸体变为丧尸`);
      }
    },
  },
  // ── 被诅咒的土地：轮回开始放诅咒牌到鬼魂初始区域 ────────────────────────────
  {
    ruleId: 'cursed_land_start',
    check(ctx) {
      const ghostId = findCharByRole(ctx.G, 'ghost');
      if (!ghostId) return { triggered: false, needsInput: false, message: '无鬼魂角色' };
      const loc = getInitialLocation(ghostId);
      if (!loc) return { triggered: false, needsInput: false, message: '鬼魂无初始区域' };
      return { triggered: true, needsInput: false, message: `被诅咒的土地：往 ${loc} 放 1 张诅咒牌` };
    },
    execute(ctx) {
      const ghostId = findCharByRole(ctx.G, 'ghost');
      if (!ghostId) return;
      const loc = getInitialLocation(ghostId);
      if (!loc || !ctx.G.v1.locations[loc]) return;
      const locState = ctx.G.v1.locations[loc];
      locState.exCardCount = (locState.exCardCount ?? 0) + 1;
      ctx.G.fullLog.push(`[阴谋] 被诅咒的土地：鬼魂初始区域 ${loc} +1 诅咒牌`);
    },
  },
  // ── 被诅咒的土地：回合结束阶段结算诅咒牌，无目标→主人公死亡 ──────────────────
  // FAQ: ①版图上诅咒→分配给同区角色 ②角色上诅咒→杀害→移回版图 ③尸体上诅咒→移到版图
  // FAQ: 诅咒牌结算在回合结束最先执行
  {
    ruleId: 'cursed_land_loss',
    check(ctx) {
      // 检查是否有任何诅咒牌存在
      let totalCurse = 0;
      for (const loc of Object.values(ctx.G.v1.locations)) {
        totalCurse += loc.exCardCount ?? 0;
      }
      for (const c of Object.values(ctx.G.v1.characters)) {
        totalCurse += c.exCardCount ?? 0;
      }
      if (totalCurse === 0) return { triggered: false, needsInput: false, message: '无诅咒牌' };
      return { triggered: true, needsInput: true, message: `诅咒牌结算：场上共 ${totalCurse} 张诅咒牌` };
    },
    execute(ctx) {
      const { characters, locations } = ctx.G.v1;
      let protagonistDied = false;

      // Step 1: 尸体上的诅咒牌移到版图
      for (const [charId, c] of Object.entries(characters)) {
        if (!c.alive && (c.exCardCount ?? 0) > 0) {
          const locState = locations[c.locationId];
          if (locState) {
            locState.exCardCount = (locState.exCardCount ?? 0) + c.exCardCount!;
          }
          ctx.G.fullLog.push(`[诅咒] ${charId} 尸体上 ${c.exCardCount} 张诅咒牌移至版图 ${c.locationId}`);
          c.exCardCount = 0;
        }
      }

      // Step 2: 版图上的诅咒牌分配给同区活角色
      for (const [locId, loc] of Object.entries(locations)) {
        const curseCount = loc.exCardCount ?? 0;
        if (curseCount <= 0) continue;

        const aliveHere = Object.entries(characters)
          .filter(([_, c]) => c.locationId === locId && c.alive)
          .map(([id]) => id);

        if (aliveHere.length === 0) {
          // 无目标→主人公死亡
          protagonistDied = true;
          ctx.G.fullLog.push(`[诅咒] ${locId} 有 ${curseCount} 张诅咒牌但无目标角色→主人公死亡`);
          continue;
        }

        // 分配诅咒牌给同区角色（沙盒模式：均匀分配）
        let remaining = curseCount;
        let idx = 0;
        while (remaining > 0) {
          const targetId = aliveHere[idx % aliveHere.length];
          characters[targetId].exCardCount = (characters[targetId].exCardCount ?? 0) + 1;
          remaining--;
          idx++;
        }
        loc.exCardCount = 0;
        ctx.G.fullLog.push(`[诅咒] ${locId} 的 ${curseCount} 张诅咒牌分配给 ${aliveHere.length} 名角色`);
      }

      // Step 3: 角色上的诅咒牌→尝试杀害→移回版图
      for (const [charId, c] of Object.entries(characters)) {
        if (!c.alive) continue;
        const curseOnChar = c.exCardCount ?? 0;
        if (curseOnChar <= 0) continue;

        // 尝试杀害角色 — 使用共享 hasImmortality/killCharacter 保持死亡联动一致性
        if (!hasImmortality(ctx, charId)) {
          killCharacter(ctx, charId, { applyDeathLink: true });
          ctx.G.fullLog.push(`[诅咒] ${charId} 被 ${curseOnChar} 张诅咒牌杀害`);
        } else {
          ctx.G.fullLog.push(`[诅咒] ${charId} 因不死特性免疫诅咒杀害`);
        }

        // 诅咒牌移回版图（无论是否被杀害）
        const locState = locations[c.locationId];
        if (locState) {
          locState.exCardCount = (locState.exCardCount ?? 0) + curseOnChar;
        }
        c.exCardCount = 0;
        ctx.G.fullLog.push(`[诅咒] ${charId} 上的 ${curseOnChar} 张诅咒牌移回版图 ${c.locationId}`);
      }

      if (protagonistDied) {
        ctx.G.v1.loopLost = true;
        ctx.G.publicLog.push('💀 诅咒牌无目标角色可放置→主人公死亡');
      }
    },
  },
  // 群众事件：元规则（当前通过事件处理器隐式支持）
  {
    ruleId: 'crowd_incident_rules',
    check() { return { triggered: false, needsInput: false, message: '群众事件元规则，空壳注册' }; },
    execute() {},
  },
  // ── 怪物们的阴谋：往无视友好角色所在版图放密谋（每日1次/每轮2次） ────────────
  {
    ruleId: 'conspiracy_of_monsters_intrigue',
    check(ctx) {
      const usageKey = '__conspiracy_of_monsters_intrigue';
      const usage = ctx.G.v1.loopState?.abilityUsage?.[usageKey];
      if (usage?.usedToday) {
        return { triggered: false, needsInput: false, message: '怪物阴谋：今日已使用' };
      }
      const loopCount = (usage as any)?.loopUsageCount ?? 0;
      if (loopCount >= 2) {
        return { triggered: false, needsInput: false, message: '怪物阴谋：本轮已使用 2 次' };
      }
      // 找到有无视友好特性的角色
      const refusalChars = Object.entries(ctx.G.v1.characters)
        .filter(([charId, c]) => {
          if (!c.alive) return false;
          const role = getEffectiveRoleId(ctx.G, charId);
          if (!role) return false;
          // 无视友好角色：goodwillRefusal 为 'mandatory' 的角色
          // 纸老虎不安≥2 也会获得必定无视友好（由后续 Phase 3 处理）
          return role === 'witch' || role === 'werewolf' || role === 'nightmare' || role === 'vampire';
        });
      if (refusalChars.length === 0) {
        return { triggered: false, needsInput: false, message: '怪物阴谋：无无视友好角色' };
      }
      return { triggered: true, needsInput: true, message: '怪物阴谋：可放 1 密谋至无视友好角色所在版图' };
    },
    execute(ctx) {
      const usageKey = '__conspiracy_of_monsters_intrigue';
      // 找到无视友好角色的所在版图
      const refusalChars = Object.entries(ctx.G.v1.characters)
        .filter(([charId, c]) => {
          if (!c.alive) return false;
          const role = getEffectiveRoleId(ctx.G, charId);
          if (!role) return false;
          return role === 'witch' || role === 'werewolf' || role === 'nightmare' || role === 'vampire';
        });
      if (refusalChars.length === 0) return;
      const targetChar = ctx.selectedTargets?.target && refusalChars.some(([id]) => id === ctx.selectedTargets!.target)
        ? ctx.selectedTargets.target
        : refusalChars[0][0];
      const targetLoc = ctx.G.v1.characters[targetChar]?.locationId;
      if (!targetLoc) return;
      const loc = ctx.G.v1.locations[targetLoc];
      if (loc) {
        addToken(loc, 'intrigue', 1);
      }
      // 追踪使用次数
      if (!ctx.G.v1.loopState.abilityUsage) ctx.G.v1.loopState.abilityUsage = {};
      if (!ctx.G.v1.loopState.abilityUsage[usageKey]) {
        ctx.G.v1.loopState.abilityUsage[usageKey] = { usedToday: true, usedThisLoop: false };
      } else {
        ctx.G.v1.loopState.abilityUsage[usageKey].usedToday = true;
      }
      const usage = ctx.G.v1.loopState.abilityUsage[usageKey] as any;
      usage.loopUsageCount = (usage.loopUsageCount ?? 0) + 1;
      if (usage.loopUsageCount >= 2) {
        usage.usedThisLoop = true;
      }
      ctx.G.publicLog.push(`🔮 ${targetLoc} +1 密谋`);
      ctx.G.fullLog.push(`[阴谋能力] 怪物阴谋：${targetLoc} +1 密谋（轮使用 ${usage.loopUsageCount}/2）`);
    },
  },
  // ── 魔女遗咒：轮回开始放诅咒牌到魔女初始区域 ──────────────────────────────
  {
    ruleId: 'witches_curse_place_curse',
    check(ctx) {
      const witchId = findCharByRole(ctx.G, 'witch');
      if (!witchId) return { triggered: false, needsInput: false, message: '无魔女角色' };
      const loc = getInitialLocation(witchId);
      if (!loc) return { triggered: false, needsInput: false, message: '魔女无初始区域' };
      return { triggered: true, needsInput: false, message: `魔女遗咒：往 ${loc} 放 1 张诅咒牌` };
    },
    execute(ctx) {
      const witchId = findCharByRole(ctx.G, 'witch');
      if (!witchId) return;
      const loc = getInitialLocation(witchId);
      if (!loc || !ctx.G.v1.locations[loc]) return;
      const locState = ctx.G.v1.locations[loc];
      locState.exCardCount = (locState.exCardCount ?? 0) + 1;
      ctx.G.fullLog.push(`[阴谋] 魔女遗咒：魔女初始区域 ${loc} +1 诅咒牌`);
    },
  },
  // 少女大危机：关键人物必须有少女属性（剧本制作约束）
  {
    ruleId: 'crisis_of_the_girl_rule',
    check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; },
    execute() {},
  },
];

// ── AHR 阴谋空壳处理器 ──────────────────────────────────────────────
// 这些阴谋有独特的败北/效果语义，先注册空壳通过可玩性门禁
const ahrPlotStubs: RuleProcessor[] = [
  // 终末之虚线：AI 死亡→败北
  { ruleId: 'ahr_thread_of_the_end_day_end_loss',
    check(ctx) {
      const aiCharId = findCharByRole(ctx.G, 'ai');
      if (!aiCharId) return { triggered: false, needsInput: false, message: '无 AI' };
      const ai = ctx.G.v1.characters[aiCharId];
      const triggered = !!ai && !ai.alive;
      return {
        triggered,
        needsInput: false,
        message: triggered ? `AI(${aiCharId}) 已死亡，主人公败北` : 'AI 仍存活',
      };
    },
    execute(ctx) {
      ctx.G.v1.loopLost = true;
      ctx.G.fullLog.push('⛔ 终末之虚线：AI 已死亡，主人公败北');
    },
  },
  // 漫长之夜：第4轮不可被生成器选出（剧本制作约束）
  { ruleId: 'ahr_a_long_night_generation_rule',
    check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; },
    execute() {},
  },
  // 里世界：剧本制作约束
  { ruleId: 'ahr_hidden_world_setup',
    check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; },
    execute() {},
  },
  // 暗黑学园：学校密谋≥(轮回数-1)→败北
  { ruleId: 'ahr_black_school_loop_end_loss',
    check(ctx) {
      const threshold = Math.max(0, ctx.G.loopIndex ?? 0);
      const schoolIntrigue = getToken(ctx.G.v1.locations.school, 'intrigue');
      const triggered = schoolIntrigue >= threshold;
      return {
        triggered,
        needsInput: false,
        message: triggered
          ? `学校密谋=${schoolIntrigue}≥${threshold}，主人公败北`
          : `学校密谋=${schoolIntrigue}<${threshold}`,
      };
    },
    execute(ctx) {
      ctx.G.v1.loopLost = true;
      ctx.G.fullLog.push('⛔ 暗黑学园：学校密谋达到当前轮回阈值，主人公败北');
    },
  },
  // 轮回的惨剧：连续杀人/猎奇杀人死亡→败北
  { ruleId: 'ahr_tragedy_of_reincarnation_loop_end_loss',
    check(ctx) {
      const triggered = !!ctx.G.v1.loopState?.abilityUsage?.__ahr_tragedy_of_reincarnation_death?.usedThisLoop;
      return {
        triggered,
        needsInput: false,
        message: triggered ? '本轮已有非幻影角色因连续杀人/猎奇杀人死亡，主人公败北' : '本轮未记录轮回惨剧死亡',
      };
    },
    execute(ctx) {
      ctx.G.v1.loopLost = true;
      ctx.G.fullLog.push('⛔ 轮回的惨剧：本轮已有非幻影角色因连续杀人或猎奇杀人死亡');
    },
  },
  // 机器之心：不可触者强制结算系统错误
  { ruleId: 'ahr_machine_heart_event',
    check(ctx) {
      const culpritId = ctx.incident?.culpritId;
      if (ctx.incident?.incidentId !== 'system_error' || !culpritId) {
        return { triggered: false, needsInput: false, message: '当前不是系统错误' };
      }
      const culprit = ctx.G.v1.characters[culpritId];
      const isUntouchable = ctx.G.v1.hiddenRoles?.[culpritId] === 'untouchable';
      return {
        triggered: !!culprit && culprit.alive && isUntouchable,
        needsInput: false,
        message: isUntouchable ? '机器之心：不可触者强制结算系统错误' : '当事人不是不可触者',
      };
    },
    execute(ctx) {
      const culpritId = ctx.incident?.culpritId;
      if (!culpritId) return;
      const culprit = ctx.G.v1.characters[culpritId];
      if (!culprit || !culprit.alive) return;
      culprit.alive = false;
      ctx.G.publicLog.push('💥 机器之心：系统错误被强制结算');
      ctx.G.fullLog.push(`[阴谋] 机器之心：不可触者 ${culpritId} 被系统错误强制杀死`);
    },
  },
  // AHR 前缀别名：复用已有 signWithMeLoss / changeOfFutureLoss 处理器
  { ruleId: 'ahr_sign_with_me_loop_end_loss',
    check: signWithMeLoss.check,
    execute: signWithMeLoss.execute,
  },
  { ruleId: 'ahr_change_of_future_loop_end_loss',
    check: changeOfFutureLoss.check,
    execute: changeOfFutureLoss.execute,
  },
];

// ── MZ 阴谋处理器 ──────────────────────────────────────────────────

// 被封印的邪灵 MZ 版：复用 FS/BTX 版（神社≥2密谋）
const theSealedItemMzLoss: RuleProcessor = {
  ruleId: 'the_sealed_item_mz_loop_end_loss',
  check: theSealedItemLoss.check,
  execute: theSealedItemLoss.execute,
};

// 绝密报告：轮回中公开过主谋/不安定因子/魔术师身份 → 败北
// 绝密报告：轮回中公开过主谋/不安定因子/魔术师身份 → 败北
// 使用已有的 loopState.revealedRoles (charId → roleId) 追踪已公开身份
const topSecretReportLoss: RuleProcessor = {
  ruleId: 'top_secret_report_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const revealedMap = ctx.G.v1.loopState?.revealedRoles ?? {};
    const forbidden = ['brain', 'factor', 'magician'];
    const revealedRoleNames = Object.values(revealedMap);
    const found = forbidden.filter(r => revealedRoleNames.includes(r));
    const triggered = found.length > 0;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `本轮公开过 [${found.join(',')}] 身份，主人公败北`
        : '本轮未公开过主谋/不安定因子/魔术师',
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 绝密报告：本轮公开过主谋/不安定因子/魔术师身份，主人公败北');
  },
};

// 男子汉的战争：剧本制作约束（忍者必须有男性属性）
const aMensBattleMaleRequirement: RuleProcessor = {
  ruleId: 'a_mans_battle_male_requirement',
  check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; },
  execute() {},
};

// 男子汉的战争：loop_end — 忍者或其尸体密谋≥2 → 败北
const aMensBattleLoss: RuleProcessor = {
  ruleId: 'a_mans_battle_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    // 忍者包括尸体，遍历所有角色找到 ninja 身份
    for (const [charId, _] of Object.entries(ctx.G.v1.characters)) {
      const role = getEffectiveRoleId(ctx.G, charId);
      if (role !== 'ninja') continue;
      const character = ctx.G.v1.characters[charId];
      const intrigue = getCharVal(character, 'intrigue');
      if (intrigue >= 2) {
        return {
          triggered: true,
          needsInput: false,
          message: `忍者(${charId}) 密谋=${intrigue}≥2，主人公败北`,
        };
      }
      return {
        triggered: false,
        needsInput: false,
        message: `忍者(${charId}) 密谋=${intrigue}<2`,
      };
    }
    return { triggered: false, needsInput: false, message: '无忍者' };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 男子汉的战争：忍者或其尸体密谋≥2，主人公败北');
  },
};

// 因果之绊：轮回开始时选择上轮死亡角色放 Ex 牌
const bondsOfKarmaLoopStart: RuleProcessor = {
  ruleId: 'bonds_of_karma_loop_start',
  check(ctx: RuleContext): RuleCheckResult {
    if ((ctx.G.loopIndex ?? 0) === 0) {
      return { triggered: false, needsInput: false, message: '因果之绊：第1轮无上轮死亡角色' };
    }
    // 不可与诸神之骰重复发动
    const usageKey = '__bonds_or_dice_ex_placed';
    if (ctx.G.v1.loopState?.abilityUsage?.[usageKey]?.usedThisLoop) {
      return { triggered: false, needsInput: false, message: '因果之绊：本轮已与诸神之骰互斥发动' };
    }
    const deadChars = ctx.G.v1.loopState?.lastLoopDeadCharacters ?? [];
    const eligible = deadChars.filter(id => {
      const c = ctx.G.v1.characters[id];
      return c && (c.exCardCount ?? 0) === 0;
    });
    return {
      triggered: eligible.length > 0,
      needsInput: eligible.length > 0,
      message: eligible.length > 0
        ? `因果之绊：可选上轮死亡角色 [${eligible.join(',')}] 放 Ex 牌`
        : '因果之绊：无合格的上轮死亡角色',
    };
  },
  execute(ctx: RuleContext) {
    const deadChars = ctx.G.v1.loopState?.lastLoopDeadCharacters ?? [];
    const eligible = deadChars.filter(id => {
      const c = ctx.G.v1.characters[id];
      return c && (c.exCardCount ?? 0) === 0;
    });
    if (eligible.length === 0) return;
    // 自动模式：选第一个合格角色
    const targetId = ctx.selectedTargets?.target || eligible[0];
    const char = ctx.G.v1.characters[targetId];
    if (!char) return;
    char.exCardCount = (char.exCardCount ?? 0) + 1;
    // 标记互斥
    if (!ctx.G.v1.loopState.abilityUsage) ctx.G.v1.loopState.abilityUsage = {};
    ctx.G.v1.loopState.abilityUsage['__bonds_or_dice_ex_placed'] = { usedToday: true, usedThisLoop: true };
    ctx.G.fullLog.push(`[因果之绊] ${targetId} 获得 Ex 牌`);
  },
};

// 因果之绊：有 Ex 牌的角色身份变为关键人物
const bondsOfKarmaExKeyPerson: RuleProcessor = {
  ruleId: 'bonds_of_karma_ex_key_person',
  check(ctx: RuleContext): RuleCheckResult {
    const targets = Object.entries(ctx.G.v1.characters).filter(
      ([id, c]) => (c.exCardCount ?? 0) > 0 && ctx.G.v1.hiddenRoles?.[id] !== 'key_person'
    );
    return {
      triggered: targets.length > 0,
      needsInput: false,
      message: targets.length > 0
        ? `因果之绊：${targets.map(([id]) => id).join(',')} 持有 Ex 牌，身份应变为关键人物`
        : '因果之绊：无角色持有 Ex 牌',
    };
  },
  execute(ctx: RuleContext) {
    for (const [id, c] of Object.entries(ctx.G.v1.characters)) {
      if ((c.exCardCount ?? 0) > 0 && ctx.G.v1.hiddenRoles?.[id] !== 'key_person') {
        // 保存原始身份
        if (!ctx.G.v1.originalRoles) ctx.G.v1.originalRoles = {};
        if (!ctx.G.v1.originalRoles[id]) {
          ctx.G.v1.originalRoles[id] = ctx.G.v1.hiddenRoles?.[id] || 'person';
        }
        ctx.G.v1.hiddenRoles[id] = 'key_person';
        ctx.G.fullLog.push(`[因果之绊] ${id} 身份变为关键人物（原: ${ctx.G.v1.originalRoles[id]}）`);
      }
    }
  },
};

// X异因子：往存活的不安定因子所在版图放置 1 密谋（每轮限 1 次）
const xFactorAnomalyIntrigue: RuleProcessor = {
  ruleId: 'x_factor_anomaly_intrigue',
  check(ctx: RuleContext): RuleCheckResult {
    const usageKey = 'x_factor_anomaly_intrigue';
    if (ctx.G.v1.loopState?.abilityUsage?.[usageKey]?.usedThisLoop) {
      return { triggered: false, needsInput: false, message: 'X异因子：本轮已使用' };
    }
    // 找存活的不安定因子
    const factorCharId = findCharByRole(ctx.G, 'factor');
    if (!factorCharId) return { triggered: false, needsInput: false, message: '无不安定因子' };
    const factor = ctx.G.v1.characters[factorCharId];
    if (!factor || !factor.alive) return { triggered: false, needsInput: false, message: '不安定因子已死亡' };
    return {
      triggered: true,
      needsInput: true,
      message: `X异因子：可在不安定因子(${factorCharId})所在版图(${factor.locationId})放置 1 密谋`,
    };
  },
  execute(ctx: RuleContext): void {
    const factorCharId = findCharByRole(ctx.G, 'factor');
    if (!factorCharId) return;
    const factor = ctx.G.v1.characters[factorCharId];
    if (!factor || !factor.alive) return;
    const locationId = factor.locationId;
    const location = ctx.G.v1.locations[locationId];
    if (location) {
      addToken(location, 'intrigue', 1);
    }
    // 标记本轮已使用
    const usageKey = 'x_factor_anomaly_intrigue';
    if (!ctx.G.v1.loopState.abilityUsage[usageKey]) {
      ctx.G.v1.loopState.abilityUsage[usageKey] = { usedToday: true, usedThisLoop: true };
    } else {
      ctx.G.v1.loopState.abilityUsage[usageKey].usedThisLoop = true;
    }
    ctx.G.fullLog.push(`[阴谋] X异因子：不安定因子(${factorCharId})所在版图(${locationId}) +1 密谋`);
  },
};

// 死亡真人秀：loop_end — 生存角色数量≤6 → 败北
const deathRealityShowLoss: RuleProcessor = {
  ruleId: 'death_reality_show_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const aliveCount = Object.values(ctx.G.v1.characters).filter(c => c.alive).length;
    const triggered = aliveCount <= 6;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `存活角色数=${aliveCount}≤6，主人公败北`
        : `存活角色数=${aliveCount}>6`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 死亡真人秀：存活角色数量≤6，主人公败北');
  },
};

// 心无灵犀：禁止友好同时具备禁止移动的效果
// 已在 phases.ts resolve_cards 阶段接线：检测 mastermind_forbid_goodwill 并注入合成禁止移动
const disconnectOfHeartsForbidMove: RuleProcessor = {
  ruleId: 'disconnect_of_hearts_forbid_move',
  check() { return { triggered: false, needsInput: false, message: '心无灵犀已在 phases.ts resolve_cards 接线' }; },
  execute() {},
};

// 灭亡讴歌：剧本制作约束（必须引入 1+ 自杀事件）
const songOfDestructionSuicideIncident: RuleProcessor = {
  ruleId: 'song_of_destruction_suicide_incident',
  check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; },
  execute() {},
};

// 灭亡讴歌：预言家存活时平民当事人不安限度-1
// 已在 runtime/incidents.ts getIncidentTriggerThreshold 中接线
const songOfDestructionProphetUneaseDown: RuleProcessor = {
  ruleId: 'song_of_destruction_prophet_unease_down',
  check() { return { triggered: false, needsInput: false, message: '灭亡讴歌已在 getIncidentTriggerThreshold 接线' }; },
  execute() {},
};

// 诸神之骰：轮回开始 Ex 牌放置（与因果之绊互斥）
const diceOfTheGodsLoopStart: RuleProcessor = {
  ruleId: 'dice_of_the_gods_loop_start',
  check(ctx: RuleContext): RuleCheckResult {
    if ((ctx.G.loopIndex ?? 0) === 0) {
      return { triggered: false, needsInput: false, message: '诸神之骰：第1轮无上轮死亡角色' };
    }
    const usageKey = '__bonds_or_dice_ex_placed';
    if (ctx.G.v1.loopState?.abilityUsage?.[usageKey]?.usedThisLoop) {
      return { triggered: false, needsInput: false, message: '诸神之骰：本轮已与因果之绊互斥发动' };
    }
    const deadChars = ctx.G.v1.loopState?.lastLoopDeadCharacters ?? [];
    const eligible = deadChars.filter(id => {
      const c = ctx.G.v1.characters[id];
      return c && (c.exCardCount ?? 0) === 0;
    });
    return {
      triggered: eligible.length > 0,
      needsInput: eligible.length > 0,
      message: eligible.length > 0
        ? `诸神之骰：可选上轮死亡角色 [${eligible.join(',')}] 放 Ex 牌`
        : '诸神之骰：无合格的上轮死亡角色',
    };
  },
  execute(ctx: RuleContext) {
    const deadChars = ctx.G.v1.loopState?.lastLoopDeadCharacters ?? [];
    const eligible = deadChars.filter(id => {
      const c = ctx.G.v1.characters[id];
      return c && (c.exCardCount ?? 0) === 0;
    });
    if (eligible.length === 0) return;
    const targetId = ctx.selectedTargets?.target || eligible[0];
    const char = ctx.G.v1.characters[targetId];
    if (!char) return;
    char.exCardCount = (char.exCardCount ?? 0) + 1;
    if (!ctx.G.v1.loopState.abilityUsage) ctx.G.v1.loopState.abilityUsage = {};
    ctx.G.v1.loopState.abilityUsage['__bonds_or_dice_ex_placed'] = { usedToday: true, usedThisLoop: true };
    ctx.G.fullLog.push(`[诸神之骰] ${targetId} 获得 Ex 牌`);
  },
};

const mzPlotStubs: RuleProcessor[] = [
  theSealedItemMzLoss,
  topSecretReportLoss,
  aMensBattleMaleRequirement,
  aMensBattleLoss,
  bondsOfKarmaLoopStart,
  bondsOfKarmaExKeyPerson,
  xFactorAnomalyIntrigue,
  deathRealityShowLoss,
  disconnectOfHeartsForbidMove,
  songOfDestructionSuicideIncident,
  songOfDestructionProphetUneaseDown,
  diceOfTheGodsLoopStart,
];

// ── WM 阴谋处理器（对齐 docs/模组/Weird_Mythology.md） ──────────────────────

// 规则Y1: 外神合唱曲 — 5名+生存角色均有密谋→败北
const wmChorusOfTheOuterGodsLoss: RuleProcessor = {
  ruleId: 'wm_chorus_of_the_outer_gods_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const aliveChars = Object.entries(ctx.G.v1.characters).filter(([_, c]) => c.alive);
    if (aliveChars.length < 5) {
      return { triggered: false, needsInput: false, message: `生存角色数=${aliveChars.length}<5` };
    }
    const allHaveIntrigue = aliveChars.every(([_, c]) => getCharVal(c, 'intrigue') >= 1);
    return {
      triggered: allHaveIntrigue,
      needsInput: false,
      message: allHaveIntrigue
        ? `${aliveChars.length}名生存角色均有密谋，败北`
        : '并非所有生存角色都有密谋',
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 外神合唱曲：5名+生存角色均有密谋，主人公败北');
  },
};

// 规则Y2: 达贡的福音书 — 神社密谋≥Ex值→败北
const wmGospelOfDagonLoss: RuleProcessor = {
  ruleId: 'wm_gospel_of_dagon_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const ex = ctx.G.v1.ex;
    const exValue = ex?.gauge ?? 0;
    if (exValue <= 0) {
      return { triggered: false, needsInput: false, message: 'Ex=0，不触发' };
    }
    const shrineIntrigue = getToken(ctx.G.v1.locations['shrine'], 'intrigue');
    const triggered = shrineIntrigue >= exValue;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `神社密谋=${shrineIntrigue}≥Ex=${exValue}，败北`
        : `神社密谋=${shrineIntrigue}<Ex=${exValue}`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 达贡的福音书：神社密谋≥Ex值，主人公败北');
  },
};

// 规则Y3: 黄衣之王 — 本轮Ex增加过→败北
const wmKingInYellowLoss: RuleProcessor = {
  ruleId: 'wm_king_in_yellow_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const ex = ctx.G.v1.ex;
    const triggered = !!ex?.changedThisLoop;
    return {
      triggered,
      needsInput: false,
      message: triggered ? '本轮Ex增加过，败北' : '本轮Ex未增加',
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 黄衣之王：本轮轮回中Ex槽增加过，主人公败北');
  },
};

// 规则Y4: 巨大定时炸弹Y — 魔女初始区域2+密谋→败北
const wmGiantTimeBombYLoss: RuleProcessor = {
  ruleId: 'wm_giant_time_bomb_y_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    // 找到魔女角色
    const witchCharId = findCharByRole(ctx.G, 'witch');
    if (!witchCharId) {
      return { triggered: false, needsInput: false, message: '无魔女' };
    }
    // 魔女的初始区域 — 使用共享 getInitialLocation
    const startLoc = getInitialLocation(witchCharId);
    if (!startLoc) {
      return { triggered: false, needsInput: false, message: '魔女无初始区域' };
    }
    const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
    const triggered = locIntrigue >= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `魔女初始区域(${startLoc})密谋=${locIntrigue}≥2，败北`
        : `魔女初始区域(${startLoc})密谋=${locIntrigue}<2`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 巨大定时炸弹Y：魔女初始区域密谋≥2，主人公败北');
  },
};

// 规则Y5: 染血的仪式 — 尸体数≥Ex值→败北
const wmBloodyRitualYLoss: RuleProcessor = {
  ruleId: 'wm_bloody_ritual_y_loop_end_loss',
  check(ctx: RuleContext): RuleCheckResult {
    const ex = ctx.G.v1.ex;
    const exValue = ex?.gauge ?? 0;
    if (exValue <= 0) {
      return { triggered: false, needsInput: false, message: 'Ex=0，不触发' };
    }
    const corpseCount = Object.values(ctx.G.v1.characters).filter(c => !c.alive).length;
    const triggered = corpseCount >= exValue;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? `尸体数=${corpseCount}≥Ex=${exValue}，败北`
        : `尸体数=${corpseCount}<Ex=${exValue}`,
    };
  },
  execute(ctx: RuleContext): void {
    ctx.G.v1.loopLost = true;
    ctx.G.fullLog.push('⛔ 染血的仪式：尸体数≥Ex值，主人公败北');
  },
};

// 规则X1: 流言四起 — 往任意版图放1密谋（每轮限1次）
const wmSpreadingRumorsIntrigue: RuleProcessor = {
  ruleId: 'wm_spreading_rumors_intrigue',
  check(ctx: RuleContext): RuleCheckResult {
    const used = ctx.G.v1.loopState?.abilityUsage?.['wm_spreading_rumors_intrigue']?.usedThisLoop ?? false;
    return {
      triggered: !used,
      needsInput: true,
      message: used ? '本轮已使用' : '流言四起：可在任意版图放 1 密谋',
    };
  },
  execute(ctx: RuleContext): void {
    if (!ctx.G.v1.loopState.abilityUsage['wm_spreading_rumors_intrigue']) {
      ctx.G.v1.loopState.abilityUsage['wm_spreading_rumors_intrigue'] = {
        usedToday: true,
        usedThisLoop: true,
      };
    } else {
      ctx.G.v1.loopState.abilityUsage['wm_spreading_rumors_intrigue'].usedThisLoop = true;
    }
  },
};

// 规则X5: 深渊之都的私语 — 偏执狂获得关键人物能力
const wmWhisperOfTheAbyssParanoiacAsKeyPerson: RuleProcessor = {
  ruleId: 'wm_whisper_of_the_abyss_paranoiac_as_key_person',
  check(ctx: RuleContext): RuleCheckResult {
    // 找 paranoiac
    for (const [charId, _] of Object.entries(ctx.G.v1.characters)) {
      const role = getEffectiveRoleId(ctx.G, charId);
      if (role !== 'paranoiac') continue;
      const c = ctx.G.v1.characters[charId];
      if (!c.alive) {
        return {
          triggered: true,
          needsInput: false,
          message: `偏执狂(${charId})已死亡，获得关键人物能力→败北`,
        };
      }
      return { triggered: false, needsInput: false, message: '偏执狂存活' };
    }
    return { triggered: false, needsInput: false, message: '无偏执狂' };
  },
  execute(ctx: RuleContext): void {
    // 偏执狂死亡 = 关键人物死亡 → 败北
    triggerImmediateLoss(ctx.G, '深渊之都的私语：偏执狂死亡（具有关键人物能力）');
  },
};

// 规则X7: 疯狂的真相 — Ex≥2时Y条件变更（空壳，需要剧本预设数据）
const wmTruthOfMadnessSwapY: RuleProcessor = {
  ruleId: 'wm_truth_of_madness_swap_y',
  check(ctx: RuleContext): RuleCheckResult {
    const ex = ctx.G.v1.ex;
    const triggered = !!ex?.enabled && (ex.gauge ?? 0) >= 2;
    return {
      triggered,
      needsInput: false,
      message: triggered
        ? '疯狂的真相：Ex≥2，Y条件变更（需剧本预设替代Y规则）'
        : `疯狂的真相：Ex=${ex?.gauge ?? 0}<2，不触发`,
    };
  },
  execute(ctx: RuleContext): void {
    // 实际变更需要剧本预设数据（alternateY），先记录日志
    ctx.G.fullLog.push('🔄 疯狂的真相：Ex≥2，规则Y失败条件已变更为替代规则');
  },
};

// 剧本制作约束空壳
const wmTruthOfMadnessInformerRequired: RuleProcessor = {
  ruleId: 'wm_truth_of_madness_informer_required',
  check() { return { triggered: false, needsInput: false, message: '剧本制作约束（情报商必须登场），无运行期效果' }; },
  execute() {},
};

const wmPlotProcessors: RuleProcessor[] = [
  wmChorusOfTheOuterGodsLoss,
  wmGospelOfDagonLoss,
  wmKingInYellowLoss,
  wmGiantTimeBombYLoss,
  wmBloodyRitualYLoss,
  wmSpreadingRumorsIntrigue,
  wmWhisperOfTheAbyssParanoiacAsKeyPerson,
  wmTruthOfMadnessSwapY,
  wmTruthOfMadnessInformerRequired,
];


// ── LL 阴谋处理器（对齐 docs/模组/Last_Liar.md）────────────────────────────

const llPlotProcessors: RuleProcessor[] = [
  // ── Y规则 ─────────────────────────────────────────────────────────────────
  // 最终计划：关键人物有希望→所有主人公不再是背叛者
  {
    ruleId: 'll_final_plan_hope_clears_traitor',
    check(ctx) {
      // 常驻检查：找到关键人物，检查希望
      const kpId = Object.entries(ctx.G.v1.hiddenRoles || {})
        .find(([_, role]) => role === 'key_person')?.[0];
      if (!kpId) return { triggered: false, needsInput: false, message: '无关键人物' };
      const kpChar = ctx.G.v1.characters[kpId];
      if (!kpChar) return { triggered: false, needsInput: false, message: '关键人物不在场' };
      const hope = getToken(kpChar, 'hope');
      return { triggered: hope >= 1, needsInput: false, message: hope >= 1
        ? `最终计划：关键人物 ${kpId} 有 ${hope} 希望，清除所有背叛者`
        : `最终计划：关键人物 ${kpId} 无希望` };
    },
    execute(ctx) {
      ctx.G.v1.betrayerVictoryConditions = undefined;
      ctx.G.publicLog.push('🕊️ 最终计划：关键人物有希望，所有主人公不再是背叛者');
      ctx.G.fullLog.push('[LL] 最终计划触发：清除 betrayerVictoryConditions');
    },
  },
  // ── X规则：背叛者胜利条件 ──────────────────────────────────────────────────
  // 真正的怪物（A）：总计放置5+已死亡标志 → 背叛者A胜利
  {
    ruleId: 'll_true_monster_victory',
    check(ctx) {
      if (ctx.timing !== 'day_end') return { triggered: false, needsInput: false, message: '' };
      if (!ctx.G.v1.betrayerVictoryConditions?.['A']) return { triggered: false, needsInput: false, message: '无背叛者A条件' };
      const count = ctx.G.v1.loopState.deathFlagCount || 0;
      return { triggered: count >= 5, needsInput: false, message: count >= 5
        ? `真正的怪物：已死亡标志=${count}≥5，背叛者A胜利`
        : `真正的怪物：已死亡标志=${count}<5` };
    },
    execute(ctx) {
      ctx.G.v1.winner = 'betrayer_A';
      ctx.G.publicLog.push('🏆 背叛者A（真正的怪物）达成胜利条件！');
      ctx.G.fullLog.push(`[LL] 背叛者A胜利：已死亡标志=${ctx.G.v1.loopState.deathFlagCount}`);
    },
  },
  // 神话收集者（B）：总计放置6+已沟通标志 → 背叛者B胜利
  {
    ruleId: 'll_myth_collector_victory',
    check(ctx) {
      // 主人公能力阶段后检查
      if (!ctx.G.v1.betrayerVictoryConditions?.['B']) return { triggered: false, needsInput: false, message: '无背叛者B条件' };
      const count = ctx.G.v1.loopState.communicationFlagCount || 0;
      return { triggered: count >= 6, needsInput: false, message: count >= 6
        ? `神话收集者：已沟通标志=${count}≥6，背叛者B胜利`
        : `神话收集者：已沟通标志=${count}<6` };
    },
    execute(ctx) {
      ctx.G.v1.winner = 'betrayer_B';
      ctx.G.publicLog.push('🏆 背叛者B（神话收集者）达成胜利条件！');
      ctx.G.fullLog.push(`[LL] 背叛者B胜利：已沟通标志=${ctx.G.v1.loopState.communicationFlagCount}`);
    },
  },
  // 我才是名侦探（C）：最终决战前正确推理所有事件当事人 → 背叛者C勝利
  buildLlDetectiveVictoryProcessor('ll_i_am_the_detective_victory'),
  buildLlDetectiveVictoryProcessor('ll_i_am_the_detective_traitor_c_win'),

  // 封印的终末：神社2+密谋→主人公死亡（day_end）
  {
    ruleId: 'll_sealed_end_shrine_kill',
    check(ctx: RuleContext): RuleCheckResult {
      const shrineIntrigue = getToken(ctx.G.v1.locations['shrine'], 'intrigue');
      const triggered = shrineIntrigue >= 2;
      return {
        triggered,
        needsInput: false,
        message: triggered
          ? `封印的终末：神社密谋=${shrineIntrigue}≥2，主人公死亡`
          : `封印的终末：神社密谋=${shrineIntrigue}<2`,
      };
    },
    execute(ctx: RuleContext): void {
      triggerProtagonistDeath(ctx.G, '封印的终末：神社密谋≥2');
      ctx.G.fullLog.push('⛔ 封印的终末：神社密谋≥2，主人公死亡');
    },
  },
  // 封印的终末：密谋计算时希望/绝望也计入
  { ruleId: 'll_sealed_end_intrigue_count', check() { return { triggered: false, needsInput: false, message: '封印的终末密谋计算变体需接线判定逻辑' }; }, execute() {} },

  // 叛逆的世界：剧本制作约束（关键人物和因果残片必须有少女属性）
  { ruleId: 'll_rebellious_world_girl_requirement', check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; }, execute() {} },
  // 叛逆的世界：轮回结束时关键人物有2+密谋→败北
  {
    ruleId: 'll_rebellious_world_loop_end_loss',
    check(ctx: RuleContext): RuleCheckResult {
      const kpCharId = findCharByRole(ctx.G, 'key_person');
      if (!kpCharId) return { triggered: false, needsInput: false, message: '无关键人物' };
      const kpIntrigue = getCharVal(ctx.G.v1.characters[kpCharId], 'intrigue');
      const triggered = kpIntrigue >= 2;
      return {
        triggered,
        needsInput: false,
        message: triggered
          ? `叛逆的世界：关键人物(${kpCharId})密谋=${kpIntrigue}≥2，败北`
          : `关键人物密谋=${kpIntrigue}<2`,
      };
    },
    execute(ctx: RuleContext): void {
      ctx.G.v1.loopLost = true;
      ctx.G.fullLog.push('⛔ 叛逆的世界：关键人物密谋≥2，主人公败北');
    },
  },

  // 恶魔的剧本：轮回结束时引发过遗言/代行者→败北
  {
    ruleId: 'll_devils_script_loop_end_loss',
    check(ctx: RuleContext): RuleCheckResult {
      const currentLoop = ctx.G.loopIndex ?? 0;
      const triggered = (ctx.G.v1.loopState?.incidentHistory || []).some(entry =>
        entry.loop === currentLoop && (entry.incidentId === 'last_will' || entry.incidentId === 'proxy'),
      );
      return {
        triggered,
        needsInput: false,
        message: triggered ? '恶魔的剧本：本轮发生过遗言或代行者，败北' : '本轮未发生遗言或代行者',
      };
    },
    execute(ctx: RuleContext): void {
      ctx.G.v1.loopLost = true;
      ctx.G.fullLog.push('⛔ 恶魔的剧本：本轮发生过遗言或代行者事件，主人公败北');
    },
  },
  // 恶魔的剧本：最终日回合结束阶段监视者指示物≤1→主人公死亡
  {
    ruleId: 'll_devils_script_watcher_day_end',
    check(ctx: RuleContext): RuleCheckResult {
      if ((ctx.G.daysPerLoop ?? 0) <= 0) {
        return { triggered: false, needsInput: false, message: '未设置剧本天数' };
      }
      if ((ctx.G.day ?? 0) < (ctx.G.daysPerLoop ?? 0)) {
        return { triggered: false, needsInput: false, message: '尚未到最终日' };
      }
      const watcherCharId = findCharByRole(ctx.G, 'watcher');
      if (!watcherCharId) {
        return { triggered: false, needsInput: false, message: '无监视者' };
      }
      const watcher = ctx.G.v1.characters[watcherCharId];
      if (!watcher || !watcher.alive) {
        return { triggered: false, needsInput: false, message: '监视者不在场' };
      }
      const tokenCount = Object.values(watcher.tokens || {})
        .reduce((sum, value) => sum + Math.max(0, value ?? 0), 0);
      const triggered = tokenCount <= 1;
      return {
        triggered,
        needsInput: false,
        message: triggered
          ? `恶魔的剧本：最终日监视者(${watcherCharId})指示物=${tokenCount}≤1，可发动主人公死亡`
          : `恶魔的剧本：监视者(${watcherCharId})指示物=${tokenCount}>1`,
      };
    },
    execute(ctx: RuleContext): void {
      triggerProtagonistDeath(ctx.G, '恶魔的剧本：最终日监视者指示物≤1');
      ctx.G.fullLog.push('⛔ 恶魔的剧本：最终日监视者指示物≤1，主人公死亡');
    },
  },

  // 巨大定时炸弹Z：轮回结束时魔女初始区域2+密谋→败北
  {
    ruleId: 'll_giant_time_bomb_z_loop_end_loss',
    check(ctx: RuleContext): RuleCheckResult {
      const witchCharId = findCharByRole(ctx.G, 'witch');
      if (!witchCharId) return { triggered: false, needsInput: false, message: '无魔女' };
      const startLoc = getInitialLocation(witchCharId);
      if (!startLoc) return { triggered: false, needsInput: false, message: '魔女无初始区域' };
      const locIntrigue = getToken(ctx.G.v1.locations[startLoc], 'intrigue');
      const triggered = locIntrigue >= 2;
      return {
        triggered,
        needsInput: false,
        message: triggered
          ? `巨大定时炸弹Z：魔女(${witchCharId})初始区域(${startLoc})密谋=${locIntrigue}≥2，败北`
          : `魔女初始区域密谋=${locIntrigue}<2`,
      };
    },
    execute(ctx: RuleContext): void {
      ctx.G.v1.loopLost = true;
      ctx.G.fullLog.push('⛔ 巨大定时炸弹Z：魔女初始区域密谋≥2，主人公败北');
    },
  },

  // ── X规则 ─────────────────────────────────────────────────────────────────
  // 真正的怪物：特殊胜利条件A
  { ruleId: 'll_true_monster_traitor_a_win', check() { return { triggered: false, needsInput: false, message: '真正的怪物：背叛者A胜利条件需接线背叛系统' }; }, execute() {} },
  // 神话收集者：特殊胜利条件B
  { ruleId: 'll_myth_collector_traitor_b_win', check() { return { triggered: false, needsInput: false, message: '神话收集者：背叛者B胜利条件需接线背叛系统' }; }, execute() {} },
  // 超越世界线：偶数轮开始绝望+1，最终轮开始希望+1
  {
    ruleId: 'll_beyond_world_line_loop_start',
    check(ctx: RuleContext): RuleCheckResult {
      const loopIndex = ctx.G.loopIndex ?? 0;
      const maxLoops = ctx.G.maxLoops ?? 0;
      const isEvenLoop = (loopIndex + 1) % 2 === 0;
      const isFinalLoop = maxLoops > 0 && loopIndex >= maxLoops - 1;
      const triggered = isEvenLoop || isFinalLoop;
      return {
        triggered,
        needsInput: false,
        message: isEvenLoop
          ? `超越世界线：第${loopIndex + 1}轮为偶数轮，剧作家获得绝望`
          : isFinalLoop
            ? `超越世界线：最终轮，主人公获得希望`
            : '不触发',
      };
    },
    execute(ctx: RuleContext): void {
      const loopIndex = ctx.G.loopIndex ?? 0;
      const maxLoops = ctx.G.maxLoops ?? 0;
      const isEvenLoop = (loopIndex + 1) % 2 === 0;
      const isFinalLoop = maxLoops > 0 && loopIndex >= maxLoops - 1;
      if (isEvenLoop) {
        addToken(ctx.G.v1.mastermind, 'despair', 1);
        ctx.G.fullLog.push(`[规则X] 超越世界线：第${loopIndex + 1}轮偶数轮，剧作家绝望+1`);
      }
      if (isFinalLoop) {
        addToken(ctx.G.v1.protagonists, 'hope', 1);
        ctx.G.fullLog.push(`[规则X] 超越世界线：最终轮，主人公希望+1`);
      }
    },
  },
  // X异因子：往不安定因子所在版图放1密谋
  {
    ruleId: 'll_x_factor_intrigue_ability',
    check(ctx: RuleContext): RuleCheckResult {
      const usageKey = 'll_x_factor_intrigue_ability';
      if (ctx.G.v1.loopState?.abilityUsage?.[usageKey]?.usedThisLoop) {
        return { triggered: false, needsInput: false, message: 'LL X异因子：本轮已使用' };
      }
      const factorCharId = findCharByRole(ctx.G, 'factor');
      if (!factorCharId) return { triggered: false, needsInput: false, message: '无不安定因子' };
      const factor = ctx.G.v1.characters[factorCharId];
      if (!factor || !factor.alive) {
        return { triggered: false, needsInput: false, message: '不安定因子已死亡' };
      }
      return {
        triggered: true,
        needsInput: true,
        message: `LL X异因子：可在不安定因子(${factorCharId})所在版图(${factor.locationId})放置 1 密谋`,
      };
    },
    execute(ctx: RuleContext): void {
      const factorCharId = findCharByRole(ctx.G, 'factor');
      if (!factorCharId) return;
      const factor = ctx.G.v1.characters[factorCharId];
      if (!factor || !factor.alive) return;
      const locationId = factor.locationId;
      const location = ctx.G.v1.locations[locationId];
      if (location) {
        addToken(location, 'intrigue', 1);
      }
      const usageKey = 'll_x_factor_intrigue_ability';
      if (!ctx.G.v1.loopState.abilityUsage[usageKey]) {
        ctx.G.v1.loopState.abilityUsage[usageKey] = { usedToday: true, usedThisLoop: true };
      } else {
        ctx.G.v1.loopState.abilityUsage[usageKey].usedThisLoop = true;
      }
      ctx.G.fullLog.push(`[LL 阴谋] X异因子：不安定因子(${factorCharId})所在版图(${locationId}) +1 密谋`);
    },
  },
  // 捏造的秘密：秘钥获得无视友好（剧本制作约束）
  { ruleId: 'll_fabricated_secret_key_ignore_goodwill', check() { return { triggered: false, needsInput: false, message: '剧本制作约束，无运行期效果' }; }, execute() {} },
  // SNS恐慌：仅增加角色需求无额外规则

  // ── 遗言希望 loop_start ───────────────────────────────────────────────────
  {
    ruleId: 'll_last_will_hope_loop_start',
    check(ctx) {
      if (ctx.timing !== 'loop_start') return { triggered: false, needsInput: false, message: '' };
      const lastWillKey = '__ll_last_will_hope';
      const prevTriggered = ctx.G.v1.loopState?.abilityUsage?.[lastWillKey]?.usedThisLoop;
      return { triggered: !!prevTriggered, needsInput: false, message: prevTriggered
        ? '遗言：上轮触发，主人公希望+1'
        : '遗言：上轮未触发' };
    },
    execute(ctx) {
      addToken(ctx.G.v1.protagonists, 'hope', 1);
      ctx.G.publicLog.push('📜 遗言效果：主人公获得 希望+1');
      ctx.G.fullLog.push('[规则] 遗言 loop_start：主人公 hope+1');
      // 清除标记（已消费）
      const lastWillKey = '__ll_last_will_hope';
      if (ctx.G.v1.loopState?.abilityUsage?.[lastWillKey]) {
        ctx.G.v1.loopState.abilityUsage[lastWillKey].usedThisLoop = false;
      }
    },
  },

  // ── 怪杰 Day3 能力注入（天数为3的倍数时获得传谣人/主谋/杀人狂能力）────────
  {
    ruleId: 'll_eccentric_day3_abilities',
    check(ctx) {
      if (ctx.timing !== 'day_start') return { triggered: false, needsInput: false, message: '' };
      const day = ctx.G.day ?? 0;
      return { triggered: day > 0 && day % 3 === 0, needsInput: false, message: day % 3 === 0
        ? `怪杰Day${day}：天数为3的倍数，注入能力`
        : `怪杰Day${day}：非3的倍数，跳过` };
    },
    execute(ctx) {
      // 查找怪杰角色
      const eccentricId = Object.entries(ctx.G.v1.hiddenRoles || {})
        .find(([_, role]) => role === 'eccentric')?.[0];
      if (!eccentricId || !ctx.G.v1.characters[eccentricId]?.alive) return;
      // 动态注入传谣人/主谋/杀人狂的能力规则（仅当天生效）
      const injectedRules = [
        { ruleId: 'll_eccentric_as_rumormonger', timing: 'mastermind_ability', source: 'eccentric_day3' },
        { ruleId: 'll_eccentric_as_conspiracy_theorist', timing: 'mastermind_ability', source: 'eccentric_day3' },
        { ruleId: 'll_eccentric_as_serial_killer', timing: 'day_end', source: 'eccentric_day3' },
      ];
      const activeRules = ctx.G.v1.activeRuleDefinitions || [];
      for (const rule of injectedRules) {
        if (!activeRules.some(r => r.ruleId === rule.ruleId)) {
          activeRules.push(rule as any);
        }
      }
      ctx.G.publicLog.push(`🎭 怪杰（Day${ctx.G.day}）获得传谣人/主谋/杀人狂能力`);
      ctx.G.fullLog.push(`[身份能力] 怪杰 ${eccentricId} Day${ctx.G.day} 动态注入 3 条能力规则`);
    },
  },
];

// ── 导出 ─────────────────────────────────────────────────────────────────────

export const plotProcessors: RuleProcessor[] = [
  // loop_end 败北 (6)
  lightOfTheAvengerLoss,
  aPlaceToProtectLoss,
  theSealedItemLoss,
  signWithMeLoss,
  changeOfFutureLoss,
  giantTimeBombLoss,
  smellOfGunpowderLoss,
  spiderwebOfIncidentsLoss,
  planOnATightropeLoss,
  darkSchoolLoss,
  theLockedFutureFrontWorldLoss,
  motherGooseMysteryCorpseLoss,
  dimensionFusionLastWillOrLostItemLoss,
  illusoryWorldObsessiveIntrigueLoss,
  strychnineTinctureIntrigueIsUnease,
  // loop_start (1)
  threadsOfFateLoopStart,
  panicInWardLoopStart,
  beyondTheWorldLineLoopStartDespair,
  beyondTheWorldLineFinalLoopStartHope,
  unspeakableMonsterDayEndLoss,
  // always / day_end (1)
  paranoiaVirusRule,
  paranoiaVirusExpandedTransform,
  // mastermind_ability (2)
  unsettlingRumorFS,
  unsettlingRumorBTX,
  // HSA plot stubs
  ...hsaPlotStubs,
  // AHR plot stubs
  ...ahrPlotStubs,
  // MZ plot stubs
  ...mzPlotStubs,
  // WM plot processors
  ...wmPlotProcessors,
  // LL plot processors
  ...llPlotProcessors,
];
