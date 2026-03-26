import { describe, expect, it } from 'vitest';
import {
  LoopResultResolutionInteractionSchema,
  RuntimeInteractionSchema,
  type TragedyGameState,
} from '@tragedy/game-logic';

import {
  getBoardInteractionState,
  getLegalTargetsFromInteractionState,
  getModuleSurfaceViewModel,
} from './runtimeInteractionView';

type RuntimeInteraction = TragedyGameState['v1']['pendingInteractions'][number];

describe('getBoardInteractionState', () => {
  it('parses shared runtime interaction schemas before deriving public panels', () => {
    const parsed = RuntimeInteractionSchema.safeParse({
      id: 'loop_result:1',
      kind: 'loop_result_resolution',
      actorSeat: '0',
      phase: 'loop_end_check',
      blocking: true,
      description: '轮回结束确认',
      resultType: 'loop_end',
      resultLabel: '第 1 轮回结束',
      failureReasons: [],
      effectOptions: [],
      availableOutcomes: [{ id: 'next_loop', label: '进入下一轮' }],
    });

    expect(parsed.success).toBe(true);
    expect(LoopResultResolutionInteractionSchema.safeParse(parsed.success ? parsed.data : null).success).toBe(true);
  });

  it('derives complete panel view models from runtime interactions alone', () => {
    const interactions: RuntimeInteraction[] = [
      {
        id: 'ability:brain',
        kind: 'mastermind_ability',
        actorSeat: '0',
        phase: 'mastermind_abilities',
        blocking: true,
        sourceId: 'brain',
        ruleId: 'brain',
        characterId: 'doctor',
        mandatory: false,
        description: 'Legacy brain prompt',
        targetSlots: [],
      },
      {
        id: 'goodwill:leader_choosing',
        kind: 'goodwill',
        actorSeat: '1',
        phase: 'leader_choosing',
        blocking: true,
        sourceId: 'leader_choosing',
        description: '友好能力阶段：leader_choosing',
        eligibleAbilities: [
          {
            characterId: 'doctor',
            abilityId: 'nurse',
            label: 'Nurse',
            used: false,
          },
        ],
        currentDeclaration: null,
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
      {
        id: 'butterfly:character:doctor',
        kind: 'butterfly_choice',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        targetId: 'doctor',
        targetKind: 'character',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
        description: '蝴蝶效应三选一',
      },
    ];

    const state = getBoardInteractionState('day_end', {
      pendingInteractions: interactions,
      activeInteractionId: 'incident:1_murder',
    } as any);

    expect(state.isManualPhase).toBe(true);

    expect(state.abilityPanel).toEqual({
      visible: true,
      phase: 'optional',
      entries: [
        {
          id: 'brain',
          ruleId: 'brain',
          characterId: 'doctor',
          mandatory: false,
          description: 'Legacy brain prompt',
          targetSlots: [],
        },
      ],
    });
    expect(state.goodwillPanel).toEqual({
      visible: true,
      actorSeat: '1',
      phase: 'leader_choosing',
      eligibleAbilities: [
        {
          characterId: 'doctor',
          abilityId: 'nurse',
          label: 'Nurse',
          used: false,
        },
      ],
      currentDeclaration: null,
    });
    expect(state.incidentPanel).toEqual({
      visible: true,
      entries: [
        {
          id: '1_murder',
          interactionId: 'incident:1_murder',
          day: 1,
          incidentId: 'murder',
          culpritId: 'doctor',
          description: '事件裁定：murder',
          targetSlots: [],
        },
      ],
    });
    expect(state.butterflyChoicePanel).toEqual({
      visible: true,
      interaction: {
        interactionId: 'butterfly:character:doctor',
        actorSeat: '0',
        targetId: 'doctor',
        targetKind: 'character',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
        description: '蝴蝶效应三选一',
      },
    });
    expect(state.loopResultPanel).toEqual({
      visible: false,
      interaction: null,
    });
  });

  it('keeps global mastermind abilities (empty characterId) visible to the board state', () => {
    const state = getBoardInteractionState('day_end', {
      pendingInteractions: [
        {
          id: 'ability:global_loss',
          kind: 'mastermind_ability',
          actorSeat: '0',
          phase: 'day_end',
          blocking: true,
          sourceId: 'global_loss',
          ruleId: 'key_person_death_loss',
          characterId: '',
          mandatory: true,
          description: '关键人物死亡判定',
          targetSlots: [],
        },
      ],
      activeInteractionId: 'ability:global_loss',
    } as any);

    expect(state.abilityPanel).toEqual({
      visible: true,
      phase: 'mandatory',
      entries: [
        {
          id: 'global_loss',
          ruleId: 'key_person_death_loss',
          characterId: '',
          mandatory: true,
          description: '关键人物死亡判定',
          targetSlots: [],
        },
      ],
    });
  });

  it('prefers runtime interactions over conflicting legacy slices', () => {
    const state = getBoardInteractionState('incidents', {
      pendingInteractions: [
      {
          id: 'ability:doctor_brain',
          kind: 'mastermind_ability',
          actorSeat: '0',
          phase: 'mastermind_abilities',
          blocking: true,
          sourceId: 'doctor_brain',
          ruleId: 'brain_intrigue',
          characterId: 'doctor',
          mandatory: false,
          description: 'Runtime ability prompt',
          targetSlots: [],
        },
        {
          id: 'goodwill:mastermind_resolving',
          kind: 'goodwill',
          actorSeat: '0',
          phase: 'mastermind_resolving',
          blocking: true,
          sourceId: 'mastermind_resolving',
          description: 'Runtime goodwill prompt',
          eligibleAbilities: [
            {
              characterId: 'doctor',
              abilityId: 'nurse',
              label: 'Runtime goodwill',
              used: false,
            },
          ],
          currentDeclaration: {
            characterId: 'doctor',
            abilityId: 'nurse',
          },
        },
        {
          id: 'incident:1_faraway_murder',
          kind: 'incident_resolution',
          actorSeat: '0',
          phase: 'incidents',
          blocking: true,
          sourceId: '1_faraway_murder',
          day: 1,
          incidentId: 'faraway_murder',
          culpritId: 'doctor',
          description: 'Runtime incident prompt',
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
          allowedTokens: ['intrigue'],
          description: 'Runtime butterfly prompt',
        },
      ],
      activeInteractionId: 'ability:doctor_brain',
      pendingAbilities: [
        {
          id: 'doctor_brain',
          ruleId: 'legacy_rule',
          characterId: 'police',
          mandatory: true,
          description: 'Legacy ability prompt',
          targetSlots: [],
        },
      ],
      abilityPhase: 'mandatory',
      goodwillInteraction: {
        phase: 'leader_choosing',
        eligibleAbilities: [
          {
            characterId: 'police',
            abilityId: 'detective',
            label: 'Legacy goodwill',
            used: true,
          },
        ],
        currentDeclaration: null,
      },
      pendingIncidents: [
        {
          id: '1_faraway_murder',
          day: 99,
          incidentId: 'legacy_incident',
          culpritId: 'police',
          targetSlots: [],
        },
      ],
    } as any);

    expect(state.abilityPanel).toEqual({
      visible: true,
      phase: 'optional',
      entries: [
        {
          id: 'doctor_brain',
          ruleId: 'brain_intrigue',
          characterId: 'doctor',
          mandatory: false,
          description: 'Runtime ability prompt',
          targetSlots: [],
        },
      ],
    });
    expect(state.goodwillPanel).toEqual({
      visible: true,
      actorSeat: '0',
      phase: 'mastermind_resolving',
      eligibleAbilities: [
        {
          characterId: 'doctor',
          abilityId: 'nurse',
          label: 'Runtime goodwill',
          used: false,
        },
      ],
      currentDeclaration: {
        characterId: 'doctor',
        abilityId: 'nurse',
      },
    });
    expect(state.incidentPanel).toEqual({
      visible: true,
      entries: [
        {
          id: '1_faraway_murder',
          interactionId: 'incident:1_faraway_murder',
          day: 1,
          incidentId: 'faraway_murder',
          culpritId: 'doctor',
          description: 'Runtime incident prompt',
          targetSlots: [],
        },
      ],
    });
    expect(state.butterflyChoicePanel).toEqual({
      visible: true,
      interaction: {
        interactionId: 'butterfly:character:doctor',
        actorSeat: '0',
        targetId: 'doctor',
        targetKind: 'character',
        allowedTokens: ['intrigue'],
        description: 'Runtime butterfly prompt',
      },
    });
    expect(state.loopResultPanel).toEqual({
      visible: false,
      interaction: null,
    });
  });

  it('projects observer-only goodwill fields from runtime interaction payload', () => {
    const state = getBoardInteractionState('goodwill_window', {
      pendingInteractions: [
        {
          id: 'goodwill:mastermind_resolving',
          kind: 'goodwill',
          actorSeat: '0',
          phase: 'mastermind_resolving',
          blocking: true,
          sourceId: 'mastermind_resolving',
          description: '友好能力处理中',
          eligibleAbilities: [],
          currentDeclaration: null,
          observerCharacterId: 'doctor',
          observerAbilityId: 'nurse',
          observerSelectedTargets: {
            target: 'patient',
          },
        },
      ],
      activeInteractionId: 'goodwill:mastermind_resolving',
    } as any);

    expect(state.goodwillPanel).toEqual({
      visible: true,
      actorSeat: '0',
      phase: 'mastermind_resolving',
      eligibleAbilities: [],
      currentDeclaration: null,
      observerCharacterId: 'doctor',
      observerAbilityId: 'nurse',
      observerSelectedTargets: {
        target: 'patient',
      },
    });
  });

  it('keeps manual phases visible even when no pending interaction exists', () => {
    expect(getBoardInteractionState('mastermind_plan', {
      pendingInteractions: [],
      activeInteractionId: null,
    } as any)).toEqual({
      isManualPhase: true,
      abilityPanel: {
        visible: false,
        phase: 'idle',
        entries: [],
      },
      goodwillPanel: {
        visible: false,
        actorSeat: null,
        phase: 'idle',
        eligibleAbilities: [],
        currentDeclaration: null,
      },
      incidentPanel: {
        visible: false,
        entries: [],
      },
      butterflyChoicePanel: {
        visible: false,
        interaction: null,
      },
      loopResultPanel: {
        visible: false,
        interaction: null,
      },
    });
  });

  it('derives butterfly choice from runtime interaction when it is the only runtime payload', () => {
    const state = getBoardInteractionState('incidents', {
      pendingInteractions: [
        {
          id: 'butterfly:location:school',
          kind: 'butterfly_choice',
          actorSeat: '0',
          phase: 'incidents',
          blocking: true,
          targetId: 'school',
          targetKind: 'location',
          allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
          description: '蝴蝶效应三选一',
        },
      ],
      activeInteractionId: 'butterfly:location:school',
    } as any);

    expect(state.butterflyChoicePanel).toEqual({
      visible: true,
      interaction: {
        interactionId: 'butterfly:location:school',
        actorSeat: '0',
        targetId: 'school',
        targetKind: 'location',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
        description: '蝴蝶效应三选一',
      },
    });
  });

  it('derives loop result confirmation panels from runtime interactions', () => {
    const state = getBoardInteractionState('loop_end_check', {
      pendingInteractions: [
        {
          id: 'loop_result:1',
          kind: 'loop_result_resolution',
          actorSeat: '0',
          phase: 'loop_end_check',
          blocking: true,
          sourceId: 'loop_result:1',
          description: '轮回结果待确认',
          resultType: 'loop_failure',
          resultLabel: '第 1 轮回结果确认',
          failureReasons: [
            { id: 'system:death', label: '主人公死亡', detail: '系统已检测到本轮的直接败北条件。' },
          ],
          effectOptions: [],
          availableOutcomes: [
            { id: 'next_loop', label: '进入时间裂隙', detail: '下一轮将从第 2 轮回开始。' },
          ],
        },
      ],
      activeInteractionId: 'loop_result:1',
    } as any);

    expect(state.loopResultPanel).toEqual({
      visible: true,
      interaction: {
        interactionId: 'loop_result:1',
        actorSeat: '0',
        resultType: 'loop_failure',
        resultLabel: '第 1 轮回结果确认',
        description: '轮回结果待确认',
        failureReasons: [
          { id: 'system:death', label: '主人公死亡', detail: '系统已检测到本轮的直接败北条件。' },
        ],
        effectOptions: [],
        availableOutcomes: [
          { id: 'next_loop', label: '进入时间裂隙', detail: '下一轮将从第 2 轮回开始。' },
        ],
      },
    });
  });

  it('derives legal character and location targets from runtime target slots', () => {
    const runtimeState = getBoardInteractionState('incidents', {
      pendingInteractions: [
        {
          id: 'incident:slot_test',
          kind: 'incident_resolution',
          actorSeat: '0',
          phase: 'incidents',
          blocking: true,
          sourceId: 'slot_test',
          day: 1,
          incidentId: 'murder',
          culpritId: 'doctor',
          description: 'Runtime incident prompt',
          targetSlots: [
            {
              slotId: 'target',
              label: 'Choose target',
              kind: 'character_or_location',
              eligibleCharacterIds: ['doctor', 'police'],
              eligibleLocationIds: ['city'],
            },
          ],
        },
      ],
      activeInteractionId: 'incident:slot_test',
    } as any);

    const legalTargets = getLegalTargetsFromInteractionState(runtimeState, false);

    expect([...legalTargets.characters].sort()).toEqual(['doctor', 'police']);
    expect([...legalTargets.locations]).toEqual(['city']);
  });
});

describe('getModuleSurfaceViewModel', () => {
  it('returns null when a module has no extra dynamic surface state to show', () => {
    const viewModel = getModuleSurfaceViewModel({
      phase: 'incidents',
      playerID: '1',
      isMastermind: false,
      scriptOpen: {
        tragedySetId: 'basic_tragedy',
      } as any,
      v1: {
        ex: {
          enabled: false,
          gauge: 0,
          changedThisLoop: false,
          lastLoopEndGauge: 0,
        },
        protagonists: {
          tokens: {
            paranoia: 0,
            intrigue: 0,
            goodwill: 0,
            hope: 1,
            despair: 0,
            guard: 0,
          },
        },
        mastermind: {
          tokens: {
            paranoia: 0,
            intrigue: 1,
            goodwill: 0,
            hope: 0,
            despair: 0,
            guard: 0,
          },
        },
        loopState: {
          revealedRoles: { doctor: 'brain' },
          revealedRules: ['forbid_intrigue'],
          revealedIncidentCulprits: {
            '2_faraway_murder': 'doctor',
          },
          incidentHistory: [
            {
              loop: 1,
              day: 2,
              incidentId: 'butterfly_effect',
              culpritId: '',
              wasImmune: false,
            },
          ],
          lastWillHopeNextLoop: false,
        },
        pendingInteractions: [
          {
            id: 'butterfly:character:doctor',
            kind: 'butterfly_choice',
          },
        ],
        activeInteractionId: 'butterfly:character:doctor',
        finalGuess: {
          guesses: [],
          completed: false,
        },
        betrayerVictoryConditions: undefined,
        exCardAssignment: undefined,
        detectiveGuesses: undefined,
      } as any,
    });

    expect(viewModel).toMatchObject({
      setId: 'basic_tragedy',
      setCode: 'BTX',
      emphasis: 'premium',
    });
    expect(viewModel?.badges).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '公开身份', value: '1' }),
      expect.objectContaining({ label: '公开规则', value: '1' }),
      expect.objectContaining({ label: '公开事件当事人', value: '1' }),
    ]));
    expect(viewModel?.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '已公开身份' }),
      expect.objectContaining({ title: '已公开规则' }),
      expect.objectContaining({ title: '已公开事件当事人' }),
    ]));
    const revealedRuleSection = viewModel?.sections.find((section) => section.title === '已公开规则');
    const revealedIncidentSection = viewModel?.sections.find((section) => section.title === '已公开事件当事人');
    expect(revealedRuleSection?.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: expect.any(String), detail: 'forbid_intrigue' }),
    ]));
    expect(revealedIncidentSection?.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: expect.stringContaining('D2 '), value: '医生' }),
    ]));
  });

  it('returns null for base modules that have no module-specific dynamic state', () => {
    const viewModel = getModuleSurfaceViewModel({
      phase: 'day_start',
      playerID: '1',
      isMastermind: false,
      scriptOpen: {
        tragedySetId: 'first_steps',
      } as any,
      v1: {
        ex: {
          enabled: false,
          gauge: 0,
          changedThisLoop: false,
          lastLoopEndGauge: 0,
        },
        protagonists: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        mastermind: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        loopState: {
          revealedRoles: {},
          revealedRules: [],
          revealedIncidentCulprits: {},
          incidentHistory: [],
          lastWillHopeNextLoop: false,
        },
        pendingInteractions: [],
        activeInteractionId: null,
        finalGuess: undefined,
        betrayerVictoryConditions: undefined,
        exCardAssignment: undefined,
        detectiveGuesses: undefined,
      } as any,
    });

    expect(viewModel).toBeNull();
  });

  it('surfaces Last Liar specific betrayal wiring for the active viewer', () => {
    const protagonistView = getModuleSurfaceViewModel({
      phase: 'day_start',
      playerID: '2',
      isMastermind: false,
      scriptOpen: {
        tragedySetId: 'last_liar',
      } as any,
      v1: {
        ex: {
          enabled: false,
          gauge: 0,
          changedThisLoop: false,
          lastLoopEndGauge: 0,
        },
        protagonists: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        mastermind: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        loopState: {
          revealedRoles: {},
          revealedRules: [],
          revealedIncidentCulprits: {},
          incidentHistory: [],
          lastWillHopeNextLoop: false,
        },
        pendingInteractions: [],
        activeInteractionId: null,
        finalGuess: undefined,
        betrayerVictoryConditions: undefined,
        exCardAssignment: { '2': 'B' },
        detectiveGuesses: { '1_murder': 'doctor' },
      } as any,
    });

    expect(protagonistView?.badges).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '你的 Ex 牌', value: 'B' }),
    ]));
    expect(protagonistView?.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Last Liar 接线',
        entries: expect.arrayContaining([
          expect.objectContaining({ label: '你的 Ex 牌', value: 'B' }),
          expect.objectContaining({ label: expect.stringContaining('名侦探猜测 D1') }),
        ]),
      }),
    ]));

    const mastermindView = getModuleSurfaceViewModel({
      phase: 'day_start',
      playerID: '0',
      isMastermind: true,
      scriptOpen: {
        tragedySetId: 'last_liar',
      } as any,
      v1: {
        ex: {
          enabled: false,
          gauge: 0,
          changedThisLoop: false,
          lastLoopEndGauge: 0,
        },
        protagonists: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        mastermind: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        loopState: {
          revealedRoles: {},
          revealedRules: [],
          revealedIncidentCulprits: {},
          incidentHistory: [],
          lastWillHopeNextLoop: false,
        },
        pendingInteractions: [],
        activeInteractionId: null,
        finalGuess: undefined,
        betrayerVictoryConditions: {
          A: {
            ruleId: 'll_true_monster',
            description: '总计放置过5枚或以上已死亡标志',
          },
        },
        exCardAssignment: undefined,
        detectiveGuesses: undefined,
      } as any,
    });

    expect(mastermindView?.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Last Liar 接线',
        entries: expect.arrayContaining([
          expect.objectContaining({
            label: '背叛者 A',
            value: '总计放置过5枚或以上已死亡标志',
          }),
        ]),
      }),
    ]));
  });
});
