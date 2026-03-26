/**
 * effectiveValues.ts — 十周年扩展：希望/绝望指示物的有效值计算
 *
 * 核心规则:
 *   - 希望/绝望同时存在时，仅希望生效（"希望不服输"）
 *   - 有效友好 = 原友好 + 活跃希望
 *   - 有效不安 = 原不安 + 活跃绝望
 *   - 有效暗跃 = 原暗跃 + 活跃绝望 - 活跃希望（最低0）
 *   - 绝望强制赋予"无视友好"，希望强制消除"无视友好"
 */

import { getToken, type TokenBag } from './tokenHelpers';

export type TokenContainer = { tokens: TokenBag } | undefined | null;

/**
 * 获取角色身上"活跃的"希望数量。
 * 当希望和绝望同时存在时，仅希望生效，绝望被压制。
 */
export function getActiveHope(c: TokenContainer): number {
  if (!c) return 0;
  const hope = getToken(c, 'hope');
  // 无希望则不生效
  if (hope <= 0) return 0;
  // 有希望则全部生效（即使同时有绝望，希望不服输）
  return hope;
}

/**
 * 获取角色身上"活跃的"绝望数量。
 * 当希望和绝望同时存在时，绝望被压制为 0。
 */
export function getActiveDespair(c: TokenContainer): number {
  if (!c) return 0;
  const hope = getToken(c, 'hope');
  const despair = getToken(c, 'despair');
  // 有希望时绝望被压制
  if (hope > 0) return 0;
  return despair;
}

/**
 * 获取角色的有效友好度 = 原友好 + 活跃希望
 */
export function getEffectiveGoodwill(c: TokenContainer): number {
  if (!c) return 0;
  return getToken(c, 'goodwill') + getActiveHope(c);
}

/**
 * 获取角色的有效不安度 = 原不安 + 活跃绝望
 */
export function getEffectiveParanoia(c: TokenContainer): number {
  if (!c) return 0;
  return getToken(c, 'paranoia') + getActiveDespair(c);
}

/**
 * 获取角色的有效暗跃（角色身上携带） = 原暗跃 + 活跃绝望 - 活跃希望 (最低0)
 */
export function getEffectiveIntrigue(c: TokenContainer): number {
  if (!c) return 0;
  const raw = getToken(c, 'intrigue') + getActiveDespair(c) - getActiveHope(c);
  return Math.max(0, raw);
}

/**
 * 判断角色是否被"无视友好"特性覆盖。
 * - 绝望 > 0 且无希望 → 强制赋予"无视友好"
 * - 希望 > 0 → 强制消除"无视友好"（即使角色原本有该特性）
 * - 都没有 → 返回 null，表示不产生覆盖效果，由原始角色特性决定
 */
export function getHopeOverrideIgnoreGoodwill(c: TokenContainer): boolean | null {
  if (!c) return null;
  const hope = getToken(c, 'hope');
  const despair = getToken(c, 'despair');

  if (hope > 0) return false;   // 希望消除"无视友好"
  if (despair > 0) return true;  // 绝望赋予"无视友好"
  return null;                   // 无覆盖效果
}

/**
 * 统一取值包装器：读取角色身上的有效指示物值。
 *
 * 对 paranoia/goodwill/intrigue 自动计入希望/绝望修正。
 * 对 hope/despair 及其他字段直接返回原始值。
 * 当角色无 hope/despair 时与 getToken 完全等价，零额外开销。
 *
 * 用途：所有阈值判定/条件检查应使用此函数替代 getToken。
 * 仅在直接操作指示物（addToken/removeToken）时使用 getToken。
 */
export function getCharVal(c: TokenContainer, field: 'paranoia' | 'goodwill' | 'intrigue'): number {
  switch (field) {
    case 'paranoia': return getEffectiveParanoia(c);
    case 'goodwill': return getEffectiveGoodwill(c);
    case 'intrigue': return getEffectiveIntrigue(c);
  }
}
