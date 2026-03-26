import {
  TRAGEDY_SETS,
  findIncidentById,
  findRoleById,
  type TragedySetUiTone,
} from '@tragedy/domain';
import {
  ButterflyChoiceInteractionSchema,
  GoodwillInteractionSchema,
  IncidentResolutionInteractionSchema,
  LoopResultResolutionInteractionSchema,
  RuntimeInteractionSchema,
  getCharacterLabel,
  getLocalizedTerm,
  type ButterflyChoiceInteractionPayload,
  type GoodwillInteractionPayload,
  type IncidentResolutionInteractionPayload,
  type LoopResultResolutionInteractionPayload,
  type RuntimeInteractionPayload,
  type TargetSlot,
  type TragedyGameState,
} from '@tragedy/game-logic';

const MANUAL_PHASES = new Set([
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

type RuntimeInteraction = TragedyGameState['v1']['pendingInteractions'][number];
type GoodwillInteraction = TragedyGameState['v1']['goodwillInteraction'];
type ButterflyChoiceInteraction = Extract<RuntimeInteraction, { kind: 'butterfly_choice' }>;
type LoopResultInteraction = Extract<RuntimeInteraction, { kind: 'loop_result_resolution' }>;

type BoardInteractionRuntimeState = {
  pendingInteractions: RuntimeInteraction[];
  activeInteractionId: string | null;
};

export type AbilityPanelEntryViewModel = {
  id: string;
  ruleId: string;
  characterId: string;
  mandatory: boolean;
  description: string;
  targetSlots: TargetSlot[];
};

export type AbilityPanelViewModel = {
  visible: boolean;
  phase: TragedyGameState['v1']['abilityPhase'];
  entries: AbilityPanelEntryViewModel[];
};

export type GoodwillPanelViewModel = {
  visible: boolean;
  actorSeat: string | null;
  phase: GoodwillInteraction['phase'];
  eligibleAbilities: GoodwillInteraction['eligibleAbilities'];
  currentDeclaration: GoodwillInteraction['currentDeclaration'];
  observerCharacterId?: string;
  observerAbilityId?: string;
  observerSelectedTargets?: Record<string, string>;
};

export type IncidentPanelEntryViewModel = {
  interactionId: string;
  id: string;
  day: number;
  incidentId: string;
  culpritId: string;
  description: string;
  targetSlots: TargetSlot[];
};

export type IncidentPanelViewModel = {
  visible: boolean;
  entries: IncidentPanelEntryViewModel[];
};

export type ButterflyChoiceInteractionViewModel = Pick<
  ButterflyChoiceInteraction,
  'targetId' | 'targetKind' | 'allowedTokens'
> & {
  interactionId: string;
  actorSeat: string;
  description: string;
};

export type ButterflyChoicePanelViewModel = {
  visible: boolean;
  interaction: ButterflyChoiceInteractionViewModel | null;
};

export type LoopResultInteractionViewModel = Pick<
  LoopResultInteraction,
  'resultType' | 'resultLabel' | 'description' | 'failureReasons' | 'effectOptions' | 'availableOutcomes'
> & {
  interactionId: string;
  actorSeat: string;
};

export type LoopResultPanelViewModel = {
  visible: boolean;
  interaction: LoopResultInteractionViewModel | null;
};

export interface BoardInteractionState {
  isManualPhase: boolean;
  abilityPanel: AbilityPanelViewModel;
  goodwillPanel: GoodwillPanelViewModel;
  incidentPanel: IncidentPanelViewModel;
  butterflyChoicePanel: ButterflyChoicePanelViewModel;
  loopResultPanel: LoopResultPanelViewModel;
}

export type ModuleSurfaceTone = TragedySetUiTone;

export type ModuleSurfaceBadge = {
  id: string;
  label: string;
  value: string;
  tone: ModuleSurfaceTone;
};

export type ModuleSurfaceEntry = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: ModuleSurfaceTone;
};

export type ModuleSurfaceSection = {
  id: string;
  title: string;
  tone: ModuleSurfaceTone;
  entries: ModuleSurfaceEntry[];
};

export type ModuleSurfaceViewModel = {
  setId: string;
  setCode: string;
  setName: string;
  summary: string;
  emphasis: 'premium' | 'standard';
  badges: ModuleSurfaceBadge[];
  sections: ModuleSurfaceSection[];
};

export type BoardLegalTargets = {
  characters: Set<string>;
  locations: Set<string>;
};

type ModuleSurfaceInput = {
  phase: string;
  playerID: string | null;
  isMastermind: boolean;
  scriptOpen: TragedyGameState['scriptOpen'];
  v1: Pick<
    TragedyGameState['v1'],
    | 'ex'
    | 'protagonists'
    | 'mastermind'
    | 'loopState'
    | 'pendingInteractions'
    | 'activeInteractionId'
    | 'finalGuess'
    | 'betrayerVictoryConditions'
    | 'exCardAssignment'
    | 'detectiveGuesses'
  >;
};

function formatDetectiveGuessLabel(guessKey: string): string {
  const match = /^(\d+)_([^_]+)(?:_(\d+))?$/.exec(guessKey);
  if (!match) return `名侦探猜测 ${guessKey}`;
  const [, day, incidentId, occurrenceIndex] = match;
  const incidentLabel = getLocalizedTerm(incidentId);
  if (occurrenceIndex != null) {
    return `名侦探猜测 D${day} ${incidentLabel} #${Number(occurrenceIndex) + 1}`;
  }
  return `名侦探猜测 D${day} ${incidentLabel}`;
}

function formatRoleLabel(roleId: string): string {
  return findRoleById(roleId)?.label?.['zh-CN'] || getLocalizedTerm(roleId) || roleId;
}

function formatIncidentLabel(incidentId: string): string {
  return findIncidentById(incidentId)?.label?.['zh-CN'] || getLocalizedTerm(incidentId) || incidentId;
}

function formatRevealedIncidentCulpritLabel(key: string): string {
  const [dayPart, ...incidentParts] = key.split('_');
  if (!/^\d+$/.test(dayPart) || incidentParts.length === 0) return key;
  const incidentId = incidentParts.join('_');
  return `D${dayPart} ${formatIncidentLabel(incidentId)}`;
}

function pushTokenEntries(
  entries: ModuleSurfaceEntry[],
  label: string,
  tone: ModuleSurfaceTone,
  tokens: Record<string, number> | undefined,
) {
  if (!tokens) return;

  const fragments: string[] = [];
  if ((tokens.hope ?? 0) > 0) fragments.push(`希望 ${tokens.hope}`);
  if ((tokens.despair ?? 0) > 0) fragments.push(`绝望 ${tokens.despair}`);
  if ((tokens.guard ?? 0) > 0) fragments.push(`护卫 ${tokens.guard}`);
  if ((tokens.goodwill ?? 0) > 0) fragments.push(`友好 ${tokens.goodwill}`);
  if ((tokens.paranoia ?? 0) > 0) fragments.push(`不安 ${tokens.paranoia}`);
  if ((tokens.intrigue ?? 0) > 0) fragments.push(`密谋 ${tokens.intrigue}`);

  if (fragments.length === 0) return;

  entries.push({
    id: `tokens:${label}`,
    label,
    value: fragments.join(' / '),
    tone,
  });
}

export function getModuleSurfaceViewModel(input: ModuleSurfaceInput): ModuleSurfaceViewModel | null {
  const setId = input.scriptOpen?.tragedySetId;
  if (!setId) return null;

  const setRecord = TRAGEDY_SETS[setId];
  const uiSurface = setRecord?.uiSurface;
  const setCode = setRecord?.label?.en || setId.toUpperCase();
  const setName = setRecord?.label?.['zh-CN'] || setCode;
  const emphasis = uiSurface?.emphasis || 'standard';
  const revealedEntries = Object.entries(input.v1.loopState?.revealedRoles || {});
  const revealedRuleIds = input.v1.loopState?.revealedRules || [];
  const revealedIncidentCulpritEntries = Object.entries(input.v1.loopState?.revealedIncidentCulprits || {});


  const badges: ModuleSurfaceBadge[] = [];
  if (input.v1.ex?.enabled) {
    badges.push({
      id: 'ex',
      label: 'EX',
      value: String(input.v1.ex.gauge),
      tone: 'violet',
    });
  }
  if (revealedEntries.length > 0) {
    badges.push({
      id: 'reveals',
      label: '公开身份',
      value: `${revealedEntries.length}`,
      tone: 'blood',
    });
  }
  if (revealedRuleIds.length > 0) {
    badges.push({
      id: 'revealed-rules',
      label: '公开规则',
      value: `${revealedRuleIds.length}`,
      tone: 'loop',
    });
  }
  if (revealedIncidentCulpritEntries.length > 0) {
    badges.push({
      id: 'revealed-incident-culprits',
      label: '公开事件当事人',
      value: `${revealedIncidentCulpritEntries.length}`,
      tone: 'gold',
    });
  }

  if (uiSurface?.features?.playerExAssignment && !input.isMastermind && input.playerID && input.v1.exCardAssignment?.[input.playerID]) {
    badges.push({
      id: 'll-assignment',
      label: '你的 Ex 牌',
      value: input.v1.exCardAssignment[input.playerID],
      tone: 'blood',
    });
  }

  const sections: ModuleSurfaceSection[] = [];

  const stateEntries: ModuleSurfaceEntry[] = [];

  if (input.v1.ex?.enabled) {
    stateEntries.push({
      id: 'state:ex',
      label: 'EX 槽',
      value: `${input.v1.ex.gauge}${input.v1.ex.changedThisLoop ? ' (本轮已变化)' : ''}`,
      detail: input.v1.ex.lastLoopEndGauge > 0 ? `上轮结束为 ${input.v1.ex.lastLoopEndGauge}` : undefined,
      tone: 'violet',
    });
  }

  if (uiSurface?.features?.worldLineFromExParity && input.v1.ex?.enabled) {
    stateEntries.push({
      id: 'state:world-line',
      label: '当前世界',
      value: input.v1.ex.gauge % 2 === 0 ? '表世界' : '里世界',
      detail: '按 EX 奇偶决定当前世界线',
      tone: 'violet',
    });
  }

  pushTokenEntries(stateEntries, '主角阵营', 'emerald', input.v1.protagonists?.tokens);
  pushTokenEntries(stateEntries, '剧作家阵营', 'blood', input.v1.mastermind?.tokens);

  if (input.isMastermind && input.v1.loopState?.lastWillHopeNextLoop) {
    stateEntries.push({
      id: 'state:last-will',
      label: '下轮遗言',
      value: '主角将在轮回开始获得 1 希望',
      tone: 'emerald',
    });
  }

  if (stateEntries.length > 0) {
    sections.push({
      id: 'live-state',
      title: '模组状态',
      tone: 'violet',
      entries: stateEntries,
    });
  }

  if (revealedEntries.length > 0) {
    sections.push({
      id: 'reveals',
      title: '已公开身份',
      tone: 'blood',
      entries: revealedEntries.map(([characterId, roleId]) => ({
        id: `reveal:${characterId}`,
        label: getCharacterLabel(characterId),
        value: formatRoleLabel(roleId),
        tone: 'blood',
      })),
    });
  }

  if (revealedRuleIds.length > 0) {
    sections.push({
      id: 'revealed-rules',
      title: '已公开规则',
      tone: 'loop',
      entries: revealedRuleIds.map((ruleId, index) => ({
        id: `revealed-rule:${ruleId}:${index}`,
        label: `规则X ${index + 1}`,
        value: getLocalizedTerm(ruleId) || ruleId,
        detail: ruleId,
        tone: 'loop',
      })),
    });
  }

  if (revealedIncidentCulpritEntries.length > 0) {
    sections.push({
      id: 'revealed-incident-culprits',
      title: '已公开事件当事人',
      tone: 'gold',
      entries: revealedIncidentCulpritEntries.map(([incidentKey, culpritId]) => ({
        id: `revealed-incident-culprit:${incidentKey}`,
        label: formatRevealedIncidentCulpritLabel(incidentKey),
        value: getCharacterLabel(culpritId),
        detail: incidentKey,
        tone: 'gold',
      })),
    });
  }



  if (
    uiSurface?.features?.playerExAssignment
    || uiSurface?.features?.betrayerVictoryConditions
    || uiSurface?.features?.detectiveGuesses
  ) {
    const llEntries: ModuleSurfaceEntry[] = [];

    if (uiSurface.features?.playerExAssignment && !input.isMastermind && input.playerID && input.v1.exCardAssignment?.[input.playerID]) {
      llEntries.push({
        id: 'll:assignment',
        label: '你的 Ex 牌',
        value: input.v1.exCardAssignment[input.playerID],
        detail: '仅当前主人公可见的背叛者链路入口',
        tone: 'blood',
      });
    }

    if (uiSurface.features?.betrayerVictoryConditions && input.isMastermind && input.v1.betrayerVictoryConditions) {
      for (const [seatLabel, condition] of Object.entries(input.v1.betrayerVictoryConditions)) {
        llEntries.push({
          id: `ll:betrayer:${seatLabel}`,
          label: `背叛者 ${seatLabel}`,
          value: condition.description,
          detail: condition.ruleId,
          tone: 'blood',
        });
      }
    }

    if (uiSurface.features?.detectiveGuesses && input.v1.detectiveGuesses) {
      for (const [guessKey, culpritId] of Object.entries(input.v1.detectiveGuesses)) {
        llEntries.push({
          id: `ll:detective:${guessKey}`,
          label: formatDetectiveGuessLabel(guessKey),
          value: getCharacterLabel(culpritId),
          tone: 'loop',
        });
      }
    }

    if (llEntries.length > 0) {
      sections.push({
        id: 'last-liar',
        title: 'Last Liar 接线',
        tone: 'blood',
        entries: llEntries,
      });
    }
  }

  if (sections.length === 0) {
    return null;
  }

  return {
    setId,
    setCode,
    setName,
    summary: uiSurface?.summary || '',
    emphasis,
    badges,
    sections,
  };
}

const EMPTY_GOODWILL_INTERACTION: GoodwillInteraction = {
  phase: 'idle',
  eligibleAbilities: [],
  currentDeclaration: null,
};

function sortInteractionsByActive(
  interactions: RuntimeInteraction[],
  activeInteractionId: string | null,
): RuntimeInteraction[] {
  if (!activeInteractionId) return interactions;

  const activeIndex = interactions.findIndex(interaction => interaction.id === activeInteractionId);
  if (activeIndex <= 0) return interactions;

  return [
    interactions[activeIndex],
    ...interactions.slice(0, activeIndex),
    ...interactions.slice(activeIndex + 1),
  ];
}

function isParsedGoodwillInteraction(
  interaction: RuntimeInteractionPayload,
): interaction is GoodwillInteractionPayload {
  return GoodwillInteractionSchema.safeParse(interaction).success;
}

function isParsedIncidentInteraction(
  interaction: RuntimeInteractionPayload,
): interaction is IncidentResolutionInteractionPayload {
  return IncidentResolutionInteractionSchema.safeParse(interaction).success;
}

function isParsedButterflyInteraction(
  interaction: RuntimeInteractionPayload,
): interaction is ButterflyChoiceInteractionPayload {
  return ButterflyChoiceInteractionSchema.safeParse(interaction).success;
}

function isParsedLoopResultInteraction(
  interaction: RuntimeInteractionPayload,
): interaction is LoopResultResolutionInteractionPayload {
  return LoopResultResolutionInteractionSchema.safeParse(interaction).success;
}

export function getBoardInteractionState(
  phase: string,
  runtimeState: BoardInteractionRuntimeState,
): BoardInteractionState {
  const pendingInteractions = runtimeState.pendingInteractions || [];
  const orderedInteractions = sortInteractionsByActive(
    pendingInteractions,
    runtimeState.activeInteractionId,
  );
  const abilityInteractions = orderedInteractions.filter(
    (
      interaction,
    ): interaction is Extract<RuntimeInteraction, { kind: 'mastermind_ability' }> =>
      interaction.kind === 'mastermind_ability',
  );
  const derivedAbilities = abilityInteractions.map(interaction => ({
    id: interaction.sourceId ?? interaction.id,
    ruleId: interaction.ruleId,
    characterId: interaction.characterId,
    mandatory: interaction.mandatory,
    description: interaction.description,
    targetSlots: interaction.targetSlots,
  }));
  const derivedAbilityPhase: TragedyGameState['v1']['abilityPhase'] = derivedAbilities.length === 0
    ? 'idle'
    : abilityInteractions[0].mandatory
      ? 'mandatory'
      : 'optional';

  const parsedRuntimeInteractions = orderedInteractions
    .map((interaction) => RuntimeInteractionSchema.safeParse(interaction))
    .filter((result): result is Extract<typeof result, { success: true }> => result.success)
    .map((result) => result.data);

  const goodwillInteractionEntry = parsedRuntimeInteractions.find(isParsedGoodwillInteraction);
  const derivedGoodwillInteraction = goodwillInteractionEntry
    ? {
        phase: goodwillInteractionEntry.phase,
        eligibleAbilities: goodwillInteractionEntry.eligibleAbilities,
        currentDeclaration: goodwillInteractionEntry.currentDeclaration,
        observerCharacterId: goodwillInteractionEntry.observerCharacterId,
        observerAbilityId: goodwillInteractionEntry.observerAbilityId,
        observerSelectedTargets: goodwillInteractionEntry.observerSelectedTargets,
      }
    : EMPTY_GOODWILL_INTERACTION;
  const goodwillObserverProjection = {
    ...(derivedGoodwillInteraction.observerCharacterId
      ? { observerCharacterId: derivedGoodwillInteraction.observerCharacterId }
      : {}),
    ...(derivedGoodwillInteraction.observerAbilityId
      ? { observerAbilityId: derivedGoodwillInteraction.observerAbilityId }
      : {}),
    ...(derivedGoodwillInteraction.observerSelectedTargets
      ? { observerSelectedTargets: derivedGoodwillInteraction.observerSelectedTargets }
      : {}),
  };

  const incidentInteractions = parsedRuntimeInteractions.filter(isParsedIncidentInteraction);
  const derivedIncidents = incidentInteractions.map(interaction => ({
    interactionId: interaction.id,
    id: interaction.sourceId ?? interaction.id,
    day: interaction.day,
    incidentId: interaction.incidentId,
    culpritId: interaction.culpritId,
    description: interaction.description,
    targetSlots: interaction.targetSlots,
  }));

  const butterflyInteraction = parsedRuntimeInteractions.find(isParsedButterflyInteraction);
  const derivedButterflyChoice = butterflyInteraction
    ? {
        interactionId: butterflyInteraction.id,
        actorSeat: butterflyInteraction.actorSeat,
        targetId: butterflyInteraction.targetId,
        targetKind: butterflyInteraction.targetKind,
        allowedTokens: butterflyInteraction.allowedTokens,
        description: butterflyInteraction.description,
      }
    : null;
  const loopResultInteraction = parsedRuntimeInteractions.find(isParsedLoopResultInteraction);
  const derivedLoopResult = loopResultInteraction
    ? {
        interactionId: loopResultInteraction.id,
        actorSeat: loopResultInteraction.actorSeat,
        resultType: loopResultInteraction.resultType,
        resultLabel: loopResultInteraction.resultLabel,
        description: loopResultInteraction.description,
        failureReasons: loopResultInteraction.failureReasons,
        effectOptions: loopResultInteraction.effectOptions,
        availableOutcomes: loopResultInteraction.availableOutcomes,
      }
    : null;

  return {
    isManualPhase: MANUAL_PHASES.has(phase) || orderedInteractions.length > 0,
    abilityPanel: {
      visible: derivedAbilities.length > 0,
      phase: derivedAbilityPhase,
      entries: derivedAbilities,
    },
    goodwillPanel: {
      visible: goodwillInteractionEntry != null,
      actorSeat: goodwillInteractionEntry?.actorSeat ?? null,
      phase: derivedGoodwillInteraction.phase,
      eligibleAbilities: derivedGoodwillInteraction.eligibleAbilities,
      currentDeclaration: derivedGoodwillInteraction.currentDeclaration,
      ...goodwillObserverProjection,
    },
    incidentPanel: {
      visible: derivedIncidents.length > 0,
      entries: derivedIncidents,
    },
    butterflyChoicePanel: {
      visible: derivedButterflyChoice != null,
      interaction: derivedButterflyChoice,
    },
    loopResultPanel: {
      visible: derivedLoopResult != null,
      interaction: derivedLoopResult,
    },
  };
}

export function getLegalTargetsFromInteractionState(
  interactionState: BoardInteractionState,
  isCardPlayMode: boolean,
): BoardLegalTargets {
  if (isCardPlayMode) {
    return {
      characters: new Set<string>(),
      locations: new Set<string>(),
    };
  }

  const characters = new Set<string>();
  const locations = new Set<string>();
  const targetSlotGroups = [
    ...interactionState.abilityPanel.entries.map(entry => entry.targetSlots || []),
    ...interactionState.incidentPanel.entries.map(entry => entry.targetSlots || []),
  ];

  for (const slots of targetSlotGroups) {
    for (const slot of slots) {
      for (const characterId of slot.eligibleCharacterIds || []) {
        characters.add(characterId);
      }
      for (const locationId of slot.eligibleLocationIds || []) {
        locations.add(locationId);
      }
    }
  }

  const butterflyInteraction = interactionState.butterflyChoicePanel.interaction;
  if (butterflyInteraction) {
    if (butterflyInteraction.targetKind === 'character') {
      characters.add(butterflyInteraction.targetId);
    } else if (butterflyInteraction.targetKind === 'location') {
      locations.add(butterflyInteraction.targetId);
    }
  }

  return { characters, locations };
}

// ── Board Highlight View Model ────────────────────────────────────────────

/**
 * Semantic highlight categories, ordered by visual priority (higher = overrides lower).
 * Components use this to decide border/glow/pulse style.
 */
export type HighlightSemantic =
  | 'none'
  | 'legal-target'      // Highlighted as a valid target during card play or interaction
  | 'recently-changed'  // Short-lived pulse after token/ex/death change
  | 'goodwill-ready'    // Character has enough goodwill to trigger an ability
  | 'paranoia-warning'  // Paranoia is one below threshold
  | 'paranoia-critical' // Paranoia has reached or exceeded threshold
  | 'dead';             // Character is dead

export type EntityHighlight = {
  semantic: HighlightSemantic;
  /** For recently-changed, which tokens changed (for directional coloring). */
  changedTokens?: ('paranoia' | 'goodwill' | 'intrigue' | 'ex' | 'death')[];
};

export type BoardHighlightViewModel = {
  characters: Record<string, EntityHighlight>;
  locations: Record<string, EntityHighlight>;
};

export type CharacterHighlightInfo = {
  uneaseLimit: number | '∞';
  goodwillAbilities: Array<{ id?: string }>;
};

/**
 * Compute board-wide highlights in a single pass.
 * Called once per render in Board.tsx and passed down — components never compute their own highlights.
 */
export function getBoardHighlights(
  characters: Record<string, { alive: boolean; tokens?: Record<string, number>; exCardCount?: number; locationId: string }>,
  locations: Record<string, { tokens?: Record<string, number> }>,
  charInfo: Record<string, CharacterHighlightInfo>,
  legalTargets: { characters: Set<string>; locations: Set<string> },
  recentChanges: { characters: Set<string>; locations: Set<string> },
): BoardHighlightViewModel {
  const charHighlights: Record<string, EntityHighlight> = {};
  const locHighlights: Record<string, EntityHighlight> = {};

  for (const [charId, char] of Object.entries(characters)) {
    // Legal target overrides all except dead
    if (!char.alive) {
      charHighlights[charId] = { semantic: 'dead' };
      continue;
    }

    if (legalTargets.characters.has(charId)) {
      charHighlights[charId] = { semantic: 'legal-target' };
      continue;
    }

    if (recentChanges.characters.has(charId)) {
      charHighlights[charId] = { semantic: 'recently-changed' };
      continue;
    }

    const info = charInfo[charId];
    const paranoia = char.tokens?.paranoia ?? 0;
    const numericLimit = typeof info?.uneaseLimit === 'number' ? info.uneaseLimit : Infinity;

    if (paranoia >= numericLimit) {
      charHighlights[charId] = { semantic: 'paranoia-critical' };
      continue;
    }
    if (paranoia === numericLimit - 1 && numericLimit > 1) {
      charHighlights[charId] = { semantic: 'paranoia-warning' };
      continue;
    }

    // Goodwill threshold check
    const abilities = info?.goodwillAbilities;
    if (abilities && abilities.length > 0) {
      const goodwill = char.tokens?.goodwill ?? 0;
      const minCost = Math.min(
        ...abilities.map((a) => {
          const match = a.id?.match(/_gw(\d+)/);
          return match ? parseInt(match[1], 10) : Infinity;
        }),
      );
      if (goodwill >= minCost && minCost < Infinity) {
        charHighlights[charId] = { semantic: 'goodwill-ready' };
        continue;
      }
    }

    charHighlights[charId] = { semantic: 'none' };
  }

  for (const locId of Object.keys(locations)) {
    if (legalTargets.locations.has(locId)) {
      locHighlights[locId] = { semantic: 'legal-target' };
    } else if (recentChanges.locations.has(locId)) {
      locHighlights[locId] = { semantic: 'recently-changed' };
    } else {
      locHighlights[locId] = { semantic: 'none' };
    }
  }

  return { characters: charHighlights, locations: locHighlights };
}
