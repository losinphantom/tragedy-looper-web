/**
 * Script Loader — bridges @tragedy/domain ScriptDef into game state.
 *
 * ## Seat allocation
 * - Seat '0': Mastermind — gets one crimson deck.
 * - Seats '1', '2', '3': Protagonists — each gets an independent symmetric deck.
 *
 * ## Security boundary
 * - scheduledIncidents in the public view contains NO culprit info.
 * - hiddenRoles and incidentCulprits are stored in v1 but stripped
 *   by playerView for all non-Mastermind clients.
 */

import type { ScriptDef, LocalizedScriptDef } from '@tragedy/domain';
import type { TragedyGameState, LoopState } from './game';
import { buildMastermindDeck, buildProtagonistDeck } from './data/cardService';
import type { LocationId } from './data/boardGraph';
import { ALL_LOCATIONS } from './data/boardGraph';
import { createEmptyTokenBag } from './utils/tokenHelpers';
import {
  classifyContentPackage,
  type ContentPackageComplianceResult,
  type ContentPackageComplianceStatus,
} from './contentPackageCompliance';

// ── Character starting locations (mapped from domain) ────────────────────
import { CHARACTERS } from '@tragedy/domain';

// ── Type helper: accept both plain and localized script definitions ────
type AnyScriptDef = ScriptDef | LocalizedScriptDef;

// ── Script → Game State ──────────────────────────────────────────────────────

export interface ScriptSetupResult {
  maxLoops: number;
  daysPerLoop: number;
  characters: TragedyGameState['v1']['characters'];
  locations: TragedyGameState['v1']['locations'];
  seatHands: Record<string, string[]>;
  scheduledIncidents: Array<{ day: number; incidentId: string }>;
  hiddenRoles: Record<string, string>;
  ahrVariableRoles: Record<string, { frontRoleId: string; backRoleId: string }>;
  incidentCulprits: Record<string, string>;
  activePlots: string[];
  loopState: LoopState;
  scriptOpen: {
    moduleId?: string;
    tragedySetId: string;
    loops: number;
    daysPerLoop: number;
    specialRules: string[];
    scriptSpecialRules: string[];
    moduleSpecialRules: string[];
    contentPackageStatus: ContentPackageComplianceStatus;
    contentPackageReasonCodes: string[];
    incidentSchedule: Array<{ day: number; incidentId: string }>;
  };
  scriptSecret: {
    mainPlotId: string;
    subplotIds: string[];
    cast: ScriptDef['cast'];
    incidents: ScriptDef['incidents'];
  };
  castDefinitions: Array<{ characterId: string; roleId: string | null; backRoleId?: string | null; appearsFromLoop?: number }>;
  contentPackageCompliance: ContentPackageComplianceResult;
  manifestResourceScope?: ManifestResourceScope;
}

/** Helper: extract a display string from a string or localized text */
function extractTitle(title: string | { 'zh-CN'?: string; 'en'?: string; 'ja'?: string }): string {
  if (typeof title === 'string') return title;
  return title['zh-CN'] || title['en'] || title['ja'] || 'Unknown Script';
}

/**
 * Convert a ScriptDef (or LocalizedScriptDef) into a full initial game state setup.
 */
