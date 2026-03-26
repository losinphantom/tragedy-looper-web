/**
 * @tragedy/game-logic — shared game definition package.
 *
 * Both the frontend (tl-simulator) and backend (server) import from here
 * to ensure they use the exact same Game object.
 */

export { TragedyLooper } from './game';
export type {
  TragedyGameState,
  CharacterState,
  LoopState,
  TargetSlot,
  FinalGuessTarget,
  FinalGuessRecord,
  FinalGuessState,
  MastermindConsoleSnapshot,
  MastermindConsoleState,
} from './game';
export { moves } from './moves';
export { phases } from './phases';
export {
  ResultAnnouncementPayloadSchema,
} from './resultAnnouncementSchema';
export type {
  ResultAnnouncementPayload,
} from './resultAnnouncementSchema';
export {
  normalizePublicAnnouncementText,
} from './resultAnnouncements';
export {
  RuntimeInteractionSchema,
  GoodwillInteractionSchema,
  IncidentResolutionInteractionSchema,
  ButterflyChoiceInteractionSchema,
  LoopResultResolutionInteractionSchema,
} from './runtimeInteractionSchema';
export type {
  RuntimeInteractionPayload,
  GoodwillInteractionPayload,
  IncidentResolutionInteractionPayload,
  ButterflyChoiceInteractionPayload,
  LoopResultResolutionInteractionPayload,
} from './runtimeInteractionSchema';
export {
  TimelineAudienceSchema,
  TimelineFieldVisibilitySchema,
  TimelineVisibilitySchema,
  createPublicTimelineVisibility,
  createMastermindTimelineVisibility,
  createSeatPrivateTimelineVisibility,
  canViewerSeeTimelineVisibility,
} from './timeline/factVisibility';
export type {
  TimelineAudience,
  TimelineFieldVisibility,
  TimelineVisibility,
} from './timeline/factVisibility';
export {
  TIMELINE_SCHEMA_VERSION,
  TimelineGameTimeSchema,
  TimelineSourceSchema,
  TimelineActorSchema,
  TimelineRefsSchema,
  TimelineChangeSchema,
  TimelineFactTypeSchema,
  TimelineFactPayloadSchema,
  TimelineFactSchema,
  TimelineCheckpointKindSchema,
  TimelineCheckpointPayloadSchema,
  TimelineCheckpointSchema,
  TimelineStateSchema,
  createEmptyTimelineRefs,
} from './timeline/factSchema';
export type {
  TimelineJsonValue,
  TimelineGameTime,
  TimelineSource,
  TimelineActor,
  TimelineRefs,
  TimelineChange,
  TimelineFactType,
  TimelineFactPayload,
  TimelineFactDraft,
  TimelineFact,
  TimelineCheckpointKind,
  TimelineCheckpointPayload,
  TimelineCheckpointDraft,
  TimelineCheckpoint,
  TimelineClockState,
  TimelineState,
} from './timeline/factSchema';
export {
  projectFactToCompatibility,
  buildPublicHistoryProjection,
  buildMastermindHistoryProjection,
  buildSeatHistoryProjection,
  buildAnimationHistoryProjection,
} from './timeline/factProjectors';
export type {
  LegacyEventLogEntry,
  LegacyEventLogType,
  TimelineHistoryEntry,
} from './timeline/factProjectors';
export {
  projectFactsForViewer,
  projectCheckpointsForViewer,
  projectTimelineForViewer,
  buildHistoryProjectionForViewer,
  buildAnimationProjectionForViewer,
} from './timeline/viewerFactProjection';
export {
  REPLAY_ARTIFACT_VERSION,
  TIMELINE_CUTOVER_NOTE,
  buildReplayArtifactManifest,
  buildReplayArtifactPayload,
  buildReplayArtifactZip,
} from './timeline/replayArtifact';
export type {
  ReplayArtifactManifest,
  ReplayArtifactMetadata,
  ReplayArtifactPayload,
  ReplayArtifactOptions,
} from './timeline/replayArtifact';
export {
  allocateTimelineTimestamp,
  advanceTimelineElapsedMs,
} from './timeline/factClock';
export type {
  TimelineTimestampMode,
  TimelineTimestampRequest,
  TimelineTimestampAllocation,
} from './timeline/factClock';
export {
  createInitialTimelineState,
  createTimelineFactId,
  createTimelineFlowId,
  createTimelineCheckpointId,
  captureTimelineGameTime,
  startTimelineFlow,
  appendTimelineFact,
  appendTimelineFacts,
  createTimelineCheckpoint,
} from './timeline/factWriter';
export type {
  TimelineStateHost,
  TimelineGameTimeInput,
  AppendTimelineFactInput,
  CreateTimelineCheckpointInput,
} from './timeline/factWriter';
export {
  canPhaseAdvanceViaMove,
  getManualPhaseAdvanceDecision,
  isMastermindOnlyAdvancePhase,
} from './phaseAdvancePolicy';
export type {
  GoodwillInteractionPhase,
  ManualPhaseAdvanceDecisionInput,
  PhaseAdvanceAction,
  PhaseAdvanceDecision,
  PhaseAdvanceTheme,
} from './phaseAdvancePolicy';
export { loadScript, getScriptPlayability } from './scriptLoader';
export type { ScriptSetupResult, ScriptPlayability } from './scriptLoader';
export { resolveAllCards } from './action-cards/cardResolver';
export type { PlayedCard, ResolutionEffect } from './action-cards/cardResolver';

// Re-export data utilities that consumers may need
export {
  getCard,
  getCardLabel,
  getCardAssetPath,
  getCardImageUrl,
  getCardBackUrl,
  getSeatColor,
  buildMastermindDeck,
  buildProtagonistDeck,
  isCardLocked,
  getPlayableHand,
  combineMoveAxes,
  resolveMovementStack,
} from './data/cardService';
export type { ActionCardRecord, ProtagonistColor } from './data/cardService';

export {
  ALL_LOCATIONS,
  LOCATION_LABELS,
  getMovementDestination,
  isValidLocation,
} from './data/boardGraph';
export type { LocationId, MoveAxis } from './data/boardGraph';

export {
  getCharacterLabel,
  getRoleLabel,
  getIncidentLabel,
  getLocalizedTerm,
} from './data/translationService';
