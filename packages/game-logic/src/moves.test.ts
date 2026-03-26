import { INVALID_MOVE } from 'boardgame.io/core';
import { describe, expect, it, vi } from 'vitest';

import { TragedyLooper } from './game';
import type { TragedyGameState } from './game';
import { moves } from './moves';
import { buildMastermindDeck, buildProtagonistDeck } from './data/cardService';
import { createEmptyTokenBag, getToken } from './utils/tokenHelpers';
import { buildActiveRules } from './scriptLoader';

function createGame(): TragedyGameState {
  return TragedyLooper.setup!({} as any) as TragedyGameState;
}

function setupGameWithScript(G: TragedyGameState): void {
  G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
  G.maxLoops = 4;
  G.daysPerLoop = 7;
  G.day = 1;
  G.loopIndex = 0;
  G.seatHands = {
    '0': buildMastermindDeck(),
    '1': buildProtagonistDeck(),
    '2': buildProtagonistDeck(),
    '3': buildProtagonistDeck(),
  };
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
}

describe('moves — permission and legality', () => {
  // ── advancePhase ──────────────────────────────────────────────────────

  describe('advancePhase', () => {
    it('rejects non-mastermind from advancing mastermind-only phases', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'time_spiral' }, events, playerID: '1' },
      );

      expect(result).toBe(INVALID_MOVE);
      expect(events.endPhase).not.toHaveBeenCalled();
    });

    it('allows mastermind to advance time_spiral', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'time_spiral' }, events, playerID: '0' },
      );

      expect(result).toBeUndefined();
      expect(events.endPhase).toHaveBeenCalled();
    });

    it('rejects advancing from non-advanceable phases', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'script_select' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('rejects when mastermind has not played 3 cards in mastermind_plan', () => {
      const G = createGame();
      setupGameWithScript(G);
      const events = { endPhase: vi.fn() };

      // Only 2 cards played
      G.v1.playedCards = [
        { id: 'c1', cardTemplateId: 'mastermind_unease_plus_1', owner: 'mastermind', targetType: 'character', targetId: 'doctor', faceUp: false, playedBySeat: '0' },
        { id: 'c2', cardTemplateId: 'mastermind_forbid_movement', owner: 'mastermind', targetType: 'character', targetId: 'girl_student', faceUp: false, playedBySeat: '0' },
      ];

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'mastermind_plan' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('blocks advance when pending interactions exist', () => {
      const G = createGame();
      G.v1.pendingInteractions = [{
        id: 'incident:1_murder',
        kind: 'incident_resolution',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: '1_murder',
        day: 1,
        incidentId: 'murder',
        culpritId: 'doctor',
        description: '事件裁定',
        targetSlots: [],
      }] as any;
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('blocks advancing checkpoint phases when pending abilities exist without runtime interactions', () => {
      const G = createGame();
      G.v1.settings.autoResolve = true;
      G.v1.pendingAbilities = [{
        id: 'brain_intrigue_ability:doctor',
        ruleId: 'brain_intrigue_ability',
        characterId: 'doctor',
        mandatory: false,
        description: '主谋可在同区域放置 1 密谋',
        targetSlots: [],
      }] as any;
      G.v1.pendingInteractions = [];
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'mastermind_abilities' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
      expect(events.endPhase).not.toHaveBeenCalled();
    });

    it('rejects the goodwill leader from using advancePhase while abilities are still being chosen', () => {
      const G = createGame();
      G.v1.leader = '1';
      G.v1.goodwillInteraction = {
        phase: 'leader_choosing',
        eligibleAbilities: [],
        currentDeclaration: null,
      };
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'goodwill_window' }, events, playerID: '1' },
      );

      expect(result).toBe(INVALID_MOVE);
      expect(events.endPhase).not.toHaveBeenCalled();
    });

    it('allows the goodwill leader to advance once the interaction is done', () => {
      const G = createGame();
      G.v1.leader = '1';
      G.v1.goodwillInteraction = {
        phase: 'done',
        eligibleAbilities: [],
        currentDeclaration: null,
      };
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'goodwill_window' }, events, playerID: '1' },
      );

      expect(result).toBeUndefined();
      expect(events.endPhase).toHaveBeenCalled();
    });

    it('keeps protagonist cards facedown after END PLAY in leader mode', () => {
      const G = createGame();
      setupGameWithScript(G);
      G.v1.settings.leaderMode = true;
      G.v1.leaderTurnOrder = ['1'];
      G.v1.leaderTurnIndex = 0;
      G.v1.playedCards = [{
        id: 'p1',
        cardTemplateId: 'protagonist_unease_plus_1',
        owner: 'protagonist',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '1',
      }];
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'protagonist_plan' }, events, playerID: '1' },
      );

      expect(result).toBeUndefined();
      expect(G.v1.playedCards[0]?.faceUp).toBe(false);
      expect(events.endPhase).toHaveBeenCalled();
    });
  });

  // ── declareLoopLoss ───────────────────────────────────────────────────

  describe('declareLoopLoss', () => {
    it('only mastermind can declare', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.declareLoopLoss as any)(
        { G, ctx: { phase: 'day_start' }, events, playerID: '1' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('sets loopLost and ends phase', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.declareLoopLoss as any)(
        { G, ctx: { phase: 'day_start' }, events, playerID: '0' },
      );

      expect(result).toBeUndefined();
      expect(G.v1.loopLost).toBe(true);
      expect(events.endPhase).toHaveBeenCalled();
      expect(G.v1.timeline.facts.at(-1)).toEqual(expect.objectContaining({
        type: 'manual_adjustment',
        visibility: expect.objectContaining({ audience: 'public' }),
        payload: expect.objectContaining({
          family: 'manual',
          operation: 'declare_loop_loss',
        }),
      }));
    });

    it('rejects from script_select phase', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.declareLoopLoss as any)(
        { G, ctx: { phase: 'script_select' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('blocks day_end advance while the mandatory queue still has pending abilities', () => {
      const G = createGame();
      G.v1.pendingAbilities = [{
        id: 'serial_killer_day_end_kill:doctor',
        ruleId: 'serial_killer_day_end_kill',
        characterId: 'doctor',
        timing: 'day_end',
        phase: 'day_end',
        mandatory: true,
        description: 'serial killer day_end kill',
        targetSlots: [],
      }];
      const events = { endPhase: vi.fn() };

      const result = (moves.advancePhase as any)(
        { G, ctx: { phase: 'day_end' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
      expect(events.endPhase).not.toHaveBeenCalled();
    });
  });

  // ── toggleReady ────────────────────────────────────────────────────────

  describe('toggleReady', () => {
    it('toggles ready state for protagonist in lobby_wait', () => {
      const G = createGame();

      (moves.toggleReady as any)({ G, ctx: { phase: 'lobby_wait' }, playerID: '1' });

      expect(G.v1.readyPlayers['1']).toBe(true);
      expect(G.v1.joinedProtagonists['1']).toBe(true);

      (moves.toggleReady as any)({ G, ctx: { phase: 'lobby_wait' }, playerID: '1' });

      expect(G.v1.readyPlayers['1']).toBe(false);
    });

    it('rejects from non-lobby phases', () => {
      const G = createGame();

      const result = (moves.toggleReady as any)(
        { G, ctx: { phase: 'time_spiral' }, playerID: '1' },
      );

      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── startGame ──────────────────────────────────────────────────────────

  describe('startGame', () => {
    it('rejects when no protagonist has joined', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.startGame as any)(
        { G, ctx: { phase: 'lobby_wait' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('rejects when joined protagonists are not ready', () => {
      const G = createGame();
      G.v1.joinedProtagonists = { '1': true };
      G.v1.readyPlayers = {};
      const events = { endPhase: vi.fn() };

      const result = (moves.startGame as any)(
        { G, ctx: { phase: 'lobby_wait' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('starts game when all joined protagonists are ready', () => {
      const G = createGame();
      G.v1.joinedProtagonists = { '1': true, '2': true };
      G.v1.readyPlayers = { '1': true, '2': true };
      const events = { endPhase: vi.fn() };

      const result = (moves.startGame as any)(
        { G, ctx: { phase: 'lobby_wait' }, events, playerID: '0' },
      );

      expect(result).toBeUndefined();
      expect(events.endPhase).toHaveBeenCalled();
      expect(G.v1.settings.playerCount).toBe(3); // 1剧作+2主角
      expect(G.publicLog.at(-1)).toContain('检测到 3 人模式');
      expect(G.v1.timeline.facts.at(-1)).toEqual(expect.objectContaining({
        type: 'manual_adjustment',
        visibility: expect.objectContaining({ audience: 'public' }),
        payload: expect.objectContaining({
          family: 'manual',
          operation: 'start_game',
        }),
      }));
    });

    it('rejects non-mastermind', () => {
      const G = createGame();
      G.v1.joinedProtagonists = { '1': true };
      G.v1.readyPlayers = { '1': true };
      const events = { endPhase: vi.fn() };

      const result = (moves.startGame as any)(
        { G, ctx: { phase: 'lobby_wait' }, events, playerID: '1' },
      );

      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── playCard ───────────────────────────────────────────────────────────

  describe('playCard', () => {
    it('rejects protagonist playing in mastermind_plan phase', () => {
      const G = createGame();
      setupGameWithScript(G);

      const result = (moves.playCard as any)(
        { G, ctx: { phase: 'mastermind_plan' }, playerID: '1' },
        'protagonist_goodwill_plus_1',
        'character',
        'doctor',
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('rejects mastermind playing in protagonist_plan phase', () => {
      const G = createGame();
      setupGameWithScript(G);

      const result = (moves.playCard as any)(
        { G, ctx: { phase: 'protagonist_plan' }, playerID: '0' },
        'mastermind_unease_plus_1',
        'character',
        'doctor',
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('allows mastermind to play a valid card in mastermind_plan phase', () => {
      const G = createGame();
      setupGameWithScript(G);
      // Mastermind has the card in hand
      expect(G.seatHands['0']).toContain('mastermind_unease_plus_1');

      const result = (moves.playCard as any)(
        { G, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
        'mastermind_unease_plus_1',
        'character',
        'doctor',
      );

      expect(result).toBeUndefined();
      expect(G.v1.playedCards.length).toBe(1);
      expect(G.v1.playedCards[0].playedBySeat).toBe('0');
    });

    it('rejects playing a card not in hand', () => {
      const G = createGame();
      setupGameWithScript(G);
      G.seatHands['0'] = []; // Empty hand

      const result = (moves.playCard as any)(
        { G, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
        'mastermind_unease_plus_1',
        'character',
        'doctor',
      );

      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── recallCard ─────────────────────────────────────────────────────────

  describe('recallCard', () => {
    it('returns card to hand when recalling own card', () => {
      const G = createGame();
      setupGameWithScript(G);
      G.v1.playedCards = [{
        id: 'card_1',
        cardTemplateId: 'mastermind_unease_plus_1',
        owner: 'mastermind',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '0',
      }];
      // Remove from hand first
      const idx = G.seatHands['0'].indexOf('mastermind_unease_plus_1');
      if (idx !== -1) G.seatHands['0'].splice(idx, 1);

      const result = (moves.recallCard as any)(
        { G, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
        'card_1',
      );

      expect(result).toBeUndefined();
      expect(G.v1.playedCards.length).toBe(0);
      expect(G.seatHands['0']).toContain('mastermind_unease_plus_1');
    });
  });

  // ── modifyToken ────────────────────────────────────────────────────────

  describe('modifyToken', () => {
    it('only allows mastermind to modify tokens', () => {
      const G = createGame();
      setupGameWithScript(G);

      const result = (moves.modifyToken as any)(
        { G, playerID: '1' },
        'doctor',
        'paranoia',
        1,
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('adds token to character when mastermind calls', () => {
      const G = createGame();
      setupGameWithScript(G);

      (moves.modifyToken as any)(
        { G, playerID: '0' },
        'doctor',
        'intrigue',
        2,
      );

      expect(getToken(G.v1.characters.doctor, 'intrigue')).toBe(2);
      expect(G.v1.timeline.facts.at(-1)).toEqual(expect.objectContaining({
        type: 'manual_adjustment',
        visibility: expect.objectContaining({ audience: 'mastermind' }),
        payload: expect.objectContaining({
          family: 'manual',
          operation: 'modify_token',
        }),
      }));
    });
  });

  // ── moveCharacter ──────────────────────────────────────────────────────

  describe('moveCharacter', () => {
    it('only allows mastermind to move characters', () => {
      const G = createGame();
      setupGameWithScript(G);

      const result = (moves.moveCharacter as any)(
        { G, playerID: '1' },
        'doctor',
        'city',
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('moves character to target location', () => {
      const G = createGame();
      setupGameWithScript(G);

      (moves.moveCharacter as any)(
        { G, playerID: '0' },
        'doctor',
        'city',
      );

      expect(G.v1.characters.doctor.locationId).toBe('city');
    });
  });

  // ── killCharacter ─────────────────────────────────────────────────────

  describe('killCharacter', () => {
    it('toggles alive status', () => {
      const G = createGame();
      setupGameWithScript(G);

      (moves.killCharacter as any)({ G, playerID: '0' }, 'doctor');
      expect(G.v1.characters.doctor.alive).toBe(false);

      (moves.killCharacter as any)({ G, playerID: '0' }, 'doctor');
      expect(G.v1.characters.doctor.alive).toBe(true);
    });

    it('rejects non-mastermind', () => {
      const G = createGame();
      setupGameWithScript(G);

      const result = (moves.killCharacter as any)({ G, playerID: '1' }, 'doctor');
      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── updateSetting ──────────────────────────────────────────────────────

  describe('updateSetting', () => {
    it('toggles autoResolve for mastermind', () => {
      const G = createGame();
      G.v1.currentScriptId = null;

      const result = (moves.updateSetting as any)(
        { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
        'autoResolve',
        true,
      );

      expect(result).toBeUndefined();
      expect(G.v1.settings.autoResolve).toBe(true);
      expect(G.publicLog.at(-1)).toBe('⚡ 已切换到结算模式');
      expect(G.v1.timeline.facts.at(-1)).toEqual(expect.objectContaining({
        type: 'manual_adjustment',
        visibility: expect.objectContaining({ audience: 'public' }),
        payload: expect.objectContaining({
          family: 'manual',
          operation: 'update_setting',
        }),
      }));
    });

    it('rejects non-mastermind', () => {
      const G = createGame();

      const result = (moves.updateSetting as any)(
        { G, ctx: { phase: 'time_spiral' }, playerID: '1' },
        'autoResolve',
        true,
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('rejects setting non-autoResolve keys outside lobby_wait', () => {
      const G = createGame();

      const result = (moves.updateSetting as any)(
        { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
        'leaderMode',
        true,
      );

      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── setPlayerCount ─────────────────────────────────────────────────────

  describe('setPlayerCount', () => {
    it('allows adjustment in lobby_wait', () => {
      const G = createGame();
      const previousCount = G.v1.settings.playerCount;

      (moves.setPlayerCount as any)(
        { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
        3,
      );

      expect(G.v1.settings.playerCount).toBe(3);
      expect(G.publicLog.at(-1)).toBe(`🔄 人数模式调整 ${previousCount}人 → 3人`);
      expect(G.v1.timeline.facts.at(-1)).toEqual(expect.objectContaining({
        type: 'manual_adjustment',
        visibility: expect.objectContaining({ audience: 'public' }),
        payload: expect.objectContaining({
          family: 'manual',
          operation: 'set_player_count',
        }),
      }));
    });

    it('rejects invalid count', () => {
      const G = createGame();

      const result = (moves.setPlayerCount as any)(
        { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
        5,
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('rejects non-mastermind', () => {
      const G = createGame();

      const result = (moves.setPlayerCount as any)(
        { G, ctx: { phase: 'lobby_wait' }, playerID: '1' },
        3,
      );

      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── confirmIncidentsComplete ──────────────────────────────────────────

  describe('confirmIncidentsComplete', () => {
    it('rejects when pending interactions exist', () => {
      const G = createGame();
      G.v1.pendingInteractions = [{
        id: 'incident:1_murder',
        kind: 'incident_resolution',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: '1_murder',
        day: 1,
        incidentId: 'murder',
        culpritId: 'doctor',
        description: '事件裁定',
        targetSlots: [],
      }] as any;
      const events = { endPhase: vi.fn() };

      const result = (moves.confirmIncidentsComplete as any)(
        { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('ends phase when no pending interactions', () => {
      const G = createGame();
      const events = { endPhase: vi.fn() };

      const result = (moves.confirmIncidentsComplete as any)(
        { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      );

      expect(result).toBeUndefined();
      expect(events.endPhase).toHaveBeenCalled();
    });
  });

  // ── chooseButterflyToken ──────────────────────────────────────────────

  describe('chooseButterflyToken', () => {
    it('rejects non-mastermind', () => {
      const G = createGame();

      const result = (moves.chooseButterflyToken as any)(
        { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn() }, playerID: '1' },
        'goodwill',
      );

      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── confirmLoopResult ────────────────────────────────────────────────

  describe('confirmLoopResult', () => {
    it('rejects non-mastermind', () => {
      const G = createGame();
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
        failureReasons: [{ id: 'system:death', label: '主人公死亡' }],
        effectOptions: [],
        availableOutcomes: [{ id: 'next_loop', label: '进入时间裂隙' }],
      }] as any;

      const result = (moves.confirmLoopResult as any)(
        { G, ctx: { phase: 'loop_end_check' }, playerID: '1' },
        'system:death',
        'next_loop',
      );

      expect(result).toBe(INVALID_MOVE);
    });

    it('confirms the loop result, emits the follow-up announcement, and clears the pending panel', () => {
      const G = createGame();
      setupGameWithScript(G);
      G.loopIndex = 1;
      G.maxLoops = 4;
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
        failureReasons: [{ id: 'system:death', label: '主人公死亡' }],
        effectOptions: [],
        availableOutcomes: [{ id: 'next_loop', label: '进入时间裂隙', detail: '下一轮将从第 2 轮回开始。' }],
      }] as any;

      const result = (moves.confirmLoopResult as any)(
        { G, ctx: { phase: 'loop_end_check' }, playerID: '0' },
        'system:death',
        'next_loop',
      );

      expect(result).toBeUndefined();
      expect(G.v1.pendingInteractions).toEqual([]);
      expect(G.publicLog.some(line => line.includes('第 1 轮回结束'))).toBe(true);
      expect(G.v1.eventLogs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'result',
          payload: expect.objectContaining({
            resultType: 'loop_end',
            title: '第 1 轮回结束',
          }),
        }),
      ]));
      expect(G.fullLog.some(line => line.includes('outcome=进入时间裂隙'))).toBe(true);
      const loopFacts = G.v1.timeline.facts.filter(fact => fact.source.id === 'confirmLoopResult');
      expect(new Set(loopFacts.map(fact => fact.flowId)).size).toBe(1);
      const publicConfirmation = loopFacts.find((fact) => (
        fact.payload.family === 'resolution'
        && (fact.payload as any).outcome === 'loop_result_confirmed'
      ));
      const secretConfirmation = loopFacts.find((fact) => (
        fact.payload.family === 'resolution'
        && (fact.payload as any).outcome === 'loop_result_confirmed_secret'
      ));
      expect(publicConfirmation).toBeDefined();
      expect(secretConfirmation?.causedByFactIds).toEqual([publicConfirmation!.factId]);
      expect(loopFacts.some(fact => fact.payload.family === 'result')).toBe(true);
    });
  });

  // ── submitGuess ───────────────────────────────────────────────────────

  describe('submitGuess', () => {
    it('emits a coherent fact chain for a winning final guess', () => {
      const G = createGame();
      setupGameWithScript(G);
      G.v1.finalGuess = {
        targets: [{ charId: 'doctor', requiresDualGuess: false }],
        guesses: [],
        completed: false,
      };
      const events = { setPhase: vi.fn() };

      const result = (moves.submitGuess as any).move(
        { G, ctx: { phase: 'final_guess' }, events, playerID: '1' },
        'doctor',
        'brain',
      );

      expect(result).toBeUndefined();
      expect(G.v1.winner).toBe('protagonist');
      expect(events.setPhase).toHaveBeenCalledWith('match_end');
      expect(G.publicLog.slice(-2)).toEqual([
        '✅ doctor: brain — 正确！',
        '🏆 全部猜对！主角团获胜！',
      ]);

      const [guessFact, completionFact] = G.v1.timeline.facts.slice(-2);
      expect(guessFact.flowId).toBe(completionFact.flowId);
      expect(completionFact.causedByFactIds).toEqual([guessFact.factId]);
      expect(guessFact).toEqual(expect.objectContaining({
        type: 'state_change',
        visibility: expect.objectContaining({ audience: 'public' }),
        actor: expect.objectContaining({ role: 'protagonist', seatId: '1' }),
        payload: expect.objectContaining({
          family: 'resolution',
          outcome: 'final_guess_correct',
        }),
      }));
      expect(completionFact).toEqual(expect.objectContaining({
        type: 'state_change',
        payload: expect.objectContaining({
          family: 'resolution',
          outcome: 'final_guess_victory',
        }),
      }));
    });
  });

  // ── submitDetectiveGuess ──────────────────────────────────────────────

  describe('submitDetectiveGuess', () => {
    it('records detective guesses as seat-private timeline facts', () => {
      const G = createGame();
      G.scriptOpen = { tragedySetId: 'last_liar' } as any;
      G.daysPerLoop = 6;
      G.v1.activePlots = ['ll_i_am_the_detective'];
      G.v1.exCardAssignment = { '3': 'C' } as any;
      G.v1.characters = {
        culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      };
      G.v1.scheduledIncidents = [{ day: 1, incidentId: 'murder' }];

      const result = (moves.submitDetectiveGuess as any)(
        { G, ctx: { phase: 'time_spiral' }, playerID: '3' },
        { day: 1, incidentId: 'murder', culpritId: 'culprit' },
      );

      expect(result).toBeUndefined();
      expect(G.publicLog).toEqual([]);
      expect(G.fullLog).toEqual([]);

      const fact = G.v1.timeline.facts.at(-1);
      expect(fact).toEqual(expect.objectContaining({
        type: 'state_change',
        visibility: expect.objectContaining({
          audience: 'seat-private',
          seatIds: ['3'],
        }),
        actor: expect.objectContaining({
          role: 'protagonist',
          seatId: '3',
        }),
        payload: expect.objectContaining({
          family: 'resolution',
          outcome: 'detective_guess_recorded',
        }),
      }));

      const detectiveView = (TragedyLooper.playerView as any)({ G, playerID: '3' }) as TragedyGameState;
      const otherSeatView = (TragedyLooper.playerView as any)({ G, playerID: '1' }) as TragedyGameState;
      expect(detectiveView.v1.timeline.facts.some(entry => entry.factId === fact?.factId)).toBe(true);
      expect(otherSeatView.v1.timeline.facts.some(entry => entry.factId === fact?.factId)).toBe(false);
    });
  });

  // ── resolveAbility ────────────────────────────────────────────────────

  describe('resolveAbility', () => {
    it('carries updated goodwill multi-slot selections into the public rejection payload', () => {
      const G = createGame();
      setupGameWithScript(G);
      G.v1.characters.doctor.locationId = 'school';
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
          abilityId: 'custom_multi_target_goodwill',
          label: '转移指示物',
          used: false,
          targetSlots: [{
            slotId: 'fromCharacter',
            label: '选择移出角色',
            kind: 'character',
            eligibleCharacterIds: ['girl_student'],
          }, {
            slotId: 'toCharacter',
            label: '选择移入角色',
            kind: 'character',
            eligibleCharacterIds: ['boy_student'],
          }],
        }],
        currentDeclaration: {
          characterId: 'doctor',
          abilityId: 'custom_multi_target_goodwill',
          selectedTargets: {
            fromCharacter: 'girl_student',
            toCharacter: 'boy_student',
          },
        },
      }] as any;
      G.v1.activeInteractionId = 'goodwill:mastermind_resolving';

      const result = (moves.resolveAbility as any)(
        { G, ctx: { phase: 'goodwill_window' }, playerID: '0' },
        false,
      );

      expect(result).toBeUndefined();
      expect(G.v1.eventLogs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'ability_trigger',
          payload: expect.objectContaining({
            outcome: 'rejected',
            detail: expect.stringContaining('选择移出角色'),
            targetId: 'girl_student',
            targetType: 'character',
          }),
        }),
      ]));
    });

    it('derives location focus targets for updated goodwill declarations without a target slot named target', () => {
      const G = createGame();
      setupGameWithScript(G);
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
          abilityId: 'custom_location_goodwill',
          label: '指定地点波动',
          used: false,
          targetSlots: [{
            slotId: 'location',
            label: '选择相邻版图',
            kind: 'location',
            eligibleLocationIds: ['city'],
          }, {
            slotId: 'worldShiftChoice',
            label: '世界线选择',
            kind: 'choice',
            eligibleChoices: [{ id: 'shift', label: '发生世界线变动' }],
          }],
        }],
        currentDeclaration: {
          characterId: 'doctor',
          abilityId: 'custom_location_goodwill',
          selectedTargets: {
            location: 'city',
            worldShiftChoice: 'shift',
          },
        },
      }] as any;
      G.v1.activeInteractionId = 'goodwill:mastermind_resolving';

      const result = (moves.resolveAbility as any)(
        { G, ctx: { phase: 'goodwill_window' }, playerID: '0' },
        false,
      );

      expect(result).toBeUndefined();
      expect(G.v1.eventLogs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'ability_trigger',
          payload: expect.objectContaining({
            outcome: 'rejected',
            detail: expect.stringContaining('选择相邻版图'),
            targetId: 'city',
            targetType: 'location',
          }),
        }),
      ]));
    });
  });

  // ── revealAllCards ─────────────────────────────────────────────────────

  describe('revealAllCards', () => {
    it('flips all cards face up', () => {
      const G = createGame();
      G.v1.playedCards = [
        { id: 'c1', cardTemplateId: 'x', owner: 'mastermind', targetType: 'character', targetId: 'a', faceUp: false, playedBySeat: '0' },
        { id: 'c2', cardTemplateId: 'y', owner: 'protagonist', targetType: 'character', targetId: 'b', faceUp: false, playedBySeat: '1' },
      ];

      (moves.revealAllCards as any)({ G, playerID: '0' });

      expect(G.v1.playedCards.every(c => c.faceUp)).toBe(true);
    });

    it('rejects non-mastermind', () => {
      const G = createGame();
      G.v1.playedCards = [
        { id: 'c1', cardTemplateId: 'x', owner: 'mastermind', targetType: 'character', targetId: 'a', faceUp: false, playedBySeat: '0' },
      ];

      const result = (moves.revealAllCards as any)({ G, playerID: '1' });
      expect(result).toBe(INVALID_MOVE);
    });
  });

  // ── registerLobbySeat ──────────────────────────────────────────────────

  describe('registerLobbySeat', () => {
    it('registers protagonist seat in lobby', () => {
      const G = createGame();

      (moves.registerLobbySeat as any)({ G, ctx: { phase: 'lobby_wait' }, playerID: '2' });

      expect(G.v1.joinedProtagonists['2']).toBe(true);
    });

    it('rejects mastermind registration', () => {
      const G = createGame();

      const result = (moves.registerLobbySeat as any)(
        { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
      );

      expect(result).toBe(INVALID_MOVE);
    });
  });
});
