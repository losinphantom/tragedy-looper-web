import { describe, expect, it, vi } from 'vitest';

import { TragedyLooper } from './game';
import type { TragedyGameState } from './game';
import { phases } from './phases';
import { beginGoodwillWindowPhase } from './phaseCheckpointHandlers';
import { createEmptyTokenBag, getToken } from './utils/tokenHelpers';
import { getCardLabel } from './data/cardService';
import { buildActiveRules } from './scriptLoader';

function createGame(): TragedyGameState {
  return TragedyLooper.setup!({} as any) as TragedyGameState;
}

function setupBasicGame(G: TragedyGameState): void {
  G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
  G.maxLoops = 4;
  G.daysPerLoop = 7;
  G.loopIndex = 0;
  G.day = 0;
  G.seatHands = { '0': [], '1': [], '2': [], '3': [] };
  G.board = { usedOncePerLoopCards: [], loopLimit: 4, dayLimit: 7 } as any;
  G.v1.characters = {
    girl_student: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    boy_student: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    doctor: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
  };
  G.v1.locations = {
    city: { tokens: createEmptyTokenBag() },
    school: { tokens: createEmptyTokenBag() },
    hospital: { tokens: createEmptyTokenBag() },
    shrine: { tokens: createEmptyTokenBag() },
  };
  G.v1.hiddenRoles = {
    girl_student: 'key_person',
    boy_student: 'serial_killer',
    doctor: 'brain',
  };
  G.v1.activePlots = ['murder_plan', 'the_hidden_freak', 'an_unsettling_rumor'];
  G.v1.activeRuleDefinitions = buildActiveRules(
    'basic_tragedy',
    G.v1.activePlots,
    G.v1.hiddenRoles,
    [],
  );
  G.v1.castDefinitions = [
    { characterId: 'girl_student', roleId: 'key_person' },
    { characterId: 'boy_student', roleId: 'serial_killer' },
    { characterId: 'doctor', roleId: 'brain' },
  ];
}

