import type { TimelineCheckpoint, TimelineFact, TimelineState } from './factSchema';
import {
  buildAnimationHistoryProjection,
  buildMastermindHistoryProjection,
  buildPublicHistoryProjection,
  buildSeatHistoryProjection,
  type LegacyEventLogEntry,
  type TimelineHistoryEntry,
} from './factProjectors';
import type { TimelineVisibility } from './factVisibility';

function canViewerSeeTimelineEntry(
  visibility: TimelineVisibility,
  viewerSeat: string | null,
): boolean {
  if (visibility.audience === 'public') return true;
  if (visibility.audience === 'mastermind') return viewerSeat === '0';
  return viewerSeat != null && visibility.seatIds.includes(viewerSeat);
}

export function projectFactsForViewer(
  facts: TimelineFact[],
  viewerSeat: string | null,
): TimelineFact[] {
  return facts.filter(fact => canViewerSeeTimelineEntry(fact.visibility, viewerSeat));
}

export function projectCheckpointsForViewer(
  checkpoints: TimelineCheckpoint[],
  viewerSeat: string | null,
): TimelineCheckpoint[] {
  return checkpoints.filter(checkpoint => canViewerSeeTimelineEntry(checkpoint.visibility, viewerSeat));
}

export function projectTimelineForViewer(
  timeline: TimelineState,
  viewerSeat: string | null,
): TimelineState {
  return {
    ...timeline,
    facts: projectFactsForViewer(timeline.facts, viewerSeat),
    checkpoints: projectCheckpointsForViewer(timeline.checkpoints, viewerSeat),
  };
}

export function buildHistoryProjectionForViewer(
  timeline: TimelineState,
  viewerSeat: string | null,
): TimelineHistoryEntry[] {
  const visibleFacts = projectFactsForViewer(timeline.facts, viewerSeat);

  if (viewerSeat === '0') {
    return buildMastermindHistoryProjection(visibleFacts);
  }

  if (viewerSeat != null) {
    return buildSeatHistoryProjection(visibleFacts, viewerSeat);
  }

  return buildPublicHistoryProjection(visibleFacts);
}

export function buildAnimationProjectionForViewer(
  timeline: TimelineState,
  viewerSeat: string | null,
): LegacyEventLogEntry[] {
  return buildAnimationHistoryProjection(projectFactsForViewer(timeline.facts, viewerSeat));
}
