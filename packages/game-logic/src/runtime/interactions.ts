import type {
  PendingIncident,
  GoodwillInteractionState,
  RuntimeInteraction,
  TragedyGameState,
} from '../game';
import { buildRuntimeInteractions } from './interactionBuilder';
import type { TimelineJsonValue } from '../timeline/factSchema';
import {
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
  createSeatPrivateTimelineVisibility,
} from '../timeline/factVisibility';
import { appendProjectedTimelineFacts } from '../timeline/legacyHistoryProjection';

function toTimelineJsonValue(value: unknown): TimelineJsonValue {
  return JSON.parse(JSON.stringify(value)) as TimelineJsonValue;
}

function projectPendingIncidentsFromInteractions(
  interactions: RuntimeInteraction[],
): PendingIncident[] {
  return interactions
    .filter(
      (interaction): interaction is Extract<RuntimeInteraction, { kind: 'incident_resolution' }> =>
        interaction.kind === 'incident_resolution',
    )
    .map(interaction => ({
      id: interaction.sourceId || interaction.id,
      day: interaction.day,
      incidentId: interaction.incidentId,
      culpritId: interaction.culpritId,
      targetSlots: interaction.targetSlots,
    }));
}

function setInteractions(
  G: TragedyGameState,
  interactions: RuntimeInteraction[],
  activeInteractionId: string | null = interactions[0]?.id ?? null,
  timelineSourceId?: string,
): void {
  const previousInteractions = G.v1.pendingInteractions || [];
  const previousActiveInteractionId = G.v1.activeInteractionId;
  G.v1.pendingInteractions = interactions;
  G.v1.activeInteractionId = activeInteractionId;
  G.v1.pendingIncidents = projectPendingIncidentsFromInteractions(interactions);

  if (timelineSourceId) {
    recordInteractionFacts(
      G,
      previousInteractions,
      interactions,
      previousActiveInteractionId,
      activeInteractionId,
      timelineSourceId,
    );
  }
}

export function syncPendingIncidentCompatibilitySlice(G: TragedyGameState): void {
  G.v1.pendingIncidents = projectPendingIncidentsFromInteractions(G.v1.pendingInteractions || []);
}

export function replacePendingInteractions(
  G: TragedyGameState,
  interactions: RuntimeInteraction[],
  activeInteractionId: string | null = interactions[0]?.id ?? null,
): void {
  setInteractions(G, interactions, activeInteractionId, 'replacePendingInteractions');
}

export function clearPendingInteractions(G: TragedyGameState): void {
  setInteractions(G, [], null, 'clearPendingInteractions');
}

export function setTimeSpiralDiscussionInteraction(G: TragedyGameState): void {
  setInteractions(G, [{
    id: `time_spiral:${G.loopIndex}:${G.day}`,
    kind: 'time_spiral_discussion',
    actorSeat: '0',
    phase: 'time_spiral',
    blocking: false,
    description: G.loopIndex === 0 && G.day === 0 ? '开局准备窗口' : '时间裂隙讨论窗口',
  }], undefined, 'setTimeSpiralDiscussionInteraction');
}

export function syncPendingInteractionsFromLegacyState(
  G: TragedyGameState,
  phase: string,
): void {
  setInteractions(G, buildRuntimeInteractions(G, phase));
}

export function getPendingGoodwillInteraction(
  G: TragedyGameState,
): Extract<RuntimeInteraction, { kind: 'goodwill' }> | null {
  const interaction = (G.v1.pendingInteractions || []).find(
    (
      pendingInteraction,
    ): pendingInteraction is Extract<RuntimeInteraction, { kind: 'goodwill' }> =>
      pendingInteraction.kind === 'goodwill',
  );
  return interaction ?? null;
}

