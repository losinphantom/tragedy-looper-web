export type AnimationEventType =
  | 'card_flip'
  | 'stat_change'
  | 'char_move'
  | 'char_death'
  | 'incident_announce'
  | 'ability_announce'
  | 'result_announce'
  | 'resolve_flip_all'
  | 'resolve_effect'
  | 'resolve_move'
  | 'resolve_dismiss_all';

export interface AnimationEvent {
  id: string;
  type: AnimationEventType;
  durationMs: number;
  payload: any;
  onComplete?: () => void;
}

export type BlockingOverlayAnimationEventType =
  | 'incident_announce'
  | 'ability_announce'
  | 'result_announce'
  | 'resolve_effect'
  | 'resolve_move';

export function isBlockingOverlayAnimationEventType(
  type: string,
): type is BlockingOverlayAnimationEventType {
  return type === 'incident_announce'
    || type === 'ability_announce'
    || type === 'result_announce'
    || type === 'resolve_effect'
    || type === 'resolve_move';
}

export function isBoardMovementAnimationEventType(type: string): type is 'char_move' {
  return type === 'char_move';
}