describe('phases — onBegin hooks', () => {
  // ── loop_setup ──────────────────────────────────────────────────────

  describe('loop_setup', () => {
    it('resets characters for new loop when loopIndex > 0', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 1;
      G.v1.characters.doctor.tokens.paranoia = 5;
      G.v1.characters.doctor.alive = false;
      G.v1.characters.doctor.locationId = 'city';

      const events = { endPhase: vi.fn() };
      (phases.loop_setup.onBegin as any)({ G, events });

      // Tokens cleared, alive, location reset
      expect(G.v1.characters.doctor.alive).toBe(true);
      expect(getToken(G.v1.characters.doctor, 'paranoia')).toBe(0);
      expect(G.v1.characters.doctor.locationId).toBe('hospital');
      expect(events.endPhase).toHaveBeenCalled();
    });

    it('increments day to 0 and sets loop log', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 0;

      const events = { endPhase: vi.fn() };
      (phases.loop_setup.onBegin as any)({ G, events });

      expect(G.day).toBe(0);
      expect(G.v1.loopLost).toBe(false);
      expect(G.publicLog.some(line => line.includes('轮回'))).toBe(true);
    });

    it('rebuilds hands for all seats', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 0;

      const events = { endPhase: vi.fn() };
      (phases.loop_setup.onBegin as any)({ G, events });

      expect(G.seatHands['0'].length).toBeGreaterThan(0);
      expect(G.seatHands['1'].length).toBeGreaterThan(0);
    });

    it('grants hope from last_will when flag is set', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 0;
      G.v1.loopState.lastWillHopeNextLoop = true;

      const events = { endPhase: vi.fn() };
      (phases.loop_setup.onBegin as any)({ G, events });

      expect(getToken(G.v1.protagonists, 'hope')).toBe(1);
      expect(G.v1.loopState.lastWillHopeNextLoop).toBe(false);
    });
  });

  // ── day_start ──────────────────────────────────────────────────────

  describe('day_start', () => {
    it('increments day and resets daily flags', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 2;
      G.v1.loopState.abilityUsage = {
        'test_ability': { usedToday: true, usedThisLoop: true },
      };

      (phases.day_start.onBegin as any)({ G });

      expect(G.day).toBe(3);
      expect(G.v1.loopState.abilityUsage['test_ability'].usedToday).toBe(false);
      expect(G.v1.loopState.abilityUsage['test_ability'].usedThisLoop).toBe(true);
    });

    it('clears expired movement restrictions', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 2;
      G.v1.movementRestrictions.blockedLocations = { hospital: 2, school: 5 };
      G.v1.movementRestrictions.immobileCharacters = { doctor: 2, girl_student: 5 };

      (phases.day_start.onBegin as any)({ G });

      // day is now 3, so restrictions with untilDay < 3 should be cleared
      expect(G.v1.movementRestrictions.blockedLocations['hospital']).toBeUndefined();
      expect(G.v1.movementRestrictions.blockedLocations['school']).toBe(5);
      expect(G.v1.movementRestrictions.immobileCharacters['doctor']).toBeUndefined();
      expect(G.v1.movementRestrictions.immobileCharacters['girl_student']).toBe(5);
    });
  });

  describe('resolve_cards', () => {
    it('emits per-target resolve frames and clears played cards after resolution', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.playedCards = [{
        id: 'card_1',
        cardTemplateId: 'mastermind_unease_plus_1',
        owner: 'mastermind',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '0',
      }];

      (phases.resolve_cards.onBegin as any)({ G });

      expect(G.v1.eventLogs.map(event => event.type)).toEqual(expect.arrayContaining([
        'resolve_flip_all',
        'resolve_effect',
        'resolve_dismiss_all',
      ]));
      const resolveFlipAllEvent = G.v1.eventLogs.find((event) => event.type === 'resolve_flip_all');
      const resolveEffectEvent = G.v1.eventLogs.find((event) => event.type === 'resolve_effect');
      expect(resolveFlipAllEvent?.payload.cards).toEqual([
        expect.objectContaining({
          id: 'card_1',
          cardTemplateId: 'mastermind_unease_plus_1',
          faceUp: true,
        }),
      ]);
      expect(resolveEffectEvent?.payload.cardIds).toEqual(['card_1']);
      expect(resolveEffectEvent?.payload.cards).toEqual([
        expect.objectContaining({
          id: 'card_1',
          cardTemplateId: 'mastermind_unease_plus_1',
          faceUp: true,
        }),
      ]);
      expect(G.v1.playedCards).toEqual([]);
      expect(G.publicLog.some(line => line.includes('行动卡结算完成'))).toBe(true);
    });

    it('carries revealed action-card faces through resolve_move events', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.playedCards = [{
        id: 'card_1',
        cardTemplateId: 'mastermind_move_vertical',
        owner: 'mastermind',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '0',
      }];

      (phases.resolve_cards.onBegin as any)({ G });

      const resolveMoveEvent = G.v1.eventLogs.find((event) => event.type === 'resolve_move');
      expect(resolveMoveEvent?.payload.cardIds).toEqual(['card_1']);
      expect(resolveMoveEvent?.payload.cards).toEqual([
        expect.objectContaining({
          id: 'card_1',
          cardTemplateId: 'mastermind_move_vertical',
          faceUp: true,
        }),
      ]);
    });

    it('emits one resolve_effect frame per value card on the same target', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.playedCards = [
        {
          id: 'card_1',
          cardTemplateId: 'mastermind_unease_plus_1',
          owner: 'mastermind',
          targetType: 'character',
          targetId: 'doctor',
          faceUp: false,
          playedBySeat: '0',
        },
        {
          id: 'card_2',
          cardTemplateId: 'mastermind_goodwill_plus_1',
          owner: 'mastermind',
          targetType: 'character',
          targetId: 'doctor',
          faceUp: false,
          playedBySeat: '0',
        },
      ];

      (phases.resolve_cards.onBegin as any)({ G });

      const resolveEffectEvents = G.v1.eventLogs.filter((event) => event.type === 'resolve_effect');
      expect(resolveEffectEvents).toHaveLength(2);
      expect(resolveEffectEvents.map((event) => event.payload.cardIds)).toEqual([['card_1'], ['card_2']]);
      expect(resolveEffectEvents.map((event) => event.payload.effects)).toEqual([
        [expect.objectContaining({ kind: 'counter', counter: 'unease', delta: 1, cardId: 'card_1' })],
        [expect.objectContaining({ kind: 'counter', counter: 'goodwill', delta: 1, cardId: 'card_2' })],
      ]);
      expect(G.publicLog).toEqual(expect.arrayContaining([
        expect.stringContaining(`角色「医生」受到 剧作家的「${getCardLabel('mastermind_unease_plus_1')}」 的影响：不安 +1`),
        expect.stringContaining(`角色「医生」受到 剧作家的「${getCardLabel('mastermind_goodwill_plus_1')}」 的影响：友好 +1`),
      ]));
    });

    it('removes hope+1 from protagonist hands after a successful single use', () => {
      const G = createGame();
      setupBasicGame(G);
      G.seatHands['1'] = ['protagonist_hope_plus_1'];
      G.seatHands['2'] = ['protagonist_hope_plus_1'];
      G.v1.playedCards = [{
        id: 'hope_1',
        cardTemplateId: 'protagonist_hope_plus_1',
        owner: 'protagonist',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '1',
      }];

      (phases.resolve_cards.onBegin as any)({ G });

      expect(G.seatHands['1']).not.toContain('protagonist_hope_plus_1');
      expect(G.seatHands['2']).not.toContain('protagonist_hope_plus_1');
      expect(G.publicLog.some(line => line.includes('希望+1 联动技'))).toBe(true);
    });
  });

  // ── day_end ──────────────────────────────────────────────────────

  describe('day_end', () => {
    it('rotates leader when configured for 4-player mode', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 1;
      G.v1.leader = '1';
      G.v1.settings.playerCount = 4;
      G.leaderSeat = '1';

      const events = { setPhase: vi.fn() };
      (phases.day_end.onBegin as any)({ G, events });

      expect(G.v1.leader).toBe('2');
    });

    it('routes to loop_end_check when loopLost is set', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 1;
      G.v1.loopLost = true;
      G.daysPerLoop = 7;

      const events = { setPhase: vi.fn() };
      (phases.day_end.onBegin as any)({ G, events });

      expect(events.setPhase).toHaveBeenCalledWith('loop_end_check');
    });

    it('queues day_end mandatory work instead of resolving it during onBegin', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 1;
      G.v1.settings.autoResolve = true;
      G.v1.characters.boy_student.locationId = 'school';
      G.v1.characters.girl_student.locationId = 'school';
      G.v1.activeRuleDefinitions = [
        { ruleId: 'serial_killer_day_end_kill', timing: 'day_end', mandatory: true, characterId: 'boy_student', source: 'role:serial_killer' } as any,
      ];

      const events = { setPhase: vi.fn() };
      (phases.day_end.onBegin as any)({ G, events });

      expect(G.v1.characters.girl_student.alive).toBe(true);
      expect(G.v1.pendingAbilities).toEqual([
        expect.objectContaining({
          ruleId: 'serial_killer_day_end_kill',
          timing: 'day_end',
          phase: 'day_end',
          mandatory: true,
        }),
      ]);
    });
  });

  // ── loop_end_check ────────────────────────────────────────────────

  describe('loop_end_check', () => {
    it('increments loopIndex and preserves causal thread data', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 0;
      G.v1.characters.doctor.tokens.goodwill = 2;
      G.v1.characters.girl_student.alive = false;
      G.v1.loopLost = true;

      const events = { endPhase: vi.fn() };
      (phases.loop_end_check.onBegin as any)({ G, events });

      expect(G.loopIndex).toBe(1);
      expect(G.v1.loopState.lastLoopGoodwillChars).toContain('doctor');
      expect(G.v1.loopState.lastLoopDeadCharacters).toContain('girl_student');
    });

    it('emits a loop failure result event and waits for explicit result confirmation', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 0;
      G.v1.loopLost = true;

      const events = { endPhase: vi.fn() };
      (phases.loop_end_check.onBegin as any)({ G, events });

      const resultEvents = G.v1.eventLogs.filter(event => event.type === 'result');
      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0]).toEqual(expect.objectContaining({
        payload: expect.objectContaining({
          resultType: 'loop_failure',
          title: '第 1 轮回失败',
        }),
      }));
      expect(G.v1.pendingInteractions).toEqual([
        expect.objectContaining({
          kind: 'loop_result_resolution',
          phase: 'loop_end_check',
          failureReasons: expect.arrayContaining([
            expect.objectContaining({
              label: expect.any(String),
            }),
          ]),
          availableOutcomes: [
            expect.objectContaining({
              id: 'next_loop',
            }),
          ],
        }),
      ]);
    });

    it('routes to final_guess when all loops exhausted with supportsFinalGuess', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 3;
      G.maxLoops = 4;
      G.v1.loopLost = true;
      G.v1.protagonistKilled = false;

      const events = { endPhase: vi.fn() };
      (phases.loop_end_check.onBegin as any)({ G, events });

      // basic_tragedy 支持 finalGuess，轮回耗尽后不直接设 mastermind winner
      // 而是路由到 final_guess 阶段
      expect(G.loopIndex).toBe(4);
      // winner 不应是 mastermind（因为还有最终猜测阶段）
      expect(G.v1.winner).toBeUndefined();
      expect(G.v1.eventLogs.filter(event => event.type === 'result')).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({
            resultType: 'loop_failure',
          }),
        }),
      ]);
      expect(G.v1.pendingInteractions).toEqual([
        expect.objectContaining({
          kind: 'loop_result_resolution',
          availableOutcomes: [
            expect.objectContaining({
              id: 'final_guess',
            }),
          ],
        }),
      ]);
    });

    it('sets protagonist winner when loop ends without loss', () => {
      const G = createGame();
      setupBasicGame(G);
      G.loopIndex = 0;
      G.v1.loopLost = false;
      G.v1.protagonistKilled = false;

      const events = { endPhase: vi.fn() };
      (phases.loop_end_check.onBegin as any)({ G, events });

      expect(G.v1.winner).toBe('protagonist');
    });
  });

  // ── time_spiral ────────────────────────────────────────────────────

  describe('time_spiral', () => {
    it('creates a discussion interaction in manual mode', () => {
      const G = createGame();
      G.loopIndex = 0;
      G.day = 0;
      G.v1.settings.autoResolve = false;
      G.v1.loopState = {
        revealedRoles: {},
        revealedRules: [],
        revealedIncidentCulprits: {},
        triggeredIncidents: [],
        incidentHistory: [],
        abilityUsage: {},
        butterflyEffectTriggered: false,
        lastLoopGoodwillChars: [],
        lastLoopDeadCharacters: [],
        lastWillHopeNextLoop: false,
        deathFlagCount: 0,
        communicationFlagCount: 0,
        deadCharactersAtLeastOnce: [],
        communicatedCharacters: [],
      };

      (phases.time_spiral.onBegin as any)({ G });

      expect(G.v1.pendingInteractions.length).toBeGreaterThanOrEqual(1);
      expect(G.v1.pendingInteractions[0].kind).toBe('time_spiral_discussion');
    });

    it('publishes revealed roles to public log', () => {
      const G = createGame();
      G.loopIndex = 1;
      G.day = 0;
      G.v1.settings.autoResolve = false;
      G.v1.loopState = {
        revealedRoles: { doctor: 'brain' },
        revealedRules: [],
        revealedIncidentCulprits: {},
        triggeredIncidents: [],
        incidentHistory: [],
        abilityUsage: {},
        butterflyEffectTriggered: false,
        lastLoopGoodwillChars: [],
        lastLoopDeadCharacters: [],
        lastWillHopeNextLoop: false,
        deathFlagCount: 0,
        communicationFlagCount: 0,
        deadCharactersAtLeastOnce: [],
        communicatedCharacters: [],
      };

      (phases.time_spiral.onBegin as any)({ G });

      expect(G.publicLog.some(line => line.includes('已揭示'))).toBe(true);
    });
  });

  // ── incidents ──────────────────────────────────────────────────────

  describe('incidents', () => {
    it('logs no incidents when no scheduled events match today', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 5;
      G.v1.scheduledIncidents = [{ day: 3, incidentId: 'murder' }];

      const events = { endPhase: vi.fn(), setPhase: vi.fn() };
      (phases.incidents.onBegin as any)({ G, events });

      expect(G.publicLog.some(line => line.includes('今日无事件'))).toBe(true);
    });

    it('builds incident interactions in manual mode', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 1;
      G.v1.settings.autoResolve = false;
      G.v1.scheduledIncidents = [{ day: 1, incidentId: 'murder' }];
      G.v1.incidentCulprits = { '1_murder': 'boy_student' };

      const events = { endPhase: vi.fn(), setPhase: vi.fn() };
      (phases.incidents.onBegin as any)({ G, events });

      expect(G.v1.pendingInteractions.length).toBeGreaterThanOrEqual(1);
    });

    it('keeps incidents as a manual checkpoint in autoResolve mode', () => {
      const G = createGame();
      setupBasicGame(G);
      G.day = 1;
      G.v1.settings.autoResolve = true;
      G.v1.scheduledIncidents = [{ day: 1, incidentId: 'murder' }];
      G.v1.incidentCulprits = { '1_murder': 'boy_student' };

      const events = { endPhase: vi.fn(), setPhase: vi.fn() };
      (phases.incidents.onBegin as any)({ G, events });

      expect(G.v1.pendingInteractions.some(interaction => interaction.kind === 'incident_resolution')).toBe(true);
      expect(G.v1.loopState.incidentHistory).toEqual([]);
      expect(G.fullLog.some(line => line.includes('[手动模式] 事件: murder'))).toBe(true);
    });
  });

  describe('mastermind_abilities', () => {
    it('keeps sensitive mastermind abilities queued in autoResolve mode', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.settings.autoResolve = true;

      (phases.mastermind_abilities.onBegin as any)({ G });

      expect(G.v1.pendingAbilities).toContainEqual(
        expect.objectContaining({
          ruleId: 'brain_intrigue_ability',
          characterId: 'doctor',
          mandatory: false,
        }),
      );
      expect(G.v1.abilityPhase).toBe('optional');
      expect(getToken(G.v1.characters.doctor, 'intrigue')).toBe(0);
      expect(G.fullLog.some(line => line.includes('[手动模式] 进入 剧作家能力阶段'))).toBe(true);
    });
  });

  describe('goodwill_window', () => {
    it('为通用友好能力补出目标槽位', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.characters.soldier = {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 2 },
      } as any;
      G.v1.characters.doctor.locationId = 'city';

      beginGoodwillWindowPhase(G);

      const soldierAbility = G.v1.goodwillInteraction.eligibleAbilities.find(
        (ability) => ability.characterId === 'soldier' && ability.abilityId === 'soldier_gw2',
      );
      expect(soldierAbility?.targetSlots).toEqual([
        expect.objectContaining({
          slotId: 'target',
          eligibleCharacterIds: expect.arrayContaining(['doctor']),
        }),
      ]);
    });

    it('为依赖前置选择的友好能力补出条件槽位', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.characters.sennin = {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 5 },
      } as any;
      G.v1.characters.corpse_a = {
        locationId: 'school',
        alive: false,
        tokens: createEmptyTokenBag(),
      } as any;
      G.v1.characters.corpse_b = {
        locationId: 'school',
        alive: false,
        tokens: createEmptyTokenBag(),
      } as any;

      beginGoodwillWindowPhase(G);

      const immortalAbility = G.v1.goodwillInteraction.eligibleAbilities.find(
        (ability) => ability.characterId === 'sennin' && ability.abilityId === 'immortal_gw1',
      );
      expect(immortalAbility?.targetSlots).toEqual(expect.arrayContaining([
        expect.objectContaining({
          slotId: 'destination',
          eligibleLocationIds: expect.arrayContaining(['school']),
        }),
        expect.objectContaining({
          slotId: 'school::target',
          eligibleCharacterIds: expect.arrayContaining(['corpse_a', 'corpse_b']),
        }),
      ]));
    });
  });

  // ── final_guess ────────────────────────────────────────────────────

  describe('final_guess', () => {
    it('resets all characters and initializes guess state', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.characters.doctor.alive = false;
      G.v1.characters.doctor.tokens.paranoia = 5;

      const events = { setPhase: vi.fn() };
      (phases.final_guess.onBegin as any)({ G, events });

      expect(G.v1.characters.doctor.alive).toBe(true);
      expect(getToken(G.v1.characters.doctor, 'paranoia')).toBe(0);
      expect(G.v1.finalGuess).toBeDefined();
      expect(G.v1.finalGuess!.targets!.length).toBe(3);
      expect(G.v1.finalGuess!.completed).toBe(false);
    });
  });

  describe('match_end', () => {
    it('emits a game result event for the winning side', () => {
      const G = createGame();
      setupBasicGame(G);
      G.v1.winner = 'mastermind';

      (phases.match_end.onBegin as any)({ G });

      expect(G.v1.eventLogs.at(-1)).toEqual(expect.objectContaining({
        type: 'result',
        payload: expect.objectContaining({
          resultType: 'game_defeat',
          title: '剧作家获胜',
        }),
      }));
    });
  });
});
