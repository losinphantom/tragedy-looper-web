/**
 * Card Resolver — action card resolution engine.
 *
 * Implements the resolve_cards phase logic:
 *   forbid_movement → movement → other_forbid → remaining cards
 *
 * Includes the Protagonist "Forbid Intrigue" nullification rule:
 *   If 2+ protagonists play Forbid Intrigue, those cards cancel each other.
 *
 * resolveAllCards is pure — reads PlayedCard[] and returns ResolutionEffect[].
 * applyEffects mutates G (writes counters, locations, logs).
 */

import { getCard } from './cardRegistry';
import { resolveMovementStack } from './movementComposer';
import type { ActionCardRecord } from './cardRegistry';
import type { Axis } from './movementComposer';
import { CHARACTERS } from '@tragedy/domain';
import { addToken } from '../utils/tokenHelpers';
import { enforceAhrIllusionParanoiaLimit } from '../rules/ahrState';


// ── 中文翻译辅助 ────────────────────────────────────────────────────────────
const cn = (id: string) => CHARACTERS[id]?.label?.['zh-CN'] || id;
const LOC_CN: Record<string, string> = { hospital: '医院', shrine: '神社', city: '都市', school: '学校' };
const locCn = (id: string) => LOC_CN[id] || id;
const TOKEN_CN: Record<string, string> = { paranoia: '不安', goodwill: '友好', intrigue: '密谋', hope: '希望', despair: '绝望' };
const tokenCn = (f: string) => TOKEN_CN[f] || f;
const AXIS_CN: Record<string, string> = { horizontal: '横向', vertical: '纵向', diagonal: '斜向' };
const axisCn = (a: string) => AXIS_CN[a] || a;

// ── Types ────────────────────────────────────────────────────────────────────

export type PlayedCard = {
  id: string;
  cardTemplateId: string;
  owner: 'mastermind' | 'protagonist';
  targetType: 'location' | 'character';
  targetId: string;
  faceUp: boolean;
  playedByColor?: 'blue' | 'orange' | 'green' | '蓝' | '橙' | '绿';
  /** Seat ID of the player who played this card (for card return routing) */
  playedBySeat?: string;
};

export type ResolutionEffect =
  | { kind: 'move';      targetId: string; axis: Axis }
  | { kind: 'counter';   targetId: string; counter: string; delta: number; cardId?: string }
  | { kind: 'forbidden'; targetId: string; cardId: string; reason: string }
  | { kind: 'no_effect'; targetId: string; cardId: string; reason: string };

// ── Main resolver ────────────────────────────────────────────────────────────

