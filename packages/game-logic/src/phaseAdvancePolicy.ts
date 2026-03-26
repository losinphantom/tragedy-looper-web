export type GoodwillInteractionPhase = 'idle' | 'leader_choosing' | 'mastermind_resolving' | 'done';

export type PhaseAdvanceAction = 'advancePhase' | 'finishAbilities' | 'skipAllAbilities';

export type PhaseAdvanceTheme = 'plan-ready' | 'manual-next' | 'disabled';

export type PhaseAdvanceDecision = {
  canAdvance: boolean;
  action: PhaseAdvanceAction;
  theme: PhaseAdvanceTheme;
};

export type ManualPhaseAdvanceDecisionInput = {
  isMastermind: boolean;
  isLeader: boolean;
  phase: string | null | undefined;
  hasPendingAbilitiesForPhase: boolean;
  hasMandatoryPendingAbilities: boolean;
  goodwillInteractionPhase?: GoodwillInteractionPhase;
  hasBlockingLoopResult?: boolean;
};

const ADVANCEABLE_PHASES = new Set([
  'time_spiral',
  'day_start',
  'mastermind_plan',
  'protagonist_plan',
  'resolve_cards',
  'mastermind_abilities',
  'goodwill_window',
  'incidents',
  'day_end',
  'loop_end_check',
]);

const MASTERMIND_ONLY_ADVANCE_PHASES = new Set([
  'time_spiral',
  'day_start',
  'resolve_cards',
  'mastermind_abilities',
  'incidents',
  'day_end',
  'loop_end_check',
]);

const ABILITY_QUEUE_EXIT_PHASES = new Set([
  'mastermind_abilities',
  'day_end',
]);

function disabledAdvanceDecision(): PhaseAdvanceDecision {
  return {
    canAdvance: false,
    action: 'advancePhase',
    theme: 'disabled',
  };
}

export function canPhaseAdvanceViaMove(phase: string | null | undefined): boolean {
  return ADVANCEABLE_PHASES.has(phase || '');
}

export function isMastermindOnlyAdvancePhase(phase: string | null | undefined): boolean {
  return MASTERMIND_ONLY_ADVANCE_PHASES.has(phase || '');
}

export function getManualPhaseAdvanceDecision(
  input: ManualPhaseAdvanceDecisionInput,
): PhaseAdvanceDecision {
  const phase = input.phase || '';
  if (!canPhaseAdvanceViaMove(phase)) return disabledAdvanceDecision();

  if (phase === 'goodwill_window') {
    if (input.isLeader && !input.isMastermind) {
      if (input.goodwillInteractionPhase === 'leader_choosing') {
        return {
          canAdvance: true,
          action: 'skipAllAbilities',
          theme: 'manual-next',
        };
      }

      const canAdvance = input.goodwillInteractionPhase === 'done' || input.goodwillInteractionPhase === 'idle';
      return {
        canAdvance,
        action: 'advancePhase',
        theme: canAdvance ? 'manual-next' : 'disabled',
      };
    }

    if (!input.isMastermind) return disabledAdvanceDecision();
  }

  if (isMastermindOnlyAdvancePhase(phase) && !input.isMastermind) {
    return disabledAdvanceDecision();
  }

  if (ABILITY_QUEUE_EXIT_PHASES.has(phase) && input.hasPendingAbilitiesForPhase) {
    if (input.hasMandatoryPendingAbilities) return disabledAdvanceDecision();
    return {
      canAdvance: true,
      action: 'finishAbilities',
      theme: 'manual-next',
    };
  }

  if (phase === 'loop_end_check' && input.hasBlockingLoopResult) {
    return disabledAdvanceDecision();
  }

  return {
    canAdvance: true,
    action: 'advancePhase',
    theme: 'manual-next',
  };
}
