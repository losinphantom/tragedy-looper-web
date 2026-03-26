import type { AnimationEventType } from './animationEvents';

export type OverlayEventType =
  | 'incident_announce'
  | 'ability_announce'
  | 'result_announce'
  | 'resolve_effect'
  | 'resolve_move';

export type OverlayEvent = {
  type: AnimationEventType;
  payload: any;
};

export interface ResolutionOverlayModel {
  variant: 'sequence' | 'announce';
  accentTone?: 'blood' | 'pink' | 'gold';
  stageLabel: string;
  title: string;
  summary: string;
  detail?: string;
  targetLabel?: string;
  targetKindLabel?: string;
  subjectCharacterId?: string;
  locationLabel?: string;
  currentStep: number;
  invalidCardIds: string[];
}
