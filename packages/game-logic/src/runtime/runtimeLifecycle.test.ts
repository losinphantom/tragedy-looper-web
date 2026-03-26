import { describe, expect, it, vi } from 'vitest';
import { INVALID_MOVE } from 'boardgame.io/core';

import { TragedyLooper } from '../game';
import type { TragedyGameState } from '../game';
import { autoResolveIncidents } from '../engine/autoResolve';
import { phases } from '../phases';
import { moves } from '../moves';
import { createEmptyTokenBag, getToken } from '../utils/tokenHelpers';

describe('shared runtime compatibility layer', () => {
  it('initializes an empty pendingInteractions queue in setup', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;

    expect((G.v1 as any).pendingInteractions).toEqual([]);
    expect((G.v1 as any).loopState.revealedRules).toEqual([]);
    expect((G.v1 as any).loopState.revealedIncidentCulprits).toEqual({});
    expect('pendingButterflyChoice' in (G.v1 as any)).toBe(false);
  });

  it('creates a visible time_spiral interaction in manual mode', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = false;
    G.loopIndex = 0;
    G.day = 0;

    (phases as any).time_spiral.onBegin({ G, events: { endPhase: vi.fn() } });

    const interactions = (G.v1 as any).pendingInteractions;
    expect(interactions).toHaveLength(1);
    expect(interactions[0]).toMatchObject({
      kind: 'time_spiral_discussion',
      actorSeat: '0',
      phase: 'time_spiral',
      blocking: false,
    });

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });
    expect((protagonistView.v1 as any).pendingInteractions).toHaveLength(1);
    expect((protagonistView.v1 as any).pendingInteractions[0]).toMatchObject({
      kind: 'time_spiral_discussion',
      actorSeat: '0',
      phase: 'time_spiral',
    });
  });

  it('mirrors pending manual incidents into pendingInteractions and redacts culprit for protagonists', () => {
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
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'faraway_murder' }];
    G.v1.incidentCulprits = { '1_faraway_murder': 'culprit' };

    (phases as any).incidents.onBegin({ G, events: { endPhase: vi.fn(), setPhase: vi.fn() } });

    const interactions = (G.v1 as any).pendingInteractions;
    expect(interactions).toHaveLength(1);
    expect(interactions[0]).toMatchObject({
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      sourceId: '1_faraway_murder',
      day: 1,
      incidentId: 'faraway_murder',
      culpritId: 'culprit',
    });

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });
    expect((protagonistView.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'incident_resolution',
        actorSeat: '0',
        culpritId: '',
        description: '事件裁定处理中',
      }),
    ]);
    expect((protagonistView.v1 as any).pendingIncidents).toEqual([]);
  });

  it('removes hidden runtime interactions from non-mastermind player views', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
    G.v1.pendingInteractions = [
      {
        id: 'ability:doctor_brain',
        kind: 'mastermind_ability',
        actorSeat: '0',
        phase: 'mastermind_abilities',
        blocking: true,
        sourceId: 'doctor_brain',
        ruleId: 'brain_intrigue_ability',
        characterId: 'doctor',
        mandatory: true,
        description: '医生发动主谋能力',
        targetSlots: [],
      },
      {
        id: 'butterfly:character:doctor',
        kind: 'butterfly_choice',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: 'doctor',
        targetId: 'doctor',
        targetKind: 'character',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
        description: '蝴蝶效应三选一',
      },
    ] as any;

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '2' });
    const mastermindView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '0' });

    expect((protagonistView.v1 as any).pendingInteractions).toEqual([]);
    expect((protagonistView.v1 as any).activeInteractionId).toBeNull();
    expect('pendingButterflyChoice' in (protagonistView.v1 as any)).toBe(false);
    expect('pendingButterflyChoice' in (mastermindView.v1 as any)).toBe(false);
    expect((mastermindView.v1 as any).pendingInteractions[1]).toMatchObject({
      kind: 'butterfly_choice',
      sourceId: 'doctor',
      targetId: 'doctor',
      allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
    });
  });

  it('keeps day_end mandatory queue details hidden from protagonists while leaving the phase checkpoint in place', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingAbilities = [{
      id: 'serial_killer_day_end_kill:doctor',
      ruleId: 'serial_killer_day_end_kill',
      characterId: 'doctor',
      timing: 'day_end',
      phase: 'day_end',
      mandatory: true,
      description: '杀人魔在 day_end 发动能力',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [{
      id: 'ability:serial_killer_day_end_kill:doctor',
      kind: 'mastermind_ability',
      actorSeat: '0',
      phase: 'day_end',
      blocking: true,
      sourceId: 'serial_killer_day_end_kill:doctor',
      ruleId: 'serial_killer_day_end_kill',
      characterId: 'doctor',
      mandatory: true,
      description: '杀人魔在 day_end 发动能力',
      targetSlots: [],
    }];
    G.v1.activeInteractionId = 'ability:serial_killer_day_end_kill:doctor';

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });
    const mastermindView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '0' });

    expect((protagonistView.v1 as any).pendingAbilities).toEqual([]);
    expect((protagonistView.v1 as any).pendingInteractions).toEqual([]);
    expect((protagonistView.v1 as any).activeInteractionId).toBeNull();
    expect((mastermindView.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'mastermind_ability',
        phase: 'day_end',
        ruleId: 'serial_killer_day_end_kill',
      }),
    ]);
  });

  it('keeps runtime goodwill payloads visible for leader but redacts them for other protagonists', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
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

    const leaderView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });
    const otherProtagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '2' });
    const mastermindView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '0' });

    expect((leaderView.v1 as any).pendingInteractions[0]).toMatchObject({
      kind: 'goodwill',
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
    });
    expect((otherProtagonistView.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'goodwill',
        actorSeat: '0',
        phase: 'mastermind_resolving',
        eligibleAbilities: [],
        currentDeclaration: null,
        observerCharacterId: 'doctor',
        observerAbilityId: 'nurse',
        observerSelectedTargets: {
          target: 'patient',
        },
        description: '友好能力处理中',
      }),
    ]);
    expect((otherProtagonistView.v1 as any).goodwillInteraction).toMatchObject({
      phase: 'mastermind_resolving',
      eligibleAbilities: [],
      currentDeclaration: null,
      observerCharacterId: 'doctor',
      observerAbilityId: 'nurse',
      observerSelectedTargets: {
        target: 'patient',
      },
    });
    expect((mastermindView.v1 as any).pendingInteractions[0]).toMatchObject({
      kind: 'goodwill',
      actorSeat: '0',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'nurse',
      }],
      currentDeclaration: {
        characterId: 'doctor',
        abilityId: 'nurse',
        selectedTargets: {
          target: 'patient',
        },
      },
    });
    expect((otherProtagonistView.v1 as any).activeInteractionId).toBe('goodwill:mastermind_resolving');
  });

  it('redacts loop result confirmation reasons for protagonists while keeping the wait state visible', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingInteractions = [{
      id: 'loop_result:1',
      kind: 'loop_result_resolution',
      actorSeat: '0',
      phase: 'loop_end_check',
      blocking: true,
      sourceId: 'loop_result:1',
      description: '轮回结果待确认',
      resultType: 'loop_failure',
      resultLabel: '第 1 轮回结果确认',
      failureReasons: [{
        id: 'system:death',
        label: '主人公死亡',
        detail: '系统已检测到本轮的直接败北条件。',
      }],
      effectOptions: [],
      availableOutcomes: [{
        id: 'next_loop',
        label: '进入时间裂隙',
        detail: '下一轮将从第 2 轮回开始。',
      }],
    }] as any;
    G.v1.activeInteractionId = 'loop_result:1';

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });
    const mastermindView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '0' });

    expect((protagonistView.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'loop_result_resolution',
        description: '轮回结果确认中',
        failureReasons: [],
        effectOptions: [],
        availableOutcomes: [],
      }),
    ]);
    expect((protagonistView.v1 as any).activeInteractionId).toBe('loop_result:1');
    expect((mastermindView.v1 as any).pendingInteractions[0]).toMatchObject({
      kind: 'loop_result_resolution',
      failureReasons: [{
        id: 'system:death',
        label: '主人公死亡',
      }],
      availableOutcomes: [{
        id: 'next_loop',
        label: '进入时间裂隙',
      }],
    });
  });

  it('does not leak hidden interaction counts through placeholder arrays', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
    G.v1.pendingAbilities = [{
      id: 'brain:doctor',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: 'Brain ability',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [
      {
        id: 'ability:doctor_brain',
        kind: 'mastermind_ability',
        actorSeat: '0',
        phase: 'mastermind_abilities',
        blocking: true,
        sourceId: 'doctor_brain',
        ruleId: 'brain_intrigue_ability',
        characterId: 'doctor',
        mandatory: true,
        description: '医生发动主谋能力',
        targetSlots: [],
      },
      {
        id: 'incident:1_murder',
        kind: 'incident_resolution',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: '1_murder',
        day: 1,
        incidentId: 'murder',
        culpritId: 'doctor',
        description: '事件裁定：murder',
        targetSlots: [],
      },
    ] as any;

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '2' });

    expect((protagonistView.v1 as any).pendingAbilities).toEqual([]);
    expect((protagonistView.v1 as any).pendingInteractions).toEqual([]);
    expect((protagonistView.v1 as any).abilityPhase).toBe('idle');
  });

  it('keeps public incident targeting metadata available for board highlights without leaking culprit identity', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingInteractions = [{
      id: 'incident:1_faraway_murder',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: '1_faraway_murder',
      day: 1,
      incidentId: 'faraway_murder',
      culpritId: 'doctor',
      description: '事件裁定：faraway_murder',
      targetSlots: [{
        slotId: 'target',
        label: '目标',
        kind: 'character_or_location',
        eligibleCharacterIds: ['doctor'],
        eligibleLocationIds: ['school'],
      }],
    }] as any;
    G.v1.activeInteractionId = 'incident:1_faraway_murder';

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });

    expect((protagonistView.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'incident:1_faraway_murder',
        kind: 'incident_resolution',
        actorSeat: '0',
        sourceId: undefined,
        culpritId: '',
        description: '事件裁定处理中',
        targetSlots: [{
          slotId: 'target',
          label: '目标',
          kind: 'character_or_location',
          eligibleCharacterIds: ['doctor'],
          eligibleLocationIds: ['school'],
        }],
      }),
    ]);
    expect((protagonistView.v1 as any).activeInteractionId).toBe('incident:1_faraway_murder');
    expect(JSON.stringify(protagonistView)).not.toContain('"culpritId":"doctor"');
  });

  it('only exposes the active hidden interaction to non-mastermind viewers', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingInteractions = [
      {
        id: 'ability:doctor_brain',
        kind: 'mastermind_ability',
        actorSeat: '0',
        phase: 'mastermind_abilities',
        blocking: true,
        sourceId: 'doctor_brain',
        ruleId: 'brain_intrigue_ability',
        characterId: 'doctor',
        mandatory: true,
        description: '医生发动主谋能力',
        targetSlots: [],
      },
      {
        id: 'incident:1_murder',
        kind: 'incident_resolution',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: '1_murder',
        day: 1,
        incidentId: 'murder',
        culpritId: 'doctor',
        description: '事件裁定：murder',
        targetSlots: [{
          slotId: 'target',
          label: '目标',
          kind: 'character',
          eligibleCharacterIds: ['doctor'],
        }],
      },
      {
        id: 'butterfly:character:doctor',
        kind: 'butterfly_choice',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: 'doctor',
        targetId: 'doctor',
        targetKind: 'character',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
        description: '蝴蝶效应三选一',
      },
    ] as any;
    G.v1.activeInteractionId = 'incident:1_murder';

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });

    expect((protagonistView.v1 as any).pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'incident:1_murder',
        kind: 'incident_resolution',
        culpritId: '',
        description: '事件裁定处理中',
        targetSlots: [{
          slotId: 'target',
          label: '目标',
          kind: 'character',
          eligibleCharacterIds: ['doctor'],
        }],
      }),
    ]);
    expect((protagonistView.v1 as any).activeInteractionId).toBe('incident:1_murder');
  });

  it('strips script-truth fields from protagonist playerView while preserving detective private notes only for seat C', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.castDefinitions = [{
      characterId: 'doctor',
      roleId: 'brain',
      backRoleId: 'key_person',
    }];
    G.v1.originalRoles = {
      doctor: 'friend',
    };
    G.v1.revealedRoleMemory = {
      doctor: 'serial_killer',
    };
    G.v1.detectiveGuesses = {
      '1_murder': 'doctor',
    };
    G.v1.exCardAssignment = {
      '1': 'A',
      '2': 'C',
      '3': 'B',
    };

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });
    const detectiveView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '2' });
    const mastermindView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '0' });

    expect((protagonistView.v1 as any).castDefinitions).toEqual([]);
    expect((protagonistView.v1 as any).originalRoles).toEqual({});
    expect((protagonistView.v1 as any).revealedRoleMemory).toEqual({});
    expect((protagonistView.v1 as any).detectiveGuesses).toBeUndefined();
    expect((detectiveView.v1 as any).detectiveGuesses).toEqual({ '1_murder': 'doctor' });
    expect((mastermindView.v1 as any).detectiveGuesses).toBeUndefined();
    expect(JSON.stringify(protagonistView)).not.toContain('brain');
    expect(JSON.stringify(protagonistView)).not.toContain('key_person');
    expect(JSON.stringify(protagonistView)).not.toContain('friend');
  });

  it('preserves public incident outcome flags while redacting culprit ids', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.loopState.incidentHistory = [{
      loop: 1,
      day: 2,
      incidentId: 'murder',
      culpritId: 'doctor',
      wasImmune: true,
    }];

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });

    expect((protagonistView.v1 as any).loopState.incidentHistory).toEqual([{
      loop: 1,
      day: 2,
      incidentId: 'murder',
      culpritId: '',
      wasImmune: true,
    }]);
  });

  it('keeps revealed rules and revealed incident culprits visible to protagonists', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.loopState.revealedRules = ['paranoia_rule_x'];
    G.v1.loopState.revealedIncidentCulprits = {
      '2_murder': 'doctor',
    };
    G.v1.loopState.incidentHistory = [{
      loop: 1,
      day: 2,
      incidentId: 'murder',
      culpritId: 'doctor',
      wasImmune: false,
    }];

    const protagonistView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '1' });
    const mastermindView = TragedyLooper.playerView!({ G, ctx: {} as any, playerID: '0' });

    expect((protagonistView.v1 as any).loopState.revealedRules).toEqual(['paranoia_rule_x']);
    expect((protagonistView.v1 as any).loopState.revealedIncidentCulprits).toEqual({ '2_murder': 'doctor' });
    expect((protagonistView.v1 as any).loopState.incidentHistory).toEqual([
      expect.objectContaining({ culpritId: '' }),
    ]);
    expect((mastermindView.v1 as any).loopState.incidentHistory).toEqual([
      expect.objectContaining({ culpritId: 'doctor' }),
    ]);
  });

  it('uses the runtime goodwill interaction as the move source when legacy goodwill state conflicts', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
    G.v1.goodwillInteraction = {
      phase: 'leader_choosing',
      eligibleAbilities: [{
        characterId: 'police',
        abilityId: 'legacy_ability',
        label: 'Legacy goodwill',
        used: false,
      }],
      currentDeclaration: null,
    };
    G.v1.pendingInteractions = [{
      id: 'goodwill:leader_choosing',
      kind: 'goodwill',
      actorSeat: '1',
      phase: 'leader_choosing',
      blocking: true,
      sourceId: 'leader_choosing',
      description: '友好能力阶段：leader_choosing',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'nurse',
        label: 'Runtime goodwill',
        used: false,
      }],
      currentDeclaration: null,
    }];
    G.v1.activeInteractionId = 'goodwill:leader_choosing';

    const result = (moves.declareAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '1' },
      'doctor',
      'nurse',
    );

    expect(result).toBeUndefined();
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'goodwill:mastermind_resolving',
        kind: 'goodwill',
        actorSeat: '0',
        phase: 'mastermind_resolving',
        currentDeclaration: {
          characterId: 'doctor',
          abilityId: 'nurse',
        },
        eligibleAbilities: [{
          characterId: 'doctor',
          abilityId: 'nurse',
          label: 'Runtime goodwill',
          used: false,
        }],
      }),
    ]);
    expect(G.v1.activeInteractionId).toBe('goodwill:mastermind_resolving');
    expect(G.v1.goodwillInteraction).toMatchObject({
      phase: 'mastermind_resolving',
      currentDeclaration: {
        characterId: 'doctor',
        abilityId: 'nurse',
      },
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'nurse',
        label: 'Runtime goodwill',
        used: false,
      }],
    });
  });

  it('does not let the mastermind skip unresolved runtime incident interactions', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    (G.v1 as any).pendingInteractions = [{
      id: 'incident:1_murder',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      sourceId: '1_murder',
      culpritId: 'doctor',
      blocking: true,
    }];

    const events = { endPhase: vi.fn() };
    const result = (moves.confirmIncidentsComplete as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect((G.v1 as any).pendingInteractions).toHaveLength(1);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('replaces an incident interaction with a butterfly choice interaction and clears it after resolution', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.pendingInteractions = [{
      id: 'incident:1_butterfly_effect',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: '1_butterfly_effect',
      day: 1,
      incidentId: 'butterfly_effect',
      culpritId: 'culprit',
      description: '事件裁定：butterfly_effect',
      targetSlots: [{
        slotId: 'target',
        label: '受影响目标',
        kind: 'character_or_location',
        eligibleCharacterIds: ['culprit', 'witness'],
        eligibleLocationIds: ['city'],
      }],
    }];
    G.v1.activeInteractionId = 'incident:1_butterfly_effect';

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_butterfly_effect',
      true,
      { target: 'city' },
    );

    expect(G.v1.pendingIncidents).toEqual([]);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'butterfly:location:city',
        kind: 'butterfly_choice',
        actorSeat: '0',
        phase: 'incidents',
        targetId: 'city',
        targetKind: 'location',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
      }),
    ]);
    expect(G.v1.activeInteractionId).toBe('butterfly:location:city');
    expect(events.endPhase).not.toHaveBeenCalled();

    (moves.chooseButterflyToken as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'goodwill',
    );

    expect(getToken(G.v1.locations.city, 'goodwill')).toBe(1);
    expect(G.v1.pendingInteractions).toEqual([]);
    expect(G.v1.activeInteractionId).toBeNull();
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('keeps the incidents phase open when runtime incident interactions remain after butterfly resolution', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.pendingInteractions = [
      {
        id: 'incident:1_murder',
        kind: 'incident_resolution',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: '1_murder',
        day: 1,
        incidentId: 'murder',
        culpritId: 'doctor',
        description: '事件裁定：murder',
        targetSlots: [],
      },
      {
        id: 'butterfly:location:city',
        kind: 'butterfly_choice',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: 'city',
        targetId: 'city',
        targetKind: 'location',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
        description: '蝴蝶效应三选一',
      },
    ] as any;
    G.v1.activeInteractionId = 'butterfly:location:city';

    const events = { endPhase: vi.fn() };

    const result = (moves.chooseButterflyToken as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'goodwill',
    );

    expect(result).toBeUndefined();
    expect(getToken(G.v1.locations.city, 'goodwill')).toBe(1);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'incident:1_murder',
        kind: 'incident_resolution',
      }),
    ]);
    expect(G.v1.activeInteractionId).toBe('incident:1_murder');
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('keeps hidden trigger reasons out of public incident logs during auto resolve', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      culprit: 'detective',
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'suicide' }];
    G.v1.incidentCulprits = { '1_suicide': 'culprit' };

    autoResolveIncidents(G);

    expect(G.publicLog).toContain('📋 事件未发生（条件未满足）');
    expect(G.publicLog.some(line => line.includes('侦探'))).toBe(false);
  });

  it('keeps hidden trigger reasons out of public incident logs during manual resolve', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      culprit: 'detective',
    };
    G.v1.pendingInteractions = [{
      id: 'incident:1_suicide',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: '1_suicide',
      day: 1,
      incidentId: 'suicide',
      culpritId: 'culprit',
      description: '事件裁定：suicide',
      targetSlots: [],
    }] as any;

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    const result = (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_suicide',
      false,
    );

    expect(result).toBeUndefined();
    expect(G.publicLog).toContain('📋 事件未发生（条件未满足）');
    expect(G.publicLog.some(line => line.includes('侦探'))).toBe(false);

    const incidentEvent = [...G.v1.eventLogs].reverse().find(event => event.type === 'incident');
    expect(incidentEvent).toBeTruthy();
    expect((incidentEvent?.payload as any).outcome).toBe('not_triggered');
    expect((incidentEvent?.payload as any).characterId).toBeUndefined();
    expect((incidentEvent?.payload as any).targetId).toBeUndefined();
    expect((incidentEvent?.payload as any).locationId).toBeUndefined();
  });
});
