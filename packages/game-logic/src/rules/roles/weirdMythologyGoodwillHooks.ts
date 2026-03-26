import { recordRevealedRole } from '../../revealTracker';
import { getEffectiveRoleId } from '../ahrEffectiveRoles';
import { ensureExState } from '../incidentEx';
import type { ModuleGoodwillResolutionHook } from '../moduleGoodwill';

const applySpellcasterPostGoodwill: ModuleGoodwillResolutionHook = ({ G, charId }) => {
  if (getEffectiveRoleId(G, charId) !== 'spellcaster') return;

  recordRevealedRole(G, charId, 'spellcaster');
  const ex = ensureExState(G);
  if (ex.enabled) {
    ex.gauge = Math.max(0, ex.gauge + 1);
    ex.changedThisLoop = true;
  }
  G.publicLog.push(`🔮 ${charId} 的身份被公开（巫师）— Ex+1`);
  G.fullLog.push(`[身份能力] 巫师 ${charId} 友好结算后揭示身份，Ex+1`);
};

export const weirdMythologyRoleGoodwillAfterResolveHooks: ModuleGoodwillResolutionHook[] = [
  applySpellcasterPostGoodwill,
];
