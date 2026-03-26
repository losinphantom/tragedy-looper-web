import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { createPublicTimelineVisibility } from './factVisibility';
import { appendTimelineFact, createInitialTimelineState, createTimelineCheckpoint } from './factWriter';
import {
  buildReplayArtifactManifest,
  buildReplayArtifactPayload,
  buildReplayArtifactZip,
  TIMELINE_CUTOVER_NOTE,
} from './replayArtifact';

function createTimelineHost() {
  return {
    loopIndex: 1,
    day: 1,
    v1: {
      timeline: createInitialTimelineState(),
    },
  };
}

describe('replayArtifact', () => {
  it('builds manifest and payload from timeline facts plus checkpoints', () => {
    const host = createTimelineHost();

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'replay-fact' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'replay_ready',
        summary: 'replay ready',
        changes: [],
        metadata: {},
      },
    });
    createTimelineCheckpoint(host, {
      kind: 'batch_change',
      visibility: createPublicTimelineVisibility(),
      payload: {
        summary: 'checkpoint',
        metadata: {},
      },
    });

    const manifest = buildReplayArtifactManifest(host.v1.timeline);
    const payload = buildReplayArtifactPayload(host.v1.timeline, {
      exportedAt: '2026-03-26T03:00:00.000Z',
      roomId: 'room-23',
      matchId: 'match-23',
    });

    expect(manifest).toEqual({
      artifactVersion: 1,
      timelineSchemaVersion: 1,
      format: 'tragedy-looper.timeline-replay',
      source: 'facts+checkpoints',
      files: ['manifest.json', 'facts.json', 'checkpoints.json', 'metadata.json'],
      factCount: 1,
      checkpointCount: 1,
    });
    expect(payload.manifest).toEqual(manifest);
    expect(payload.facts).toHaveLength(1);
    expect(payload.checkpoints).toHaveLength(1);
    expect(payload.metadata).toEqual({
      timelineSchemaVersion: 1,
      factCount: 1,
      checkpointCount: 1,
      cutoverNote: TIMELINE_CUTOVER_NOTE,
      exportedAt: '2026-03-26T03:00:00.000Z',
      roomId: 'room-23',
      matchId: 'match-23',
    });
  });

  it('writes the replay zip with the required structured entries', async () => {
    const host = createTimelineHost();

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'zip-fact' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'zip_ready',
        summary: 'zip ready',
        changes: [],
        metadata: {},
      },
    });

    const archive = await buildReplayArtifactZip(host.v1.timeline, {
      exportedAt: '2026-03-26T03:15:00.000Z',
    });
    const zip = await JSZip.loadAsync(archive);
    const fileNames = Object.keys(zip.files).sort();

    expect(fileNames).toEqual([
      'checkpoints.json',
      'facts.json',
      'manifest.json',
      'metadata.json',
    ]);

    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    const facts = JSON.parse(await zip.file('facts.json')!.async('string'));
    const checkpoints = JSON.parse(await zip.file('checkpoints.json')!.async('string'));
    const metadata = JSON.parse(await zip.file('metadata.json')!.async('string'));

    expect(manifest.files).toEqual([
      'manifest.json',
      'facts.json',
      'checkpoints.json',
      'metadata.json',
    ]);
    expect(facts).toHaveLength(1);
    expect(checkpoints).toEqual([]);
    expect(metadata.cutoverNote).toBe(TIMELINE_CUTOVER_NOTE);
    expect(metadata.exportedAt).toBe('2026-03-26T03:15:00.000Z');
  });
});
