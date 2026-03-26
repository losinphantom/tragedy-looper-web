/**
 * Action Cards Module — unified export.
 *
 * All action-card logic is gathered here so that moves.ts, phases.ts,
 * and external consumers import from one place.
 */

// Card Registry
export {
  getCard,
  getCardLabel,
  getCardAssetPath,
  getCardImageUrl,
  getCardBackUrl,
  buildMastermindDeck,
  buildProtagonistDeck,
  isCardLocked,
  getPlayableHand,
} from './cardRegistry';
export type { ActionCardRecord } from './cardRegistry';

// Card Validator
export { validatePlayCard, validateRecallCard } from './cardValidator';
export type { ValidationResult } from './cardValidator';

// Card Resolver
export { resolveAllCards, applyEffects } from './cardResolver';
export type { PlayedCard, ResolutionEffect } from './cardResolver';

// Movement Composer
export { combineMoveAxes, resolveMovementStack } from './movementComposer';
export type { Axis } from './movementComposer';