export function resolveAllCards(
  playedCards: PlayedCard[],
  immunities: Array<{ characterId: string; immuneToForbid: string }> = [],
  /** WM 旧印（Ex≥3）：跳过禁止密谋互抵规则 */
  skipForbidIntrigueNullification = false,
): ResolutionEffect[] {
  const effects: ResolutionEffect[] = [];

  // ── 全局预处理: 禁止暗跃互抵规则 ──
  // 如果两名或以上主人公打出了 forbid_intrigue，这些卡片互相抵消
  const protagonistForbidIntrigueCards = playedCards.filter(
    pc => pc.owner === 'protagonist' && getCard(pc.cardTemplateId)?.actionFamily === 'forbid_intrigue'
  );
  const forbidIntrigueNullified = !skipForbidIntrigueNullification && protagonistForbidIntrigueCards.length >= 2;

  const byTarget = new Map<string, { card: PlayedCard; def: ActionCardRecord }[]>();
  for (const pc of playedCards) {
    const def = getCard(pc.cardTemplateId);
    if (!def) continue;
    const key = `${pc.targetType}:${pc.targetId}`;
    if (!byTarget.has(key)) byTarget.set(key, []);
    byTarget.get(key)!.push({ card: pc, def });
  }

  for (const [targetKey, entries] of byTarget) {
    const [targetType, targetId] = targetKey.split(':') as ['location' | 'character', string];

    // ── Step 1: Forbid Movement ──
    const hasForbidMove = entries.some((e) => e.def.actionFamily === 'forbid_movement');
    const moveEntries = entries.filter((e) => e.def.actionFamily === 'movement');

    if (hasForbidMove) {
      for (const me of moveEntries) {
        effects.push({
          kind: 'forbidden',
          targetId,
          cardId: me.card.id,
          reason: '被"禁止移动"抵消',
        });
      }
    } else if (moveEntries.length > 0 && targetType === 'character') {
      // ── Step 2: Resolve movement composition ──
      const axes = moveEntries
        .map((e) => e.def.params.axis as Axis)
        .filter(Boolean);
      const finalAxis = resolveMovementStack(axes);
      if (finalAxis) {
        effects.push({ kind: 'move', targetId, axis: finalAxis });
      }
    } else if (moveEntries.length > 0 && targetType === 'location') {
      // 移动卡放在地点上无效（规则书 L207）
      for (const me of moveEntries) {
        effects.push({
          kind: 'no_effect',
          targetId,
          cardId: me.card.id,
          reason: '移动卡放在地点上无效',
        });
      }
    }

    // ── Step 3: Other Forbid cards ──
    const forbidFamilies = new Set<string>();
    for (const e of entries) {
      if (e.def.actionFamily.startsWith('forbid_') && e.def.actionFamily !== 'forbid_movement') {
        // 禁止暗跃互抵: 如果被抵消则跳过
        if (e.def.actionFamily === 'forbid_intrigue' && forbidIntrigueNullified) {
          effects.push({
            kind: 'no_effect',
            targetId,
            cardId: e.card.id,
            reason: '多名主人公打出禁止暗跃，互相抵消',
          });
          continue;
        }
        // 免疫检查：如果目标角色对此禁止类型免疫，跳过
        if (targetType === 'character') {
          const isImmune = immunities.some(
            im => im.characterId === targetId && im.immuneToForbid === e.def.actionFamily
          );
          if (isImmune) {
            effects.push({
              kind: 'no_effect',
              targetId,
              cardId: e.card.id,
              reason: `角色身份能力无视${e.def.actionFamily}`,
            });
            continue;
          }
        }
        const blocked = e.def.actionFamily.replace('forbid_', '');
        forbidFamilies.add(blocked);
      }
    }

    // ── Step 4: Value cards (不安+1 先于 -1 结算) ──
    const valueEntries = entries.filter(
      (e) => !e.def.actionFamily.startsWith('forbid_') && e.def.actionFamily !== 'movement'
    );
    // 排序：add 先于 remove，保证不安+1 先结算
    valueEntries.sort((a, b) => {
      const opA = a.def.params.operation === 'remove' ? 1 : 0;
      const opB = b.def.params.operation === 'remove' ? 1 : 0;
      return opA - opB;
    });

    // 十周年: 希望+1 撞车降级——同一目标多张 hope 卡 → 全部降级为 goodwill+1
    const hopeEntries = valueEntries.filter((e) => e.def.actionFamily === 'hope');
    if (hopeEntries.length > 1) {
      for (const he of hopeEntries) {
        (he.def as any) = { ...he.def, actionFamily: 'goodwill' };
        effects.push({
          kind: 'no_effect',
          targetId,
          cardId: he.card.id,
          reason: '希望+1 撞车，降级为友好+1',
        });
      }
    }

    for (const ve of valueEntries) {
      if (forbidFamilies.has(ve.def.actionFamily)) {
        effects.push({
          kind: 'forbidden',
          targetId,
          cardId: ve.card.id,
          reason: `被"禁止${ve.def.actionFamily}"抵消`,
        });
        continue;
      }

      // 地点只接受阴谋指示物，其他值卡放地点上无效（规则书 L207）
      if (targetType === 'location' && ve.def.actionFamily !== 'intrigue') {
        effects.push({
          kind: 'no_effect',
          targetId,
          cardId: ve.card.id,
          reason: `${ve.def.actionFamily}卡放在地点上无效`,
        });
        continue;
      }

      const amount = (ve.def.params.amount as number) || 0;
      const op = ve.def.params.operation as string | undefined;
      const delta = op === 'remove' ? -amount : amount;

      if (delta !== 0) {
        effects.push({
          kind: 'counter',
          targetId,
          counter: ve.def.actionFamily,
          delta,
          cardId: ve.card.id,
        });
      }
    }
  }

  return effects;
}

// ── Auto-apply effects to G ──────────────────────────────────────────────────

import type { TragedyGameState } from '../game';
import { getMovementDestination } from '../data/boardGraph';
import { canCharacterMoveBetween } from '../runtime/movementRestrictions';

function hasLoopUsageFlag(G: TragedyGameState, key: string): boolean {
  return !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
}

function isRemovedFromBoard(G: TragedyGameState, characterId: string): boolean {
  return hasLoopUsageFlag(G, `__removed_from_board_${characterId}`);
}

function canIgnoreForbiddenLocation(
  G: TragedyGameState,
  characterId: string,
): boolean {
  if (characterId === 'patient' && hasLoopUsageFlag(G, '__doctor_patient_can_leave_hospital')) {
    return true;
  }
  if (characterId === 'little_girl' && hasLoopUsageFlag(G, '__ignore_forbidden_little_girl')) {
    return true;
  }
  return false;
}

/**
 * Apply resolution effects to the game state automatically.
 * Logs each applied effect to G.publicLog for transparency.
 */
