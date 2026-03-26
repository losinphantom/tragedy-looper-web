import type { TragedyGameState } from '../../game';

export type GoodwillGameState = TragedyGameState;
export type GoodwillSelectedTargets = Record<string, string>;

export interface GoodwillHandlerContext {
  G: GoodwillGameState;
  charId: string;
  abilityId: string;
  selectedTargets?: GoodwillSelectedTargets;
}

export interface GoodwillHandlerResult {
  targetedCharacterIds?: string[];
}

export type GoodwillHandler = (ctx: GoodwillHandlerContext) => GoodwillHandlerResult | void;

export type GoodwillHandlerRegistry = Record<string, GoodwillHandler>;

export function noGoodwillTargets(): GoodwillHandlerResult {
  return { targetedCharacterIds: [] };
}

export function goodwillTargets(...targetedCharacterIds: Array<string | undefined>): GoodwillHandlerResult {
  return {
    targetedCharacterIds: targetedCharacterIds.filter((id): id is string => !!id),
  };
}
