import { describe, expect, it } from 'vitest';
import {
  appendTimelineFact,
  createInitialTimelineState,
  createPublicTimelineVisibility,
} from '@tragedy/game-logic';

import {
  RESOLVE_FLIP_ALL_DURATION_MS,
  attachOverlayCardsToPayload,
  buildAnimationFeedFromGameState,
  getOverlayCardsFromPayload,
  shouldRenderAnimatedSnapshot,
  shouldSeedDisplayedSnapshotFromPreviousState,
} from './AnimationContext';
import {
  isBlockingOverlayAnimationEventType,
  isBoardMovementAnimationEventType,
} from './animationEvents';

describe('shouldSeedDisplayedSnapshotFromPreviousState', () => {
  it('rewinds to the previous snapshot when fresh events arrive while idle', () => {
    expect(shouldSeedDisplayedSnapshotFromPreviousState({
      isAnimating: false,
      queuedAnimations: 0,
      hasCurrentAnimation: false,
    })).toBe(true);
  });

  it('does not rewind while animation work is already active', () => {
    expect(shouldSeedDisplayedSnapshotFromPreviousState({
      isAnimating: true,
      queuedAnimations: 0,
      hasCurrentAnimation: false,
    })).toBe(false);

    expect(shouldSeedDisplayedSnapshotFromPreviousState({
      isAnimating: false,
      queuedAnimations: 2,
      hasCurrentAnimation: false,
    })).toBe(false);

    expect(shouldSeedDisplayedSnapshotFromPreviousState({
      isAnimating: false,
      queuedAnimations: 0,
      hasCurrentAnimation: true,
    })).toBe(false);
  });
});

describe('shouldRenderAnimatedSnapshot', () => {
  it('keeps rendering the previous snapshot while fresh event logs are waiting to animate', () => {
    expect(shouldRenderAnimatedSnapshot({
      isAnimating: false,
      queuedAnimations: 0,
      hasCurrentAnimation: false,
      previousEventLogCount: 4,
      nextEventLogCount: 8,
    })).toBe(true);
  });

  it('keeps rendering the animated snapshot while the queue is active', () => {
    expect(shouldRenderAnimatedSnapshot({
      isAnimating: false,
      queuedAnimations: 2,
      hasCurrentAnimation: false,
      previousEventLogCount: 8,
      nextEventLogCount: 8,
    })).toBe(true);
  });

  it('falls back to the live game state when no animation work is pending', () => {
    expect(shouldRenderAnimatedSnapshot({
      isAnimating: false,
      queuedAnimations: 0,
      hasCurrentAnimation: false,
      previousEventLogCount: 8,
      nextEventLogCount: 8,
    })).toBe(false);
  });
});

describe('animation event responsibilities', () => {
  it('treats blocking settlement/announcement events as overlay-only work', () => {
    expect(isBlockingOverlayAnimationEventType('resolve_effect')).toBe(true);
    expect(isBlockingOverlayAnimationEventType('resolve_move')).toBe(true);
    expect(isBlockingOverlayAnimationEventType('incident_announce')).toBe(true);
    expect(isBlockingOverlayAnimationEventType('char_move')).toBe(false);
  });

  it('treats board movement as a dedicated mutation event', () => {
    expect(isBoardMovementAnimationEventType('char_move')).toBe(true);
    expect(isBoardMovementAnimationEventType('resolve_move')).toBe(false);
    expect(isBoardMovementAnimationEventType('ability_announce')).toBe(false);
  });

  it('prefers fact-derived animation order over legacy event insertion order', () => {
    const host = {
      loopIndex: 1,
      day: 1,
      v1: {
        timeline: createInitialTimelineState(),
      },
    };

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'first-fact' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'first',
        summary: 'first',
        changes: [],
        metadata: {
          compatibility: {
            eventLogs: [{
              type: 'resolve_flip_all',
              payload: { marker: 'fact-first' },
            }],
          },
        },
      },
    });
    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'second-fact' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'second',
        summary: 'second',
        changes: [],
        metadata: {
          compatibility: {
            eventLogs: [{
              type: 'result',
              payload: { marker: 'fact-second' },
            }],
          },
        },
      },
    });

    const feed = buildAnimationFeedFromGameState({
      v1: {
        timeline: host.v1.timeline,
        eventLogs: [
          { id: 'legacy-result', type: 'result', payload: { marker: 'legacy-second' } },
          { id: 'legacy-flip-all', type: 'resolve_flip_all', payload: { marker: 'legacy-first' } },
        ],
      },
    } as any);

    expect(feed.map(event => event.type)).toEqual(['resolve_flip_all', 'result']);
    expect(feed[0]?.payload.marker).toBe('fact-first');
    expect(feed[1]?.payload.marker).toBe('fact-second');
  });

  it('treats overlay cards carried on the current event payload as the single source of truth', () => {
    const payload = {
      targetKey: 'character:girl_student',
      overlayCards: [{
        id: 'card-1',
        cardTemplateId: 'mastermind_intrigue_plus_1',
        owner: 'mastermind',
        targetType: 'character',
        targetId: 'girl_student',
        faceUp: true,
        playedBySeat: '0',
      }],
    };

    expect(getOverlayCardsFromPayload(payload)).toEqual([
      expect.objectContaining({
        id: 'card-1',
        cardTemplateId: 'mastermind_intrigue_plus_1',
      }),
    ]);
  });

  it('keeps the initial resolve flip stage at three seconds before settlement overlays', () => {
    expect(RESOLVE_FLIP_ALL_DURATION_MS).toBe(3000);
  });

  it('hydrates resolve_effect payloads from the prior reveal event when the event bus already knows the card face', () => {
    const revealedCardsByTarget = new Map([
      ['character:girl_student', [{
        id: 'card-1',
        cardTemplateId: 'mastermind_intrigue_plus_1',
        owner: 'mastermind' as const,
        targetType: 'character' as const,
        targetId: 'girl_student',
        faceUp: true,
        playedBySeat: '0',
      }]],
    ]);

    const payload = attachOverlayCardsToPayload({
      targetKey: 'character:girl_student',
      targetType: 'character',
      targetId: 'girl_student',
      effects: [{ kind: 'counter', counter: 'intrigue', delta: 1 }],
    }, revealedCardsByTarget);

    expect(getOverlayCardsFromPayload(payload)).toEqual([
      expect.objectContaining({
        cardTemplateId: 'mastermind_intrigue_plus_1',
      }),
    ]);
  });
});
