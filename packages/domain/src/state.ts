import type { MatchPhase } from './phases';
import type { LocalizedText } from './dictionary';
import type { OpenScriptView, OpenSpecialRuleView, ScriptChoice, SecretScriptView } from './script';

export type MatchOpenScriptView = OpenScriptView<
  string | LocalizedText,
  number | ScriptChoice<number>,
  string | OpenSpecialRuleView
>;

export type RoomState = {
  roomId: string;
  roomCode: string;
  spectators: Array<
    | string
    | {
        spectatorId: string;
        name: string;
      }
  >;
  seats: Array<{
    seatId: string;
    playerId: string | null;
    boardgamePlayerId: string;
    role: 'mastermind' | 'protagonist';
    locked?: boolean;
  }>;
  reconnectTokens: Record<string, string>;
  status: 'lobby' | 'locked' | 'in_game' | 'finished';
};

export type BoardState = {
  locations: string[];
  characters: string[];
  scheduledIncidents: Array<
    | string
    | {
        day: number;
        incidentId: string;
        culpritCharacterId?: string;
      }
  >;
  usedOncePerLoopCards: string[];
  revealedRoles: string[];
  protagonistsDead: boolean;
  loopLossReason: string | null;
  incidentHistory: Array<
    | string
    | {
        day: number;
        incidentId: string;
        resolved: boolean;
      }
  >;
};

export type MatchState = {
  scriptOpen: MatchOpenScriptView | null;
  scriptSecret: SecretScriptView | null;
  tragedySet: string | null;
  loopIndex: number;
  maxLoops: number;
  day: number;
  daysPerLoop: number;
  leaderSeat: string | null;
  phase: MatchPhase;
  publicLog: string[];
  fullLog: string[];
  seatHands: Record<string, string[]>;
  board: BoardState;
  /** 当前人数模式：2=1剧作+1主角, 3=1剧作+2主角, 4=1剧作+3主角 */
  playerCount: 2 | 3 | 4;
};

export function createInitialRoomState(input: {
  roomId: string;
  roomCode: string;
}): RoomState {
  return {
    roomId: input.roomId,
    roomCode: input.roomCode,
    spectators: [],
    seats: [],
    reconnectTokens: {},
    status: 'lobby',
  };
}

export function createInitialMatchState(): MatchState {
  return {
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
  };
}
