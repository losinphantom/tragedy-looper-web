export type TokenType = 'paranoia' | 'intrigue' | 'goodwill' | 'hope' | 'despair' | 'guard';
export type TokenBag = Record<TokenType, number>;

export const TOKEN_LABELS: Record<TokenType, string> = {
  paranoia: '不安',
  intrigue: '密谋',
  goodwill: '友好',
  hope: '希望',
  despair: '绝望',
  guard: '护卫',
};

/**
 * 获取一个全新的全 0 TokenBag
 */
export function createEmptyTokenBag(): TokenBag {
  return {
    paranoia: 0,
    intrigue: 0,
    goodwill: 0,
    hope: 0,
    despair: 0,
    guard: 0,
  };
}

/**
 * 辅助函数：安全地为目标（角色或地点）增加/减少指示物
 * @param target G.v1.characters[id] 或 G.v1.locations[id] 的引用
 * @param type 指示物类型
 * @param delta 变化量（正负均可）
 * @returns 最终该指示物的数量
 */
export function addToken(target: { tokens: TokenBag }, type: TokenType, delta: number): number {
  if (!target || !target.tokens) return 0;
  target.tokens[type] += delta;
  if (target.tokens[type] < 0) {
    target.tokens[type] = 0; // 指示物不能是负数
  }
  return target.tokens[type];
}

/**
 * 辅助函数：安全地读取目标的指定指示物数量
 */
export function getToken(target: { tokens: TokenBag } | undefined | null, type: TokenType): number {
  if (!target || !target.tokens) return 0;
  return target.tokens[type] || 0;
}

/**
 * 辅助函数：在不同类型间转移，或在不同角色间转移 1 枚指示物
 * @param fromTarget 提供方
 * @param toTarget 接收方
 * @param fromType 移除的种类
 * @param toType (可选) 增加的种类。如果不传，则与 fromType 同种
 * @returns 是否转移成功
 */
export function moveToken(
  fromTarget: { tokens: TokenBag },
  toTarget: { tokens: TokenBag },
  fromType: TokenType,
  toType: TokenType = fromType
): boolean {
  if (getToken(fromTarget, fromType) <= 0) return false;
  addToken(fromTarget, fromType, -1);
  addToken(toTarget, toType, 1);
  return true;
}

/**
 * 辅助函数：清空目标身上所有的指示物
 */
export function clearAllTokens(target: { tokens: TokenBag }): void {
  if (!target || !target.tokens) return;
  target.tokens = createEmptyTokenBag();
}
