import { isBlockingOverlayAnimationEventType } from './animationEvents';
import { buildResolutionAnnouncementModel, isResolutionAnnouncementType } from './resolutionAnnouncementModel';
import { buildResolutionSequenceModel, isResolutionSequenceType } from './resolutionSequenceModel';
import { getLocationLabel } from './resolutionOverlayShared';
import type { OverlayEvent, ResolutionOverlayModel } from './resolutionOverlayTypes';

export { getLocationLabel, isResolutionAnnouncementType, isResolutionSequenceType };

export function isResolutionOverlayBlocking(type: string): boolean {
  return isBlockingOverlayAnimationEventType(type);
}

export function buildResolutionOverlayModel(event: OverlayEvent): ResolutionOverlayModel | null {
  const { type } = event;
  if (!isResolutionOverlayBlocking(type)) return null;

  if (isResolutionAnnouncementType(type)) {
    return buildResolutionAnnouncementModel(event);
  }

  if (isResolutionSequenceType(type)) {
    return buildResolutionSequenceModel(event);
  }

  return null;
}
