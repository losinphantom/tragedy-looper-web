import { afterEach, describe, expect, it } from 'vitest';

import { useBoardUiStore } from './boardUiStore';

afterEach(() => {
  useBoardUiStore.setState({
    selectedHandCard: null,
    previewCardId: null,
    leaderModeDialogOpen: false,
    acknowledgedLeaderStepKey: null,
  });
});

describe('boardUiStore', () => {
  it('opens the leader dialog for a new unacknowledged leader step and stores the acknowledgement', () => {
    useBoardUiStore.getState().syncLeaderModeStep('protagonist_plan:1:1:0');

    expect(useBoardUiStore.getState().leaderModeDialogOpen).toBe(true);

    useBoardUiStore.getState().acknowledgeLeaderStep('protagonist_plan:1:1:0');

    expect(useBoardUiStore.getState().leaderModeDialogOpen).toBe(false);
    expect(useBoardUiStore.getState().acknowledgedLeaderStepKey).toBe('protagonist_plan:1:1:0');
  });

  it('keeps acknowledged leader steps closed until the step key changes', () => {
    useBoardUiStore.getState().acknowledgeLeaderStep('goodwill_window:1:1');
    useBoardUiStore.getState().syncLeaderModeStep('goodwill_window:1:1');

    expect(useBoardUiStore.getState().leaderModeDialogOpen).toBe(false);

    useBoardUiStore.getState().setAcknowledgedLeaderStepKey(null);
    useBoardUiStore.getState().syncLeaderModeStep('goodwill_window:1:2');

    expect(useBoardUiStore.getState().leaderModeDialogOpen).toBe(true);
    expect(useBoardUiStore.getState().acknowledgedLeaderStepKey).toBeNull();
  });

  it('clears transient card ui without disturbing leader acknowledgement state', () => {
    useBoardUiStore.setState({
      selectedHandCard: 2,
      previewCardId: 'forbid_move',
      leaderModeDialogOpen: true,
      acknowledgedLeaderStepKey: 'protagonist_plan:1:1:0',
    });

    useBoardUiStore.getState().clearTransientCardUi();

    expect(useBoardUiStore.getState().selectedHandCard).toBeNull();
    expect(useBoardUiStore.getState().previewCardId).toBeNull();
    expect(useBoardUiStore.getState().leaderModeDialogOpen).toBe(true);
    expect(useBoardUiStore.getState().acknowledgedLeaderStepKey).toBe('protagonist_plan:1:1:0');
  });
});
