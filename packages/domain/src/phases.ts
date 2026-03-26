export const MATCH_PHASES = [
  'lobby',
  'seat_lock',
  'loop_setup',
  'day_start',
  'mastermind_plan',
  'protagonist_plan',
  'resolve_cards',
  'mastermind_abilities',
  'goodwill_window',
  'incidents',
  'switch_leader',
  'day_end',
  'loop_end_check',
  'final_guess',
  'match_end',
] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];
