import { describe, expect, it } from 'vitest';
import { createInitialRoomState } from '@tragedy/domain';

import {
  advancePhase,
  canJoinPlayerSeat,
  canStartGame,
  getInitialPhase,
  type AdvancePhaseInput,
  type MatchPhase,
} from './phases';

describe('phase helpers', () => {
  it('starts matches in lobby', () => {
    expect(getInitialPhase()).toBe('lobby');
  });

  it('advances deterministically through the main phase order', () => {
    const orderedPhases = [
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
    ] as const;

    let current: MatchPhase = orderedPhases[0];

    for (const next of orderedPhases.slice(1)) {
      current = advancePhase({ currentPhase: current });
      expect(current).toBe(next);
    }
  });

  it('branches from loop_end_check using explicit resolution input', () => {
    const continueLoop: AdvancePhaseInput = {
      currentPhase: 'loop_end_check',
      loopOutcome: 'continue_loop',
    };
    const enterFinalGuess: AdvancePhaseInput = {
      currentPhase: 'loop_end_check',
      loopOutcome: 'final_guess',
    };
    const endMatch: AdvancePhaseInput = {
      currentPhase: 'loop_end_check',
      loopOutcome: 'match_end',
    };

    expect(advancePhase(continueLoop)).toBe('loop_setup');
    expect(advancePhase(enterFinalGuess)).toBe('final_guess');
    expect(advancePhase(endMatch)).toBe('match_end');
  });

  it('rejects invalid transitions that lack required loop outcome input', () => {
    expect(() => advancePhase({ currentPhase: 'loop_end_check' })).toThrow(
      'loopOutcome is required for loop_end_check',
    );
  });

  it('cannot start a game without a claimed mastermind seat', () => {
    const room = {
      ...createInitialRoomState({ roomId: 'room-1', roomCode: 'ROOM1' }),
      seats: [
        {
          seatId: 'seat-mm',
          playerId: null,
          boardgamePlayerId: '0',
          role: 'mastermind' as const,
        },
        {
          seatId: 'seat-p1',
          playerId: 'player-1',
          boardgamePlayerId: '1',
          role: 'protagonist' as const,
        },
      ],
    };

    expect(canStartGame(room)).toBe(false);
  });

  it('cannot start a game without at least one claimed protagonist seat', () => {
    const room = {
      ...createInitialRoomState({ roomId: 'room-1', roomCode: 'ROOM1' }),
      seats: [
        {
          seatId: 'seat-mm',
          playerId: 'mastermind',
          boardgamePlayerId: '0',
          role: 'mastermind' as const,
        },
        {
          seatId: 'seat-p1',
          playerId: null,
          boardgamePlayerId: '1',
          role: 'protagonist' as const,
        },
      ],
    };

    expect(canStartGame(room)).toBe(false);
  });

  it('can start a game when mastermind and at least one protagonist are seated', () => {
    const room = {
      ...createInitialRoomState({ roomId: 'room-1', roomCode: 'ROOM1' }),
      seats: [
        {
          seatId: 'seat-mm',
          playerId: 'mastermind',
          boardgamePlayerId: '0',
          role: 'mastermind' as const,
        },
        {
          seatId: 'seat-p1',
          playerId: 'player-1',
          boardgamePlayerId: '1',
          role: 'protagonist' as const,
        },
      ],
    };

    expect(canStartGame(room)).toBe(true);
  });

  it('does not allow new player seats once the room is in progress', () => {
    const room = {
      ...createInitialRoomState({ roomId: 'room-1', roomCode: 'ROOM1' }),
      status: 'in_progress' as const,
    };

    expect(canJoinPlayerSeat(room)).toBe(false);
  });

  it('does not allow new player seats once the room is in the real domain in_game state', () => {
    const room = {
      ...createInitialRoomState({ roomId: 'room-1', roomCode: 'ROOM1' }),
      status: 'in_game' as const,
    };

    expect(canJoinPlayerSeat(room)).toBe(false);
  });
});