export function applyEffects(G: TragedyGameState, effects: ResolutionEffect[]): void {
  for (const eff of effects) {
    switch (eff.kind) {
      case 'move': {
        const char = G.v1.characters[eff.targetId];
        if (!char) break;
        if (isRemovedFromBoard(G, eff.targetId)) {
          G.publicLog.push(`👻 ${cn(eff.targetId)} 已被移出版图，跳过移动`);
          break;
        }
        // 死亡角色不可移动
        if (!char.alive) {
          G.publicLog.push(`⚰️ ${cn(eff.targetId)} 已死亡，无法移动`);
          break;
        }
        // 黑猫移动反转：主人公移动卡对黑猫生效时，垂直↔水平互换
        let effectiveAxis = eff.axis;
        if (G.v1.hiddenRoles?.[eff.targetId] === 'black_cat') {
          if (eff.axis === 'vertical') effectiveAxis = 'horizontal';
          else if (eff.axis === 'horizontal') effectiveAxis = 'vertical';
          // diagonal 不反转
          if (effectiveAxis !== eff.axis) {
            G.fullLog.push(`[黑猫] ${eff.targetId} 移动方向反转：${eff.axis} → ${effectiveAxis}`);
          }
        }
        const dest = getMovementDestination(char.locationId as any, effectiveAxis);
        if (dest) {
          // 禁止地点检查：从 domain 获取角色的 forbiddenLocations
          const domainChar = CHARACTERS[eff.targetId];
          const ignoreForbidden = canIgnoreForbiddenLocation(G, eff.targetId);
          if (!canCharacterMoveBetween(G, eff.targetId, char.locationId, dest)) {
            G.publicLog.push(`🚫 ${cn(eff.targetId)} 当前无法移动到 ${locCn(dest)}`);
          } else if (domainChar && domainChar.forbiddenLocations.includes(dest) && !ignoreForbidden) {
            G.publicLog.push(`🚫 ${cn(eff.targetId)} 不能前往 ${locCn(dest)}（禁止地点）`);
          } else {
            G.publicLog.push(`🚶 ${cn(eff.targetId)} ${axisCn(eff.axis)}移动 → ${locCn(dest)}`);
            char.locationId = dest;
          }
        } else {
          G.publicLog.push(`🚶 ${cn(eff.targetId)} 无法${axisCn(eff.axis)}移动，已在边缘`);
        }
        break;
      }
      case 'counter': {
        const counterMap: Record<string, 'paranoia' | 'intrigue' | 'goodwill' | 'hope' | 'despair' | undefined> = {
          'unease': 'paranoia',
          'intrigue': 'intrigue',
          'goodwill': 'goodwill',
          'hope': 'hope',
          'despair': 'despair',
        };
        // Extract the base counter name (e.g. 'unease_plus' → 'unease')
        const baseName = eff.counter.replace(/_plus$|_minus$/, '');
        const field = counterMap[baseName];

        if (field) {
          const char = G.v1.characters[eff.targetId];
          const loc = G.v1.locations[eff.targetId];
          // 死亡角色不接受指示物变更
          if (char && isRemovedFromBoard(G, eff.targetId)) {
            G.publicLog.push(`👻 ${cn(eff.targetId)} 已被移出版图，跳过指示物结算`);
          } else if (char && !char.alive) {
            G.publicLog.push(`⚰️ ${cn(eff.targetId)} 已死亡，无法放置指示物`);
          } else if (char) {
            addToken(char, field as any, eff.delta);
            G.publicLog.push(`📊 ${cn(eff.targetId)} ${tokenCn(field)} ${eff.delta > 0 ? '+' : ''}${eff.delta}`);
            // AHR 幻影：不安达到 3 时死亡（resolve_cards 路径）
            // 十周年: despair 视作不安，放置后也需检查幻影上限
            if ((field === 'paranoia' || field === 'despair') && eff.delta > 0) {
              enforceAhrIllusionParanoiaLimit(G, eff.targetId);
            }
          } else if (loc && field === 'intrigue') {
            addToken(loc, field as any, eff.delta);
            G.publicLog.push(`📊 ${locCn(eff.targetId)} ${tokenCn(field)} ${eff.delta > 0 ? '+' : ''}${eff.delta}`);
          }
        }
        break;
      }
      case 'forbidden':
        G.publicLog.push(`🚫 ${cn(eff.targetId) !== eff.targetId ? cn(eff.targetId) : locCn(eff.targetId)}: ${eff.reason}`);
        break;
      case 'no_effect':
        G.publicLog.push(`⚪ ${cn(eff.targetId) !== eff.targetId ? cn(eff.targetId) : locCn(eff.targetId)}: ${eff.reason}`);
        break;
    }
  }
}
