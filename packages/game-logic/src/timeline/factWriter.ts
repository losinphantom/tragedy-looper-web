import {
  TIMELINE_SCHEMA_VERSION,
  TimelineCheckpointDraftSchema,
  TimelineCheckpointSchema,
  TimelineGameTimeSchema,
  TimelineFactDraftSchema,
  TimelineFactSchema,
  TimelineRefsSchema,
  TimelineStateSchema,
  createEmptyTimelineRefs,
  type TimelineActor,
  type TimelineCheckpoint,
  type TimelineCheckpointKind,
  type TimelineCheckpointPayload,
  type TimelineFact,
  type TimelineFactPayload,
  type TimelineGameTime,
  type TimelineRefs,
  type TimelineSource,
  type TimelineState,
} from './factSchema';
import {
  allocateTimelineTimestamp,
  type TimelineTimestampRequest,
} from './factClock';
import type { TimelineVisibility } from './factVisibility';

export interface TimelineStateHost {
  loopIndex: number;
  day: number;
  v1: {
    timeline: TimelineState;
  };
}

export interface TimelineGameTimeInput {
  loop?: number;
  day?: number;
  phase?: string | null;
  phaseStep?: string | null;
  turn?: number | null;
}

export interface AppendTimelineFactInput {
  type: TimelineFactPayload['type'];
  flowId?: string;
  causedByFactIds?: string[];
  gameTime?: TimelineGameTimeInput;
  source: TimelineSource;
  actor?: TimelineActor | null;
  refs?: Partial<TimelineRefs>;
  visibility: TimelineVisibility;
  payload: TimelineFactPayload;
  timestamp?: TimelineTimestampRequest;
}

export interface CreateTimelineCheckpointInput {
  kind: TimelineCheckpointKind;
  gameTime?: TimelineGameTimeInput;
  visibility: TimelineVisibility;
  refs?: Partial<TimelineRefs>;
  payload?: TimelineCheckpointPayload;
  timestamp?: TimelineTimestampRequest;
}

const TIMELINE_ID_PAD = 6;

function padTimelineId(sequence: number): string {
  return String(sequence).padStart(TIMELINE_ID_PAD, '0');
}

export function createTimelineFactId(sequence: number): string {
  return `timeline-fact-${padTimelineId(sequence)}`;
}

export function createTimelineFlowId(sequence: number): string {
  return `timeline-flow-${padTimelineId(sequence)}`;
}

export function createTimelineCheckpointId(sequence: number): string {
  return `timeline-checkpoint-${padTimelineId(sequence)}`;
}

export function createInitialTimelineState(): TimelineState {
  return TimelineStateSchema.parse({
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    facts: [],
    checkpoints: [],
    nextSequence: 1,
    clock: {
      nextFlowSequence: 1,
      nextCheckpointSequence: 1,
      lastLegacyProjectionSequence: 0,
    },
  });
}

export function captureTimelineGameTime(
  host: Pick<TimelineStateHost, 'loopIndex' | 'day'>,
  input: TimelineGameTimeInput = {},
): TimelineGameTime {
  return TimelineGameTimeSchema.parse({
    loop: input.loop ?? host.loopIndex,
    day: input.day ?? host.day,
    phase: input.phase ?? null,
    phaseStep: input.phaseStep ?? null,
    turn: input.turn ?? null,
  });
}

function mergeTimelineRefs(refs?: Partial<TimelineRefs>): TimelineRefs {
  return TimelineRefsSchema.parse({
    ...createEmptyTimelineRefs(),
    ...refs,
  });
}

export function startTimelineFlow(host: TimelineStateHost): string {
  const sequence = host.v1.timeline.clock.nextFlowSequence;
  host.v1.timeline.clock.nextFlowSequence += 1;
  return createTimelineFlowId(sequence);
}

export function appendTimelineFact(
  host: TimelineStateHost,
  input: AppendTimelineFactInput,
): TimelineFact {
  const flowId = input.flowId ?? startTimelineFlow(host);
  const sequence = host.v1.timeline.nextSequence;
  const timestamp = allocateTimelineTimestamp(input.timestamp);
  const draft = TimelineFactDraftSchema.parse({
    type: input.type,
    flowId,
    causedByFactIds: input.causedByFactIds ?? [],
    gameTime: captureTimelineGameTime(host, input.gameTime),
    source: input.source,
    actor: input.actor ?? null,
    refs: mergeTimelineRefs(input.refs),
    visibility: input.visibility,
    payload: input.payload,
  });

  const fact = TimelineFactSchema.parse({
    ...draft,
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    factId: createTimelineFactId(sequence),
    sequence,
    recordedAt: timestamp.recordedAt,
    elapsedMs: timestamp.elapsedMs,
  });

  host.v1.timeline.facts.push(fact);
  host.v1.timeline.nextSequence += 1;
  return fact;
}

export function appendTimelineFacts(
  host: TimelineStateHost,
  inputs: AppendTimelineFactInput[],
): TimelineFact[] {
  return inputs.map(input => appendTimelineFact(host, input));
}

export function createTimelineCheckpoint(
  host: TimelineStateHost,
  input: CreateTimelineCheckpointInput,
): TimelineCheckpoint {
  const latestFact = host.v1.timeline.facts.at(-1) ?? null;
  const checkpointSequence = host.v1.timeline.clock.nextCheckpointSequence;
  const timestamp = allocateTimelineTimestamp(input.timestamp);
  const draft = TimelineCheckpointDraftSchema.parse({
    kind: input.kind,
    gameTime: captureTimelineGameTime(host, input.gameTime),
    visibility: input.visibility,
    refs: mergeTimelineRefs(input.refs),
    payload: input.payload ?? {
      metadata: {},
    },
  });

  const checkpoint = TimelineCheckpointSchema.parse({
    ...draft,
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    checkpointId: createTimelineCheckpointId(checkpointSequence),
    sequence: latestFact?.sequence ?? 0,
    anchorFactId: latestFact?.factId ?? null,
    factCount: host.v1.timeline.facts.length,
    recordedAt: timestamp.recordedAt,
    elapsedMs: timestamp.elapsedMs,
  });

  host.v1.timeline.checkpoints.push(checkpoint);
  host.v1.timeline.clock.nextCheckpointSequence += 1;
  return checkpoint;
}