export function buildGoodwillInteraction(
  G: TragedyGameState,
  state: GoodwillInteractionState,
): Extract<RuntimeInteraction, { kind: 'goodwill' }> | null {
  if (state.phase === 'idle') return null;

  return {
    id: `goodwill:${state.phase}`,
    kind: 'goodwill',
    actorSeat: state.phase === 'leader_choosing' ? G.v1.leader : '0',
    phase: state.phase,
    blocking: state.phase !== 'done',
    sourceId: state.phase,
    description: `友好能力阶段：${state.phase}`,
    eligibleAbilities: state.eligibleAbilities,
    currentDeclaration: state.currentDeclaration,
  };
}

export function setPendingGoodwillInteraction(
  G: TragedyGameState,
  interaction: Extract<RuntimeInteraction, { kind: 'goodwill' }> | null,
): void {
  const interactions = (G.v1.pendingInteractions || []).filter(
    pendingInteraction => pendingInteraction.kind !== 'goodwill',
  );
  if (!interaction) {
    setInteractions(G, interactions, undefined, 'setPendingGoodwillInteraction');
    return;
  }
  setInteractions(G, [...interactions, interaction], interaction.id, 'setPendingGoodwillInteraction');
}

export function getPendingButterflyChoiceInteraction(
  G: TragedyGameState,
): Extract<RuntimeInteraction, { kind: 'butterfly_choice' }> | null {
  const interaction = (G.v1.pendingInteractions || []).find(
    (
      pendingInteraction,
    ): pendingInteraction is Extract<RuntimeInteraction, { kind: 'butterfly_choice' }> =>
      pendingInteraction.kind === 'butterfly_choice',
  );
  return interaction ?? null;
}

export function hasPendingButterflyChoiceInteraction(G: TragedyGameState): boolean {
  return getPendingButterflyChoiceInteraction(G) !== null;
}

export function getPendingLoopResultResolutionInteraction(
  G: TragedyGameState,
): Extract<RuntimeInteraction, { kind: 'loop_result_resolution' }> | null {
  const interaction = (G.v1.pendingInteractions || []).find(
    (
      pendingInteraction,
    ): pendingInteraction is Extract<RuntimeInteraction, { kind: 'loop_result_resolution' }> =>
      pendingInteraction.kind === 'loop_result_resolution',
  );
  return interaction ?? null;
}

export function getPendingIncidentResolutionInteractions(
  G: TragedyGameState,
): Array<Extract<RuntimeInteraction, { kind: 'incident_resolution' }>> {
  return (G.v1.pendingInteractions || []).filter(
    (
      interaction,
    ): interaction is Extract<RuntimeInteraction, { kind: 'incident_resolution' }> =>
      interaction.kind === 'incident_resolution',
  );
}

export function getPendingIncidentResolutionInteractionBySource(
  G: TragedyGameState,
  sourceId: string,
): Extract<RuntimeInteraction, { kind: 'incident_resolution' }> | null {
  return getPendingIncidentResolutionInteractions(G).find(
    interaction => interaction.sourceId === sourceId,
  ) ?? null;
}

export function hasPendingIncidentResolutionInteractions(G: TragedyGameState): boolean {
  return getPendingIncidentResolutionInteractions(G).length > 0;
}

export function enqueueButterflyChoiceInteraction(
  G: TragedyGameState,
  phase: string,
  choice: {
    targetId: string;
    targetKind: 'character' | 'location';
    allowedTokens: Array<'goodwill' | 'paranoia' | 'intrigue'>;
  },
): void {
  const interaction: Extract<RuntimeInteraction, { kind: 'butterfly_choice' }> = {
    id: `butterfly:${choice.targetKind}:${choice.targetId}`,
    kind: 'butterfly_choice',
    actorSeat: '0',
    phase,
    blocking: true,
    sourceId: choice.targetId,
    targetId: choice.targetId,
    targetKind: choice.targetKind,
    allowedTokens: choice.allowedTokens,
    description: '蝴蝶效应三选一',
  };
  const interactions = (G.v1.pendingInteractions || []).filter(
    pendingInteraction => pendingInteraction.kind !== 'butterfly_choice',
  );
  setInteractions(G, [...interactions, interaction], interaction.id, 'enqueueButterflyChoiceInteraction');
}

