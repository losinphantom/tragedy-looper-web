import { describe, expect, it } from 'vitest';

import {
  ADJUDICATION_NOTES,
  type LocalizedOpenScriptView,
  type LocalizedScriptDef,
  AUDIENCE_LABELS_ZH_CN,
  BUTTON_LABELS_ZH_CN,
  MATCH_PHASES,
  ACTION_CARDS,
  CORE_TERMS_ZH_CN,
  FIRST_STEPS_INCIDENTS,
  FIRST_STEPS_PLOTS,
  FIRST_STEPS_ROLES,
  BTX_INCIDENTS,
  BTX_PLOTS,
  BTX_ROLES,
  AHR_INCIDENTS,
  AHR_PLOTS,
  AHR_ROLES,
  type ScriptChoice,
  type ScriptContentRecord,
  type SpecialRuleRecord,
  TRAGEDY_SETS,
  MATCH_PHASE_LABELS_ZH_CN,
  ROOM_STATUS_LABELS_ZH_CN,
  createInitialMatchState,
  createInitialRoomState,
  type AbilityRecord,
  type ActionCardRecord,
  type CharacterRecord,
  type IncidentRecord,
  type LocalizedText,
  type OpenScriptView,
  type PlotRecord,
  type RoleRecord,
  type RuleAtomRecord,
  type SecretScriptView,
  type TragedySetRecord,
} from './index';

