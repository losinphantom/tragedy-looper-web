import type { TragedyGameState } from '../game';
import type { TimelineJsonValue } from './factSchema';
import { appendTimelineFact, appendTimelineFacts, type AppendTimelineFactInput } from './factWriter';
import type { LegacyEventLogType } from './factProjectors';
import { projectFactToCompatibility } from './factProjectors';

export interface TimelineCompatibilityMetadataInput {
  publicLog?: string[];
  fullLog?: string[];
  eventLogs?: Array<{
    type: LegacyEventLogType;
    payload: TimelineJsonValue;
  }>;
  seatHistory?: Record<string, string[]>;
  reset?: Partial<{
    publicLog: boolean;
    fullLog: boolean;
    eventLogs: boolean;
  }>;
}

export const COMPATIBILITY_ONLY_HISTORY_SURFACES = [
  'publicLog',
  'fullLog',
  'eventLogs',
] as const;

export function buildTimelineCompatibilityMetadata(
  input: TimelineCompatibilityMetadataInput,
): Record<string, TimelineJsonValue> {
  return JSON.parse(JSON.stringify({
    compatibility: {
      ...(input.publicLog && input.publicLog.length > 0 ? { publicLog: input.publicLog } : {}),
      ...(input.fullLog && input.fullLog.length > 0 ? { fullLog: input.fullLog } : {}),
      ...(input.eventLogs && input.eventLogs.length > 0 ? { eventLogs: input.eventLogs } : {}),
      ...(input.seatHistory && Object.keys(input.seatHistory).length > 0 ? { seatHistory: input.seatHistory } : {}),
      ...(input.reset ? { reset: input.reset } : {}),
    },
  })) as Record<string, TimelineJsonValue>;
}

export function refreshLegacyHistoryFromFacts(G: TragedyGameState): void {
  const pendingFacts = G.v1.timeline.facts.filter(
    fact => fact.sequence > G.v1.timeline.clock.lastLegacyProjectionSequence,
  );

  if (pendingFacts.length === 0) return;

  let publicLog = [...G.publicLog];
  let fullLog = [...G.fullLog];
  let eventLogs = [...G.v1.eventLogs];

  for (const fact of pendingFacts) {
    const projection = projectFactToCompatibility(fact);

    if (projection.reset.publicLog) publicLog = [];
    if (projection.reset.fullLog) fullLog = [];
    if (projection.reset.eventLogs) eventLogs = [];

    publicLog.push(...projection.publicLog);
    fullLog.push(...projection.fullLog);
    eventLogs.push(...projection.eventLogs);
  }

  G.publicLog = publicLog;
  G.fullLog = fullLog;
  G.v1.eventLogs = eventLogs;
  G.v1.timeline.clock.lastLegacyProjectionSequence = pendingFacts.at(-1)?.sequence ?? 0;
}

export function appendProjectedTimelineFact(
  G: TragedyGameState,
  input: AppendTimelineFactInput,
) {
  const fact = appendTimelineFact(G, input);
  refreshLegacyHistoryFromFacts(G);
  return fact;
}

export function appendProjectedTimelineFacts(
  G: TragedyGameState,
  inputs: AppendTimelineFactInput[],
) {
  const facts = appendTimelineFacts(G, inputs);
  refreshLegacyHistoryFromFacts(G);
  return facts;
}