export function loadScript(script: AnyScriptDef): ScriptSetupResult {
  const contentPackageCompliance = classifyContentPackage(script);
  const manifestOwnedLookup = resolveManifestOwnedScriptLookup(script);
  const scriptSpecialRuleIds = (script.scriptSpecialRules ?? script.specialRules ?? [])
    .map((rule: any) => typeof rule === 'string' ? rule : rule.id || '')
    .filter(Boolean);
  const moduleSpecialRules = contentPackageCompliance.scope?.moduleSpecialRuleIds ?? [];

  // ── Characters ──
  const characters: TragedyGameState['v1']['characters'] = {};
  for (const entry of script.cast) {
    const characterData = CHARACTERS[entry.characterId];
    const startLoc = (characterData?.startingLocations?.[0] as LocationId) || 'city';
    characters[entry.characterId] = {
      locationId: startLoc,
      alive: true,
      tokens: createEmptyTokenBag(),
    };
  }

  // ── Locations ──
  const locations: TragedyGameState['v1']['locations'] = {};
  for (const loc of ALL_LOCATIONS) {
    locations[loc] = { tokens: createEmptyTokenBag() };
  }

  // ── Hands: 4 independent seats ──
  const seatHands: Record<string, string[]> = {
    '0': buildMastermindDeck(),
    '1': buildProtagonistDeck(),
    '2': buildProtagonistDeck(),
    '3': buildProtagonistDeck(),
  };

  // ── Hidden roles (Mastermind-only secret) ──
  const hiddenRoles: Record<string, string> = {};
  const ahrVariableRoles: Record<string, { frontRoleId: string; backRoleId: string }> = {};
  for (const entry of script.cast) {
    if (entry.roleId) {
      hiddenRoles[entry.characterId] = entry.roleId;
    }
    if (
      script.tragedySetId === 'another_horizon_revised'
      && entry.backRoleId
      && entry.backRoleId !== (entry.roleId || 'person')
    ) {
      ahrVariableRoles[entry.characterId] = {
        frontRoleId: entry.roleId || 'person',
        backRoleId: entry.backRoleId,
      };
    }
  }

  // ── Incident culprits (Mastermind-only secret) ──
  const incidentCulprits: Record<string, string> = {};
  const incidentOccurrences = new Map<string, number>();
  for (const inc of script.incidents) {
    const occurrenceKey = `${inc.day}:${inc.incidentId}`;
    const occurrenceIndex = incidentOccurrences.get(occurrenceKey) ?? 0;
    incidentOccurrences.set(occurrenceKey, occurrenceIndex + 1);
    if (inc.culpritCharacterId) {
      const key = buildIncidentInstanceKey(inc.day, inc.incidentId, occurrenceIndex);
      incidentCulprits[key] = inc.culpritCharacterId;
    }
  }

  // ── Active plots ──
  const activePlots: string[] = [
    script.mainPlotId,
    ...script.subplotIds,
  ];

  const loopState: LoopState = {
    revealedRoles: {},
    revealedRules: [],
    revealedIncidentCulprits: {},
    triggeredIncidents: [],
    incidentHistory: [],
    abilityUsage: {},
    butterflyEffectTriggered: false,
    lastLoopGoodwillChars: [],
    lastLoopDeadCharacters: [],
    lastWillHopeNextLoop: false,
    deathFlagCount: 0,
    communicationFlagCount: 0,
    deadCharactersAtLeastOnce: [],
    communicatedCharacters: [],
  };

  // ── Incident schedule (Public, NO culprits — security boundary) ──
  const scheduledIncidents = script.incidents.map((inc) => ({
    day: inc.day,
    incidentId: inc.incidentId,
  }));

  // ── Open script view (visible to all) ──
  const scriptOpen = {
    moduleId: script.moduleId ?? contentPackageCompliance.moduleId ?? undefined,
    tragedySetId: script.tragedySetId,
    loops: typeof script.loops === 'number' ? script.loops : (script.loops as any).recommended ?? script.loops,
    daysPerLoop: script.daysPerLoop,
    specialRules: scriptSpecialRuleIds,
    scriptSpecialRules: scriptSpecialRuleIds,
    moduleSpecialRules,
    contentPackageStatus: contentPackageCompliance.status,
    contentPackageReasonCodes: contentPackageCompliance.reasons.map(reason => reason.reasonCode),
    incidentSchedule: scheduledIncidents,
  };

  // ── Secret script view (mastermind only) ──
  const scriptSecret = {
    title: extractTitle(script.title),
    mainPlotId: script.mainPlotId,
    subplotIds: script.subplotIds,
    cast: script.cast,
    incidents: script.incidents,
  };

  const resolvedLoops = typeof script.loops === 'number' ? script.loops : (script.loops as any).recommended ?? 3;

  return {
    maxLoops: resolvedLoops,
    daysPerLoop: script.daysPerLoop,
    characters,
    locations,
    seatHands,
    scheduledIncidents,
    hiddenRoles,
    ahrVariableRoles,
    incidentCulprits,
    activePlots,
    loopState,
    scriptOpen,
    scriptSecret,
    castDefinitions: script.cast.map(c => ({
      characterId: c.characterId,
      roleId: c.roleId,
      backRoleId: c.backRoleId,
      appearsFromLoop: c.appearsFromLoop,
    })),
    contentPackageCompliance,
    manifestResourceScope: manifestOwnedLookup.scope,
  };
}

