import { CHARACTERS } from '@tragedy/domain';
import { triggerProtagonistDeath } from '../../lossConditions';
import { recordRevealedRole } from '../../revealTracker';
import { applyCharacterTokenDelta } from '../ahrState';
import { getEffectiveRoleId } from '../ahrEffectiveRoles';
import type { ModuleGoodwillResolutionHook } from '../moduleGoodwill';
import { addToken } from '../../utils/tokenHelpers';

const applySecretKeyPostGoodwill: ModuleGoodwillResolutionHook = ({ G, charId }) => {
  if (getEffectiveRoleId(G, charId) !== 'secret_key') return;

  recordRevealedRole(G, charId, 'secret_key');
  G.publicLog.push(`🔑 ${charId} 的身份（密钥）被公开`);
  const loopIndex = G.loopIndex ?? 0;
  if (loopIndex <= 1) {
    triggerProtagonistDeath(G, `密钥 ${charId} 在第${loopIndex + 1}轮被公开`);
    G.fullLog.push(`[身份能力] 密钥 ${charId} 第${loopIndex + 1}轮公开→主人公死亡`);
  }
};

const applyInfluencerPostGoodwill: ModuleGoodwillResolutionHook = ({ G, charId }) => {
  if (getEffectiveRoleId(G, charId) !== 'influencer') return;

  const influencerKey = `__ll_influencer_spread_${charId}`;
  const alreadyUsed = G.v1.loopState?.abilityUsage?.[influencerKey]?.usedThisLoop;
  if (alreadyUsed) return;

  if (!G.v1.loopState.abilityUsage[influencerKey]) {
    G.v1.loopState.abilityUsage[influencerKey] = { usedToday: false, usedThisLoop: false };
  }
  G.v1.loopState.abilityUsage[influencerKey].usedThisLoop = true;

  const startLoc = CHARACTERS[charId as keyof typeof CHARACTERS]?.startingLocations?.[0];
  if (!startLoc) return;

  for (const [otherId, otherChar] of Object.entries(G.v1.characters)) {
    if (otherId === charId || !otherChar.alive) continue;
    const otherStart = CHARACTERS[otherId as keyof typeof CHARACTERS]?.startingLocations?.[0];
    if (otherStart !== startLoc) continue;
    addToken(otherChar, 'goodwill', 1);
    applyCharacterTokenDelta(G, otherId, 'paranoia', 1);
    G.fullLog.push(`[身份能力] 网络名流友好扩散：${otherId} +1友好 +1不安`);
  }
  G.publicLog.push(`📡 ${charId}（网络名流）使用友好能力后，同初始区域角色获得 +1友好 +1不安`);
};

export const lastLiarRoleGoodwillAfterResolveHooks: ModuleGoodwillResolutionHook[] = [
  applySecretKeyPostGoodwill,
  applyInfluencerPostGoodwill,
];
