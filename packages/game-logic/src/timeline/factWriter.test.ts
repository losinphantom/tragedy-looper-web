import { describe, expect, it } from 'vitest';
import { TragedyLooper } from '../game';
import type { TragedyGameState } from '../game';
import {
  appendTimelineFact,
  appendTimelineFacts,
  createTimelineCheckpoint,
  startTimelineFlow,
} from './factWriter';
import {
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
} from './factVisibility';

function createGame(): TragedyGameState {
  return TragedyLooper.setup!({} as any) as TragedyGameState;
}

describe('timeline fact writer', () => {
  it('assigns monotonic sequences and deterministic ids', () => {
    const G = createGame();
    G.day = 1;

    const flowId = startTimelineFlow(G);
    const facts = appendTimelineFacts(G, [
      {
        type: 'ability_declared',
        flowId,
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
        gameTime: {
          phase: 'goodwill',
          phaseStep: 'declare',
        },
      },
      {
        type: 'ability_resolved',
        flowId,
        causedByFactIds: ['timeline-fact-000001'],
        source: {
          system: 'move',
          id: 'resolveAbility',
          phase: 'goodwill',
        },
        actor: {
          role: 'mastermind',
          seatId: '0',
          characterId: 'doctor',
        },
        visibility: createMastermindTimelineVisibility(),
        payload: {
          family: 'resolution',
          type: 'ability_resolved',
          outcome: 'allowed',
          summary: 'mastermind allowed the ability',
          changes: [],
          metadata: {},
        },
        gameTime: {
          phase: 'goodwill',
          phaseStep: 'resolve',
        },
      },
    ]);

    expect(flowId).toBe('timeline-flow-000001');
    expect(facts[0]?.sequence).toBe(1);
    expect(facts[1]?.sequence).toBe(2);
    expect(facts[0]?.factId).toBe('timeline-fact-000001');
    expect(facts[1]?.factId).toBe('timeline-fact-000002');
    expect(facts[0]?.causedByFactIds).toEqual([]);
    expect(facts[1]?.causedByFactIds).toEqual(['timeline-fact-000001']);
    expect(facts[0]?.recordedAt).toBeNull();
    expect(facts[0]?.elapsedMs).toBeNull();
    expect(facts[1]?.recordedAt).toBeNull();
    expect(facts[1]?.elapsedMs).toBeNull();
    expect(G.v1.timeline.nextSequence).toBe(3);
    expect(JSON.parse(JSON.stringify(G.v1.timeline.facts))).toHaveLength(2);
  });

  it('anchors checkpoints to the current fact stream', () => {
    const G = createGame();
    G.day = 2;

    const fact = appendTimelineFact(G, {
      type: 'phase_boundary',
      source: {
        system: 'phase',
        id: 'beginGoodwillWindowPhase',
        phase: 'goodwill',
      },
      actor: null,
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'boundary',
        type: 'phase_boundary',
        label: 'goodwill phase started',
        metadata: {},
      },
      gameTime: {
        phase: 'goodwill',
        phaseStep: 'begin',
      },
    });

    const checkpoint = createTimelineCheckpoint(G, {
      kind: 'phase_boundary',
      visibility: createMastermindTimelineVisibility(),
      payload: {
        summary: 'goodwill phase checkpoint',
        metadata: {
          phase: 'goodwill',
        },
      },
      gameTime: {
        phase: 'goodwill',
        phaseStep: 'checkpoint',
      },
    });

    expect(checkpoint.anchorFactId).toBe(fact.factId);
    expect(checkpoint.sequence).toBe(fact.sequence);
    expect(checkpoint.factCount).toBe(1);
    expect(G.v1.timeline.checkpoints[0]).toEqual(checkpoint);
    expect(G.v1.timeline.clock.nextCheckpointSequence).toBe(2);
  });

  it('rejects non-null shared authoritative timestamps', () => {
    const G = createGame();

    expect(() => appendTimelineFact(G, {
      type: 'result_announced',
      source: {
        system: 'move',
        id: 'confirmLoopResult',
      },
      actor: null,
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'result',
        type: 'result_announced',
        announcement: {
          resultType: 'loop_end',
          title: 'loop complete',
          summary: 'the loop ended',
        },
        metadata: {},
      },
      timestamp: {
        mode: 'shared-deterministic',
        recordedAt: '2026-03-26T00:00:00.000Z',
      },
    })).toThrow(/shared-deterministic/);
  });
});
