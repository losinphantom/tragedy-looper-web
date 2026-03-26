import { describe, expect, it } from 'vitest';

import { getLeaderModeDialogState, shouldResetFlyingCardsForPhase, shouldShowDaySummaryPanel } from './Board';

describe('shouldShowDaySummaryPanel', () => {
  it('keeps the day summary panel disabled in the current flow', () => {
    expect(shouldShowDaySummaryPanel()).toBe(false);
  });
});

describe('shouldResetFlyingCardsForPhase', () => {
  it('keeps flying-card state only during plan phases', () => {
    expect(shouldResetFlyingCardsForPhase('mastermind_plan')).toBe(false);
    expect(shouldResetFlyingCardsForPhase('protagonist_plan')).toBe(false);
    expect(shouldResetFlyingCardsForPhase('resolve_cards')).toBe(true);
  });
});

describe('getLeaderModeDialogState', () => {
  it('triggers the leader dialog for protagonist leader-mode handoff steps', () => {
    expect(getLeaderModeDialogState({
      phase: 'protagonist_plan',
      leaderMode: true,
      leaderSeatId: '1',
      leaderTurnOrder: ['1', '2'],
      leaderTurnIndex: 1,
      goodwillInteractionPhase: 'idle',
      viewerSeatId: '2',
    })).toMatchObject({
      stepKey: 'protagonist_plan:1:2:1',
      title: '轮到你出牌',
    });
  });

  it('triggers the leader dialog for goodwill leader choosing', () => {
    expect(getLeaderModeDialogState({
      phase: 'goodwill_window',
      leaderMode: true,
      leaderSeatId: '1',
      leaderTurnOrder: ['1', '2'],
      leaderTurnIndex: 0,
      goodwillInteractionPhase: 'leader_choosing',
      viewerSeatId: '1',
    })).toMatchObject({
      stepKey: 'goodwill_window:1:1',
      title: '轮到你选择友好能力',
    });
  });
});
