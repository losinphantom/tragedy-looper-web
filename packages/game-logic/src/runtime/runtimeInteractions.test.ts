import { describe, expect, it, vi } from 'vitest';

import { TragedyLooper } from '../game';
import type { TragedyGameState } from '../game';
import { phases } from '../phases';
import { RuntimeInteractionSchema } from '../runtimeInteractionSchema';
import { buildRuntimeInteractions } from './interactionBuilder';
import { createEmptyTokenBag } from '../utils/tokenHelpers';

describe('runtime pendingInteractions compatibility layer', () => {
  it('initializes pendingInteractions in setup', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;

    expect(Array.isArray((G.v1 as any).pendingInteractions)).toBe(true);
    expect((G.v1 as any).pendingInteractions).toEqual([]);
  });

  it('creates a public discussion interaction during manual time_spiral', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = false;
    G.loopIndex = 0;
    G.day = 0;

    (phases as any).time_spiral.onBegin({
      G,
      events: { endPhase: vi.fn() },
    });

    expect((G.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'time_spiral_discussion',
        phase: 'time_spiral',
        actorSeat: '0',
      }),
    ]);
  });

  it('mirrors pending incidents into pendingInteractions and redacts them for protagonists', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'faraway_murder' }];
    G.v1.incidentCulprits = { '1_faraway_murder': 'culprit' };

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const mastermindView = TragedyLooper.playerView!({ G, playerID: '0', ctx: {} as any });
    const protagonistView = TragedyLooper.playerView!({ G, playerID: '1', ctx: {} as any });

    expect(((G.v1 as any).pendingInteractions || [])).toEqual([
      expect.objectContaining({
        kind: 'incident_resolution',
        phase: 'incidents',
        actorSeat: '0',
        culpritId: 'culprit',
      }),
    ]);
    expect(((mastermindView.v1 as any).pendingInteractions || [])[0]).toEqual(
      expect.objectContaining({
        culpritId: 'culprit',
      }),
    );
    expect(((protagonistView.v1 as any).pendingInteractions || [])[0]).toEqual(
      expect.objectContaining({
        culpritId: '',
      }),
    );
    expect((((protagonistView.v1 as any).pendingInteractions || [])[0]?.targetSlots || [])).toEqual([
      expect.objectContaining({
        slotId: 'target',
        kind: 'character',
        eligibleCharacterIds: ['target'],
      }),
    ]);
  });

  it('builds a stable ordered interaction queue from legacy runtime slices without incident backfill', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingAbilities = [{
      id: 'brain:doctor',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: 'Brain ability',
      targetSlots: [],
    }];
    G.v1.goodwillInteraction = {
      phase: 'mastermind_resolving',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'nurse',
        label: 'Doctor goodwill',
        used: false,
      }],
      currentDeclaration: {
        characterId: 'doctor',
        abilityId: 'nurse',
      },
    };
    expect(buildRuntimeInteractions(G, 'incidents')).toEqual([
      {
        id: 'ability:brain:doctor',
        kind: 'mastermind_ability',
        actorSeat: '0',
        phase: 'mastermind_abilities',
        blocking: true,
        sourceId: 'brain:doctor',
        ruleId: 'brain_intrigue_ability',
        characterId: 'doctor',
        mandatory: true,
        description: 'Brain ability',
        targetSlots: [],
      },
      {
        id: 'goodwill:mastermind_resolving',
        kind: 'goodwill',
        actorSeat: '0',
        phase: 'mastermind_resolving',
        blocking: true,
        sourceId: 'mastermind_resolving',
        description: '友好能力阶段：mastermind_resolving',
        eligibleAbilities: [{
          characterId: 'doctor',
          abilityId: 'nurse',
          label: 'Doctor goodwill',
          used: false,
        }],
        currentDeclaration: {
          characterId: 'doctor',
          abilityId: 'nurse',
        },
        observerCharacterId: 'doctor',
        observerAbilityId: 'nurse',
        observerSelectedTargets: undefined,
      },
    ]);
  });

  it('keeps goodwill observer fields schema-valid when declaration targets exist', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.goodwillInteraction = {
      phase: 'mastermind_resolving',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'nurse',
        label: 'Doctor goodwill',
        used: false,
      }],
      currentDeclaration: {
        characterId: 'doctor',
        abilityId: 'nurse',
        selectedTargets: {
          target: 'patient',
        },
      },
    };

    const interactions = buildRuntimeInteractions(G, 'goodwill_window');
    const parsed = RuntimeInteractionSchema.safeParse(interactions[0]);

    expect(parsed.success).toBe(true);
    expect(interactions[0]).toMatchObject({
      kind: 'goodwill',
      observerCharacterId: 'doctor',
      observerAbilityId: 'nurse',
      observerSelectedTargets: {
        target: 'patient',
      },
    });
  });

  it('exposes observer-only goodwill summary for non-leader protagonists without control payloads', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
    G.v1.pendingInteractions = [{
      id: 'goodwill:mastermind_resolving',
      kind: 'goodwill',
      actorSeat: '0',
      phase: 'mastermind_resolving',
      blocking: true,
      sourceId: 'mastermind_resolving',
      description: '友好能力阶段：mastermind_resolving',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'nurse',
        label: 'Doctor goodwill',
        used: false,
        targetSlots: [{
          slotId: 'target',
          label: '目标角色',
          kind: 'character',
          eligibleCharacterIds: ['patient'],
        }],
      }],
      currentDeclaration: {
        characterId: 'doctor',
        abilityId: 'nurse',
        selectedTargets: {
          target: 'patient',
        },
      },
    }];
    G.v1.activeInteractionId = 'goodwill:mastermind_resolving';

    const protagonistView = TragedyLooper.playerView!({ G, playerID: '2', ctx: {} as any });

    expect((protagonistView.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'goodwill',
        actorSeat: '0',
        eligibleAbilities: [],
        currentDeclaration: null,
        observerCharacterId: 'doctor',
        observerAbilityId: 'nurse',
        observerSelectedTargets: {
          target: 'patient',
        },
      }),
    ]);
    expect(((protagonistView.v1 as any).pendingInteractions?.[0]?.eligibleAbilities || [])).toEqual([]);
  });
});
