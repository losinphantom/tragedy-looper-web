import { describe, expect, it } from 'vitest';
import type { TragedyGameState } from './game';
import {
  getProtagonistSeats,
  getMaxCardsForSeat,
  shouldRotateLeader,
  detectPlayerCount,
  getDeckCountForSeat,
} from './playerConfig';

// ── Helper: minimal G stub ──────────────────────────────────────────────────

function makeG(playerCount: 2 | 3 | 4, leader = '1'): TragedyGameState {
  return {
    v1: {
      settings: { playerCount, autoResolve: false, leaderMode: false, soloMode: false },
      leader,
    },
  } as unknown as TragedyGameState;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('playerConfig', () => {
  describe('getProtagonistSeats', () => {
    it('returns ["1"] for 2-player', () => {
      expect(getProtagonistSeats(makeG(2))).toEqual(['1']);
    });
    it('returns ["1","2"] for 3-player', () => {
      expect(getProtagonistSeats(makeG(3))).toEqual(['1', '2']);
    });
    it('returns ["1","2","3"] for 4-player', () => {
      expect(getProtagonistSeats(makeG(4))).toEqual(['1', '2', '3']);
    });
  });

  describe('getMaxCardsForSeat', () => {
    it('mastermind always plays 3', () => {
      expect(getMaxCardsForSeat(makeG(2), '0')).toBe(3);
      expect(getMaxCardsForSeat(makeG(3), '0')).toBe(3);
      expect(getMaxCardsForSeat(makeG(4), '0')).toBe(3);
    });
    it('2-player: sole protagonist plays 3', () => {
      expect(getMaxCardsForSeat(makeG(2), '1')).toBe(3);
    });
    it('3-player: captain plays 2, non-captain plays 0', () => {
      const G = makeG(3, '1');
      expect(getMaxCardsForSeat(G, '1')).toBe(2); // captain
      expect(getMaxCardsForSeat(G, '2')).toBe(0); // non-captain
    });
    it('3-player: captain is seat 2', () => {
      const G = makeG(3, '2');
      expect(getMaxCardsForSeat(G, '2')).toBe(2);
      expect(getMaxCardsForSeat(G, '1')).toBe(0);
    });
    it('4-player: each plays 1', () => {
      expect(getMaxCardsForSeat(makeG(4), '1')).toBe(1);
      expect(getMaxCardsForSeat(makeG(4), '2')).toBe(1);
      expect(getMaxCardsForSeat(makeG(4), '3')).toBe(1);
    });
  });

  describe('shouldRotateLeader', () => {
    it('returns false for 2-player', () => {
      expect(shouldRotateLeader(makeG(2))).toBe(false);
    });
    it('returns true for 3-player', () => {
      expect(shouldRotateLeader(makeG(3))).toBe(true);
    });
    it('returns true for 4-player', () => {
      expect(shouldRotateLeader(makeG(4))).toBe(true);
    });
  });

  describe('detectPlayerCount', () => {
    it('no protagonists ready → 2', () => {
      expect(detectPlayerCount({})).toBe(2);
    });
    it('1 protagonist ready → 2', () => {
      expect(detectPlayerCount({ '1': true })).toBe(2);
    });
    it('2 protagonists ready → 3', () => {
      expect(detectPlayerCount({ '1': true, '2': true })).toBe(3);
    });
    it('3 protagonists ready → 4', () => {
      expect(detectPlayerCount({ '1': true, '2': true, '3': true })).toBe(4);
    });
    it('ignores mastermind seat', () => {
      expect(detectPlayerCount({ '0': true, '1': true })).toBe(2);
    });
  });

  describe('getDeckCountForSeat', () => {
    it('mastermind gets 0 decks', () => {
      expect(getDeckCountForSeat(makeG(4), '0')).toBe(0);
    });
    it('2-player: seat 1 gets 3, others get 0', () => {
      expect(getDeckCountForSeat(makeG(2), '1')).toBe(3);
      expect(getDeckCountForSeat(makeG(2), '2')).toBe(0);
    });
    it('3-player: captain gets 2', () => {
      expect(getDeckCountForSeat(makeG(3, '1'), '1')).toBe(2);
    });
    it('4-player: each active protagonist gets 1', () => {
      expect(getDeckCountForSeat(makeG(4), '1')).toBe(1);
      expect(getDeckCountForSeat(makeG(4), '2')).toBe(1);
      expect(getDeckCountForSeat(makeG(4), '3')).toBe(1);
    });
  });
});
