export { sharedGoodwillHandlers } from './sharedHandlers';
export type { GoodwillHandler, GoodwillHandlerContext, GoodwillHandlerRegistry } from './types';

import { characterGoodwillHandlers } from '../../rules/characterGoodwillHandlers';

export const characterOwnedGoodwillHandlers = {
  ...characterGoodwillHandlers,
};
