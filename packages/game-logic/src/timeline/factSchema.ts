import { z } from 'zod';
import { ResultAnnouncementPayloadSchema } from '../resultAnnouncementSchema';
import { RuntimeInteractionSchema } from '../runtimeInteractionSchema';
import { TimelineVisibilitySchema } from './factVisibility';

export const TIMELINE_SCHEMA_VERSION = 1 as const;

const timelineFactTypeValues = [
  'ability_declared',
  'ability_skipped',
  'incident_resolution_requested',
  'ability_resolved',
  'incident_resolved',
  'card_resolution',
  'state_change',
  'interaction_enqueued',
  'interaction_updated',
  'interaction_removed',
  'phase_boundary',
  'day_boundary',
  'loop_boundary',
  'match_boundary',
  'manual_adjustment',
  'result_announced',
] as const;

const timelineCheckpointKindValues = [
  'phase_boundary',
  'day_boundary',
  'loop_boundary',
  'match_boundary',
  'console_snapshot',
  'truth_change',
  'batch_change',
] as const;

const timelineSystemValues = [
  'move',
  'phase',
  'runtime',
  'console',
  'rules',
  'server',
] as const;

const timelineActorRoleValues = [
  'system',
  'mastermind',
  'protagonist',
  'character',
] as const;

const timelineChangeTargetValues = [
  'character',
  'location',
  'global',
  'card',
  'interaction',
  'rule',
] as const;

const declarationTypeValues = [
  'ability_declared',
  'ability_skipped',
  'incident_resolution_requested',
] as const;

const resolutionTypeValues = [
  'ability_resolved',
  'incident_resolved',
  'card_resolution',
  'state_change',
] as const;

const interactionTypeValues = [
  'interaction_enqueued',
  'interaction_updated',
  'interaction_removed',
] as const;

const boundaryTypeValues = [
  'phase_boundary',
  'day_boundary',
  'loop_boundary',
  'match_boundary',
] as const;

const declarationSubjectValues = [
  'ability',
  'incident',
  'interaction',
  'manual_adjustment',
] as const;

export type TimelineJsonValue =
  | string
  | number
  | boolean
  | null
  | TimelineJsonValue[]
  | { [key: string]: TimelineJsonValue };

export const TimelineJsonValueSchema: z.ZodType<TimelineJsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(TimelineJsonValueSchema),
  z.record(z.string(), TimelineJsonValueSchema),
]));

export const TimelineMetadataSchema = z.record(z.string(), TimelineJsonValueSchema);

export const TimelineGameTimeSchema = z.object({
  loop: z.number().int().nonnegative(),
  day: z.number().int().nonnegative(),
  phase: z.string().min(1).nullable(),
  phaseStep: z.string().min(1).nullable(),
  turn: z.number().int().nonnegative().nullable(),
});

export const TimelineSourceSchema = z.object({
  system: z.enum(timelineSystemValues),
  id: z.string().min(1).optional(),
  phase: z.string().min(1).nullable().optional(),
  ruleId: z.string().min(1).optional(),
  scriptId: z.string().min(1).optional(),
});

export const TimelineActorSchema = z.object({
  role: z.enum(timelineActorRoleValues),
  seatId: z.string().min(1).optional(),
  characterId: z.string().min(1).optional(),
});

export const TimelineRefsSchema = z.object({
  characterIds: z.array(z.string().min(1)).default([]),
  locationIds: z.array(z.string().min(1)).default([]),
  seatIds: z.array(z.string().min(1)).default([]),
  cardIds: z.array(z.string().min(1)).default([]),
  incidentIds: z.array(z.string().min(1)).default([]),
  interactionIds: z.array(z.string().min(1)).default([]),
  ruleIds: z.array(z.string().min(1)).default([]),
  checkpointIds: z.array(z.string().min(1)).default([]),
});

export function createEmptyTimelineRefs(): TimelineRefs {
  return TimelineRefsSchema.parse({});
}

export const TimelineChangeSchema = z.object({
  targetType: z.enum(timelineChangeTargetValues),
  targetId: z.string().min(1),
  field: z.string().min(1),
  delta: z.number().int().optional(),
  previousValue: TimelineJsonValueSchema.optional(),
  nextValue: TimelineJsonValueSchema.optional(),
  reason: z.string().min(1).optional(),
});

export const TimelineDeclarationPayloadSchema = z.object({
  family: z.literal('declaration'),
  type: z.enum(declarationTypeValues),
  subject: z.enum(declarationSubjectValues),
  summary: z.string().min(1).optional(),
  abilityId: z.string().min(1).optional(),
  incidentId: z.string().min(1).optional(),
  selectedTargets: z.record(z.string(), z.string()).default({}),
  metadata: TimelineMetadataSchema.default({}),
});

export const TimelineResolutionPayloadSchema = z.object({
  family: z.literal('resolution'),
  type: z.enum(resolutionTypeValues),
  outcome: z.string().min(1),
  summary: z.string().min(1).optional(),
  changes: z.array(TimelineChangeSchema).default([]),
  metadata: TimelineMetadataSchema.default({}),
});

