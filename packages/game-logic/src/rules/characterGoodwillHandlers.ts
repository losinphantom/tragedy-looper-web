import type { GoodwillHandlerRegistry } from '../engine/goodwill/types';
import { ownedCharacterGoodwillHandlers } from './characters/owned-goodwill';

// Character-owned goodwill handlers.
// Registration belongs to the character/ability layer; module manifests should
// only assemble roles / incidents / plots / module-scoped hooks.
// New handlers should default to `rules/characters/owned-goodwill/*.ts`.
export const characterGoodwillHandlers = {
  ...ownedCharacterGoodwillHandlers,
} satisfies GoodwillHandlerRegistry;
