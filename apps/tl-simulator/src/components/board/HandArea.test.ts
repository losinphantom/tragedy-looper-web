import { describe, expect, it } from 'vitest';

import { getAdvanceButtonState, parseHandDropTargetId } from './HandArea';

describe('getAdvanceButtonState', () => {
  it('disables NEXT in mastermind_abilities while mandatory work is still pending', () => {
    expect(getAdvanceButtonState({
      isMyPlanPhase: false,
      isReady: false,
      isManualPhase: true,
      isMastermind: true,
      isLeader: false,
      phase: 'mastermind_abilities',
      hasPendingAbilitiesForPhase: true,
      hasMandatoryPendingAbilities: true,
    })).toEqual({
      canAdvance: false,
      action: 'advancePhase',
      theme: 'disabled',
    });
  });

  it('switches NEXT to finishAbilities when only optional mastermind abilities remain', () => {
    expect(getAdvanceButtonState({
      isMyPlanPhase: false,
      isReady: false,
      isManualPhase: true,
      isMastermind: true,
      isLeader: false,
      phase: 'mastermind_abilities',
      hasPendingAbilitiesForPhase: true,
      hasMandatoryPendingAbilities: false,
    })).toEqual({
      canAdvance: true,
      action: 'finishAbilities',
      theme: 'manual-next',
    });
  });

  it('keeps regular manual phases advanceable with the red-outline NEXT state', () => {
    expect(getAdvanceButtonState({
      isMyPlanPhase: false,
      isReady: false,
      isManualPhase: true,
      isMastermind: true,
      isLeader: false,
      phase: 'resolve_cards',
      hasPendingAbilitiesForPhase: false,
      hasMandatoryPendingAbilities: false,
    })).toEqual({
      canAdvance: true,
      action: 'advancePhase',
      theme: 'manual-next',
    });
  });

  it('disables NEXT when a blocking runtime interaction is still open', () => {
    expect(getAdvanceButtonState({
      isMyPlanPhase: false,
      isReady: false,
      isManualPhase: true,
      isMastermind: true,
      isLeader: false,
      phase: 'incidents',
      hasPendingAbilitiesForPhase: false,
      hasMandatoryPendingAbilities: false,
      hasBlockingRuntimeInteraction: true,
    })).toEqual({
      canAdvance: false,
      action: 'advancePhase',
      theme: 'disabled',
    });
  });

  it('puts the goodwill NEXT on the leader side and lets it skip remaining abilities', () => {
    expect(getAdvanceButtonState({
      isMyPlanPhase: false,
      isReady: false,
      isManualPhase: true,
      isMastermind: false,
      isLeader: true,
      phase: 'goodwill_window',
      hasPendingAbilitiesForPhase: false,
      hasMandatoryPendingAbilities: false,
      goodwillInteractionPhase: 'leader_choosing',
    })).toEqual({
      canAdvance: true,
      action: 'skipAllAbilities',
      theme: 'manual-next',
    });
  });

  it('keeps loop_end_check advanceable via the regular red-outline NEXT on the mastermind side', () => {
    expect(getAdvanceButtonState({
      isMyPlanPhase: false,
      isReady: false,
      isManualPhase: true,
      isMastermind: true,
      isLeader: false,
      phase: 'loop_end_check',
      hasPendingAbilitiesForPhase: false,
      hasMandatoryPendingAbilities: false,
    })).toEqual({
      canAdvance: true,
      action: 'advancePhase',
      theme: 'manual-next',
    });
  });

  it('disables NEXT in loop_end_check while the loop result confirmation panel is unresolved', () => {
    expect(getAdvanceButtonState({
      isMyPlanPhase: false,
      isReady: false,
      isManualPhase: true,
      isMastermind: true,
      isLeader: false,
      phase: 'loop_end_check',
      hasPendingAbilitiesForPhase: false,
      hasMandatoryPendingAbilities: false,
      hasLoopResultPanel: true,
    })).toEqual({
      canAdvance: false,
      action: 'advancePhase',
      theme: 'disabled',
    });
  });
});

describe('parseHandDropTargetId', () => {
  it('parses character droppable ids from dnd-kit', () => {
    expect(parseHandDropTargetId('character:doctor')).toEqual({
      type: 'character',
      id: 'doctor',
    });
  });

  it('parses location droppable ids from dnd-kit', () => {
    expect(parseHandDropTargetId('location:city')).toEqual({
      type: 'location',
      id: 'city',
    });
  });

  it('returns null for unrelated droppable ids', () => {
    expect(parseHandDropTargetId('loop_result:1')).toBeNull();
    expect(parseHandDropTargetId(null)).toBeNull();
  });
});