export const TimelineInteractionPayloadSchema = z.object({
  family: z.literal('interaction'),
  type: z.enum(interactionTypeValues),
  interactionId: z.string().min(1),
  interactionKind: z.string().min(1),
  description: z.string().min(1).optional(),
  snapshot: RuntimeInteractionSchema.optional(),
  metadata: TimelineMetadataSchema.default({}),
});

export const TimelineBoundaryPayloadSchema = z.object({
  family: z.literal('boundary'),
  type: z.enum(boundaryTypeValues),
  label: z.string().min(1),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  metadata: TimelineMetadataSchema.default({}),
});

export const TimelineManualAdjustmentPayloadSchema = z.object({
  family: z.literal('manual'),
  type: z.literal('manual_adjustment'),
  operation: z.string().min(1),
  summary: z.string().min(1),
  changes: z.array(TimelineChangeSchema).default([]),
  metadata: TimelineMetadataSchema.default({}),
});

export const TimelineResultPayloadSchema = z.object({
  family: z.literal('result'),
  type: z.literal('result_announced'),
  announcement: ResultAnnouncementPayloadSchema,
  metadata: TimelineMetadataSchema.default({}),
});

export const TimelineFactPayloadSchema = z.discriminatedUnion('family', [
  TimelineDeclarationPayloadSchema,
  TimelineResolutionPayloadSchema,
  TimelineInteractionPayloadSchema,
  TimelineBoundaryPayloadSchema,
  TimelineManualAdjustmentPayloadSchema,
  TimelineResultPayloadSchema,
]);

export const TimelineFactTypeSchema = z.enum(timelineFactTypeValues);
export const TimelineCheckpointKindSchema = z.enum(timelineCheckpointKindValues);

export const TimelineFactDraftSchema = z.object({
  type: TimelineFactTypeSchema,
  flowId: z.string().min(1),
  causedByFactIds: z.array(z.string().min(1)).default([]),
  gameTime: TimelineGameTimeSchema,
  source: TimelineSourceSchema,
  actor: TimelineActorSchema.nullable(),
  refs: TimelineRefsSchema,
  visibility: TimelineVisibilitySchema,
  payload: TimelineFactPayloadSchema,
}).superRefine((value, ctx) => {
  if (value.type !== value.payload.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'fact type must match payload type',
      path: ['payload', 'type'],
    });
  }
});

export const TimelineFactSchema = TimelineFactDraftSchema.extend({
  schemaVersion: z.literal(TIMELINE_SCHEMA_VERSION),
  factId: z.string().min(1),
  sequence: z.number().int().positive(),
  recordedAt: z.string().min(1).nullable(),
  elapsedMs: z.number().int().nonnegative().nullable(),
});

export const TimelineCheckpointPayloadSchema = z.object({
  summary: z.string().min(1).optional(),
  metadata: TimelineMetadataSchema.default({}),
});

export const TimelineCheckpointDraftSchema = z.object({
  kind: TimelineCheckpointKindSchema,
  gameTime: TimelineGameTimeSchema,
  visibility: TimelineVisibilitySchema,
  refs: TimelineRefsSchema,
  payload: TimelineCheckpointPayloadSchema,
});

export const TimelineCheckpointSchema = TimelineCheckpointDraftSchema.extend({
  schemaVersion: z.literal(TIMELINE_SCHEMA_VERSION),
  checkpointId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  anchorFactId: z.string().min(1).nullable(),
  factCount: z.number().int().nonnegative(),
  recordedAt: z.string().min(1).nullable(),
  elapsedMs: z.number().int().nonnegative().nullable(),
});

export const TimelineClockStateSchema = z.object({
  nextFlowSequence: z.number().int().positive(),
  nextCheckpointSequence: z.number().int().positive(),
  lastLegacyProjectionSequence: z.number().int().nonnegative(),
});

export const TimelineStateSchema = z.object({
  schemaVersion: z.literal(TIMELINE_SCHEMA_VERSION),
  facts: z.array(TimelineFactSchema),
  checkpoints: z.array(TimelineCheckpointSchema),
  nextSequence: z.number().int().positive(),
  clock: TimelineClockStateSchema,
});

export type TimelineGameTime = z.infer<typeof TimelineGameTimeSchema>;
export type TimelineSource = z.infer<typeof TimelineSourceSchema>;
export type TimelineActor = z.infer<typeof TimelineActorSchema>;
export type TimelineRefs = z.infer<typeof TimelineRefsSchema>;
export type TimelineChange = z.infer<typeof TimelineChangeSchema>;
export type TimelineFactType = z.infer<typeof TimelineFactTypeSchema>;
export type TimelineCheckpointKind = z.infer<typeof TimelineCheckpointKindSchema>;
export type TimelineFactPayload = z.infer<typeof TimelineFactPayloadSchema>;
export type TimelineFactDraft = z.infer<typeof TimelineFactDraftSchema>;
export type TimelineFact = z.infer<typeof TimelineFactSchema>;
export type TimelineCheckpointPayload = z.infer<typeof TimelineCheckpointPayloadSchema>;
export type TimelineCheckpointDraft = z.infer<typeof TimelineCheckpointDraftSchema>;
export type TimelineCheckpoint = z.infer<typeof TimelineCheckpointSchema>;
export type TimelineClockState = z.infer<typeof TimelineClockStateSchema>;
export type TimelineState = z.infer<typeof TimelineStateSchema>;
