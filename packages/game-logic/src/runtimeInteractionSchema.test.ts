import { describe, expect, it } from 'vitest';

import {
  ButterflyChoiceInteractionSchema,
  GoodwillInteractionSchema,
  MastermindAbilityInteractionSchema,
  IncidentResolutionInteractionSchema,
  LoopResultResolutionInteractionSchema,
  RuntimeInteractionSchema,
} from './runtimeInteractionSchema';

describe('runtimeInteractionSchema', () => {
  it('accepts goodwill interactions', () => {
    expect(GoodwillInteractionSchema.parse({
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
          label: '护士',
          used: false,
          targetSlots: [],
        },
      ],
      currentDeclaration: null,
    }).kind).toBe('goodwill');
  });

  it('accepts incident, butterfly, and loop result interactions through the shared union', () => {
    const incident = RuntimeInteractionSchema.parse({
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
    });
    const butterfly = ButterflyChoiceInteractionSchema.parse({
      id: 'butterfly:doctor',
      kind: 'butterfly_choice',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      targetId: 'doctor',
      targetKind: 'character',
      allowedTokens: ['goodwill', 'paranoia'],
      description: '蝴蝶效应三选一',
    });
    const loopResult = LoopResultResolutionInteractionSchema.parse({
      id: 'loop_result:1',
      kind: 'loop_result_resolution',
      actorSeat: '0',
      phase: 'loop_end_check',
      blocking: true,
      description: '轮回结束，需要剧作家确认。',
      resultType: 'loop_end',
      resultLabel: '第 1 轮回结束',
      failureReasons: [],
      effectOptions: [],
      availableOutcomes: [
        {
          id: 'next_loop',
          label: '进入下一轮',
        },
      ],
    });

    expect(incident.kind).toBe('incident_resolution');
    expect(butterfly.kind).toBe('butterfly_choice');
    expect(loopResult.kind).toBe('loop_result_resolution');
  });

  it('accepts global mastermind abilities without character ownership', () => {
    const parsed = MastermindAbilityInteractionSchema.parse({
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
    });

    expect(parsed.kind).toBe('mastermind_ability');
    expect(parsed.characterId).toBe('');
  });

  it('rejects malformed runtime payloads', () => {
    expect(() => IncidentResolutionInteractionSchema.parse({
      id: 'incident:bad',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      day: '1',
      incidentId: 'murder',
      culpritId: 'doctor',
      description: 'bad incident payload',
      targetSlots: [],
    })).toThrow();

    const malformed = RuntimeInteractionSchema.safeParse({
      id: 'loop_result:bad',
      kind: 'loop_result_resolution',
      actorSeat: '0',
      phase: 'loop_end_check',
      blocking: true,
      description: 'missing available outcomes',
      resultType: 'loop_failure',
      resultLabel: '轮回失败',
      failureReasons: [{ id: 'loss', label: '关键人物死亡' }],
      effectOptions: [],
    });

    expect(malformed.success).toBe(false);
  });
});
