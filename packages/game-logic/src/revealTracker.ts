import type { TragedyGameState } from './game';
import { getEffectiveRoleId } from './rules/ahrEffectiveRoles';

/**
 * 记录角色身份公开。
 * 包含忍者虚假宣称拦截：如果角色是忍者且 mz_ninja_false_claim 规则激活，
 * 记录的身份替换为假身份（自动模式默认 'serial_killer'）。
 */
export function recordRevealedRole(
  G: TragedyGameState,
  characterId: string,
  roleId: string,
): void {
  if (!G.v1.revealedRoleMemory) {
    G.v1.revealedRoleMemory = {};
  }

  let effectiveRoleToRecord = roleId;
  const character = G.v1.characters[characterId];
  const canFalseClaim = !!character?.alive;

  // 忍者虚假宣称：需公开身份时可宣称非平民的假身份
  const realRole = getEffectiveRoleId(G, characterId);
  const hasNinjaFalseClaim = (G.v1.activeRuleDefinitions || []).some(
    r => r.ruleId === 'mz_ninja_false_claim' && r.characterId === characterId
  );
  if (canFalseClaim && realRole === 'ninja' && hasNinjaFalseClaim && roleId === 'ninja') {
    // 自动模式：宣称一个不在当前公开信息中的非平民身份
    const alreadyRevealed = new Set(Object.values(G.v1.loopState?.revealedRoles ?? {}));
    const fakeCandidates = ['serial_killer', 'brain', 'key_person', 'cultist', 'friend']
      .filter(r => !alreadyRevealed.has(r));
    effectiveRoleToRecord = fakeCandidates[0] || 'serial_killer';
    G.fullLog.push(`[忍者虚假宣称] ${characterId} 真实身份忍者 → 宣称 ${effectiveRoleToRecord}`);
  }

  G.v1.loopState.revealedRoles[characterId] = effectiveRoleToRecord;
  G.v1.revealedRoleMemory[characterId] = effectiveRoleToRecord;
}

export function wasRoleRevealedBefore(
  G: TragedyGameState,
  characterId: string,
): boolean {
  return !!G.v1.revealedRoleMemory?.[characterId];
}