// ── Build ActiveRule[] from script's active plots ────────────────────────────

import { findPlotById, findRoleById, findIncidentById, getPlotById, getRoleById, getIncidentById } from '@tragedy/domain';
import type { ActiveRule } from './ruleEngine';
import {
  getOfficialModuleManifestBySetId,
  resolveManifestOwnedScriptLookup,
  resolveIncidentDefinitionFromManifest,
  resolvePlotDefinitionFromManifest,
  resolveRoleDefinitionFromManifest,
  type ManifestResourceScope,
} from './rules/moduleAssemblyResolver';

export function buildIncidentInstanceKey(
  day: number,
  incidentId: string,
  occurrenceIndex: number,
): string {
  return occurrenceIndex > 0
    ? `${day}_${incidentId}_${occurrenceIndex}`
    : `${day}_${incidentId}`;
}

/**
 * 根据剧本的 activePlots / hiddenRoles / incidents 从 domain 层
 * 读取 plot/role/incident rules，统一构建 ruleEngine 的 ActiveRule[] 列表。
 *
 * 三类规则注册：
 *   1. plot rules  → source: plot:${plotId}
 *   2. role rules  → source: role:${roleId}, characterId: ${charId}
 *   3. incident rules → source: incident:${incidentId}
 */
export function buildActiveRules(
  tragedySetIdOrActivePlots: string[] | string,
  activePlotsOrHiddenRoles?: string[] | Record<string, string>,
  hiddenRolesOrIncidents?: Record<string, string> | Array<{ day: number; incidentId: string }>,
  maybeIncidents?: Array<{ day: number; incidentId: string }> | Record<string, { frontRoleId: string; backRoleId: string }>,
  maybeVariableRoles?: Record<string, { frontRoleId: string; backRoleId: string }>,
  maybeManifestResourceScope?: ManifestResourceScope,
): ActiveRule[] {
  const exactSetId = Array.isArray(tragedySetIdOrActivePlots) ? undefined : tragedySetIdOrActivePlots;
  const strictManifestScope = maybeManifestResourceScope?.manifest;
  const assemblyManifest = strictManifestScope
    ?? (exactSetId ? getOfficialModuleManifestBySetId(exactSetId) : undefined);
  const activePlots = Array.isArray(tragedySetIdOrActivePlots)
    ? tragedySetIdOrActivePlots
    : (Array.isArray(activePlotsOrHiddenRoles) ? activePlotsOrHiddenRoles : []);
  const hiddenRoles = Array.isArray(tragedySetIdOrActivePlots)
    ? (activePlotsOrHiddenRoles as Record<string, string> | undefined)
    : (hiddenRolesOrIncidents as Record<string, string> | undefined);
  const incidents = Array.isArray(tragedySetIdOrActivePlots)
    ? (hiddenRolesOrIncidents as Array<{ day: number; incidentId: string }> | undefined)
    : (Array.isArray(maybeIncidents) ? maybeIncidents : undefined);
  const variableRoles = Array.isArray(tragedySetIdOrActivePlots)
    ? (Array.isArray(maybeIncidents) ? maybeVariableRoles : (maybeIncidents as Record<string, { frontRoleId: string; backRoleId: string }> | undefined))
    : maybeVariableRoles;
  const rules: ActiveRule[] = [];
  const registeredRoleRules = new Set<string>();

  // ── 1. Plot rules ──
  for (const plotId of activePlots) {
    const plot = exactSetId
      ? (strictManifestScope
          ? resolvePlotDefinitionFromManifest(assemblyManifest, exactSetId, plotId)?.record
          : (resolvePlotDefinitionFromManifest(assemblyManifest, exactSetId, plotId)?.record ?? getPlotById(exactSetId, plotId)))
      : findPlotById(plotId);
    if (!plot) continue;

    for (const rule of plot.rules) {
      rules.push({
        ruleId: rule.id,
        timing: rule.timing,
        mandatory: rule.mandatory,
        source: `plot:${plotId}`,
      });
    }
  }

  // ── 2. Role rules (绑定 characterId) ──
  const registerRoleRules = (charId: string, roleId: string | null | undefined) => {
    if (!roleId || roleId === 'person') return;
    const role = exactSetId
      ? (strictManifestScope
          ? resolveRoleDefinitionFromManifest(assemblyManifest, exactSetId, roleId)?.record
          : (resolveRoleDefinitionFromManifest(assemblyManifest, exactSetId, roleId)?.record ?? getRoleById(exactSetId, roleId)))
      : findRoleById(roleId);
    if (!role?.rules) return;

    for (const rule of role.rules) {
      const dedupeKey = `${charId}:${rule.id}`;
      if (registeredRoleRules.has(dedupeKey)) continue;
      registeredRoleRules.add(dedupeKey);
      rules.push({
        ruleId: rule.id,
        timing: rule.timing,
        mandatory: rule.mandatory,
        source: `role:${roleId}`,
        characterId: charId,
      });
    }
  };

  if (hiddenRoles) {
    for (const [charId, roleId] of Object.entries(hiddenRoles)) {
      registerRoleRules(charId, roleId);
    }
  }

  if (variableRoles) {
    for (const [charId, assignment] of Object.entries(variableRoles)) {
      registerRoleRules(charId, assignment.frontRoleId);
      registerRoleRules(charId, assignment.backRoleId);
    }
  }

  // ── 3. Incident rules (去重 incidentId) ──
  if (incidents) {
    const seenIncidents = new Set<string>();
    for (const inc of incidents) {
      if (seenIncidents.has(inc.incidentId)) continue;
      seenIncidents.add(inc.incidentId);

      const incDef = exactSetId
        ? (strictManifestScope
            ? resolveIncidentDefinitionFromManifest(assemblyManifest, exactSetId, inc.incidentId)?.record
            : (resolveIncidentDefinitionFromManifest(assemblyManifest, exactSetId, inc.incidentId)?.record ?? getIncidentById(exactSetId, inc.incidentId)))
        : findIncidentById(inc.incidentId);
      if (!incDef?.rules) continue;

      for (const rule of incDef.rules) {
        rules.push({
          ruleId: rule.id,
          timing: rule.timing,
          mandatory: rule.mandatory,
          source: `incident:${inc.incidentId}`,
          incidentId: inc.incidentId,
        });
      }
    }
  }

  return rules;
}