describe('domain module', () => {
  it('exposes the documented match phases in order', () => {
    expect(MATCH_PHASES).toEqual([
      'lobby',
      'seat_lock',
      'loop_setup',
      'day_start',
      'mastermind_plan',
      'protagonist_plan',
      'resolve_cards',
      'mastermind_abilities',
      'goodwill_window',
      'incidents',
      'switch_leader',
      'day_end',
      'loop_end_check',
      'final_guess',
      'match_end',
    ]);
  });

  it('creates initial room and match state shells', () => {
    const room = createInitialRoomState({
      roomId: 'room-1',
      roomCode: 'ABCD',
    });
    const match = createInitialMatchState();

    expect(room).toEqual({
      roomId: 'room-1',
      roomCode: 'ABCD',
      spectators: [],
      seats: [],
      reconnectTokens: {},
      status: 'lobby',
    });

    expect(match).toEqual({
      scriptOpen: null,
      scriptSecret: null,
      tragedySet: null,
      loopIndex: 0,
      maxLoops: 0,
      day: 0,
      daysPerLoop: 0,
      leaderSeat: null,
      phase: 'lobby',
      publicLog: [],
      fullLog: [],
      seatHands: {},
      board: {
        locations: [],
        characters: [],
        scheduledIncidents: [],
        usedOncePerLoopCards: [],
        revealedRoles: [],
        protagonistsDead: false,
        loopLossReason: null,
        incidentHistory: [],
      },
      playerCount: 4,
    });
  });

  it('supports minimal open and secret script fixtures', () => {
    const openScript: LocalizedOpenScriptView = {
      title: {
        'zh-CN': '午夜循环',
        en: 'Midnight Loop',
      },
      tragedySetId: 'basic_tragedy',
      loops: {
        recommended: 3,
        options: [3, 4],
      },
      daysPerLoop: 4,
      specialRules: [
        {
          id: 'rule-a',
          label: {
            'zh-CN': '特殊规则A',
          },
        },
      ],
      incidentSchedule: [{ day: 1, incidentId: 'hospital_incident' }],
    };

    const scriptDef: LocalizedScriptDef = {
      title: openScript.title!,
      tragedySetId: openScript.tragedySetId,
      loops: openScript.loops,
      daysPerLoop: openScript.daysPerLoop,
      specialRules: [
        {
          id: 'rule-a',
          label: {
            'zh-CN': '特殊规则A',
          },
          summary: {
            'zh-CN': '用于验证结构化特殊规则。',
          },
        },
      ],
      mainPlotId: 'murder_plan',
      subplotIds: ['the_sealed_item'],
      cast: [{ characterId: 'boy_student', roleId: 'key_person' }],
      incidents: [
        {
          day: 1,
          incidentId: 'hospital_incident',
          culpritCharacterId: 'office_worker',
        },
      ],
    };

    const secretScript: SecretScriptView = {
      mainPlotId: 'murder_plan',
      subplotIds: ['the_sealed_item'],
      cast: [{ characterId: 'boy_student', roleId: 'key_person' }],
      incidents: [
        {
          day: 1,
          incidentId: 'hospital_incident',
          culpritCharacterId: 'office_worker',
        },
      ],
    };

    expect(openScript.title!['zh-CN']).toBe('午夜循环');
    expect(openScript.loops.recommended).toBe(3);
    expect(openScript.specialRules[0]?.id).toBe('rule-a');
    expect(scriptDef.specialRules[0]?.summary?.['zh-CN']).toContain('结构化');
    expect(openScript.incidentSchedule[0]?.incidentId).toBe('hospital_incident');
    expect(secretScript.incidents[0]?.culpritCharacterId).toBe('office_worker');
  });

  it('supports structured script choices and content metadata', () => {
    const loopChoice: ScriptChoice<number> = {
      recommended: 4,
      options: [3, 4, 5],
    };

    const specialRule: SpecialRuleRecord = {
      id: 'all_locations_are_school',
      label: {
        'zh-CN': '所有版图视为学校',
      },
      summary: {
        'zh-CN': '本剧本中所有版图都视为学校。',
      },
    };

    const content: ScriptContentRecord = {
      scriptId: 'traditional_ensemble_murder',
      specifics: {
        'zh-CN': '一个典型的基础剧本。',
      },
      story: {
        'zh-CN': '城镇被死亡氛围笼罩。',
      },
      mastermindHints: {
        'zh-CN': '优先用医院事故制造压力。',
      },
      mastermindVictoryNotes: [
        {
          'zh-CN': '杀死关键人物',
        },
      ],
      creator: 'BakaFire',
      difficulty: 3,
      source: 'masterbook',
    };

    expect(loopChoice.options).toEqual([3, 4, 5]);
    expect(specialRule.summary['zh-CN']).toContain('学校');
    expect(content.mastermindVictoryNotes?.[0]?.['zh-CN']).toBe('杀死关键人物');
  });

  it('supports room seats carrying a boardgame player slot id', () => {
    const room = createInitialRoomState({
      roomId: 'room-2',
      roomCode: 'EFGH',
    });

    room.seats = [
      {
        seatId: 'seat-mm',
        playerId: 'mastermind-user',
        boardgamePlayerId: '0',
        role: 'mastermind',
      },
    ];

    expect(room.seats[0]?.boardgamePlayerId).toBe('0');
  });

  it('exports dictionary base record types', () => {
    const label: LocalizedText = {
      'zh-CN': '基础惨剧X',
    };

    const rule: RuleAtomRecord = {
      id: 'rule-1',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: label,
    };

    const ability: AbilityRecord = {
      id: 'ability-1',
      label,
      timing: 'always',
      controller: 'system',
      rules: [rule],
    };

    const tragedySet: TragedySetRecord = {
      id: 'basic_tragedy',
      label,
      subplotCount: 2,
      supportsFinalGuess: true,
      supportedPlayerCounts: [2, 3, 4],
      availablePlotIds: ['murder_plan'],
      availableRoleIds: ['brain'],
      availableIncidentIds: ['murder'],
      uiSurface: {
        emphasis: 'premium',
      },
    };

    const character: CharacterRecord = {
      id: 'boy_student',
      label,
      traits: ['student'],
      startingLocations: ['school'],
      forbiddenLocations: [],
      uneaseLimit: 2,
      goodwillAbilities: [ability],
      passiveAbilities: [],
      scriptCreationRules: [],
      source: {},
    };

    const actionCard: ActionCardRecord = {
      id: 'protagonist_goodwill_plus_1',
      owner: 'protagonist',
      label,
      oncePerLoop: false,
      targetKind: 'character',
      actionFamily: 'goodwill',
      params: { amount: 1 },
      rulesText: {
        'zh-CN': ['放置1个友好。'],
      },
      source: {},
    };

    const plot: PlotRecord = {
      id: 'murder_plan',
      kind: 'main',
      label,
      roleRequirements: [],
      rules: [rule],
      source: {
        setId: 'basic_tragedy',
      },
    };

    const role: RoleRecord = {
      id: 'brain',
      label,
      maxCopies: null,
      goodwillRefusal: 'optional',
      rules: [rule],
      appearsInPlotIds: ['murder_plan'],
      source: {
        setId: 'basic_tragedy',
      },
    };

    const incident: IncidentRecord = {
      id: 'murder',
      label,
      rules: [rule],
      source: {
        setId: 'basic_tragedy',
      },
    };

    expect(tragedySet.subplotCount).toBe(2);
    expect(character.goodwillAbilities[0]?.id).toBe('ability-1');
    expect(actionCard.actionFamily).toBe('goodwill');
    expect(plot.kind).toBe('main');
    expect(role.goodwillRefusal).toBe('optional');
    expect(incident.rules[0]?.id).toBe('rule-1');
  });

  it('exports shared term, action card, and tragedy set registries', () => {
    expect(CORE_TERMS_ZH_CN.goodwill['zh-CN']).toBe('友好');
    expect(CORE_TERMS_ZH_CN.unease['zh-CN']).toBe('不安');
    expect(CORE_TERMS_ZH_CN.intrigue['zh-CN']).toBe('密谋');

    expect(ACTION_CARDS.protagonist_goodwill_plus_1.owner).toBe('protagonist');
    expect(ACTION_CARDS.mastermind_intrigue_plus_1.owner).toBe('mastermind');
    expect(ACTION_CARDS.protagonist_forbid_movement.oncePerLoop).toBe(true);

    expect(TRAGEDY_SETS.first_steps.subplotCount).toBe(1);
    expect(TRAGEDY_SETS.first_steps.supportsFinalGuess).toBe(false);
    expect(TRAGEDY_SETS.first_steps.uiSurface?.entryPoints?.[0]?.label).toBe('主棋盘');
    expect(TRAGEDY_SETS.basic_tragedy.subplotCount).toBe(2);
    expect(TRAGEDY_SETS.basic_tragedy.supportsFinalGuess).toBe(true);
    expect(TRAGEDY_SETS.basic_tragedy.uiSurface?.emphasis).toBe('premium');
    expect(TRAGEDY_SETS.last_liar.uiSurface?.features?.detectiveGuesses).toBe(true);
  });

  it('exports first steps content registries', () => {
    expect(Object.values(FIRST_STEPS_PLOTS).filter((plot) => plot.kind === 'main')).toHaveLength(3);
    expect(Object.values(FIRST_STEPS_PLOTS).filter((plot) => plot.kind === 'subplot')).toHaveLength(3);
    expect(Object.keys(FIRST_STEPS_ROLES)).toHaveLength(8);
    expect(Object.keys(FIRST_STEPS_INCIDENTS)).toHaveLength(7);
    expect(FIRST_STEPS_PLOTS.murder_plan.source.setId).toBe('first_steps');
    expect(FIRST_STEPS_ROLES.key_person.label['zh-CN']).toBe('关键人物');
    expect(FIRST_STEPS_INCIDENTS.hospital_incident.label['zh-CN']).toBe('医院事故');
  });

  it('exports btx content registries', () => {
    expect(Object.values(BTX_PLOTS).filter((plot) => plot.kind === 'main')).toHaveLength(5);
    expect(Object.values(BTX_PLOTS).filter((plot) => plot.kind === 'subplot')).toHaveLength(7);
    expect(Object.keys(BTX_ROLES)).toHaveLength(12);
    expect(Object.keys(BTX_INCIDENTS)).toHaveLength(9);
    expect(BTX_PLOTS.change_of_future.source.setId).toBe('basic_tragedy');
    expect(BTX_ROLES.time_traveler.label['zh-CN']).toBe('时间旅者');
    expect(BTX_INCIDENTS.butterfly_effect.label['zh-CN']).toBe('蝴蝶效应');
  });

  it('exports current AHR registry content instead of the legacy placeholder set', () => {
    expect(TRAGEDY_SETS.another_horizon_revised.availablePlotIds).toEqual([
      'the_locked_future',
      'fairy_tale_killer',
      'mother_goose_mystery',
      'dimension_fusion',
      'illusory_world',
      'dr_jekyll_and_mr_hyde',
      'devil_plays_the_flute',
      'puppet_strings',
      'alice_in_wonderland',
      'beyond_the_world_line',
      'unspeakable_monster',
      'paranoia_virus_expanded',
    ]);
    expect(TRAGEDY_SETS.another_horizon_revised.availableRoleIds).toEqual([
      'key_person',
      'obsessive',
      'marionette',
      'storyteller',
      'lullaby',
      'dimension_traveler',
      'brain',
      'fragment',
      'serial_killer',
      'pied_piper',
      'conspiracy_theorist',
      'evangelist',
      'alice',
    ]);
    expect(TRAGEDY_SETS.another_horizon_revised.availableIncidentIds).toEqual([
      'impulse_murder',
      'dimension_shift',
      'dimension_warp',
      'dimension_fault',
      'lost_item',
      'imaginary_incident',
      'last_will',
      'hospital_incident',
      'singularity',
      'light_in_the_gap',
      'darkness_of_despair',
    ]);
  });

  it('exports current AHR plot, role, and incident registries', () => {
    expect(AHR_PLOTS.the_locked_future.label['zh-CN']).toBe('闭锁的未来');
    expect(AHR_PLOTS.puppet_strings.source.setId).toBe('another_horizon_revised');
    expect(AHR_PLOTS.paranoia_virus_expanded.label['zh-CN']).toBe('空想扩大病毒');
    expect(AHR_ROLES.storyteller.label['zh-CN']).toBe('叙述者');
    expect(AHR_ROLES.dimension_traveler.label['zh-CN']).toBe('次元旅者');
    expect(AHR_ROLES.obsessive.label['zh-CN']).toBe('强迫症');
    expect(AHR_INCIDENTS.impulse_murder.label['zh-CN']).toBe('冲动杀人');
    expect(AHR_INCIDENTS.singularity.label['zh-CN']).toBe('奇点');
    expect(AHR_INCIDENTS.hospital_incident.label['zh-CN']).toBe('医院事故');
  });

  it('exports adjudication notes for faq-sensitive rule edges', () => {
    expect(ADJUDICATION_NOTES.corpse_semantics.summary['zh-CN']).toContain('尸体');
    expect(ADJUDICATION_NOTES.forbid_intrigue_scope.category).toBe('card_resolution');
    expect(ADJUDICATION_NOTES.movement_legality.summary['zh-CN']).toContain('禁行区域');
    expect(ADJUDICATION_NOTES.goodwill_refusal_timing.summary['zh-CN']).toContain('先宣言');
    expect(ADJUDICATION_NOTES.incident_announced_but_prevented.summary['zh-CN']).toContain(
      '宣布发生',
    );
  });

  it('exports chinese copy labels for web-facing states and actions', () => {
    expect(AUDIENCE_LABELS_ZH_CN.mastermind['zh-CN']).toBe('剧本家视角');
    expect(ROOM_STATUS_LABELS_ZH_CN.in_game['zh-CN']).toBe('游戏中');
    expect(MATCH_PHASE_LABELS_ZH_CN.protagonist_plan['zh-CN']).toBe('主人公行动');
    expect(BUTTON_LABELS_ZH_CN.start_game['zh-CN']).toBe('开始游戏');
  });
});
