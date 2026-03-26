import { describe, expect, it } from 'vitest';
import {
  TIMELINE_SCHEMA_VERSION,
  TimelineCheckpointSchema,
  TimelineFactSchema,
  createEmptyTimelineRefs,
} from './factSchema';
import {
  TimelineVisibilitySchema,
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
} from './factVisibility';

describe('timeline fact schema', () => {
  it('parses valid fact envelopes', () => {
    const result = TimelineFactSchema.safeParse({
      schemaVersion: TIMELINE_SCHEMA_VERSION,
      factId: 'timeline-fact-000001',
      type: 'ability_declared',
      flowId: 'timeline-flow-000001',
      causedByFactIds: [],
      sequence: 1,
      gameTime: {
        loop: 0,
        day: 1,
        phase: 'goodwill',
        phaseStep: 'declare',
        turn: null,
      },
      recordedAt: null,
      elapsedMs: null,
      source: {
        system: 'move',
        id: 'declareAbility',
        phase: 'goodwill',
      },
      actor: {
        role: 'protagonist',
        seatId: '1',
        characterId: 'doctor',
      },
      refs: createEmptyTimelineRefs(),
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'declaration',
        type: 'ability_declared',
        subject: 'ability',
        summary: 'leader declared a goodwill ability',
        abilityId: 'doctor.goodwill',
        selectedTargets: {
          target: 'patient',
        },
        metadata: {},
      },
    });

    expect(result.success).toBe(true);
  });

  it('parses valid checkpoints', () => {
    const result = TimelineCheckpointSchema.safeParse({
      schemaVersion: TIMELINE_SCHEMA_VERSION,
      checkpointId: 'timeline-checkpoint-000001',
      kind: 'phase_boundary',
      sequence: 1,
      anchorFactId: 'timeline-fact-000001',
      factCount: 1,
      gameTime: {
        loop: 0,
        day: 1,
        phase: 'goodwill',
        phaseStep: 'resolve',
        turn: null,
      },
      recordedAt: null,
      elapsedMs: null,
      visibility: createMastermindTimelineVisibility(),
      refs: createEmptyTimelineRefs(),
      payload: {
        summary: 'goodwill window resolved',
        metadata: {
          phase: 'goodwill',
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed visibility metadata', () => {
    const result = TimelineVisibilitySchema.safeParse({
      audience: 'seat-private',
      seatIds: [],
      fieldOverrides: {},
    });

    expect(result.success).toBe(false);
  });

  it('rejects payload and envelope type mismatches', () => {
    const result = TimelineFactSchema.safeParse({
      schemaVersion: TIMELINE_SCHEMA_VERSION,
      factId: 'timeline-fact-000001',
      type: 'ability_resolved',
      flowId: 'timeline-flow-000001',
      causedByFactIds: [],
      sequence: 1,
      gameTime: {
        loop: 0,
        day: 1,
        phase: 'goodwill',
        phaseStep: 'resolve',
        turn: null,
      },
      recordedAt: null,
      elapsedMs: null,
      source: {
        system: 'move',
        id: 'resolveAbility',
      },
      actor: null,
      refs: createEmptyTimelineRefs(),
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'declaration',
        type: 'ability_declared',
        subject: 'ability',
        selectedTargets: {},
        metadata: {},
      },
    });

    expect(result.success).toBe(false);
  });
});