export function removePendingInteractionBySource(
  G: TragedyGameState,
  kind: RuntimeInteraction['kind'],
  sourceId?: string,
): void {
  setInteractions(
    G,
    (G.v1.pendingInteractions || []).filter(interaction => {
      if (interaction.kind !== kind) return true;
      if (sourceId == null) return false;
      return interaction.sourceId !== sourceId;
    }),
    undefined,
    'removePendingInteractionBySource',
  );
}

function buildInteractionVisibility(
  G: TragedyGameState,
  interaction: RuntimeInteraction,
) {
  if (interaction.kind === 'time_spiral_discussion' || interaction.kind === 'loop_result_resolution') {
    return createPublicTimelineVisibility();
  }

  if (interaction.kind === 'goodwill' && interaction.phase === 'leader_choosing') {
    return createSeatPrivateTimelineVisibility([G.v1.leader]);
  }

  return createMastermindTimelineVisibility();
}

function getInteractionChanges(
  previous: RuntimeInteraction | undefined,
  next: RuntimeInteraction,
) {
  if (!previous) return [];
  if (JSON.stringify(previous) === JSON.stringify(next)) return [];

  return [{
    targetType: 'interaction' as const,
    targetId: next.id,
    field: 'interaction',
    previousValue: previous,
    nextValue: next,
  }];
}

function recordInteractionFacts(
  G: TragedyGameState,
  previousInteractions: RuntimeInteraction[],
  nextInteractions: RuntimeInteraction[],
  previousActiveInteractionId: string | null,
  nextActiveInteractionId: string | null,
  sourceId: string,
): void {
  const previousMap = new Map(previousInteractions.map(interaction => [interaction.id, interaction]));
  const nextMap = new Map(nextInteractions.map(interaction => [interaction.id, interaction]));
  const facts: Parameters<typeof appendProjectedTimelineFacts>[1] = [
    ...nextInteractions.flatMap((interaction) => {
      const previous = previousMap.get(interaction.id);
      const type = previous ? 'interaction_updated' as const : 'interaction_enqueued' as const;
      const changes = previous ? getInteractionChanges(previous, interaction) : [{
        targetType: 'interaction' as const,
        targetId: interaction.id,
        field: 'interaction',
        nextValue: interaction,
      }];

      if (previous && changes.length === 0 && previousActiveInteractionId === nextActiveInteractionId) {
        return [];
      }

      return [{
        type,
        source: {
          system: 'runtime' as const,
          id: sourceId,
          phase: interaction.phase,
        },
        actor: null,
        visibility: buildInteractionVisibility(G, interaction),
        payload: {
          family: 'interaction' as const,
          type,
          interactionId: interaction.id,
          interactionKind: interaction.kind,
          description: interaction.description,
          snapshot: interaction,
          metadata: {
            activeInteractionId: nextActiveInteractionId,
            previousActiveInteractionId,
            changes: toTimelineJsonValue(changes),
          },
        },
        gameTime: {
          phase: interaction.phase,
          phaseStep: type,
        },
      }];
    }),
    ...previousInteractions.flatMap((interaction) => {
      if (nextMap.has(interaction.id)) return [];
      return [{
        type: 'interaction_removed' as const,
        source: {
          system: 'runtime' as const,
          id: sourceId,
          phase: interaction.phase,
        },
        actor: null,
        visibility: buildInteractionVisibility(G, interaction),
        payload: {
          family: 'interaction' as const,
          type: 'interaction_removed' as const,
          interactionId: interaction.id,
          interactionKind: interaction.kind,
          description: interaction.description,
          snapshot: interaction,
          metadata: {
            activeInteractionId: nextActiveInteractionId,
            previousActiveInteractionId,
          },
        },
        gameTime: {
          phase: interaction.phase,
          phaseStep: 'interaction_removed',
        },
      }];
    }),
  ];

  if (facts.length === 0) return;
  appendProjectedTimelineFacts(G, facts);
}
