import type {
  MastermindView,
  MatchHistoryEntry,
  MatchState,
  PublicMatchView,
  RoomState,
  SpectatorView,
  ProtagonistView,
} from '@tragedy/domain';
import {
  buildHistoryProjectionForViewer,
  type TimelineState,
} from '@tragedy/game-logic';

function cloneScheduledIncident(
  incident: MatchState['board']['scheduledIncidents'][number],
): MatchState['board']['scheduledIncidents'][number] {
  return typeof incident === 'string' ? incident : { ...incident };
}

function cloneIncidentHistoryEntry(
  entry: MatchState['board']['incidentHistory'][number],
): MatchState['board']['incidentHistory'][number] {
  return typeof entry === 'string' ? entry : { ...entry };
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type MatchWithTimeline = MatchState & {
  v1?: {
    timeline?: TimelineState;
  };
};

function buildCompatibilityHistory(
  lines: string[],
  audience: MatchHistoryEntry['audience'],
  seatIds: string[] = [],
): MatchHistoryEntry[] {
  return lines.map((text, index) => ({
    factId: `legacy-history:${audience}:${index + 1}`,
    sequence: index + 1,
    audience,
    seatIds,
    text,
  }));
}

function buildProjectedHistory(
  match: MatchWithTimeline,
  viewerSeat: string | null,
): MatchHistoryEntry[] {
  if (match.v1?.timeline) {
    return cloneJsonValue(buildHistoryProjectionForViewer(match.v1.timeline, viewerSeat));
  }

  if (viewerSeat === '0') {
    return [
      ...buildCompatibilityHistory(match.publicLog, 'public'),
      ...buildCompatibilityHistory(match.fullLog, 'mastermind'),
    ];
  }

  return buildCompatibilityHistory(match.publicLog, 'public');
}

function findAuthenticatedSeat(room: RoomState, playerId: string): RoomState['seats'][number] {
  const seat = room.seats.find((candidate) => (
    candidate.playerId === playerId && candidate.role === 'protagonist'
  ));

  if (!seat) {
    throw new Error(`No authenticated protagonist seat found for playerId: ${playerId}`);
  }

  return seat;
}

export function buildPublicMatchView(
  room: RoomState,
  match: MatchWithTimeline,
): PublicMatchView {
  const scriptOpen = match.scriptOpen == null ? null : cloneJsonValue(match.scriptOpen);

  return {
    room: {
      roomId: room.roomId,
      roomCode: room.roomCode,
      spectatorCount: room.spectators.length,
      seats: room.seats.map((seat) => ({
        seatId: seat.seatId,
        occupied: seat.playerId !== null,
        role: seat.role,
        ...(seat.locked !== undefined ? { locked: seat.locked } : {}),
      })),
      status: room.status,
    },
    match: {
      scriptOpen,
      loopIndex: match.loopIndex,
      day: match.day,
      daysPerLoop: match.daysPerLoop ?? null,
      leaderSeat: match.leaderSeat,
      phase: match.phase,
      publicLog: [...match.publicLog],
      history: buildProjectedHistory(match, null),
      board: {
        locations: [...match.board.locations],
        characters: [...match.board.characters],
        scheduledIncidents: match.board.scheduledIncidents.map(cloneScheduledIncident),
        revealedRoles: [...match.board.revealedRoles],
        protagonistsDead: match.board.protagonistsDead,
        loopLossReason: match.board.loopLossReason,
        incidentHistory: match.board.incidentHistory.map(cloneIncidentHistoryEntry),
      },
    },
  };
}

export function buildSpectatorView(
  room: RoomState,
  match: MatchWithTimeline,
): SpectatorView {
  return buildPublicMatchView(room, match);
}

export function buildMastermindView(
  room: RoomState,
  match: MatchWithTimeline,
): MastermindView {
  const scriptSecret = match.scriptSecret == null ? null : cloneJsonValue(match.scriptSecret);

  return {
    ...buildPublicMatchView(room, match),
    secret: {
      scriptSecret,
      fullLog: [...match.fullLog],
      history: buildProjectedHistory(match, '0'),
    },
  };
}

export function buildSeatView(
  room: RoomState,
  match: MatchWithTimeline,
  playerId: string,
): ProtagonistView {
  const publicView = buildPublicMatchView(room, match);
  const seat = findAuthenticatedSeat(room, playerId);
  const seatId = seat.seatId;

  return {
    ...publicView,
    private: {
      seatId,
      reconnectToken: room.reconnectTokens[seatId] ?? null,
      hand: [...(match.seatHands[seatId] ?? [])],
      history: buildProjectedHistory(match, seatId),
    },
  };
}
