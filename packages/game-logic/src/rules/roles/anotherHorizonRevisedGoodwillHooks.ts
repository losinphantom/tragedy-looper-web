import { triggerImmediateLoss } from '../../lossConditions';
import { addToken, getToken } from '../../utils/tokenHelpers';
import { recordDeathSnapshots } from '../deathSnapshots';
import { getEffectiveRoleId } from '../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../ahrWorldShift';
import type { ModuleGoodwillResolutionHook } from '../moduleGoodwill';

const AHR_ALICE_GOODWILL_HOPE_USAGE_KEY = '__ahr_alice_goodwill_hope';

function markLoopUsageFlag(key: string, hook: Parameters<ModuleGoodwillResolutionHook>[0]): void {
  const current = hook.G.v1.loopState.abilityUsage[key] || { usedToday: false, usedThisLoop: false };
  hook.G.v1.loopState.abilityUsage[key] = {
    ...current,
    usedToday: true,
    usedThisLoop: true,
  };
}

function hasImmortalityRole(hook: Parameters<ModuleGoodwillResolutionHook>[0], charId: string): boolean {
  const roleId = getEffectiveRoleId(hook.G, charId);
  return roleId === 'time_traveler'
    || roleId === 'detective'
    || roleId === 'ai'
    || roleId === 'black_cat'
    || roleId === 'illusion'
    || roleId === 'vampire';
}

function killCharacterFromGoodwill(
  hook: Parameters<ModuleGoodwillResolutionHook>[0],
  charId: string,
  sourceRuleLabel: string,
): void {
  const character = hook.G.v1.characters[charId];
  if (!character || !character.alive) return;
  if (hasImmortalityRole(hook, charId)) {
    hook.G.fullLog.push(`[友好能力] ${sourceRuleLabel} ${hook.charId} 对 ${charId} 的击杀被不死特性免疫`);
    return;
  }

  recordDeathSnapshots(hook.G, charId);
  character.alive = false;
  const effectiveRoleId = getEffectiveRoleId(hook.G, charId);
  if (effectiveRoleId === 'magician') {
    addToken(character, 'paranoia', -getToken(character, 'paranoia'));
    hook.G.fullLog.push(`[友好能力] 魔术师 ${charId} 死亡时移除了所有不安`);
  }
  if (effectiveRoleId === 'key_person') {
    triggerImmediateLoss(hook.G, `关键人物 ${charId} 死亡`);
  }
  hook.G.publicLog.push(`💀 ${charId} 死亡`);
  hook.G.fullLog.push(`[友好能力] ${sourceRuleLabel} ${hook.charId} 使 ${charId} 死亡`);
}

const applyAlicePostGoodwill: ModuleGoodwillResolutionHook = hook => {
  if (getEffectiveRoleId(hook.G, hook.charId) !== 'alice') return;
  if (!hook.G.v1.ex?.enabled || hook.G.v1.ex.gauge < 1) return;
  if (hook.G.v1.loopState.abilityUsage[AHR_ALICE_GOODWILL_HOPE_USAGE_KEY]?.usedThisLoop) return;

  const self = hook.G.v1.characters[hook.charId];
  if (!self || !self.alive) return;

  const targets = Object.entries(hook.G.v1.characters)
    .filter(([id, character]) => id !== hook.charId && character.alive && character.locationId === self.locationId)
    .map(([id]) => id);
  if (targets.length === 0) return;

  for (const targetId of targets) {
    addToken(hook.G.v1.characters[targetId], 'hope', 1);
  }
  markLoopUsageFlag(AHR_ALICE_GOODWILL_HOPE_USAGE_KEY, hook);
  hook.G.fullLog.push(`[身份能力] 爱丽丝 ${hook.charId} 的友好能力结算后，为同区域其他角色各放置了 1 希望`);
};

const applyMarionettePostGoodwill: ModuleGoodwillResolutionHook = hook => {
  if (getEffectiveRoleId(hook.G, hook.charId) !== 'marionette') return;

  const character = hook.G.v1.characters[hook.charId];
  if (!character || !character.alive) return;

  const distinctTokenTypes = ['paranoia', 'intrigue', 'goodwill', 'hope', 'despair', 'guard']
    .filter(tokenType => getToken(character, tokenType as keyof typeof character.tokens) > 0)
    .length;
  if (distinctTokenTypes < 2) return;

  recordDeathSnapshots(hook.G, hook.charId);
  character.alive = false;
  markWorldShiftThisDay(hook.G, `goodwill:marionette:${hook.charId}`);
  hook.G.publicLog.push(`💀 ${hook.charId} 死亡`);
  hook.G.fullLog.push(`[身份能力] 提线木偶 ${hook.charId} 在友好能力结算后因拥有 ${distinctTokenTypes} 种指示物而死亡，并记录当天 world shift`);
};

const applyLullabyPostGoodwill: ModuleGoodwillResolutionHook = hook => {
  if (getEffectiveRoleId(hook.G, hook.charId) !== 'lullaby') return;

  for (const targetId of hook.targetedCharacterIds || []) {
    killCharacterFromGoodwill(hook, targetId, '童谣');
  }
};

export const anotherHorizonRevisedRoleGoodwillAfterResolveHooks: ModuleGoodwillResolutionHook[] = [
  applyAlicePostGoodwill,
  applyMarionettePostGoodwill,
  applyLullabyPostGoodwill,
];