// ── Script Playability Check ─────────────────────────────────────────────────

import { hasProcessor } from './ruleEngine';
import { getScriptById } from '@tragedy/domain';

export interface ScriptPlayability {
  /** 规则总数 */
  total: number;
  /** 有处理器的规则数 */
  covered: number;
  /** 缺少处理器的 ruleId 列表 */
  missing: string[];
  /** 剧本语义/生成约束问题 */
  validationIssues: string[];
  /** 是否可玩（100% 覆盖） */
  playable: boolean;
  /** 覆盖率百分比 */
  coveragePercent: number;
}

export interface ScriptRuntimeCapability {
  canLoad: boolean;
  canAutoResolve: boolean;
  loadBlockReasons: string[];
  autoResolveBlockReasons: string[];
  informationalReasons: string[];
}

export function getScriptValidationIssues(script: AnyScriptDef): string[] {
  const issues: string[] = [];
  const activePlots = [
    script.mainPlotId,
    ...(script.subplotIds || []),
  ].filter(Boolean);

  if (script.tragedySetId === 'midnight_zone' && activePlots.includes('a_mans_battle')) {
    const hasInvalidNinjaAssignment = (script.cast || []).some((castEntry) => {
      if (castEntry.roleId !== 'ninja') return false;
      const traits = CHARACTERS[castEntry.characterId]?.traits || [];
      return !(traits.includes('man') && traits.includes('adult'));
    });
    if (hasInvalidNinjaAssignment) {
      issues.push('a_mans_battle_male_requirement');
    }
  }

  if (script.tragedySetId === 'midnight_zone') {
    const compulsiveCharacterIds = (script.cast || [])
      .filter(castEntry => castEntry.roleId === 'compulsive')
      .map(castEntry => castEntry.characterId);
    const culpritCharacterIds = new Set(
      (script.incidents || []).map(incident => incident.culpritCharacterId).filter(Boolean),
    );
    const hasUnassignedCompulsive = compulsiveCharacterIds.some(
      characterId => !culpritCharacterIds.has(characterId),
    );
    if (hasUnassignedCompulsive) {
      issues.push('mz_compulsive_incident_target');
    }
  }

  if (script.tragedySetId === 'midnight_zone' && activePlots.includes('song_of_destruction')) {
    const hasSuicideIncident = (script.incidents || []).some(
      incident => incident.incidentId === 'suicide',
    );
    if (!hasSuicideIncident) {
      issues.push('song_of_destruction_suicide_incident');
    }
  }

  if (script.tragedySetId === 'another_horizon_revised' && activePlots.includes('a_long_night')) {
    const loops = script.loops;
    const recommended = typeof loops === 'number' ? loops : loops?.recommended;
    const options = typeof loops === 'number' ? [loops] : loops?.options || [];
    if (recommended === 4 || options.includes(4)) {
      issues.push('ahr_a_long_night_generation_rule');
    }
  }

  if (script.tragedySetId === 'another_horizon_revised' && activePlots.includes('hidden_world')) {
    const nonVampireMonsterRoles = new Set(['black_cat', 'illusion']);
    const monsterCount = (script.cast || []).filter(
      castEntry => castEntry.roleId && nonVampireMonsterRoles.has(castEntry.roleId),
    ).length;
    const requiredCount = activePlots.includes('secret_magician') ? 1 : 2;

    if (monsterCount < requiredCount) {
      issues.push('ahr_hidden_world_setup');
    }
  }

  return issues;
}

