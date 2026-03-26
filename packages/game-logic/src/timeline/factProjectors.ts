import type { TragedyGameState } from '../game';
import { normalizePublicAnnouncementText } from '../resultAnnouncements';
import type { TimelineFact, TimelineJsonValue } from './factSchema';

export type LegacyEventLogEntry = TragedyGameState['v1']['eventLogs'][number];
export type LegacyEventLogType = LegacyEventLogEntry['type'];

export interface TimelineHistoryEntry {
  factId: string;
  sequence: number;
  audience: 'public' | 'mastermind' | 'seat-private';
  seatIds: string[];
  text: string;
}

export interface TimelineCompatibilityProjection {
  reset: {
    publicLog: boolean;
    fullLog: boolean;
    eventLogs: boolean;
  };
  publicLog: string[];
  fullLog: string[];
  eventLogs: LegacyEventLogEntry[];
  publicHistory: TimelineHistoryEntry[];
  mastermindHistory: TimelineHistoryEntry[];
  seatHistory: Record<string, TimelineHistoryEntry[]>;
}

type LegacyEventLogSpec = Omit<LegacyEventLogEntry, 'id'>;

function isRecord(value: TimelineJsonValue | undefined): value is Record<string, TimelineJsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLegacyEventLogType(value: string): value is LegacyEventLogType {
  return [
    'stat_change',
    'move',
    'death',
    'incident',
    'card_flip',
    'phase_change',
    'ability_trigger',
    'result',
    'resolve_flip_all',
    'resolve_effect',
    'resolve_move',
    'resolve_dismiss_all',
  ].includes(value);
}

function toStringArray(value: TimelineJsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toEventLogSpecs(value: TimelineJsonValue | undefined): LegacyEventLogSpec[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const type = entry.type;
    if (typeof type !== 'string' || !isLegacyEventLogType(type)) return [];

    return [{
      type,
      payload: entry.payload,
    }];
  });
}

function toResetFlags(value: TimelineJsonValue | undefined): TimelineCompatibilityProjection['reset'] {
  if (!isRecord(value)) {
    return {
      publicLog: false,
      fullLog: false,
      eventLogs: false,
    };
  }

  return {
    publicLog: value.publicLog === true,
    fullLog: value.fullLog === true,
    eventLogs: value.eventLogs === true,
  };
}

function buildHistoryEntries(
  fact: TimelineFact,
  audience: TimelineHistoryEntry['audience'],
  lines: string[],
  seatIds: string[] = [],
): TimelineHistoryEntry[] {
  return lines.map((text) => ({
    factId: fact.factId,
    sequence: fact.sequence,
    audience,
    seatIds,
    text,
  }));
}

function getCompatibilityRecord(fact: TimelineFact): Record<string, TimelineJsonValue> {
  const metadata = fact.payload.metadata;
  const compatibility = isRecord(metadata.compatibility) ? metadata.compatibility : {};
  return compatibility;
}

function buildSeatHistoryProjectionEntries(
  fact: TimelineFact,
  compatibility: Record<string, TimelineJsonValue>,
): Record<string, TimelineHistoryEntry[]> {
  const seatHistoryRecord = isRecord(compatibility.seatHistory) ? compatibility.seatHistory : {};
  return Object.entries(seatHistoryRecord).reduce<Record<string, TimelineHistoryEntry[]>>(
    (accumulator, [seatId, value]) => {
      const lines = toStringArray(value);
      if (lines.length > 0) {
        accumulator[seatId] = buildHistoryEntries(fact, 'seat-private', lines, [seatId]);
      }
      return accumulator;
    },
    {},
  );
}

function projectResultAnnouncementFact(
  fact: TimelineFact,
  compatibility: Record<string, TimelineJsonValue>,
  seatHistory: Record<string, TimelineHistoryEntry[]>,
): TimelineCompatibilityProjection | null {
  if (fact.type !== 'result_announced' || fact.payload.family !== 'result') return null;

  const normalizedText = normalizePublicAnnouncementText(fact.payload.announcement);
  const normalizedAnnouncement = {
    ...fact.payload.announcement,
    ...normalizedText,
  };
  const publicLog = [normalizedText.summary];
  const fullLog = toStringArray(compatibility.fullLog);

  return {
    reset: toResetFlags(compatibility.reset),
    publicLog,
    fullLog,
    eventLogs: [{
      id: `${fact.factId}:event:0`,
      type: 'result',
      payload: normalizedAnnouncement,
    }],
    publicHistory: buildHistoryEntries(fact, 'public', publicLog),
    mastermindHistory: [
      ...buildHistoryEntries(fact, 'public', publicLog),
      ...buildHistoryEntries(fact, 'mastermind', fullLog),
    ],
    seatHistory,
  };
}

export function projectFactToCompatibility(
  fact: TimelineFact,
): TimelineCompatibilityProjection {
  const compatibility = getCompatibilityRecord(fact);
  const seatHistory = buildSeatHistoryProjectionEntries(fact, compatibility);
  const resultProjection = projectResultAnnouncementFact(fact, compatibility, seatHistory);
  if (resultProjection) return resultProjection;
  const publicLog = toStringArray(compatibility.publicLog);
  const fullLog = toStringArray(compatibility.fullLog);

  return {
    reset: toResetFlags(compatibility.reset),
    publicLog,
    fullLog,
    eventLogs: toEventLogSpecs(compatibility.eventLogs).map((entry, index) => ({
      id: `${fact.factId}:event:${index}`,
      type: entry.type,
      payload: entry.payload,
    })),
    publicHistory: buildHistoryEntries(fact, 'public', publicLog),
    mastermindHistory: [
      ...buildHistoryEntries(fact, 'public', publicLog),
      ...buildHistoryEntries(fact, 'mastermind', fullLog),
    ],
    seatHistory,
  };
}

export function buildPublicHistoryProjection(facts: TimelineFact[]): TimelineHistoryEntry[] {
  return facts.flatMap((fact) => projectFactToCompatibility(fact).publicHistory);
}

export function buildMastermindHistoryProjection(facts: TimelineFact[]): TimelineHistoryEntry[] {
  return facts.flatMap((fact) => projectFactToCompatibility(fact).mastermindHistory);
}

export function buildSeatHistoryProjection(
  facts: TimelineFact[],
  seatId: string,
): TimelineHistoryEntry[] {
  return facts.flatMap((fact) => {
    const projection = projectFactToCompatibility(fact);
    return [
      ...projection.publicHistory,
      ...(projection.seatHistory[seatId] ?? []),
    ];
  });
}

export function buildAnimationHistoryProjection(facts: TimelineFact[]): LegacyEventLogEntry[] {
  return facts.flatMap((fact) => projectFactToCompatibility(fact).eventLogs);
}
