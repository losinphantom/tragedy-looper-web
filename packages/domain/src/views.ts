import type { MatchState, RoomState } from './state';

export type PublicSeatView = {
  seatId: string;
  occupied: boolean;
  role: RoomState['seats'][number]['role'];
  locked?: boolean;
};

export type MatchHistoryEntry = {
  factId: string;
  sequence: number;
  audience: 'public' | 'mastermind' | 'seat-private';
  seatIds: string[];
  text: string;
};

export type PublicMatchView = {
  room: Pick<RoomState, 'roomId' | 'roomCode' | 'status'> & {
    spectatorCount: number;
    seats: PublicSeatView[];
  };
  match: Pick<
    MatchState,
    'scriptOpen' | 'loopIndex' | 'day' | 'daysPerLoop' | 'leaderSeat' | 'phase' | 'publicLog'
  > & {
    history: MatchHistoryEntry[];
    board: Pick<
      MatchState['board'],
      | 'locations'
      | 'characters'
      | 'scheduledIncidents'
      | 'revealedRoles'
      | 'protagonistsDead'
      | 'loopLossReason'
      | 'incidentHistory'
    >;
  };
};

export type MastermindView = PublicMatchView & {
  secret: {
    scriptSecret: MatchState['scriptSecret'];
    fullLog: MatchState['fullLog'];
    history: MatchHistoryEntry[];
  };
};

export type ProtagonistView = PublicMatchView & {
  private: {
    seatId: string;
    reconnectToken: string | null;
    hand: string[];
    history: MatchHistoryEntry[];
  };
};

export type SpectatorView = PublicMatchView;