/**
 * 计算指定剧本的规则处理器覆盖率。
 * 通过 buildActiveRules 提取剧本所有规则，逐条检查 processorRegistry。
 */
export function getScriptPlayability(scriptId: string): ScriptPlayability {
  const entry = getScriptById(scriptId);
  if (!entry) {
    return {
      total: 0,
      covered: 0,
      missing: [],
      validationIssues: [],
      playable: false,
      coveragePercent: 0,
    };
  }

  const def = entry.def as any;

  // 提取 activePlots
  const activePlots: string[] = [
    def.mainPlotId,
    ...(def.subplotIds || []),
  ].filter(Boolean);

  // 提取 hiddenRoles
  const hiddenRoles: Record<string, string> = {};
  const variableRoles: Record<string, { frontRoleId: string; backRoleId: string }> = {};
  for (const c of def.cast || []) {
    if (c.roleId) hiddenRoles[c.characterId] = c.roleId;
    if (
      def.tragedySetId === 'another_horizon_revised'
      && c.backRoleId
      && c.backRoleId !== (c.roleId || 'person')
    ) {
      variableRoles[c.characterId] = {
        frontRoleId: c.roleId || 'person',
        backRoleId: c.backRoleId,
      };
    }
  }

  // 提取 incidents
  const incidents = (def.incidents || []).map((inc: any) => ({
    day: inc.day,
    incidentId: inc.incidentId,
  }));

  // 构建规则列表
  const rules = buildActiveRules(def.tragedySetId, activePlots, hiddenRoles, incidents, variableRoles);
  const total = rules.length;
  const missing: string[] = [];
  const validationIssues = getScriptValidationIssues(def);

  for (const rule of rules) {
    if (!hasProcessor(rule.ruleId)) {
      missing.push(rule.ruleId);
    }
  }

  const covered = total - missing.length;
  return {
    total,
    covered,
    missing,
    validationIssues,
    playable: missing.length === 0 && validationIssues.length === 0,
    coveragePercent: total > 0 ? Math.round((covered / total) * 100) : 100,
  };
}

export function getScriptRuntimeCapability(
  scriptId: string,
  loadedScript?: Pick<ScriptSetupResult, 'contentPackageCompliance'>,
): ScriptRuntimeCapability {
  const compliance = loadedScript?.contentPackageCompliance
    ?? (() => {
      const entry = getScriptById(scriptId);
      if (!entry) {
        return null;
      }
      return classifyContentPackage(entry.def);
    })();
  const playability = getScriptPlayability(scriptId);
  const complianceReasonCodes = compliance?.reasons.map(reason => reason.reasonCode) ?? [];
  const canLoad = !!compliance && compliance.status !== 'invalid';
  const autoResolveBlockReasons = [
    ...playability.validationIssues,
    ...playability.missing,
  ];

  return {
    canLoad,
    canAutoResolve: canLoad && playability.playable,
    loadBlockReasons: compliance?.status === 'invalid' ? complianceReasonCodes : [],
    autoResolveBlockReasons,
    informationalReasons: compliance?.status === 'invalid' ? [] : complianceReasonCodes,
  };
}
