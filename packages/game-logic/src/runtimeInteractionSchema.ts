import { z } from 'zod';

const TokenTypeSchema = z.enum(['paranoia', 'intrigue', 'goodwill']);
const TargetChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const TargetSlotSchema = z.object({
  slotId: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['character', 'location', 'character_or_location', 'token_type', 'choice']),
  eligibleCharacterIds: z.array(z.string().min(1)).optional(),
  eligibleLocationIds: z.array(z.string().min(1)).optional(),
  eligibleTokenTypes: z.array(TokenTypeSchema).optional(),
  eligibleChoices: z.array(TargetChoiceSchema).optional(),
});

const RuntimeInteractionBaseSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  actorSeat: z.string().min(1),
  phase: z.string().min(1),
  blocking: z.boolean(),
  sourceId: z.string().min(1).optional(),
  description: z.string().min(1),
});

const GoodwillInteractionPhaseSchema = z.enum([
  'idle',
  'leader_choosing',
  'mastermind_resolving',
  'done',
]);

export const GoodwillEligibleAbilitySchema = z.object({
  characterId: z.string().min(1),
  abilityId: z.string().min(1),
  label: z.string().min(1),
  used: z.boolean(),
  targetSlots: z.array(TargetSlotSchema).optional(),
});

export const GoodwillDeclarationSchema = z.object({
  characterId: z.string().min(1),
  abilityId: z.string().min(1),
  selectedTargets: z.record(z.string(), z.string()).optional(),
});

export const TimeSpiralDiscussionInteractionSchema = RuntimeInteractionBaseSchema.extend({
  kind: z.literal('time_spiral_discussion'),
  phase: z.literal('time_spiral'),
});

export const MastermindAbilityInteractionSchema = RuntimeInteractionBaseSchema.extend({
  kind: z.literal('mastermind_ability'),
  phase: z.enum(['mastermind_abilities', 'day_end']),
  ruleId: z.string().min(1),
  // Global abilities may not be bound to a specific character.
  characterId: z.string(),
  mandatory: z.boolean(),
  targetSlots: z.array(TargetSlotSchema),
});

export const GoodwillInteractionSchema = RuntimeInteractionBaseSchema.extend({
  kind: z.literal('goodwill'),
  phase: GoodwillInteractionPhaseSchema,
  eligibleAbilities: z.array(GoodwillEligibleAbilitySchema),
  currentDeclaration: GoodwillDeclarationSchema.nullable(),
  observerCharacterId: z.string().min(1).optional(),
  observerAbilityId: z.string().min(1).optional(),
  observerSelectedTargets: z.record(z.string(), z.string()).optional(),
});

export const IncidentResolutionInteractionSchema = RuntimeInteractionBaseSchema.extend({
  kind: z.literal('incident_resolution'),
  phase: z.literal('incidents'),
  day: z.number().int().nonnegative(),
  incidentId: z.string().min(1),
  culpritId: z.string().min(1),
  targetSlots: z.array(TargetSlotSchema),
});

export const ButterflyChoiceInteractionSchema = RuntimeInteractionBaseSchema.extend({
  kind: z.literal('butterfly_choice'),
  targetId: z.string().min(1),
  targetKind: z.enum(['character', 'location']),
  allowedTokens: z.array(TokenTypeSchema).min(1),
});

const LoopResultReasonSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1).optional(),
});

const LoopResultEffectOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1).optional(),
  stage: z.enum(['after_loss_declared', 'after_progression']).optional(),
  outcomeOverride: z.enum(['next_loop', 'final_guess', 'match_end']).optional(),
});

const LoopResultOutcomeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1).optional(),
});

export const LoopResultResolutionInteractionSchema = RuntimeInteractionBaseSchema.extend({
  kind: z.literal('loop_result_resolution'),
  phase: z.literal('loop_end_check'),
  resultType: z.enum(['loop_failure', 'loop_end']),
  resultLabel: z.string().min(1),
  failureReasons: z.array(LoopResultReasonSchema),
  effectOptions: z.array(LoopResultEffectOptionSchema),
  availableOutcomes: z.array(LoopResultOutcomeSchema),
});

export const RuntimeInteractionSchema = z.discriminatedUnion('kind', [
  TimeSpiralDiscussionInteractionSchema,
  MastermindAbilityInteractionSchema,
  GoodwillInteractionSchema,
  IncidentResolutionInteractionSchema,
  ButterflyChoiceInteractionSchema,
  LoopResultResolutionInteractionSchema,
]);

export type TargetSlotPayload = z.infer<typeof TargetSlotSchema>;
export type GoodwillEligibleAbilityPayload = z.infer<typeof GoodwillEligibleAbilitySchema>;
export type GoodwillDeclarationPayload = z.infer<typeof GoodwillDeclarationSchema>;
export type TimeSpiralDiscussionInteractionPayload = z.infer<typeof TimeSpiralDiscussionInteractionSchema>;
export type MastermindAbilityInteractionPayload = z.infer<typeof MastermindAbilityInteractionSchema>;
export type GoodwillInteractionPayload = z.infer<typeof GoodwillInteractionSchema>;
export type IncidentResolutionInteractionPayload = z.infer<typeof IncidentResolutionInteractionSchema>;
export type ButterflyChoiceInteractionPayload = z.infer<typeof ButterflyChoiceInteractionSchema>;
export type LoopResultResolutionInteractionPayload = z.infer<typeof LoopResultResolutionInteractionSchema>;
export type RuntimeInteractionPayload = z.infer<typeof RuntimeInteractionSchema>;
