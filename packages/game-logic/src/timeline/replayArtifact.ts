import JSZip from 'jszip';

import { TIMELINE_SCHEMA_VERSION, type TimelineCheckpoint, type TimelineFact, type TimelineState } from './factSchema';

export const REPLAY_ARTIFACT_VERSION = 1 as const;
export const TIMELINE_CUTOVER_NOTE = 'Phase 23 timeline cutover: legacy publicLog/fullLog/eventLogs are compatibility projections sourced from facts for migrated flows. Rooms missing timeline state or using a mismatched timeline schema should be restarted or wiped.';

const REPLAY_ARTIFACT_FILES = [
  'manifest.json',
  'facts.json',
  'checkpoints.json',
  'metadata.json',
] as const;

export interface ReplayArtifactManifest {
  artifactVersion: typeof REPLAY_ARTIFACT_VERSION;
  timelineSchemaVersion: typeof TIMELINE_SCHEMA_VERSION;
  format: 'tragedy-looper.timeline-replay';
  source: 'facts+checkpoints';
  files: typeof REPLAY_ARTIFACT_FILES;
  factCount: number;
  checkpointCount: number;
}

export interface ReplayArtifactMetadata {
  timelineSchemaVersion: typeof TIMELINE_SCHEMA_VERSION;
  factCount: number;
  checkpointCount: number;
  cutoverNote: string;
  exportedAt: string | null;
  roomId: string | null;
  matchId: string | null;
}

export interface ReplayArtifactPayload {
  manifest: ReplayArtifactManifest;
  facts: TimelineFact[];
  checkpoints: TimelineCheckpoint[];
  metadata: ReplayArtifactMetadata;
}

export interface ReplayArtifactOptions {
  exportedAt?: string | null;
  roomId?: string | null;
  matchId?: string | null;
  cutoverNote?: string;
}

function cloneReplayFacts(facts: TimelineFact[]): TimelineFact[] {
  return JSON.parse(JSON.stringify(facts)) as TimelineFact[];
}

function cloneReplayCheckpoints(checkpoints: TimelineCheckpoint[]): TimelineCheckpoint[] {
  return JSON.parse(JSON.stringify(checkpoints)) as TimelineCheckpoint[];
}

export function buildReplayArtifactManifest(timeline: TimelineState): ReplayArtifactManifest {
  return {
    artifactVersion: REPLAY_ARTIFACT_VERSION,
    timelineSchemaVersion: TIMELINE_SCHEMA_VERSION,
    format: 'tragedy-looper.timeline-replay',
    source: 'facts+checkpoints',
    files: REPLAY_ARTIFACT_FILES,
    factCount: timeline.facts.length,
    checkpointCount: timeline.checkpoints.length,
  };
}

export function buildReplayArtifactPayload(
  timeline: TimelineState,
  options: ReplayArtifactOptions = {},
): ReplayArtifactPayload {
  return {
    manifest: buildReplayArtifactManifest(timeline),
    facts: cloneReplayFacts(timeline.facts),
    checkpoints: cloneReplayCheckpoints(timeline.checkpoints),
    metadata: {
      timelineSchemaVersion: TIMELINE_SCHEMA_VERSION,
      factCount: timeline.facts.length,
      checkpointCount: timeline.checkpoints.length,
      cutoverNote: options.cutoverNote ?? TIMELINE_CUTOVER_NOTE,
      exportedAt: options.exportedAt ?? null,
      roomId: options.roomId ?? null,
      matchId: options.matchId ?? null,
    },
  };
}

export async function buildReplayArtifactZip(
  timeline: TimelineState,
  options: ReplayArtifactOptions = {},
): Promise<Uint8Array> {
  const payload = buildReplayArtifactPayload(timeline, options);
  const zip = new JSZip();

  zip.file('manifest.json', JSON.stringify(payload.manifest, null, 2));
  zip.file('facts.json', JSON.stringify(payload.facts, null, 2));
  zip.file('checkpoints.json', JSON.stringify(payload.checkpoints, null, 2));
  zip.file('metadata.json', JSON.stringify(payload.metadata, null, 2));

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });
}
