export type TimelineTimestampMode =
  | 'shared-deterministic'
  | 'server-authoritative'
  | 'export-time';

export interface TimelineTimestampRequest {
  mode?: TimelineTimestampMode;
  recordedAt?: string | null;
  elapsedMs?: number | null;
}

export interface TimelineTimestampAllocation {
  recordedAt: string | null;
  elapsedMs: number | null;
}

export function allocateTimelineTimestamp(
  request: TimelineTimestampRequest = {},
): TimelineTimestampAllocation {
  const mode = request.mode ?? 'shared-deterministic';
  const recordedAt = request.recordedAt ?? null;
  const elapsedMs = request.elapsedMs ?? null;

  if (mode === 'shared-deterministic' && (recordedAt !== null || elapsedMs !== null)) {
    throw new Error('shared-deterministic timeline writes must leave recordedAt and elapsedMs null');
  }

  if (elapsedMs != null && (!Number.isInteger(elapsedMs) || elapsedMs < 0)) {
    throw new Error('elapsedMs must be a non-negative integer when provided');
  }

  return {
    recordedAt,
    elapsedMs,
  };
}

export function advanceTimelineElapsedMs(
  currentElapsedMs: number | null,
  deltaMs: number,
): number {
  if (!Number.isInteger(deltaMs) || deltaMs < 0) {
    throw new Error('timeline elapsed delta must be a non-negative integer');
  }

  return (currentElapsedMs ?? 0) + deltaMs;
}
