import { MATCH_PHASES, type MatchPhase, type RoomState } from '@tragedy/domain';

export type { MatchPhase };

export type LoopOutcome = 'continue_loop' | 'final_guess' | 'match_end';
export type AdvancePhaseInput = {
  currentPhase: MatchPhase;
  loopOutcome?: LoopOutcome;
};

type LifecycleRoomState = Pick<RoomState, 'seats'> & {
  status: RoomState['status'] | 'in_progress';
};

export function getInitialPhase(): MatchPhase {
  return MATCH_PHASES[0];
}

export function canStartGame(room: LifecycleRoomState): boolean {
  const hasMastermind = room.seats.some(
    (seat) => seat.role === 'mastermind' && seat.playerId !== null,
  );
  const hasProtagonist = room.seats.some(
    (seat) => seat.role === 'protagonist' && seat.playerId !== null,
  );

  return hasMastermind && hasProtagonist;
}

export function canJoinPlayerSeat(room: LifecycleRoomState): boolean {
  return room.status !== 'in_progress' && room.status !== 'in_game';
}

export function advancePhase(input: AdvancePhaseInput): MatchPhase {
  if (input.currentPhase === 'loop_end_check') {
    if (!input.loopOutcome) {
      throw new Error('loopOutcome is required for loop_end_check');
    }

    if (input.loopOutcome === 'continue_loop') {
      return 'loop_setup';
    }

    if (input.loopOutcome === 'final_guess') {
      return 'final_guess';
    }

    return 'match_end';
  }

  if (input.currentPhase === 'final_guess' || input.currentPhase === 'match_end') {
    return 'match_end';
  }

  const currentIndex = MATCH_PHASES.indexOf(input.currentPhase);

  if (currentIndex === -1 || currentIndex === MATCH_PHASES.length - 1) {
    throw new Error(`No transition defined for phase: ${input.currentPhase}`);
  }

  return MATCH_PHASES[currentIndex + 1];
}
