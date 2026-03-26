import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { INVALID_MOVE } from 'boardgame.io/core';
import { describe, expect, it, vi } from 'vitest';

import * as domainModule from '@tragedy/domain';
import { CHARACTERS, getAllScripts, getScriptById, getScriptsByModule, getTragedySetById } from '@tragedy/domain';

import { TragedyLooper } from './game';
import type { TragedyGameState } from './game';
import { moves } from './moves';
import { phases } from './phases';
import { buildActiveRules, buildIncidentInstanceKey, getScriptPlayability, getScriptValidationIssues, loadScript } from './scriptLoader';
import { classifyContentPackage } from './contentPackageCompliance';
import { autoResolve, autoResolveIncidents, getIncidentTriggerStatus } from './engine/autoResolve';
import { characterOwnedGoodwillHandlers } from './engine/goodwill';
import { ownedCharacterGoodwillHandlers } from './rules/characters/owned-goodwill';
import { characterGoodwillHandlers as legacyGoodwillHandlers } from './rules/characters/goodwill';
import { characterGoodwillActionHandlers } from './rules/characters/goodwill.action';
import { characterGoodwillRevealHandlers } from './rules/characters/goodwill.reveal';
import { revealGoodwillHandlers } from './rules/characters/revealGoodwill';
import { collectEligibleAbilities, executeGoodwillAbility, getGoodwillTrait, resolveGoodwillPhase } from './engine/goodwillResolver';
import { validatePlayCard } from './action-cards';
import { getProcessor, resolveTimingWindow } from './ruleEngine';
import {
  getOfficialModuleManifestBySetId,
  resolveIncidentDefinitionFromManifest,
  resolveModuleAssembly,
  resolveRoleDefinitionFromManifest,
} from './rules/moduleAssemblyResolver';
import { buildModuleGoodwillTargetSlots } from './rules/moduleGoodwill';
import { createEmptyTokenBag, getToken } from './utils/tokenHelpers';
import { applyIncidentExDelta, configureExForSet } from './rules/incidentEx';
import { isBackWorld, isFrontWorld, usesReversedEmotionRules } from './rules/ahrWorldShift';
import { applyCharacterTokenDelta } from './rules/ahrState';

function createMastermindClient() {
  const client = Client({
    game: TragedyLooper,
    multiplayer: Local(),
    numPlayers: 4,
    playerID: '0',
  });
  client.start();
  return client;
}

const CURRENT_AHR_PLOT_IDS = [
  'the_locked_future',
  'fairy_tale_killer',
  'mother_goose_mystery',
  'dimension_fusion',
  'illusory_world',
  'dr_jekyll_and_mr_hyde',
  'devil_plays_the_flute',
  'puppet_strings',
  'alice_in_wonderland',
  'beyond_the_world_line',
  'unspeakable_monster',
  'paranoia_virus_expanded',
];

const CURRENT_AHR_ROLE_IDS = [
  'key_person',
  'obsessive',
  'marionette',
  'storyteller',
  'lullaby',
  'dimension_traveler',
  'brain',
  'fragment',
  'serial_killer',
  'pied_piper',
  'conspiracy_theorist',
  'evangelist',
  'alice',
];

const CURRENT_AHR_INCIDENT_IDS = [
  'impulse_murder',
  'dimension_shift',
  'dimension_warp',
  'dimension_fault',
  'lost_item',
  'imaginary_incident',
  'last_will',
  'hospital_incident',
  'singularity',
  'light_in_the_gap',
  'darkness_of_despair',
];

function findPendingIncidentInteraction(
  G: TragedyGameState,
  incidentId?: string,
): any {
  return ((G.v1.pendingInteractions || []) as any[]).find(interaction => {
    if (interaction.kind !== 'incident_resolution') return false;
    if (incidentId == null) return true;
    return interaction.incidentId === incidentId;
  });
}

describe('script playability gate', () => {
  it('classifies content package module ownership as one script belonging to one owning module', () => {
    const result = classifyContentPackage({
      id: 'traditional_ensemble_murder',
      title: 'Traditional Ensemble Murder',
      moduleId: 'basic-tragedy',
      tragedySetId: 'basic_tragedy',
      loops: 4,
      daysPerLoop: 7,
      specialRules: [],
      scriptSpecialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['the_hidden_freak', 'an_unsettling_rumor'],
      cast: [
        { characterId: 'girl_student', roleId: 'key_person' },
        { characterId: 'boy_student', roleId: 'serial_killer' },
        { characterId: 'doctor', roleId: 'brain' },
      ],
      incidents: [
        { day: 1, incidentId: 'murder', culpritCharacterId: 'boy_student' },
      ],
    } as any);

    expect(result.status).toBe('compliant');
    expect(result.moduleId).toBe('basic-tragedy');
  });

  it('treats direct content package fixtures as compliant before workflow metadata is layered in', () => {
    const result = classifyContentPackage({
      id: 'first_steps_transitional_fixture',
      title: 'First Steps Sample',
      moduleId: 'first-steps',
      tragedySetId: 'first_steps',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      scriptSpecialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['an_unsettling_rumor'],
      cast: [
        { characterId: 'girl_student', roleId: 'key_person' },
        { characterId: 'office_worker', roleId: 'brain' },
        { characterId: 'boy_student', roleId: 'killer' },
      ],
      incidents: [
        { day: 1, incidentId: 'murder', culpritCharacterId: 'boy_student' },
      ],
    } as any);

    expect(result.status).toBe('compliant');
  });

  it('preserves content package special rules layering in the loaded result', () => {
    const loaded = loadScript({
      id: 'ahr_layering_transitional_fixture',
      title: 'AHR Layering Fixture',
      moduleId: 'another-horizon-revised',
      tragedySetId: 'another_horizon_revised',
      loops: 3,
      daysPerLoop: 4,
      specialRules: ['script_rule_only'],
      scriptSpecialRules: ['script_rule_only'],
      mainPlotId: 'the_locked_future',
      subplotIds: ['puppet_strings'],
      cast: [
        { characterId: 'doctor', roleId: 'obsessive' },
        { characterId: 'class_rep', roleId: 'storyteller' },
      ],
      incidents: [
        { day: 1, incidentId: 'impulse_murder', culpritCharacterId: 'doctor' },
      ],
    } as any);

    expect(loaded.scriptOpen.specialRules).toEqual(['script_rule_only']);
    expect(loaded.scriptOpen.scriptSpecialRules).toEqual(['script_rule_only']);
    expect(loaded.scriptOpen.moduleSpecialRules).toEqual(expect.arrayContaining(['world_shift_1']));
    expect(loaded.contentPackageCompliance.status).toBe('compliant');
  });

  it('classifies content package cross-module references as invalid', () => {
    const result = classifyContentPackage({
      id: 'btx_invalid_cross_module',
      title: 'BTX Invalid Cross Module',
      moduleId: 'basic-tragedy',
      tragedySetId: 'basic_tragedy',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      scriptSpecialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['the_hidden_freak', 'an_unsettling_rumor'],
      cast: [
        { characterId: 'doctor', roleId: 'obsessive' },
      ],
      incidents: [
        { day: 1, incidentId: 'murder', culpritCharacterId: 'doctor' },
      ],
    } as any);

    expect(result.status).toBe('invalid');
    expect(result.reasons.map(reason => reason.reasonCode)).toContain('resource_outside_module_role_pool');
  });

  it('selectScript keeps compliant manifest-backed scripts auto-resolve eligible', () => {
    const entry = getScriptById('traditional_ensemble_murder');
    expect(entry).toBeTruthy();

    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = true;
    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const result = (moves.selectScript as any)(
      { G, ctx: { phase: 'script_select' }, events, playerID: '0' },
      'traditional_ensemble_murder',
    );

    expect(result).toBeUndefined();
    expect(events.endPhase).toHaveBeenCalledOnce();
    expect((G.scriptOpen as any)?.contentPackageStatus).toBe('compliant');
    expect(G.publicLog.at(-1)).toBe('📜 剧本已选定');
  });

  it('selectScript keeps auto-resolve enabled for playable scripts even when registry workflow metadata is transitional', () => {
    const fakeScriptId = 'first_steps_transitional_select_fixture';
    const baseEntry = getScriptById('traditional_ensemble_murder');
    expect(baseEntry).toBeTruthy();
    const fakeEntry = {
      ...baseEntry,
      id: fakeScriptId,
      def: {
        ...(baseEntry as NonNullable<typeof baseEntry>).def,
        id: fakeScriptId,
      },
      moduleId: 'basic-tragedy',
      registrationPath: 'imported-json-transitional-entry' as const,
      workflowStatus: 'manual-only-transitional' as const,
    };
    const originalGetScriptById = domainModule.getScriptById;
    const getScriptByIdSpy = vi.spyOn(domainModule, 'getScriptById').mockImplementation((id: string) => {
      if (id === fakeScriptId) return fakeEntry as any;
      return originalGetScriptById(id);
    });

    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = true;
    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const result = (moves.selectScript as any)(
      { G, ctx: { phase: 'script_select' }, events, playerID: '0' },
      fakeScriptId,
    );

    expect(result).toBeUndefined();
    expect(events.endPhase).toHaveBeenCalledOnce();
    expect(G.v1.settings.autoResolve).toBe(true);
    expect(G.publicLog.at(-1)).toBe('📜 剧本已选定');

    getScriptByIdSpy.mockRestore();
  });

  it('selectScript rejects invalid module boundary onboarding before selection completes', () => {
    const fakeScriptId = 'invalid_module_boundary_selectScript';
    const fakeEntry = {
      id: fakeScriptId,
      def: {
        id: fakeScriptId,
        title: 'Invalid Module Boundary',
        moduleId: 'basic-tragedy',
        tragedySetId: 'basic_tragedy',
        loops: 3,
        daysPerLoop: 4,
        specialRules: [],
        scriptSpecialRules: [],
        mainPlotId: 'murder_plan',
        subplotIds: ['the_hidden_freak'],
        cast: [{ characterId: 'doctor', roleId: 'obsessive' }],
        incidents: [{ day: 1, incidentId: 'murder', culpritCharacterId: 'doctor' }],
      },
      moduleId: 'basic-tragedy',
      registrationPath: 'imported-json-transitional-entry' as const,
      workflowStatus: 'manual-only-transitional' as const,
    };
    const originalGetScriptById = domainModule.getScriptById;
    const getScriptByIdSpy = vi.spyOn(domainModule, 'getScriptById').mockImplementation((id: string) => {
      if (id === fakeScriptId) return fakeEntry as any;
      return originalGetScriptById(id);
    });

    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const result = (moves.selectScript as any)(
      { G, ctx: { phase: 'script_select' }, events, playerID: '0' },
      fakeScriptId,
    );

    expect(result).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
    expect(G.v1.currentScriptId).toBeNull();
    expect(G.fullLog.at(-1)).toContain('剧本接入未完成');

    getScriptByIdSpy.mockRestore();
  });

  it('treats the basic tragedy module manifest as an assembly-only definition reference source', () => {
    const manifest = getOfficialModuleManifestBySetId('basic_tragedy');
    expect(manifest?.roleIds).toContain('key_person');
    expect(manifest?.incidentIds).toContain('murder');
    expect(manifest?.plotIds).toContain('murder_plan');
    expect(manifest?.scriptIds).toContain('traditional_ensemble_murder');

    const resolved = resolveModuleAssembly(manifest!);
    expect(resolved.roleDefinitions.some(def => def.id === 'key_person')).toBe(true);
    expect(resolved.incidentDefinitions.some(def => def.id === 'murder')).toBe(true);
  });

  it('resolves a RoleDefinition through the module manifest assembly-only path', () => {
    const manifest = getOfficialModuleManifestBySetId('basic_tragedy');
    const definition = resolveRoleDefinitionFromManifest(manifest, 'basic_tragedy', 'key_person');

    expect(definition).toMatchObject({
      contract: 'RoleDefinition',
      assembly: 'definition-reference',
      ownership: 'role-owned',
      id: 'key_person',
      sourcePath: 'rules/roles/keyPersonRoleDefinition.ts',
    });
    expect(definition?.rules.map(rule => rule.id)).toContain('key_person_death_loss');
  });

  it('resolves multiple AHR RoleDefinition entries through manifest references instead of a BTX-only sample', () => {
    const manifest = getOfficialModuleManifestBySetId('another_horizon_revised');
    const obsessive = resolveRoleDefinitionFromManifest(manifest, 'another_horizon_revised', 'obsessive');
    const storyteller = resolveRoleDefinitionFromManifest(manifest, 'another_horizon_revised', 'storyteller');

    expect(manifest?.roleIds).toEqual(expect.arrayContaining(['obsessive', 'storyteller', 'dimension_traveler', 'fragment']));
    expect(obsessive).toMatchObject({
      contract: 'RoleDefinition',
      ownership: 'role-owned',
      sourcePath: 'rules/roles/obsessiveRoleDefinition.ts',
    });
    expect(storyteller).toMatchObject({
      contract: 'RoleDefinition',
      ownership: 'role-owned',
      sourcePath: 'rules/roles/storytellerRoleDefinition.ts',
    });
    expect(obsessive?.rules.map(rule => rule.id)).toContain('ahr_obsessive_forced_incident');
    expect(storyteller?.rules.map(rule => rule.id)).toContain('ahr_storyteller_shift_token');
  });

  it('resolves an IncidentDefinition through the script loader definition reference path', () => {
    const manifest = getOfficialModuleManifestBySetId('basic_tragedy');
    const definition = resolveIncidentDefinitionFromManifest(manifest, 'basic_tragedy', 'murder');

    expect(definition).toMatchObject({
      contract: 'IncidentDefinition',
      assembly: 'definition-reference',
      ownership: 'incident-owned',
      id: 'murder',
      sourcePath: 'rules/incidents/murderIncidentDefinition.ts',
    });
    expect(definition?.rules.map(rule => rule.id)).toContain('btx_incident_murder_effect');
  });

  it('resolves multiple AHR IncidentDefinition entries through manifest references and script loader ownership paths', () => {
    const manifest = getOfficialModuleManifestBySetId('another_horizon_revised');
    const impulseMurder = resolveIncidentDefinitionFromManifest(manifest, 'another_horizon_revised', 'impulse_murder');
    const hospitalIncident = resolveIncidentDefinitionFromManifest(manifest, 'another_horizon_revised', 'hospital_incident');

    expect(manifest?.incidentIds).toEqual(expect.arrayContaining(['impulse_murder', 'dimension_shift', 'hospital_incident', 'last_will']));
    expect(impulseMurder).toMatchObject({
      contract: 'IncidentDefinition',
      ownership: 'incident-owned',
      sourcePath: 'rules/incidents/impulseMurderIncidentDefinition.ts',
    });
    expect(hospitalIncident).toMatchObject({
      contract: 'IncidentDefinition',
      ownership: 'incident-owned',
      sourcePath: 'rules/incidents/hospitalIncidentDefinition.ts',
    });
    expect(impulseMurder?.rules.map(rule => rule.id)).toContain('ahr_incident_impulse_murder');
    expect(hospitalIncident?.rules.map(rule => rule.id)).toContain('ahr_incident_hospital_incident');
  });

  it('exposes definition-reference assembly fields across more than one official manifest', () => {
    const manifests = [
      getOfficialModuleManifestBySetId('basic_tragedy'),
      getOfficialModuleManifestBySetId('first_steps'),
      getOfficialModuleManifestBySetId('another_horizon_revised'),
      getOfficialModuleManifestBySetId('last_liar'),
    ].filter(Boolean);

    expect(manifests).toHaveLength(4);
    for (const manifest of manifests) {
      expect(manifest?.roleIds?.length ?? 0).toBeGreaterThan(0);
      expect(manifest?.incidentIds?.length ?? 0).toBeGreaterThan(0);
      expect(manifest?.plotIds?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('builds basic tragedy active rules through assembly-only definition references', () => {
    const rules = buildActiveRules(
      'basic_tragedy',
      ['murder_plan'],
      {
        girl_student: 'key_person',
      },
      [
        { day: 1, incidentId: 'murder' },
      ],
    );

    expect(rules.some(rule => rule.ruleId === 'key_person_death_loss' && rule.characterId === 'girl_student')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'btx_incident_murder_effect' && rule.incidentId === 'murder')).toBe(true);
  });

  it('registers current AHR vocabulary instead of the legacy placeholder set', () => {
    const set = getTragedySetById('another_horizon_revised');

    expect(set?.availablePlotIds).toEqual(CURRENT_AHR_PLOT_IDS);
    expect(set?.availableRoleIds).toEqual(CURRENT_AHR_ROLE_IDS);
    expect(set?.availableIncidentIds).toEqual(CURRENT_AHR_INCIDENT_IDS);
    expect(set?.availablePlotIds).not.toContain('thread_of_the_end');
    expect(set?.availableRoleIds).not.toContain('illusion');
    expect(set?.availableIncidentIds).not.toContain('butterfly_effect');
  });

  it('builds active rules from current AHR plot, role, and incident definitions', () => {
    const rules = buildActiveRules(
      'another_horizon_revised',
      ['the_locked_future', 'puppet_strings'],
      {
        doctor: 'obsessive',
        class_rep: 'storyteller',
      },
      [
        { day: 1, incidentId: 'impulse_murder' },
        { day: 2, incidentId: 'hospital_incident' },
      ],
    );

    expect(rules.some(rule => rule.ruleId === 'ahr_the_locked_future_front_world_loss')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'ahr_puppet_strings_puppetize_ignores_goodwill')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'ahr_obsessive_forced_incident')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'ahr_storyteller_loop_start_hope')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'ahr_incident_impulse_murder')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'ahr_incident_hospital_incident')).toBe(true);
  });

  it('loads AHR variable-role assignments from script cast definitions', () => {
    const script = loadScript({
      title: 'AHR variable role fixture',
      tragedySetId: 'another_horizon_revised',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'the_locked_future',
      subplotIds: [],
      cast: [
        { characterId: 'doctor', roleId: 'obsessive', backRoleId: 'key_person' } as any,
        { characterId: 'patient', roleId: null },
      ],
      incidents: [],
    } as any);

    expect(script.hiddenRoles).toEqual({
      doctor: 'obsessive',
    });
    expect((script as any).ahrVariableRoles).toEqual({
      doctor: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    });
    expect(script.castDefinitions).toEqual([
      { characterId: 'doctor', roleId: 'obsessive', backRoleId: 'key_person', appearsFromLoop: undefined },
      { characterId: 'patient', roleId: null, backRoleId: undefined, appearsFromLoop: undefined },
    ]);
  });

  it('builds active rules from both front and back AHR variable roles', () => {
    const rules = buildActiveRules(
      'another_horizon_revised',
      [],
      {
        doctor: 'obsessive',
      },
      [],
      {
        doctor: {
          frontRoleId: 'obsessive',
          backRoleId: 'key_person',
        },
      },
    );

    expect(rules.some(rule => rule.ruleId === 'ahr_obsessive_forced_incident' && rule.characterId === 'doctor')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'key_person_death_loss' && rule.characterId === 'doctor')).toBe(true);
    expect(rules.filter(rule => rule.characterId === 'doctor' && rule.ruleId === 'ahr_obsessive_forced_incident')).toHaveLength(1);
  });

  it('triggers current AHR the_locked_future loss while Ex parity stays on the front world', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 0;
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['the_locked_future'], {}, []);

    resolveTimingWindow(G, 'loop_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('adds despair on second-loop starts for current AHR beyond_the_world_line', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 1;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['beyond_the_world_line'], {}, []);

    resolveTimingWindow(G, 'loop_start');

    expect(getToken(G.v1.mastermind, 'despair')).toBe(1);
  });

  it('kills protagonists on current AHR dimension_traveler end_of_last_day when only two token types remain', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      traveler: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 1, intrigue: 1 },
      },
    };
    G.v1.hiddenRoles = {
      traveler: 'dimension_traveler',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], { traveler: 'dimension_traveler' }, []);

    resolveTimingWindow(G, 'end_of_last_day');

    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('gives current AHR fragment both despair-from-death and hope-from-goodwill on loop_start', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      fragment: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 2 },
      },
    };
    G.v1.hiddenRoles = {
      fragment: 'fragment',
    };
    G.v1.loopState.abilityUsage.__ahr_fragment_dead_last_loop = {
      usedToday: false,
      usedThisLoop: true,
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], { fragment: 'fragment' }, []);

    resolveTimingWindow(G, 'loop_start');

    expect(getToken(G.v1.mastermind, 'despair')).toBe(1);
    expect(getToken(G.v1.protagonists, 'hope')).toBe(1);
  });

  it('gives current AHR storyteller hope on loop_start when the previous loop ended at Ex 3+', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.lastLoopEndGauge = 3;
    G.v1.characters = {
      storyteller: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      storyteller: 'storyteller',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], { storyteller: 'storyteller' }, []);

    resolveTimingWindow(G, 'loop_start');

    expect(getToken(G.v1.protagonists, 'hope')).toBe(1);
  });

  it('kills protagonists on current AHR unspeakable_monster day_end when Ex reaches 3+', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 3;
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['unspeakable_monster'], {}, []);

    resolveTimingWindow(G, 'day_end');

    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('applies current AHR paranoia_virus_expanded before day_end in the back world and rebuilds dynamic serial killer rules', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.activePlots = ['paranoia_virus_expanded'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      civilian: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1, goodwill: 1 },
      },
      witness: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {};
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      G.v1.activePlots,
      G.v1.hiddenRoles,
      [],
    );

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.hiddenRoles.civilian).toBe('serial_killer');
    expect(
      G.v1.activeRuleDefinitions.some(
        rule => rule.ruleId === 'serial_killer_day_end_kill' && rule.characterId === 'civilian',
      ),
    ).toBe(true);
    expect(G.v1.characters.witness.alive).toBe(true);
    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'serial_killer_day_end_kill',
        characterId: 'civilian',
        timing: 'day_end',
        phase: 'day_end',
        mandatory: true,
      }),
    ]);
  });

  it('triggers current AHR mother_goose_mystery loss when loop-end corpses reach the capped loop threshold', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 2;
    G.v1.characters = {
      corpseA: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
      corpseB: { locationId: 'school', alive: false, tokens: createEmptyTokenBag() },
      corpseC: { locationId: 'hospital', alive: false, tokens: createEmptyTokenBag() },
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['mother_goose_mystery'], {}, []);

    resolveTimingWindow(G, 'loop_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('triggers current AHR dimension_fusion loss when last_will or lost_item occurred this loop', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 1;
    G.v1.loopState.incidentHistory.push({
      loop: 1,
      day: 2,
      incidentId: 'last_will',
      culpritId: 'brain',
      wasImmune: false,
    });
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['dimension_fusion'], {}, []);

    resolveTimingWindow(G, 'loop_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('triggers current AHR alice loop_end loss when alice is dead', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      alice: {
        locationId: 'school',
        alive: false,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      alice: 'alice',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], { alice: 'alice' }, []);

    resolveTimingWindow(G, 'loop_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('triggers current AHR illusory_world loss when obsessive intrigue plus Ex reaches 3', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      obsessive: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 2 },
      },
    };
    G.v1.hiddenRoles = {
      obsessive: 'obsessive',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['illusory_world'], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'loop_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('uses current AHR variable-role assignments when illusory_world searches for obsessive', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      target: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 2 },
      },
    };
    G.v1.hiddenRoles = {
      target: 'person',
    };
    (G.v1 as any).ahrVariableRoles = {
      target: {
        frontRoleId: 'person',
        backRoleId: 'obsessive',
      },
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['illusory_world'], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'loop_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('queues and resolves the current AHR storyteller token-shift ability', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      storyteller: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      source: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 1 } },
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      storyteller: 'storyteller',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_storyteller_shift_token',
        characterId: 'storyteller',
      }),
    ]);
    expect(G.v1.pendingAbilities[0]?.targetSlots).toEqual([
      expect.objectContaining({ slotId: 'fromCharacter', eligibleCharacterIds: ['source', 'target'] }),
      expect.objectContaining({ slotId: 'toCharacter', eligibleCharacterIds: ['source', 'target'] }),
      expect.objectContaining({ slotId: 'tokenType', eligibleTokenTypes: expect.arrayContaining(['paranoia']) }),
    ]);

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      G.v1.pendingAbilities[0].id,
      { fromCharacter: 'source', toCharacter: 'target', tokenType: 'paranoia' },
    );

    expect(getToken(G.v1.characters.source, 'paranoia')).toBe(0);
    expect(getToken(G.v1.characters.target, 'paranoia')).toBe(1);
  });

  it('queues and resolves the current AHR lullaby token-placement ability once per loop', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      lullaby: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      lullaby: 'lullaby',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_lullaby_place_token',
        characterId: 'lullaby',
      }),
    ]);

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      G.v1.pendingAbilities[0].id,
      { target: 'target', tokenType: 'goodwill' },
    );

    expect(getToken(G.v1.characters.target, 'goodwill')).toBe(1);
    expect(G.v1.loopState.abilityUsage.ahr_lullaby_place_token?.usedThisLoop).toBe(true);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });
    expect(G.v1.pendingAbilities).toEqual([]);
  });

  it('triggers current AHR lullaby day_end loss when four token types are present', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      lullaby: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1, intrigue: 1, goodwill: 1, hope: 1 },
      },
    };
    G.v1.hiddenRoles = {
      lullaby: 'lullaby',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'day_end');

    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('kills a same-area character with current AHR pied_piper at day_end when Ex is 2+', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 2;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victim: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'day_end');

    expect(G.v1.characters.victim.alive).toBe(false);
    expect(G.v1.loopState.abilityUsage.__ahr_pied_piper_day_end_kill?.usedThisLoop).toBe(true);
  });

  it('adds intrigue to a corpse and triggers current AHR pied_piper corpse loss at day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      corpse: { locationId: 'city', alive: false, tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'day_end');

    expect(getToken(G.v1.characters.corpse, 'intrigue')).toBe(3);
    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('still triggers current AHR pied_piper corpse loss when no same-area corpse exists but all corpses already have 3 intrigue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      far_corpse: { locationId: 'hospital', alive: false, tokens: { ...createEmptyTokenBag(), intrigue: 3 } },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'day_end');

    expect(getToken(G.v1.characters.far_corpse, 'intrigue')).toBe(3);
    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('queues current AHR pied_piper day-end kill for manual target selection', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 2;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      aaa_target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      zzz_target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_pied_piper_day_end_kill',
        characterId: 'piper',
        timing: 'day_end',
        phase: 'day_end',
        targetSlots: [
          {
            slotId: 'target',
            label: '选择角色',
            kind: 'character',
            eligibleCharacterIds: ['aaa_target', 'zzz_target'],
          },
        ],
      }),
    ]);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'mastermind_ability',
        phase: 'day_end',
        sourceId: 'ahr_pied_piper_day_end_kill:piper',
      }),
    ]);
  });

  it('allows confirming current AHR pied_piper day-end kill outside mastermind_abilities with the selected target', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 2;
    G.v1.pendingAbilities = [{
      id: 'ahr_pied_piper_day_end_kill:piper',
      ruleId: 'ahr_pied_piper_day_end_kill',
      characterId: 'piper',
      mandatory: false,
      description: '魔笛手可杀死同区域 1 名角色',
      targetSlots: [
        {
          slotId: 'target',
          label: '选择角色',
          kind: 'character',
          eligibleCharacterIds: ['aaa_target', 'zzz_target'],
        },
      ],
    }];
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      aaa_target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      zzz_target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'day_end' }, events: { endPhase: vi.fn() }, playerID: '0' },
      'ahr_pied_piper_day_end_kill:piper',
      { target: 'zzz_target' },
    );

    expect(result).toBeUndefined();
    expect(G.v1.characters.aaa_target.alive).toBe(true);
    expect(G.v1.characters.zzz_target.alive).toBe(false);
    expect(G.v1.loopState.abilityUsage.__ahr_pied_piper_day_end_kill?.usedThisLoop).toBe(true);
  });

  it('queues current AHR pied_piper corpse intrigue for manual corpse selection', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      aaa_corpse: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
      zzz_corpse: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_pied_piper_corpse_intrigue_and_loss',
        characterId: 'piper',
        timing: 'day_end',
        phase: 'day_end',
        targetSlots: [
          {
            slotId: 'target',
            label: '选择尸体',
            kind: 'character',
            eligibleCharacterIds: ['aaa_corpse', 'zzz_corpse'],
          },
        ],
      }),
    ]);
  });

  it('allows confirming current AHR pied_piper corpse intrigue outside mastermind_abilities with the selected corpse', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.pendingAbilities = [{
      id: 'ahr_pied_piper_corpse_intrigue_and_loss:piper',
      ruleId: 'ahr_pied_piper_corpse_intrigue_and_loss',
      characterId: 'piper',
      mandatory: false,
      description: '魔笛手可向同区域尸体放置 1 密谋',
      targetSlots: [
        {
          slotId: 'target',
          label: '选择尸体',
          kind: 'character',
          eligibleCharacterIds: ['aaa_corpse', 'zzz_corpse'],
        },
      ],
    }];
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      aaa_corpse: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
      zzz_corpse: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
    };

    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'day_end' }, events: { endPhase: vi.fn() }, playerID: '0' },
      'ahr_pied_piper_corpse_intrigue_and_loss:piper',
      { target: 'zzz_corpse' },
    );

    expect(result).toBeUndefined();
    expect(getToken(G.v1.characters.aaa_corpse, 'intrigue')).toBe(0);
    expect(getToken(G.v1.characters.zzz_corpse, 'intrigue')).toBe(1);
  });

  it('queues and resolves the current AHR evangelist goodwill ability in mastermind_abilities', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      evangelist: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      evangelist: 'evangelist',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_evangelist_goodwill_ability',
        characterId: 'evangelist',
      }),
    ]);

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      G.v1.pendingAbilities[0].id,
      { target: 'target' },
    );

    expect(getToken(G.v1.characters.target, 'goodwill')).toBe(1);
  });

  it('adds despair to another same-area character when the current AHR evangelist dies', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 2;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      evangelist: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
      evangelist: 'evangelist',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'day_end');

    expect(G.v1.characters.evangelist.alive).toBe(false);
    expect(getToken(G.v1.characters.piper, 'despair') + getToken(G.v1.characters.witness, 'despair')).toBe(1);
  });

  it('allows boss evangelist death to place despair on a character in territory in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 2;
    G.v1.characters = {
      aaa_territory: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
      boss: {
        locationId: 'city',
        territoryLocationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      zzz_killer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      boss: 'evangelist',
      zzz_killer: 'pied_piper',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'day_end');

    expect(G.v1.characters.boss.alive).toBe(false);
    expect(getToken(G.v1.characters.aaa_territory, 'despair')).toBe(1);
    expect(getToken(G.v1.characters.zzz_killer, 'despair')).toBe(0);
  });

  it('queues an AHR evangelist optional world-shift choice after death outside mastermind_abilities', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 2;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      evangelist: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
      evangelist: 'evangelist',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    resolveTimingWindow(G, 'day_end');

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_evangelist_death_despair_and_world_shift',
        characterId: 'evangelist',
        targetSlots: [
          {
            slotId: 'target',
            label: '选择角色',
            kind: 'character',
            eligibleCharacterIds: ['piper', 'witness'],
          },
          {
            slotId: 'worldShiftChoice',
            label: '世界移动',
            kind: 'choice',
            eligibleChoices: [
              { id: 'shift', label: '进行世界移动' },
              { id: 'no_shift', label: '不进行世界移动' },
            ],
          },
        ],
      }),
    ]);
    expect(getToken(G.v1.characters.piper, 'despair') + getToken(G.v1.characters.witness, 'despair')).toBe(0);
  });

  it('allows confirming an AHR evangelist optional world-shift choice outside mastermind_abilities', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 0;
    G.v1.pendingAbilities = [{
      id: 'ahr_evangelist_world_shift:evangelist',
      ruleId: 'ahr_evangelist_death_despair_and_world_shift',
      characterId: 'evangelist',
      mandatory: false,
      description: '布道者死亡后可进行世界移动',
      targetSlots: [
        {
          slotId: 'target',
          label: '选择角色',
          kind: 'character',
          eligibleCharacterIds: ['witness'],
        },
        {
          slotId: 'worldShiftChoice',
          label: '世界移动',
          kind: 'choice',
          eligibleChoices: [
            { id: 'shift', label: '进行世界移动' },
            { id: 'no_shift', label: '不进行世界移动' },
          ],
        },
      ],
    }];
    G.v1.characters = {
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      evangelist: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
    };

    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'day_end' }, events: { endPhase: vi.fn() }, playerID: '0' },
      'ahr_evangelist_world_shift:evangelist',
      { target: 'witness', worldShiftChoice: 'shift' },
    );

    expect(result).toBeUndefined();
    expect(getToken(G.v1.characters.witness, 'despair')).toBe(1);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);
  });

  it('keeps current AHR evangelist day_end follow-up queued even in auto-resolve mode', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 2;
    G.day = 1;
    G.daysPerLoop = 4;
    G.v1.characters = {
      piper: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      evangelist: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      piper: 'pied_piper',
      evangelist: 'evangelist',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.day_end.onBegin as any)({ G, events: { endPhase: vi.fn(), setPhase: vi.fn() } });

    expect(G.v1.characters.evangelist.alive).toBe(true);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).not.toBe(true);
    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_pied_piper_day_end_kill',
        phase: 'day_end',
      }),
    ]);
  });

  it('adds hope to other same-area characters after resolving the current AHR alice goodwill ability', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
      witnessA: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      witnessB: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      doctor: 'alice',
    };

    executeGoodwillAbility(G, 'doctor', 'doctor_gw2');

    expect(getToken(G.v1.characters.witnessA, 'hope')).toBe(1);
    expect(getToken(G.v1.characters.witnessB, 'hope')).toBe(1);
    expect(getToken(G.v1.characters.doctor, 'hope')).toBe(0);
  });

  it('kills the current AHR marionette after resolving goodwill with two token types on itself', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.characters = {
      doctor: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3, paranoia: 1 },
      },
      witness: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      doctor: 'marionette',
    };

    executeGoodwillAbility(G, 'doctor', 'doctor_gw2');

    expect(G.v1.characters.doctor.alive).toBe(false);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.ex.gauge).toBe(1);
  });

  it('keeps the current AHR storyteller alive when a serial killer attacks during day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      storyteller: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      killer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      storyteller: 'storyteller',
      killer: 'serial_killer',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['the_locked_future'], G.v1.hiddenRoles, []);

    autoResolve(G, 'day_end');

    expect(G.v1.characters.storyteller.alive).toBe(true);
  });

  it('keeps the current AHR dimension_traveler alive when a serial killer attacks during day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      traveler: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      killer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      traveler: 'dimension_traveler',
      killer: 'serial_killer',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['illusory_world'], G.v1.hiddenRoles, []);

    autoResolve(G, 'day_end');

    expect(G.v1.characters.traveler.alive).toBe(true);
  });

  it('uses current AHR variable-role assignments for dimension_traveler immortality during day_end kills', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 1;
    G.v1.characters = {
      traveler: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      killer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      traveler: 'person',
      killer: 'serial_killer',
    };
    (G.v1 as any).ahrVariableRoles = {
      traveler: {
        frontRoleId: 'person',
        backRoleId: 'dimension_traveler',
      },
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['illusory_world'], G.v1.hiddenRoles, []);

    autoResolve(G, 'day_end');

    expect(G.v1.characters.traveler.alive).toBe(true);
  });

  it('uses current AHR variable-role assignments for key_person immediate loss during day_end kills', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 1;
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      killer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      target: 'obsessive',
      killer: 'serial_killer',
    };
    (G.v1 as any).ahrVariableRoles = {
      target: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', ['the_locked_future'], G.v1.hiddenRoles, []);

    autoResolve(G, 'day_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('requires guessing both AHR variable roles during final guesses', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 1;
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      target: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      target: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };
    G.v1.finalGuess = {
      targets: [{ charId: 'target', requiresDualGuess: true }],
      guesses: [],
      completed: false,
    } as any;
    const events = { setPhase: vi.fn(), endPhase: vi.fn() };

    const result = (moves.submitGuess.move as any)(
      { G, ctx: { phase: 'final_guess' }, events, playerID: '1' },
      'target',
      { frontRoleId: 'obsessive', backRoleId: 'key_person' },
    );

    expect(result).toBeUndefined();
    expect(G.v1.finalGuess!.guesses[0]).toEqual({
      charId: 'target',
      guessedFrontRoleId: 'obsessive',
      guessedBackRoleId: 'key_person',
      correct: true,
    });
    expect(G.v1.winner).toBe('protagonist');
    expect(events.setPhase).toHaveBeenCalledWith('match_end');
  });

  it('fails AHR dual-role final guesses when either side is wrong', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      target: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      target: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };
    G.v1.finalGuess = {
      targets: [{ charId: 'target', requiresDualGuess: true }],
      guesses: [],
      completed: false,
    } as any;
    const events = { setPhase: vi.fn(), endPhase: vi.fn() };

    const result = (moves.submitGuess.move as any)(
      { G, ctx: { phase: 'final_guess' }, events, playerID: '1' },
      'target',
      { frontRoleId: 'obsessive', backRoleId: 'person' },
    );

    expect(result).toBeUndefined();
    expect(G.v1.finalGuess!.guesses[0]).toEqual({
      charId: 'target',
      guessedFrontRoleId: 'obsessive',
      guessedBackRoleId: 'person',
      correct: false,
    });
    expect(G.v1.winner).toBe('mastermind');
    expect(events.setPhase).toHaveBeenCalledWith('match_end');
  });

  it('exposes dual-guess requirements in final_guess playerView without leaking AHR answers', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      target: 'obsessive',
      witness: 'person',
    };
    (G.v1 as any).ahrVariableRoles = {
      target: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    (phases.final_guess.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect((G.v1.finalGuess as any).targets).toEqual([
      { charId: 'target', requiresDualGuess: true },
      { charId: 'witness', requiresDualGuess: false },
    ]);

    const protagonistView = (TragedyLooper.playerView as any)({ G, playerID: '1' }) as TragedyGameState;
    expect((protagonistView.v1.finalGuess as any).targets).toEqual([
      { charId: 'target', requiresDualGuess: true },
      { charId: 'witness', requiresDualGuess: false },
    ]);
    expect(protagonistView.v1.ahrVariableRoles).toEqual({});
  });

  it('uses original cast role assignments for single-role final guesses after runtime hidden-role mutations', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      target: 'serial_killer',
    };
    G.v1.castDefinitions = [
      { characterId: 'target', roleId: 'person' },
    ] as any;
    G.v1.finalGuess = {
      targets: [{ charId: 'target', requiresDualGuess: false }],
      guesses: [],
      completed: false,
    } as any;
    const events = { setPhase: vi.fn(), endPhase: vi.fn() };

    const result = (moves.submitGuess.move as any)(
      { G, ctx: { phase: 'final_guess' }, events, playerID: '1' },
      'target',
      'person',
    );

    expect(result).toBeUndefined();
    expect(G.v1.finalGuess!.guesses[0]).toEqual({
      charId: 'target',
      guessedRole: 'person',
      correct: true,
    });
    expect(G.v1.winner).toBe('protagonist');
  });

  it('rejects final guesses for character ids outside the announced target list', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      target: 'person',
    };
    G.v1.finalGuess = {
      targets: [{ charId: 'target', requiresDualGuess: false }],
      guesses: [],
      completed: false,
    } as any;
    const events = { setPhase: vi.fn(), endPhase: vi.fn() };

    const result = (moves.submitGuess.move as any)(
      { G, ctx: { phase: 'final_guess' }, events, playerID: '1' },
      'ghost',
      'person',
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.finalGuess?.guesses).toEqual([]);
    expect(events.setPhase).not.toHaveBeenCalled();
  });

  it('blocks final guess submissions after a module final_guess rule has already decided the winner', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.finalGuess = {
      targets: [{ charId: 'doctor', requiresDualGuess: false }],
      guesses: [],
      completed: true,
    } as any;
    G.v1.winner = 'betrayer_C';
    const events = { setPhase: vi.fn(), endPhase: vi.fn() };

    const result = (moves.submitGuess.move as any)(
      { G, ctx: { phase: 'final_guess' }, events, playerID: '1' },
      'doctor',
      'person',
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.finalGuess!.guesses).toEqual([]);
    expect(events.setPhase).not.toHaveBeenCalled();
  });

  it('lets LL traitor C win when final_guess begins with all detective guesses correct', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.v1.activePlots = ['ll_i_am_the_detective'];
    G.v1.characters = {
      doctor: { locationId: 'city', alive: false, tokens: { ...createEmptyTokenBag(), paranoia: 2 } },
      patient: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 1 } },
    };
    G.v1.locations = {
      city: { tokens: { ...createEmptyTokenBag(), intrigue: 1 } },
      school: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'murder' }];
    G.v1.incidentCulprits = {
      [buildIncidentInstanceKey(1, 'murder', 0)]: 'doctor',
    };
    G.v1.detectiveGuesses = {
      [buildIncidentInstanceKey(1, 'murder', 0)]: 'doctor',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('last_liar', G.v1.activePlots, G.v1.hiddenRoles, G.v1.scheduledIncidents);
    G.v1.pendingInteractions = [{
      id: 'stale-discussion',
      kind: 'time_spiral_discussion',
      actorSeat: '0',
      phase: 'time_spiral',
      blocking: true,
      description: 'stale',
    } as any];
    const events = { setPhase: vi.fn(), endPhase: vi.fn() };

    (phases.final_guess.onBegin as any)({ G, events });

    expect(G.v1.winner).toBe('betrayer_C');
    expect(G.v1.finalGuess?.completed).toBe(true);
    expect(G.v1.pendingInteractions).toEqual([]);
    expect(events.setPhase).toHaveBeenCalledWith('match_end');
    expect(G.v1.characters.doctor.alive).toBe(true);
    expect(getToken(G.v1.characters.doctor, 'paranoia')).toBe(0);
  });

  it('kills the targeted character after resolving a targeted goodwill ability for the current AHR lullaby', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      doctor: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
      witness: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1 },
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'lullaby',
    };

    executeGoodwillAbility(G, 'doctor', 'doctor_gw2');

    expect(G.v1.characters.witness.alive).toBe(false);
  });

  it('uses current AHR variable-role assignments for alice goodwill post-effects', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
      witnessA: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      witnessB: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      doctor: 'person',
    };
    (G.v1 as any).ahrVariableRoles = {
      doctor: {
        frontRoleId: 'person',
        backRoleId: 'alice',
      },
    };

    executeGoodwillAbility(G, 'doctor', 'doctor_gw2');

    expect(getToken(G.v1.characters.witnessA, 'hope')).toBe(1);
    expect(getToken(G.v1.characters.witnessB, 'hope')).toBe(1);
  });

  it('uses current AHR variable-role assignments for marionette goodwill post-effects', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3, paranoia: 1 },
      },
      witness: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      doctor: 'person',
    };
    (G.v1 as any).ahrVariableRoles = {
      doctor: {
        frontRoleId: 'person',
        backRoleId: 'marionette',
      },
    };

    executeGoodwillAbility(G, 'doctor', 'doctor_gw2');

    expect(G.v1.characters.doctor.alive).toBe(false);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);
  });

  it('uses current AHR variable-role assignments for lullaby goodwill post-effects', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
      witness: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1 },
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'person',
    };
    (G.v1 as any).ahrVariableRoles = {
      doctor: {
        frontRoleId: 'person',
        backRoleId: 'lullaby',
      },
    };

    executeGoodwillAbility(G, 'doctor', 'doctor_gw2');

    expect(G.v1.characters.witness.alive).toBe(false);
  });

  it('uses current AHR variable-role assignments for key_person loss on goodwill kills', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
      witness: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1 },
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'lullaby',
      witness: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      witness: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'doctor', 'doctor_gw2');

    expect(G.v1.characters.witness.alive).toBe(false);
    expect(G.v1.loopLost).toBe(true);
  });

  it('reveals the current effective role for office_worker_gw3 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      office_worker: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
    };
    G.v1.hiddenRoles = {
      office_worker: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      office_worker: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'office_worker', 'office_worker_gw3');

    expect(G.v1.loopState.revealedRoles.office_worker).toBe('key_person');
  });

  it('reveals the target current effective role for miko_gw5 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      shrine_maiden: {
        locationId: 'shrine',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 5 },
      },
      target: {
        locationId: 'shrine',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      target: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      target: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'shrine_maiden', 'miko_gw5');

    expect(G.v1.loopState.revealedRoles.target).toBe('key_person');
  });

  it('reveals the current effective role for outsider_gw3 in current AHR after loop one', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 1;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      mystery_boy: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
    };
    G.v1.hiddenRoles = {
      mystery_boy: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      mystery_boy: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'mystery_boy', 'outsider_gw3');

    expect(G.v1.loopState.revealedRoles.mystery_boy).toBe('key_person');
  });

  it('uses current AHR effective roles and only on-board alive characters for copycat_gw3', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 1;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      copycat: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      alive_same: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      dead_same: {
        locationId: 'hospital',
        alive: false,
        tokens: createEmptyTokenBag(),
      },
      removed_same: {
        locationId: 'shrine',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      front_only_same: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      copycat: 'person',
      alive_same: 'obsessive',
      dead_same: 'brain',
      removed_same: 'fragment',
      front_only_same: 'key_person',
    };
    (G.v1 as any).ahrVariableRoles = {
      copycat: {
        frontRoleId: 'person',
        backRoleId: 'key_person',
      },
      alive_same: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
      dead_same: {
        frontRoleId: 'brain',
        backRoleId: 'key_person',
      },
      removed_same: {
        frontRoleId: 'fragment',
        backRoleId: 'key_person',
      },
      front_only_same: {
        frontRoleId: 'key_person',
        backRoleId: 'obsessive',
      },
    };
    G.v1.loopState.abilityUsage.__removed_from_board_removed_same = {
      usedToday: false,
      usedThisLoop: true,
    };

    executeGoodwillAbility(G, 'copycat', 'copycat_gw3');

    expect(G.publicLog.some(line => line.includes('alive_same'))).toBe(true);
    expect(G.publicLog.some(line => line.includes('dead_same'))).toBe(false);
    expect(G.publicLog.some(line => line.includes('removed_same'))).toBe(false);
    expect(G.publicLog.some(line => line.includes('front_only_same'))).toBe(false);
  });

  it('declares none for copycat_gw3 in current AHR when no same-role character is on-board and alive', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 1;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      copycat: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
      dead_same: {
        locationId: 'city',
        alive: false,
        tokens: createEmptyTokenBag(),
      },
      removed_same: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      copycat: 'person',
      dead_same: 'person',
      removed_same: 'person',
    };
    (G.v1 as any).ahrVariableRoles = {
      copycat: {
        frontRoleId: 'person',
        backRoleId: 'key_person',
      },
      dead_same: {
        frontRoleId: 'person',
        backRoleId: 'key_person',
      },
      removed_same: {
        frontRoleId: 'person',
        backRoleId: 'key_person',
      },
    };
    G.v1.loopState.abilityUsage = {
      __removed_from_board_removed_same: {
        usedToday: false,
        usedThisLoop: true,
      },
    };

    executeGoodwillAbility(G, 'copycat', 'copycat_gw3');

    expect(G.publicLog.some(line => line.includes('不存在'))).toBe(true);
    expect(G.publicLog.some(line => line.includes('公开同身份角色：无'))).toBe(false);
  });

  it('reveals the current effective role for teacher_gw4 targets in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      teacher: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 4 },
      },
      boy_student: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      teacher: 'person',
      boy_student: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      boy_student: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'teacher', 'teacher_gw4');

    expect(G.v1.loopState.revealedRoles.boy_student).toBe('key_person');
  });

  it('reveals the current effective role for cult_leader_gw4 targets in current AHR while keeping paranoia-vs-limit legality', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      cult_leader: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 4 },
      },
      office_worker: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3, goodwill: 0 },
      },
    };
    G.v1.hiddenRoles = {
      cult_leader: 'person',
      office_worker: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      office_worker: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'cult_leader', 'cult_leader_gw4');

    expect(G.v1.loopState.revealedRoles.office_worker).toBe('key_person');
  });

  it('reveals the current effective role for temp_worker_question_gw2 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      temp_worker_question: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      bystander: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      temp_worker_question: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      temp_worker_question: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'temp_worker_question', 'temp_worker_question_gw2');

    expect(G.v1.loopState.revealedRoles.temp_worker_question).toBe('key_person');
    expect(getToken(G.v1.characters.bystander, 'goodwill')).toBe(2);
  });

  it('simulates the first public incident through ai_gw3 without recording it as a real incident', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 0;
    G.v1.characters = {
      target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      ai: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
    };
    G.v1.hiddenRoles = {
      ai: 'ai',
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'lost_item' }];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);

    executeGoodwillAbility(G, 'ai', 'ai_gw3');

    expect(getToken(G.v1.characters.target, 'intrigue')).toBe(1);
    expect(G.v1.characters.ai.locationId).toBe('hospital');
    expect(G.v1.loopState.triggeredIncidents).toEqual([]);
    expect(G.v1.loopState.incidentHistory).toEqual([]);
    expect(G.v1.ex!.gauge).toBe(0);
  });

  it('does not treat described incident characters as targeted goodwill targets when current AHR AI is lullaby', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      ai: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
    };
    G.v1.hiddenRoles = {
      ai: 'ai',
    };
    (G.v1 as any).ahrVariableRoles = {
      ai: {
        frontRoleId: 'ai',
        backRoleId: 'lullaby',
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'lost_item' }];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);

    executeGoodwillAbility(G, 'ai', 'ai_gw3');

    expect(getToken(G.v1.characters.target, 'intrigue')).toBe(1);
    expect(G.v1.characters.target.alive).toBe(true);
  });

  it('marks ai_gw3 as usedThisLoop after goodwill resolution in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.characters = {
      target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      ai: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
    };
    G.v1.hiddenRoles = {
      ai: 'ai',
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'lost_item' }];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);

    resolveGoodwillPhase(G);

    expect(G.v1.loopState.abilityUsage.ai_ai_gw3?.usedToday).toBe(true);
    expect(G.v1.loopState.abilityUsage.ai_ai_gw3?.usedThisLoop).toBe(true);
  });

  it('routes both manual and auto goodwill execution through the same character-owned handler registry', () => {
    const originalHandler = characterOwnedGoodwillHandlers.journalist_gw2_paranoia;
    const wrappedHandler = vi.fn((ctx: Parameters<typeof originalHandler>[0]) => originalHandler(ctx));
    characterOwnedGoodwillHandlers.journalist_gw2_paranoia = wrappedHandler;

    try {
      const manualG = TragedyLooper.setup!({} as any) as TragedyGameState;
      manualG.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
      manualG.v1.characters = {
        journalist: {
          locationId: 'city',
          alive: true,
          tokens: { ...createEmptyTokenBag(), goodwill: 2 },
        },
        target: {
          locationId: 'school',
          alive: true,
          tokens: createEmptyTokenBag(),
        },
      };
      manualG.v1.hiddenRoles = {};

      executeGoodwillAbility(manualG, 'journalist', 'journalist_gw2_paranoia');

      const autoG = TragedyLooper.setup!({} as any) as TragedyGameState;
      autoG.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
      autoG.v1.characters = {
        journalist: {
          locationId: 'city',
          alive: true,
          tokens: { ...createEmptyTokenBag(), goodwill: 2 },
        },
        target: {
          locationId: 'school',
          alive: true,
          tokens: createEmptyTokenBag(),
        },
      };
      autoG.v1.hiddenRoles = {};

      resolveGoodwillPhase(autoG);

      expect(wrappedHandler).toHaveBeenCalledTimes(2);
      expect(getToken(manualG.v1.characters.target, 'paranoia')).toBe(1);
      expect(getToken(autoG.v1.characters.target, 'paranoia')).toBe(1);
    } finally {
      characterOwnedGoodwillHandlers.journalist_gw2_paranoia = originalHandler;
    }
  });

  it('aggregates owned-goodwill character files into the top-level character registry', () => {
    expect(characterOwnedGoodwillHandlers.ai_gw3).toBe(ownedCharacterGoodwillHandlers.ai_gw3);
    expect(characterOwnedGoodwillHandlers.alien_gw4).toBe(ownedCharacterGoodwillHandlers.alien_gw4);
    expect(characterOwnedGoodwillHandlers.alien_gw5).toBe(ownedCharacterGoodwillHandlers.alien_gw5);
    expect(characterOwnedGoodwillHandlers.boy_student_gw1).toBe(ownedCharacterGoodwillHandlers.boy_student_gw1);
    expect(characterOwnedGoodwillHandlers.copycat_gw3).toBe(ownedCharacterGoodwillHandlers.copycat_gw3);
    expect(characterOwnedGoodwillHandlers.cult_leader_gw3).toBe(ownedCharacterGoodwillHandlers.cult_leader_gw3);
    expect(characterOwnedGoodwillHandlers.cult_leader_gw4).toBe(ownedCharacterGoodwillHandlers.cult_leader_gw4);
    expect(characterOwnedGoodwillHandlers.deity_gw3).toBe(ownedCharacterGoodwillHandlers.deity_gw3);
    expect(characterOwnedGoodwillHandlers.doctor_gw3).toBe(ownedCharacterGoodwillHandlers.doctor_gw3);
    expect(characterOwnedGoodwillHandlers.doctor_gw2).toBe(ownedCharacterGoodwillHandlers.doctor_gw2);
    expect(characterOwnedGoodwillHandlers.deity_gw5).toBe(ownedCharacterGoodwillHandlers.deity_gw5);
    expect(characterOwnedGoodwillHandlers.follower_gw2).toBe(ownedCharacterGoodwillHandlers.follower_gw2);
    expect(characterOwnedGoodwillHandlers.forensic_scientist_gw2).toBe(ownedCharacterGoodwillHandlers.forensic_scientist_gw2);
    expect(characterOwnedGoodwillHandlers.illusion_gw4).toBe(ownedCharacterGoodwillHandlers.illusion_gw4);
    expect(characterOwnedGoodwillHandlers.henchman_gw3).toBe(ownedCharacterGoodwillHandlers.henchman_gw3);
    expect(characterOwnedGoodwillHandlers.higher_being_gw2).toBe(ownedCharacterGoodwillHandlers.higher_being_gw2);
    expect(characterOwnedGoodwillHandlers.illusion_gw3).toBe(ownedCharacterGoodwillHandlers.illusion_gw3);
    expect(characterOwnedGoodwillHandlers.immortal_gw1).toBe(ownedCharacterGoodwillHandlers.immortal_gw1);
    expect(characterOwnedGoodwillHandlers.immortal_gw3).toBe(ownedCharacterGoodwillHandlers.immortal_gw3);
    expect(characterOwnedGoodwillHandlers.informant_gw5).toBe(ownedCharacterGoodwillHandlers.informant_gw5);
    expect(characterOwnedGoodwillHandlers.journalist_gw2_intrigue).toBe(ownedCharacterGoodwillHandlers.journalist_gw2_intrigue);
    expect(characterOwnedGoodwillHandlers.journalist_gw2_paranoia).toBe(ownedCharacterGoodwillHandlers.journalist_gw2_paranoia);
    expect(characterOwnedGoodwillHandlers.little_girl_gw1).toBe(ownedCharacterGoodwillHandlers.little_girl_gw1);
    expect(characterOwnedGoodwillHandlers.little_girl_gw3).toBe(ownedCharacterGoodwillHandlers.little_girl_gw3);
    expect(characterOwnedGoodwillHandlers.miko_gw5).toBe(ownedCharacterGoodwillHandlers.miko_gw5);
    expect(characterOwnedGoodwillHandlers.sister_gw6).toBe(ownedCharacterGoodwillHandlers.sister_gw6);
    expect(characterOwnedGoodwillHandlers.miko_gw3).toBe(ownedCharacterGoodwillHandlers.miko_gw3);
    expect(characterOwnedGoodwillHandlers.nurse_gw2).toBe(ownedCharacterGoodwillHandlers.nurse_gw2);
    expect(characterOwnedGoodwillHandlers.office_worker_gw3).toBe(ownedCharacterGoodwillHandlers.office_worker_gw3);
    expect(characterOwnedGoodwillHandlers.outsider_gw3).toBe(ownedCharacterGoodwillHandlers.outsider_gw3);
    expect(characterOwnedGoodwillHandlers.police_gw4).toBe(ownedCharacterGoodwillHandlers.police_gw4);
    expect(characterOwnedGoodwillHandlers.police_gw5).toBe(ownedCharacterGoodwillHandlers.police_gw5);
    expect(characterOwnedGoodwillHandlers.pop_idol_gw3).toBe(ownedCharacterGoodwillHandlers.pop_idol_gw3);
    expect(characterOwnedGoodwillHandlers.pop_idol_gw4).toBe(ownedCharacterGoodwillHandlers.pop_idol_gw4);
    expect(characterOwnedGoodwillHandlers.rich_man_gw4).toBe(ownedCharacterGoodwillHandlers.rich_man_gw4);
    expect(characterOwnedGoodwillHandlers.scholar_gw3).toBe(ownedCharacterGoodwillHandlers.scholar_gw3);
    expect(characterOwnedGoodwillHandlers.soldier_gw2).toBe(ownedCharacterGoodwillHandlers.soldier_gw2);
    expect(characterOwnedGoodwillHandlers.soldier_gw5).toBe(ownedCharacterGoodwillHandlers.soldier_gw5);
    expect(characterOwnedGoodwillHandlers.temp_worker_question_gw2).toBe(ownedCharacterGoodwillHandlers.temp_worker_question_gw2);
    expect(characterOwnedGoodwillHandlers.teacher_gw3).toBe(ownedCharacterGoodwillHandlers.teacher_gw3);
    expect(characterOwnedGoodwillHandlers.transfer_student_gw2).toBe(ownedCharacterGoodwillHandlers.transfer_student_gw2);
    expect(characterOwnedGoodwillHandlers.teacher_gw4).toBe(ownedCharacterGoodwillHandlers.teacher_gw4);
    expect(characterOwnedGoodwillHandlers.forensic_scientist_gw5).toBe(ownedCharacterGoodwillHandlers.forensic_scientist_gw5);
    expect(characterOwnedGoodwillHandlers.class_rep_gw2).toBe(ownedCharacterGoodwillHandlers.class_rep_gw2);
    expect(characterOwnedGoodwillHandlers.vlogger_gw2_move_paranoia).toBe(ownedCharacterGoodwillHandlers.vlogger_gw2_move_paranoia);
    expect(characterOwnedGoodwillHandlers.vlogger_gw3_add_intrigue).toBe(ownedCharacterGoodwillHandlers.vlogger_gw3_add_intrigue);
    expect(characterOwnedGoodwillHandlers.young_lady_gw3).toBe(ownedCharacterGoodwillHandlers.young_lady_gw3);
  });

  it('keeps legacy goodwill buckets empty after the owned-goodwill migration', () => {
    expect(Object.keys(legacyGoodwillHandlers)).toEqual([]);
    expect(Object.keys(characterGoodwillActionHandlers)).toEqual([]);
    expect(Object.keys(characterGoodwillRevealHandlers)).toEqual([]);
    expect(Object.keys(revealGoodwillHandlers)).toEqual([]);
    expect(characterOwnedGoodwillHandlers).toEqual(ownedCharacterGoodwillHandlers);
  });

  it('does not offer ai_gw3 again later in the same loop in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.characters = {
      target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      ai: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
    };
    G.v1.hiddenRoles = {
      ai: 'ai',
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'lost_item' }];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);
    G.v1.loopState.abilityUsage.ai_ai_gw3 = {
      usedToday: false,
      usedThisLoop: true,
    };

    expect(collectEligibleAbilities(G).some(ability => ability.abilityId === 'ai_gw3')).toBe(false);
  });

  it('offers leader-declared public incident choices for current AHR ai_gw3 in goodwill_window', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.leader = '1';
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      ai: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
    };
    G.v1.hiddenRoles = { ai: 'ai' };
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'dimension_shift' },
      { day: 2, incidentId: 'light_in_the_gap' },
    ];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);

    (phases.goodwill_window.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const ability = G.v1.goodwillInteraction.eligibleAbilities.find(a => a.abilityId === 'ai_gw3') as any;
    expect(ability).toBeTruthy();
    expect(ability.targetSlots?.[0]?.slotId).toBe('incidentChoice');
    expect(ability.targetSlots?.[0]?.eligibleChoices).toHaveLength(2);
    expect(ability.targetSlots?.some((slot: any) => `${slot.slotId}`.includes('::'))).toBe(true);
  });

  it('rejects current AHR ai_gw3 declarations when the chosen incident target is missing', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.leader = '1';
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      ai: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
    };
    G.v1.hiddenRoles = { ai: 'ai' };
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'dimension_shift' },
      { day: 2, incidentId: 'light_in_the_gap' },
    ];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);

    (phases.goodwill_window.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const ability = G.v1.goodwillInteraction.eligibleAbilities.find(a => a.abilityId === 'ai_gw3') as any;
    const incidentChoice = ability.targetSlots[0].eligibleChoices[1].id;
    const result = (moves.declareAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '1' },
      'ai',
      'ai_gw3',
      { incidentChoice },
    );

    expect(result).toBe(INVALID_MOVE);
  });

  it('resolves current AHR ai_gw3 using the leader-selected public incident and targets', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 0;
    G.v1.settings.autoResolve = false;
    G.v1.leader = '1';
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      other: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      ai: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
    };
    G.v1.hiddenRoles = { ai: 'ai' };
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'dimension_shift' },
      { day: 2, incidentId: 'light_in_the_gap' },
    ];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);

    (phases.goodwill_window.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const ability = G.v1.goodwillInteraction.eligibleAbilities.find(a => a.abilityId === 'ai_gw3') as any;
    const incidentChoice = ability.targetSlots[0].eligibleChoices[1].id;
    const targetSlot = ability.targetSlots.find((slot: any) => `${slot.slotId}`.startsWith(`${incidentChoice}::`) && `${slot.slotId}`.endsWith('target'));

    const declareResult = (moves.declareAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '1' },
      'ai',
      'ai_gw3',
      {
        incidentChoice,
        [targetSlot.slotId]: 'target',
      },
    );
    expect(declareResult).toBeUndefined();

    (moves.resolveAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, events: { endPhase: vi.fn() }, playerID: '0' },
      true,
    );

    expect(getToken(G.v1.characters.target, 'hope')).toBe(1);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);
    expect(G.v1.loopState.triggeredIncidents).toEqual([]);
  });

  it('downgrades current AHR puppetized mandatory ignore-goodwill roles to can_reject for protagonist declarations', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.activePlots = ['puppet_strings'];
    G.v1.characters = {
      class_rep: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      class_rep: 'obsessive',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    expect(getGoodwillTrait(G, 'class_rep')).toBe('can_reject');
  });

  it('queues and resolves puppetized class_rep goodwill in mastermind_abilities under current AHR puppet_strings', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    G.v1.leader = '1';
    G.seatHands['1'] = [];
    G.board.usedOncePerLoopCards = ['1:protagonist_goodwill_plus_2'];
    G.v1.characters = {
      class_rep: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 2 },
      },
    };
    G.v1.hiddenRoles = {
      class_rep: 'obsessive',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'ahr_puppetized_goodwill_ability',
          characterId: 'class_rep',
          abilityId: 'class_rep_gw2',
        }),
      ]),
    );

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'class_rep_gw2');
    expect(puppetAbility).toBeTruthy();

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
    );

    expect(G.seatHands['1']).toContain('protagonist_goodwill_plus_2');
    expect(G.board.usedOncePerLoopCards).not.toContain('1:protagonist_goodwill_plus_2');
  });

  it('queues and resolves puppetized office_worker goodwill in mastermind_abilities under current AHR puppet_strings', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    G.v1.characters = {
      office_worker: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
    };
    G.v1.hiddenRoles = {
      office_worker: 'brain',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'ahr_puppetized_goodwill_ability',
          characterId: 'office_worker',
          abilityId: 'office_worker_gw3',
        }),
      ]),
    );

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'office_worker_gw3');
    expect(puppetAbility).toBeTruthy();

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
    );

    expect(G.v1.loopState.revealedRoles.office_worker).toBe('brain');
  });

  it('reveals the back-world effective role when resolving puppetized office_worker goodwill in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      office_worker: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
    };
    G.v1.hiddenRoles = {
      office_worker: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      office_worker: {
        frontRoleId: 'obsessive',
        backRoleId: 'brain',
      },
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'office_worker_gw3');
    expect(puppetAbility).toBeTruthy();

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
    );

    expect(G.v1.loopState.revealedRoles.office_worker).toBe('brain');
  });

  it('queues and resolves puppetized outsider goodwill in mastermind_abilities under current AHR puppet_strings even with despair', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    G.loopIndex = 1;
    G.v1.characters = {
      mystery_boy: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3, despair: 1 },
      },
    };
    G.v1.hiddenRoles = {
      mystery_boy: 'brain',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'ahr_puppetized_goodwill_ability',
          characterId: 'mystery_boy',
          abilityId: 'outsider_gw3',
        }),
      ]),
    );

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'outsider_gw3');
    expect(puppetAbility).toBeTruthy();

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
    );

    expect(G.v1.loopState.revealedRoles.mystery_boy).toBe('brain');
  });

  it('does not queue puppetized outsider goodwill on loop one under current AHR puppet_strings', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    G.loopIndex = 0;
    G.v1.characters = {
      mystery_boy: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 3 },
      },
    };
    G.v1.hiddenRoles = {
      mystery_boy: 'brain',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities.some(ability => ability.abilityId === 'outsider_gw3')).toBe(false);
  });

  it('queues puppetized miko_gw5 with explicit target slots and reveals the selected target in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      shrine_maiden: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 5 },
      },
      first_target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      second_target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      shrine_maiden: 'brain',
      first_target: 'obsessive',
      second_target: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      second_target: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'miko_gw5');
    expect(puppetAbility).toBeTruthy();
    expect(puppetAbility?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: ['first_target', 'second_target'],
      }),
    ]);

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
      { target: 'second_target' },
    );

    expect(G.v1.loopState.revealedRoles.second_target).toBe('key_person');
    expect(G.v1.loopState.revealedRoles.first_target).toBeUndefined();
  });

  it('requires an explicit target when resolving puppetized miko_gw5 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      shrine_maiden: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 5 },
      },
      target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      shrine_maiden: 'brain',
      target: 'obsessive',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'miko_gw5');
    expect(puppetAbility).toBeTruthy();

    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.loopState.revealedRoles.target).toBeUndefined();
  });

  it('queues puppetized nurse_gw2 using target paranoia vs unease limit in back-world current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      nurse: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2, goodwill: 0 },
      },
      office_worker: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 0, goodwill: 5 },
      },
    };
    G.v1.hiddenRoles = {
      nurse: 'brain',
      patient: 'key_person',
      office_worker: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'nurse_gw2');
    expect(puppetAbility).toBeTruthy();
    expect(puppetAbility?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: ['patient'],
      }),
    ]);

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
      { target: 'patient' },
    );

    expect(getToken(G.v1.characters.patient, 'paranoia')).toBe(1);
    expect(getToken(G.v1.characters.office_worker, 'paranoia')).toBe(0);
  });

  it('rejects puppetized nurse_gw2 targets that fail paranoia-vs-unease legality in back-world current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      nurse: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2, goodwill: 0 },
      },
      office_worker: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 0, goodwill: 5 },
      },
    };
    G.v1.hiddenRoles = {
      nurse: 'brain',
      patient: 'key_person',
      office_worker: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'nurse_gw2');
    expect(puppetAbility).toBeTruthy();

    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
      { target: 'office_worker' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(getToken(G.v1.characters.patient, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.office_worker, 'paranoia')).toBe(0);
  });

  it('queues puppetized doctor_gw2 with target and mode slots and places paranoia on the selected target in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      office_worker: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'brain',
      patient: 'key_person',
      office_worker: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'doctor_gw2');
    expect(puppetAbility).toBeTruthy();
    expect(puppetAbility?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['patient', 'office_worker']),
      }),
      expect.objectContaining({
        slotId: 'mode',
        kind: 'choice',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'place' }),
          expect.objectContaining({ id: 'remove' }),
        ]),
      }),
    ]);

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
      { target: 'patient', mode: 'place' },
    );

    expect(getToken(G.v1.characters.patient, 'paranoia')).toBe(1);
    expect(getToken(G.v1.characters.office_worker, 'paranoia')).toBe(2);
  });

  it('removes paranoia from the selected target when puppetized doctor_gw2 chooses remove in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      office_worker: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'brain',
      patient: 'key_person',
      office_worker: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'doctor_gw2');
    expect(puppetAbility).toBeTruthy();

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
      { target: 'office_worker', mode: 'remove' },
    );

    expect(getToken(G.v1.characters.office_worker, 'paranoia')).toBe(1);
    expect(getToken(G.v1.characters.patient, 'paranoia')).toBe(0);
  });

  it('requires an explicit mode when resolving puppetized doctor_gw2 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.activePlots = ['puppet_strings'];
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'brain',
      patient: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', G.v1.activePlots, G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const puppetAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'doctor_gw2');
    expect(puppetAbility).toBeTruthy();

    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      puppetAbility!.id,
      { target: 'patient' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(getToken(G.v1.characters.patient, 'paranoia')).toBe(0);
  });

  it('queues current AHR higher_being_gw2 for mastermind use in the front world when the role ignores goodwill and the character has one goodwill', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      higher_being: {
        locationId: 'shrine',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 1 },
      },
      target: {
        locationId: 'shrine',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      higher_being: 'brain',
      target: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const mastermindAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'higher_being_gw2');
    expect(mastermindAbility).toBeTruthy();
    expect(mastermindAbility).toEqual(
      expect.objectContaining({
        ruleId: 'ahr_mastermind_goodwill_ability',
        characterId: 'higher_being',
        abilityId: 'higher_being_gw2',
      }),
    );
    expect(mastermindAbility?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['higher_being', 'target']),
      }),
      expect.objectContaining({
        slotId: 'token',
        kind: 'choice',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'hope' }),
          expect.objectContaining({ id: 'despair' }),
        ]),
      }),
    ]);
  });

  it('queues current AHR higher_being_gw2 for mastermind use in the back world using mastermind paranoia per FAQ', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.mastermind = { tokens: { ...createEmptyTokenBag(), paranoia: 1 } };
    G.v1.characters = {
      higher_being: {
        locationId: 'shrine',
        alive: true,
        tokens: { ...createEmptyTokenBag(), despair: 1 },
      },
      target: {
        locationId: 'shrine',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      higher_being: 'brain',
      target: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'ahr_mastermind_goodwill_ability',
          characterId: 'higher_being',
          abilityId: 'higher_being_gw2',
        }),
      ]),
    );
  });

  it('places the selected hope or despair token when resolving mastermind higher_being_gw2 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      higher_being: {
        locationId: 'shrine',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 1 },
      },
      target: {
        locationId: 'shrine',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      higher_being: 'brain',
      target: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const mastermindAbility = G.v1.pendingAbilities.find(ability => ability.abilityId === 'higher_being_gw2');
    expect(mastermindAbility).toBeTruthy();

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      mastermindAbility!.id,
      { target: 'target', token: 'despair' },
    );

    expect(getToken(G.v1.characters.target, 'despair')).toBe(1);
    expect(getToken(G.v1.characters.target, 'hope')).toBe(0);
  });

  it('queues current AHR doctor_gw2 for mastermind use in the front world when the role ignores goodwill and the doctor has two goodwill', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      doctor: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'brain',
      patient: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const mastermindAbility = G.v1.pendingAbilities.find(
      ability => ability.ruleId === 'ahr_mastermind_goodwill_ability' && ability.abilityId === 'doctor_gw2',
    );
    expect(mastermindAbility).toBeTruthy();
    expect(mastermindAbility?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: ['patient'],
      }),
      expect.objectContaining({
        slotId: 'mode',
        kind: 'choice',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'place' }),
          expect.objectContaining({ id: 'remove' }),
        ]),
      }),
    ]);
  });

  it('queues current AHR doctor_gw2 for mastermind use in the back world using paranoia per FAQ', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'brain',
      patient: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'ahr_mastermind_goodwill_ability',
          characterId: 'doctor',
          abilityId: 'doctor_gw2',
        }),
      ]),
    );
  });

  it('does not consume protagonist-side doctor_gw2 usage after mastermind-side resolution in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      doctor: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 2 },
      },
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      doctor: 'brain',
      patient: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const mastermindAbility = G.v1.pendingAbilities.find(
      ability => ability.ruleId === 'ahr_mastermind_goodwill_ability' && ability.abilityId === 'doctor_gw2',
    );
    expect(mastermindAbility).toBeTruthy();

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      mastermindAbility!.id,
      { target: 'patient', mode: 'place' },
    );

    expect(G.v1.loopState.abilityUsage.doctor_doctor_gw2?.usedToday).toBeFalsy();
    expect(collectEligibleAbilities(G).some(ability => ability.charId === 'doctor' && ability.abilityId === 'doctor_gw2')).toBe(true);
  });

  it('reveals the current effective role for cult_leader_gw4 in current AHR while keeping paranoia-vs-limit target legality', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      cult_leader: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 4 },
      },
      boy_student: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2, goodwill: 0 },
      },
    };
    G.v1.hiddenRoles = {
      cult_leader: 'brain',
      boy_student: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      boy_student: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'cult_leader', 'cult_leader_gw4');

    expect(G.v1.loopState.revealedRoles.boy_student).toBe('key_person');
  });

  it('reveals the current effective role for teacher_gw4 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      teacher: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 4 },
      },
      boy_student: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      teacher: 'brain',
      boy_student: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      boy_student: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    executeGoodwillAbility(G, 'teacher', 'teacher_gw4');

    expect(G.v1.loopState.revealedRoles.boy_student).toBe('key_person');
  });

  it('reveals the current effective role for temp_worker_question_gw2 in current AHR', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex!.gauge = 1;
    G.v1.characters = {
      part_timer_question: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      target: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      part_timer_question: 'obsessive',
      target: 'key_person',
    };
    (G.v1 as any).ahrVariableRoles = {
      part_timer_question: {
        frontRoleId: 'obsessive',
        backRoleId: 'brain',
      },
    };

    executeGoodwillAbility(G, 'part_timer_question', 'temp_worker_question_gw2');

    expect(G.v1.loopState.revealedRoles.part_timer_question).toBe('brain');
  });

  it('resolves current AHR light_in_the_gap through the manual incident queue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      target: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'light_in_the_gap' }];
    G.v1.incidentCulprits = { '1_light_in_the_gap': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const pending = findPendingIncidentInteraction(G, 'light_in_the_gap');
    expect(pending?.targetSlots?.[0]?.eligibleCharacterIds).toContain('target');

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      pending!.sourceId,
      true,
      { target: 'target' },
    );

    expect(getToken(G.v1.characters.target, 'hope')).toBe(1);
  });

  it('resolves current AHR darkness_of_despair through the manual incident queue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      target: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'darkness_of_despair' }];
    G.v1.incidentCulprits = { '1_darkness_of_despair': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const pending = findPendingIncidentInteraction(G, 'darkness_of_despair');
    expect(pending?.targetSlots?.[0]?.eligibleCharacterIds).toContain('target');

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      pending!.sourceId,
      true,
      { target: 'target' },
    );

    expect(getToken(G.v1.characters.target, 'despair')).toBe(1);
  });

  it('allows selecting scripts that are only supported in manual mode', () => {
    const unplayable = getAllScripts().find(script => !getScriptPlayability(script.id).playable);
    expect(unplayable).toBeTruthy();

    const client = createMastermindClient();
    client.moves.selectScript(unplayable!.id);

    const state = client.getState();
    expect(state?.ctx.phase).toBe('lobby_wait');
    expect(Object.keys(state!.G.v1.characters).length).toBeGreaterThan(0);
    expect(state!.G.v1.scheduledIncidents.length).toBeGreaterThanOrEqual(0);
    expect(state!.G.v1.currentScriptId).toBe(unplayable!.id);
    expect(state!.G.v1.settings.autoResolve).toBe(false);
  });

  it('still allows fully covered scripts', () => {
    const playable = getAllScripts().find(script => getScriptPlayability(script.id).playable);
    expect(playable).toBeTruthy();

    const client = createMastermindClient();
    client.moves.selectScript(playable!.id);

    const state = client.getState();
    expect(state?.ctx.phase).toBe('lobby_wait');
    expect(Object.keys(state!.G.v1.characters).length).toBeGreaterThan(0);
    expect(state!.G.v1.activeRuleDefinitions.length).toBeGreaterThan(0);
  });

  it('rejects switching a manual-only script back to auto-resolve mode', () => {
    const unplayable = getAllScripts().find(script => !getScriptPlayability(script.id).playable);
    expect(unplayable).toBeTruthy();

    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    (moves.selectScript as any)(
      { G, ctx: { phase: 'script_select' }, events, playerID: '0' },
      unplayable!.id,
    );

    const result = (moves.updateSetting as any)(
      { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
      'autoResolve',
      true,
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.settings.autoResolve).toBe(false);
    expect(G.fullLog.at(-1)).toContain('无法切换到结算模式:');
  });

  it('builds BTX doctor_gw2 and nurse_gw2 target slots through module goodwill hooks', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 2 } },
      nurse: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 2 } },
      patient: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 2 } },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    expect(buildModuleGoodwillTargetSlots({ G, charId: 'doctor', abilityId: 'doctor_gw2' })).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['nurse', 'patient', 'witness']),
      }),
      expect.objectContaining({
        slotId: 'mode',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'place' }),
          expect.objectContaining({ id: 'remove' }),
        ]),
      }),
    ]);
    expect(buildModuleGoodwillTargetSlots({ G, charId: 'nurse', abilityId: 'nurse_gw2' })).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: ['patient'],
      }),
    ]);
  });

  it('builds AHR miko_gw5, higher_being_gw2, and ai_gw3 target slots through module goodwill hooks', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      shrine_maiden: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 5 } },
      metaworld_denizen: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
      ai: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      other: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      shrine_maiden: 'obsessive',
      metaworld_denizen: 'brain',
      ai: 'ai',
      target: 'key_person',
      other: 'key_person',
    };
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'dimension_shift' },
      { day: 2, incidentId: 'light_in_the_gap' },
    ];
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, G.v1.scheduledIncidents);

    expect(buildModuleGoodwillTargetSlots({ G, charId: 'shrine_maiden', abilityId: 'miko_gw5' })).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['metaworld_denizen', 'ai', 'target']),
      }),
    ]);
    expect(buildModuleGoodwillTargetSlots({ G, charId: 'metaworld_denizen', abilityId: 'higher_being_gw2' })).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['shrine_maiden', 'metaworld_denizen', 'ai', 'target']),
      }),
      expect.objectContaining({
        slotId: 'token',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'hope' }),
          expect.objectContaining({ id: 'despair' }),
        ]),
      }),
    ]);
    expect(buildModuleGoodwillTargetSlots({ G, charId: 'ai', abilityId: 'ai_gw3' })).toEqual([
      expect.objectContaining({
        slotId: 'incidentChoice',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: expect.stringContaining('dimension_shift') }),
          expect.objectContaining({ id: expect.stringContaining('light_in_the_gap') }),
        ]),
      }),
      expect.objectContaining({
        slotId: expect.stringContaining('::'),
      }),
    ]);
  });

  it('requires explicit leader targets for AHR miko_gw5 and higher_being_gw2 in goodwill_window', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.leader = '1';
    G.v1.characters = {
      shrine_maiden: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 5 } },
      metaworld_denizen: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 3 } },
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      shrine_maiden: 'obsessive',
      metaworld_denizen: 'brain',
      target: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('another_horizon_revised', [], G.v1.hiddenRoles, []);

    (phases.goodwill_window.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const mikoAbility = G.v1.goodwillInteraction.eligibleAbilities.find(a => a.abilityId === 'miko_gw5') as any;
    const higherBeingAbility = G.v1.goodwillInteraction.eligibleAbilities.find(a => a.abilityId === 'higher_being_gw2') as any;

    expect(mikoAbility?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['metaworld_denizen', 'target']),
      }),
    ]);
    expect(higherBeingAbility?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['shrine_maiden', 'metaworld_denizen', 'target']),
      }),
      expect.objectContaining({
        slotId: 'token',
      }),
    ]);

    const missingMikoTarget = (moves.declareAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '1' },
      'shrine_maiden',
      'miko_gw5',
    );
    expect(missingMikoTarget).toBe(INVALID_MOVE);

    const missingHigherBeingToken = (moves.declareAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '1' },
      'metaworld_denizen',
      'higher_being_gw2',
      { target: 'target' },
    );
    expect(missingHigherBeingToken).toBe(INVALID_MOVE);

    const declareHigherBeing = (moves.declareAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '1' },
      'metaworld_denizen',
      'higher_being_gw2',
      { target: 'target', token: 'despair' },
    );
    expect(declareHigherBeing).toBeUndefined();
  });

  it('emits explicit goodwill result announcements with selected target detail after mastermind resolution', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.leader = '1';
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 2 } },
      target: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 1 } },
    };
    G.v1.hiddenRoles = {};
    G.v1.activeRuleDefinitions = buildActiveRules('basic_tragedy', [], G.v1.hiddenRoles, []);

    (phases.goodwill_window.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const declareResult = (moves.declareAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '1' },
      'doctor',
      'doctor_gw2',
      { target: 'target', mode: 'remove' },
    );
    expect(declareResult).toBeUndefined();

    const resolveResult = (moves.resolveAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, events: { endPhase: vi.fn() }, playerID: '0' },
      true,
    );
    expect(resolveResult).toBeUndefined();

    const goodwillAnnouncement = G.v1.eventLogs.find(e => e.type === 'ability_trigger');
    expect(goodwillAnnouncement).toEqual(expect.objectContaining({
      type: 'ability_trigger',
      payload: expect.objectContaining({
        resultType: 'goodwill',
        outcome: 'allowed',
        abilityName: '友好能力生效',
        targetId: 'target',
        targetType: 'character',
        detail: expect.stringContaining('效果'),
      }),
    }));
    // 事后通知：友好能力还应生成 resolve_effect
    const resolveEffects = G.v1.eventLogs.filter(e => e.type === 'resolve_effect');
    expect(resolveEffects.length).toBeGreaterThanOrEqual(1);
  });

  it('enters the initial time spiral before the first loop starts', () => {
    const playable = getAllScripts().find(script => getScriptPlayability(script.id).playable);
    expect(playable).toBeTruthy();

    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    const events = { endPhase: vi.fn(), setPhase: vi.fn() };

    (moves.selectScript as any)(
      { G, ctx: { phase: 'script_select' }, events, playerID: '0' },
      playable!.id,
    );

    if (G.v1.characters.boss && !G.v1.characters.boss.territoryLocationId) {
      (moves.setCharacterTerritory as any)(
        { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
        'boss',
        'city',
      );
    }

    G.v1.joinedProtagonists['1'] = true;
    G.v1.readyPlayers['1'] = true;

    (moves.startGame as any)(
      { G, ctx: { phase: 'lobby_wait' }, events, playerID: '0' },
    );

    expect(events.endPhase).toHaveBeenCalled();
  });

  it('rejects startGame while a joined protagonist seat remains unready', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.joinedProtagonists = { '1': true, '2': true };
    G.v1.readyPlayers = { '1': true, '2': false };
    const events = { endPhase: vi.fn(), setPhase: vi.fn() };

    const result = (moves.startGame as any)(
      { G, ctx: { phase: 'lobby_wait' }, events, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('rejects startGame when boss exists but territory is unset', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      boss: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const result = (moves.startGame as any)(
      { G, ctx: { phase: 'lobby_wait' }, events, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('rejects startGame when no protagonist is ready, even after boss territory is set', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      boss: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const setResult = (moves.setCharacterTerritory as any)(
      { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
      'boss',
      'hospital',
    );
    const startResult = (moves.startGame as any)(
      { G, ctx: { phase: 'lobby_wait' }, events, playerID: '0' },
    );

    expect(setResult).toBeUndefined();
    expect(startResult).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('rejects protagonist advance when the player has not played a card yet, even after readying up', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.leaderMode = false;
    G.v1.readyPlayers = {
      '1': false,
      '2': true,
      '3': true,
    };
    G.v1.playedCards = [
      {
        id: 'card_1',
        cardTemplateId: 'move',
        owner: 'protagonist',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '2',
        playedByColor: 'green',
      },
    ] as any;

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const readyResult = (moves.toggleReady as any)({ G, ctx: { phase: 'lobby_wait' }, playerID: '1' });
    const advanceResult = (moves.advancePhase as any)(
      { G, ctx: { phase: 'protagonist_plan' }, events, playerID: '1' },
    );

    expect(readyResult).toBeUndefined();
    expect(G.v1.readyPlayers['1']).toBe(true);
    expect(advanceResult).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('does not let ready protagonists skip other seats that have not played yet', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.leaderMode = false;
    G.v1.readyPlayers = {
      '1': false,
      '2': true,
      '3': true,
    };
    G.v1.playedCards = [
      {
        id: 'card_1',
        cardTemplateId: 'move',
        owner: 'protagonist',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '1',
        playedByColor: 'orange',
      },
    ] as any;

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const advanceResult = (moves.advancePhase as any)(
      { G, ctx: { phase: 'protagonist_plan' }, events, playerID: '1' },
    );

    expect(advanceResult).toBeUndefined();
    expect(G.v1.readyPlayers['1']).toBe(true);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('keeps protagonist and spectator views free of hidden script data and other seats\' hands', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptSecret = {
      mainPlotId: 'murder_plan',
      subplotIds: ['the_sealed_item'],
      cast: [],
      incidents: [],
    } as any;
    G.fullLog = ['secret log entry'];
    G.seatHands = {
      '0': ['mm-card'],
      '1': ['p1-card-a', 'p1-card-b'],
      '2': ['p2-card'],
      '3': ['p3-card'],
    };
    G.v1.hiddenRoles = {
      doctor: 'key_person',
    };
    G.v1.incidentCulprits = {
      '1_hospital_incident': 'doctor',
    };
    G.v1.activeRuleDefinitions = [
      { ruleId: 'key_person_death_loss', timing: 'day_end', mandatory: true, source: 'role:key_person' },
    ];
    G.v1.pendingAbilities = [
      {
        id: 'brain_intrigue_ability:doctor',
        ruleId: 'brain_intrigue_ability',
        characterId: 'doctor',
        mandatory: true,
        description: '医生发动主谋能力',
        targetSlots: [],
      },
    ];

    const protagonistView = (TragedyLooper.playerView as any)({ G, playerID: '1' }) as TragedyGameState;
    expect(protagonistView.scriptSecret).toBeNull();
    expect(protagonistView.fullLog).toEqual([]);
    expect(protagonistView.v1.hiddenRoles).toEqual({});
    expect(protagonistView.v1.incidentCulprits).toEqual({});
    expect(protagonistView.v1.activeRuleDefinitions).toEqual([]);
    expect(protagonistView.v1.loopState.abilityUsage).toEqual({});
    expect(protagonistView.v1.pendingAbilities).toEqual([]);
    expect(protagonistView.seatHands).toEqual({
      '1': ['p1-card-a', 'p1-card-b'],
    });

    const mastermindView = (TragedyLooper.playerView as any)({ G, playerID: '0' }) as TragedyGameState;
    expect(mastermindView.seatHands).toEqual({
      '0': ['mm-card'],
    });

    const spectatorView = (TragedyLooper.playerView as any)({ G, playerID: undefined }) as TragedyGameState;
    expect(spectatorView.scriptSecret).toBeNull();
    expect(spectatorView.fullLog).toEqual([]);
    expect(spectatorView.v1.hiddenRoles).toEqual({});
    expect(spectatorView.v1.incidentCulprits).toEqual({});
    expect(spectatorView.v1.activeRuleDefinitions).toEqual([]);
    expect(spectatorView.seatHands).toEqual({});
  });

  it('builds plot rules using the exact tragedy set instead of global first-match lookup', () => {
    const basicRules = buildActiveRules('basic_tragedy', ['sign_with_me'], {}, []);
    const revisedRules = buildActiveRules('another_horizon_revised', ['sign_with_me'], {}, []);

    expect(basicRules.some(rule => rule.ruleId === 'sign_with_me_loop_end_loss')).toBe(true);
    expect(basicRules.some(rule => rule.ruleId === 'ahr_sign_with_me_loop_end_loss')).toBe(false);
    expect(revisedRules.some(rule => rule.ruleId === 'ahr_sign_with_me_loop_end_loss')).toBe(true);
    expect(revisedRules.some(rule => rule.ruleId === 'sign_with_me_loop_end_loss')).toBe(false);
  });

  it('clears stale pending incident state before rebuilding the incidents phase queue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.v1.pendingIncidents = [{
      id: 'stale_incident',
      day: 9,
      incidentId: 'murder',
      culpritId: 'ghost',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [{
      id: 'butterfly:character:doctor',
      kind: 'butterfly_choice',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: 'doctor',
      targetId: 'doctor',
      targetKind: 'character',
      allowedTokens: ['goodwill'],
      description: '蝴蝶效应三选一',
    }];
    G.v1.activeInteractionId = 'butterfly:character:doctor';

    (phases as any).incidents.onBegin({ G, events: { endPhase: vi.fn(), setPhase: vi.fn() } });

    expect(G.v1.pendingIncidents).toEqual([]);
    expect(G.v1.pendingInteractions).toEqual([]);
    expect(G.v1.activeInteractionId).toBeNull();
  });

  it('builds unique pending incident ids for duplicate incidents on the same day', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      culprit_a: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      culprit_b: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'murder' },
      { day: 1, incidentId: 'murder' },
    ];
    G.v1.incidentCulprits = {
      '1_murder': 'culprit_a',
      '1_murder_1': 'culprit_b',
    };

    (phases as any).incidents.onBegin({ G, events: { endPhase: vi.fn(), setPhase: vi.fn() } });

    expect(G.v1.pendingIncidents.map(inc => inc.id)).toEqual(['1_murder', '1_murder_1']);
    expect(G.v1.pendingIncidents.map(inc => inc.culpritId)).toEqual(['culprit_a', 'culprit_b']);
  });

  it('resets interaction state when auto-resolving mastermind and goodwill windows', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = true;
    G.v1.pendingAbilities = [{
      id: 'stale_ability',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: 'stale',
      targetSlots: [],
    }];
    G.v1.abilityPhase = 'mandatory';
    G.v1.goodwillInteraction = {
      phase: 'mastermind_resolving',
      eligibleAbilities: [{ characterId: 'doctor', abilityId: 'goodwill', label: 'stale', used: false }],
      currentDeclaration: { characterId: 'doctor', abilityId: 'goodwill' },
    };

    (phases as any).mastermind_abilities.onBegin({ G, events: { endPhase: vi.fn() } });
    expect(G.v1.pendingAbilities).toEqual([]);
    expect(G.v1.abilityPhase).toBe('done');

    (phases as any).goodwill_window.onBegin({ G, events: { endPhase: vi.fn() } });
    expect(G.v1.goodwillInteraction.phase).toBe('done');
    expect(G.v1.goodwillInteraction.eligibleAbilities).toEqual([]);
    expect(G.v1.goodwillInteraction.currentDeclaration).toBeNull();
  });

  it('keeps leaderSeat synchronized with the active leader during day rotation', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.day = 1;
    G.daysPerLoop = 6;
    G.v1.leader = '2';
    G.leaderSeat = '2';

    (phases as any).day_end.onBegin({ G, events: { endPhase: vi.fn(), setPhase: vi.fn() } });

    expect(G.v1.leader).toBe('3');
    expect(G.leaderSeat).toBe('3');
  });

  it('supports AHR butterfly effect choosing a location target before token type', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.pendingIncidents = [{
      id: '1_butterfly_effect',
      day: 1,
      incidentId: 'butterfly_effect',
      culpritId: 'culprit',
      targetSlots: [{
        slotId: 'target',
        label: '受影响目标',
        kind: 'character_or_location',
        eligibleCharacterIds: ['culprit', 'witness'],
        eligibleLocationIds: ['city'],
      }],
    }];

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_butterfly_effect',
      true,
      { target: 'city' },
    );

    expect(G.v1.pendingIncidents).toHaveLength(0);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'butterfly:location:city',
        kind: 'butterfly_choice',
        targetId: 'city',
        targetKind: 'location',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
      }),
    ]);
    expect(events.endPhase).not.toHaveBeenCalled();

    (moves.chooseButterflyToken as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'goodwill',
    );

    expect(getToken(G.v1.locations.city, 'goodwill')).toBe(1);
    expect(G.v1.pendingInteractions).toEqual([]);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('resolves pending incident by custom pendingIncidents.id', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.pendingIncidents = [{
      id: 'custom-incident-id-001',
      day: 1,
      incidentId: 'butterfly_effect',
      culpritId: 'culprit',
      targetSlots: [{
        slotId: 'target',
        label: '受影响目标',
        kind: 'character_or_location',
        eligibleCharacterIds: ['culprit', 'witness'],
        eligibleLocationIds: ['city'],
      }],
    }];

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'custom-incident-id-001',
      true,
      { target: 'city' },
    );

    expect(G.v1.pendingIncidents).toHaveLength(0);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'butterfly:location:city',
        kind: 'butterfly_choice',
        targetId: 'city',
        targetKind: 'location',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
      }),
    ]);
  });

  it('resolves incidents from the runtime interaction payload when legacy pendingIncidents conflicts', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.pendingIncidents = [{
      id: 'runtime-first-incident',
      day: 1,
      incidentId: 'butterfly_effect',
      culpritId: 'culprit',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [{
      id: 'incident:runtime-first-incident',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: 'runtime-first-incident',
      day: 1,
      incidentId: 'butterfly_effect',
      culpritId: 'culprit',
      description: '事件裁定：butterfly_effect',
      targetSlots: [{
        slotId: 'target',
        label: '受影响目标',
        kind: 'character_or_location',
        eligibleCharacterIds: ['culprit', 'witness'],
        eligibleLocationIds: ['city'],
      }],
    }];
    G.v1.activeInteractionId = 'incident:runtime-first-incident';

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const result = (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'runtime-first-incident',
      true,
      { target: 'city' },
    );

    expect(result).toBeUndefined();
    expect(G.v1.pendingIncidents).toEqual([]);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        id: 'butterfly:location:city',
        kind: 'butterfly_choice',
        targetId: 'city',
        targetKind: 'location',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
      }),
    ]);
    expect(G.v1.activeInteractionId).toBe('butterfly:location:city');
  });

  it('accepts incident token_type target when selection is whitelisted', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.pendingIncidents = [{
      id: 'token-slot-incident',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      targetSlots: [{
        slotId: 'tokenType',
        label: '选择指示物',
        kind: 'token_type',
        eligibleTokenTypes: ['paranoia', 'intrigue'],
      }],
    }];

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'token-slot-incident',
      true,
      { tokenType: 'paranoia' },
    );

    expect(G.v1.pendingIncidents).toHaveLength(0);
    expect(G.v1.loopState.triggeredIncidents).toContain(1);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('allows non-triggered incident with targetSlots without selecting targets', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.pendingIncidents = [{
      id: 'non-triggered-with-target-slots',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      targetSlots: [{
        slotId: 'target',
        label: '被害者',
        kind: 'character',
        eligibleCharacterIds: ['witness'],
      }],
    }];

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'non-triggered-with-target-slots',
      false,
    );

    expect(G.v1.pendingIncidents).toHaveLength(0);
    expect(G.v1.loopState.triggeredIncidents).not.toContain(1);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('rejects incident token_type target when selection is not whitelisted', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.pendingIncidents = [{
      id: 'token-slot-incident-invalid',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      targetSlots: [{
        slotId: 'tokenType',
        label: '选择指示物',
        kind: 'token_type',
        eligibleTokenTypes: ['paranoia', 'intrigue'],
      }],
    }];

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const result = (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'token-slot-incident-invalid',
      true,
      { tokenType: 'goodwill' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.pendingIncidents).toHaveLength(1);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('buildActiveRules uses exact set role definitions when setId is provided', () => {
    const rules = buildActiveRules('midnight_zone', [], { x: 'cultist' }, []);
    expect(rules.some(rule => rule.ruleId === 'mz_cultist_ignore_forbid_intrigue')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'cultist_ignore_forbid_intrigue')).toBe(false);
  });

  it('buildActiveRules uses exact set incident definitions when setId is provided', () => {
    const rules = buildActiveRules('another_horizon_revised', [], {}, [{ day: 1, incidentId: 'butterfly_effect' }]);
    expect(rules.some(rule => rule.ruleId === 'ahr_incident_butterfly_effect')).toBe(true);
    expect(rules.some(rule => rule.ruleId === 'btx_incident_butterfly_effect')).toBe(false);
  });

  it('keeps AHR-tagged scripts on another_horizon_revised after reclassification fix', () => {
    for (const scriptId of ['AHR-01', 'AHR-02', 'AHR-03', 'AHR-04', 'AHR-05', 'AHR-E08']) {
      const entry = getScriptById(scriptId);
      expect(entry).toBeTruthy();
      expect(entry!.def.tragedySetId).toBe('another_horizon_revised');
    }
  });

  it('marks all LL scripts playable after incident/factor aliases are registered', () => {
    const llScripts = getScriptsByModule('last_liar');
    expect(llScripts.length).toBeGreaterThan(0);
    const unplayable = llScripts.filter(s => !getScriptPlayability(s.id).playable);
    expect(unplayable).toHaveLength(0);
  });

  it('marks all WM scripts playable after hospital/missing/increasing aliases are registered', () => {
    const wmScripts = getScriptsByModule('weird_mythology');
    expect(wmScripts.length).toBeGreaterThan(0);
    const unplayable = wmScripts.filter(s => !getScriptPlayability(s.id).playable);
    if (unplayable.length > 0) {
      const details = unplayable.map(s => ({ id: s.id, missing: getScriptPlayability(s.id).missing }));
      throw new Error(`Unplayable WM scripts missing rules: ${JSON.stringify(details, null, 2)}`);
    }
    expect(unplayable).toHaveLength(0);
  });

  it('marks all MC scripts playable after poisoner Phase D processors are implemented', () => {
    const mcScripts = getScriptsByModule('mystery_circle');
    expect(mcScripts.length).toBeGreaterThan(0);
    const playable = mcScripts.filter(s => getScriptPlayability(s.id).playable);
    expect(playable.length).toBe(mcScripts.length);
  });

  it('marks all HSA scripts playable after role/incident/plot processors', () => {
    const hsaScripts = getScriptsByModule('haunted_stage_again');
    expect(hsaScripts.length).toBeGreaterThan(0);
    const playable = hsaScripts.filter(s => getScriptPlayability(s.id).playable);
    expect(playable.length).toBe(hsaScripts.length);
  });

  it('marks all BTX scripts playable after time traveler alias coverage is aligned', () => {
    const btxScripts = getScriptsByModule('basic_tragedy');
    expect(btxScripts.length).toBeGreaterThan(0);
    const playable = btxScripts.filter(s => getScriptPlayability(s.id).playable);
    expect(playable.length).toBe(btxScripts.length);
  });

  it('keeps Ex runtime on revised sets while disabling it for remapped AH imports', () => {
    const ahrScript = getScriptById('AHR-01');
    expect(ahrScript).toBeTruthy();

    const G1 = TragedyLooper.setup!({} as any) as TragedyGameState;
    configureExForSet(G1, 'mystery_circle');
    expect(G1.v1.ex.enabled).toBe(true);
    expect(G1.v1.ex.gauge).toBe(0);

    const G3 = TragedyLooper.setup!({} as any) as TragedyGameState;
    configureExForSet(G3, 'weird_mythology');
    expect(G3.v1.ex.enabled).toBe(true);
    expect(G3.v1.ex.gauge).toBe(0);

    expect(ahrScript!.def.tragedySetId).toBe('another_horizon_revised');

    const G2 = TragedyLooper.setup!({} as any) as TragedyGameState;
    configureExForSet(G2, ahrScript!.def.tragedySetId);
    expect(G2.v1.ex.enabled).toBe(true);
    expect(G2.v1.ex.gauge).toBe(0);

    const G4 = TragedyLooper.setup!({} as any) as TragedyGameState;
    configureExForSet(G4, 'another_horizon_revised');
    expect(G4.v1.ex.enabled).toBe(true);
    expect(G4.v1.ex.gauge).toBe(0);
  });

  it('applies AHR bizarre_murder incident Ex deltas once AHR runtime is enabled', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;

    const delta = applyIncidentExDelta(G, 'bizarre_murder');

    expect(delta).toBe(2);
    expect(G.v1.ex.gauge).toBe(2);
    expect(G.v1.ex.changedThisLoop).toBe(true);
  });

  it('flags AHR a_long_night scripts that fix the loop count to 4', () => {
    const issues = getScriptValidationIssues({
      title: 'invalid ahr long night',
      tragedySetId: 'another_horizon_revised',
      loops: 4,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'a_long_night',
      subplotIds: [],
      cast: [],
      incidents: [],
    });

    expect(issues).toContain('ahr_a_long_night_generation_rule');
  });

  it('flags AHR a_long_night scripts whose loop options still include 4', () => {
    const issues = getScriptValidationIssues({
      title: 'invalid ahr long night options',
      tragedySetId: 'another_horizon_revised',
      loops: { recommended: 3, options: [3, 4, 5] },
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'a_long_night',
      subplotIds: [],
      cast: [],
      incidents: [],
    } as any);

    expect(issues).toContain('ahr_a_long_night_generation_rule');
  });

  it('allows AHR a_long_night scripts when loop 4 is excluded from the choices', () => {
    const issues = getScriptValidationIssues({
      title: 'valid ahr long night options',
      tragedySetId: 'another_horizon_revised',
      loops: { recommended: 3, options: [3, 5] },
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'a_long_night',
      subplotIds: [],
      cast: [],
      incidents: [],
    } as any);

    expect(issues).toEqual([]);
  });

  it('flags AHR hidden_world scripts without enough non-vampire monsters', () => {
    const issues = getScriptValidationIssues({
      title: 'invalid ahr hidden world',
      tragedySetId: 'another_horizon_revised',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'hidden_world',
      subplotIds: ['thread_of_the_end', 'black_school'],
      cast: [
        { characterId: 'doctor', roleId: 'vampire' },
        { characterId: 'patient', roleId: 'untouchable' },
        { characterId: 'journalist', roleId: 'time_traveler' },
      ],
      incidents: [],
    } as any);

    expect(issues).toContain('ahr_hidden_world_setup');
  });

  it('allows AHR hidden_world scripts to use one non-vampire monster with secret_magician', () => {
    const issues = getScriptValidationIssues({
      title: 'valid ahr hidden world',
      tragedySetId: 'another_horizon_revised',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'hidden_world',
      subplotIds: ['secret_magician', 'thread_of_the_end'],
      cast: [
        { characterId: 'black_cat', roleId: 'black_cat' },
        { characterId: 'doctor', roleId: 'magician' },
        { characterId: 'patient', roleId: 'untouchable' },
      ],
      incidents: [],
    } as any);

    expect(issues).toEqual([]);
  });

  it('applies MC incident Ex deltas and snapshots loop-end gauge', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
    };

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    G.v1.pendingIncidents = [{ id: '1_faked_suicide', day: 1, incidentId: 'faked_suicide', culpritId: 'culprit', targetSlots: [] }];
    (moves.resolveIncident as any)({ G, ctx: { phase: 'incidents' }, events, playerID: '0' }, '1_faked_suicide', true, {});
    expect(G.v1.ex.gauge).toBe(1);
    expect(G.v1.ex.changedThisLoop).toBe(true);

    applyIncidentExDelta(G, 'bizarre_murder');
    expect(G.v1.ex.gauge).toBe(3);

    applyIncidentExDelta(G, 'silver_bullet');
    expect(G.v1.ex.gauge).toBe(3);

    (phases.loop_end_check.onBegin as any)({ G, events });
    expect(G.v1.ex.lastLoopEndGauge).toBe(3);
  });

  it('blocks protagonist targeting Ex-marked character and clears on loop start', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
    };
    G.seatHands['1'] = ['protagonist_unease_plus_1'];

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    G.v1.pendingIncidents = [{ id: '1_faked_suicide', day: 1, incidentId: 'faked_suicide', culpritId: 'culprit', targetSlots: [] }];
    (moves.resolveIncident as any)({ G, ctx: { phase: 'incidents' }, events, playerID: '0' }, '1_faked_suicide', true, {});
    expect(G.v1.characters.culprit.exCardCount).toBe(1);

    const blocked = validatePlayCard(G, '1', 'protagonist_unease_plus_1', 'character', 'culprit', 'protagonist_plan');
    expect(blocked.ok).toBe(false);

    (phases.loop_setup.onBegin as any)({ G, events });
    expect(G.v1.ex.gauge).toBe(0);
    expect(G.v1.ex.changedThisLoop).toBe(false);
    expect(G.v1.characters.culprit.exCardCount).toBe(0);

    const allowedAfterReset = validatePlayCard(G, '1', 'protagonist_unease_plus_1', 'character', 'culprit', 'protagonist_plan');
    expect(allowedAfterReset.ok).toBe(true);
  });

  it('blocks the mastermind from playing an action card onto an AHR illusion', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.seatHands['0'] = ['mastermind_intrigue_plus_1'];
    G.v1.characters = {
      illusion: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      illusion: 'illusion',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['tragedy_of_reincarnation'],
      G.v1.hiddenRoles,
      [],
    );

    const blocked = validatePlayCard(
      G,
      '0',
      'mastermind_intrigue_plus_1',
      'character',
      'illusion',
      'mastermind_plan',
    );

    expect(blocked.ok).toBe(false);
  });

  it('blocks the mastermind from playing an action card onto a current AHR back-world illusion', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex.gauge = 1;
    G.seatHands['0'] = ['mastermind_intrigue_plus_1'];
    G.v1.characters = {
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      target: 'obsessive',
    };
    G.v1.ahrVariableRoles = {
      target: { frontRoleId: 'obsessive', backRoleId: 'illusion' },
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['tragedy_of_reincarnation'],
      G.v1.hiddenRoles,
      [],
      G.v1.ahrVariableRoles,
    );

    const blocked = validatePlayCard(
      G,
      '0',
      'mastermind_intrigue_plus_1',
      'character',
      'target',
      'mastermind_plan',
    );

    expect(blocked.ok).toBe(false);
  });

  it('filters AHR illusions out of mastermind ability target slots', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      brain: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      illusion: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      illusion: 'illusion',
    };
    G.v1.activeRuleDefinitions = [
      {
        ruleId: 'brain_intrigue_ability',
        timing: 'mastermind_ability',
        mandatory: false,
        characterId: 'brain',
        source: 'role:brain',
      },
      {
        ruleId: 'ahr_illusion_unease_limit',
        timing: 'always',
        mandatory: true,
        characterId: 'illusion',
        source: 'role:illusion',
      },
    ];

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const slot = G.v1.pendingAbilities[0]?.targetSlots?.[0];
    expect(slot?.eligibleCharacterIds).toContain('witness');
    expect(slot?.eligibleCharacterIds).not.toContain('illusion');
  });

  it('filters current AHR back-world illusions out of mastermind ability target slots', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex.gauge = 1;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      brain: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      brain: 'brain',
      target: 'obsessive',
    };
    G.v1.ahrVariableRoles = {
      target: { frontRoleId: 'obsessive', backRoleId: 'illusion' },
    };
    G.v1.activeRuleDefinitions = [
      {
        ruleId: 'brain_intrigue_ability',
        timing: 'mastermind_ability',
        mandatory: false,
        characterId: 'brain',
        source: 'role:brain',
      },
      {
        ruleId: 'ahr_illusion_unease_limit',
        timing: 'always',
        mandatory: true,
        characterId: 'target',
        source: 'role:illusion',
      },
    ];

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    const slot = G.v1.pendingAbilities[0]?.targetSlots?.[0];
    expect(slot?.eligibleCharacterIds).toContain('witness');
    expect(slot?.eligibleCharacterIds).not.toContain('target');
  });

  it('prevalidates incident definition and processor before mutating Ex state', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
    };

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    G.v1.pendingIncidents = [{
      id: '1_unknown',
      day: 1,
      incidentId: 'unknown_incident',
      culpritId: 'culprit',
      targetSlots: [],
    }];
    const resultMissingDef = (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_unknown',
      true,
      {},
    );
    expect(resultMissingDef).toBe(INVALID_MOVE);
    expect(G.v1.ex.gauge).toBe(0);
    expect(G.v1.loopState.triggeredIncidents).toHaveLength(0);
    expect(G.v1.loopState.incidentHistory).toHaveLength(0);
    expect(G.v1.pendingIncidents).toHaveLength(1);

    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.pendingIncidents = [{
      id: '1_nonexistent_mz_incident',
      day: 1,
      incidentId: 'nonexistent_mz_incident',
      culpritId: 'culprit',
      targetSlots: [],
    }];
    const resultMissingProcessor = (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_nonexistent_mz_incident',
      true,
      {},
    );
    expect(resultMissingProcessor).toBe(INVALID_MOVE);
    expect(G.v1.ex.gauge).toBe(0);
    expect(G.v1.loopState.triggeredIncidents).toHaveLength(0);
    expect(G.v1.loopState.incidentHistory).toHaveLength(0);
    expect(G.v1.pendingIncidents).toHaveLength(1);
  });

  it('keeps Ex and Ex cards visible in protagonist playerView', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.ex = {
      enabled: true,
      gauge: 2,
      changedThisLoop: true,
      lastLoopEndGauge: 1,
    };
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
        exCardCount: 1,
      },
    };

    const protagonistView = (TragedyLooper.playerView as any)({ G, playerID: '1' }) as TragedyGameState;
    expect(protagonistView.v1.ex).toEqual(G.v1.ex);
    expect(protagonistView.v1.characters.culprit.exCardCount).toBe(1);
  });

  it('applies MC non-poisoner Ex plot and role processors', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.loopIndex = 1;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      psychiatrist: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      patient: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 1 } },
    };
    G.v1.hiddenRoles = {
      psychiatrist: 'psychiatrist',
    };
    G.v1.activeRuleDefinitions = [
      { ruleId: 'panic_in_ward_loop_start', timing: 'loop_start', mandatory: true, source: 'plot:panic_in_ward' },
      { ruleId: 'mc_psychiatrist_heal', timing: 'mastermind_ability', mandatory: true, characterId: 'psychiatrist', source: 'role:psychiatrist' },
    ];

    G.v1.ex.lastLoopEndGauge = 2;
    autoResolve(G, 'loop_start');
    expect(G.v1.ex.gauge).toBe(1);

    autoResolve(G, 'mastermind_ability');
    expect(getToken(G.v1.characters.patient, 'paranoia')).toBe(0);

    G.v1.activeRuleDefinitions = [
      { ruleId: 'spiderweb_of_incidents_loop_end_loss', timing: 'loop_end', mandatory: true, source: 'plot:spiderweb_of_incidents' },
    ];
    G.v1.loopLost = false;
    G.v1.ex.gauge = 3;
    autoResolve(G, 'loop_end');
    expect(G.v1.loopLost).toBe(true);

    G.v1.activeRuleDefinitions = [
      { ruleId: 'plan_on_a_tightrope_loop_end_loss', timing: 'loop_end', mandatory: true, source: 'plot:plan_on_a_tightrope' },
    ];
    G.v1.loopLost = false;
    G.v1.ex.gauge = 1;
    autoResolve(G, 'loop_end');
    expect(G.v1.loopLost).toBe(true);
  });

  it('applies MC poisoner day_end rules with FAQ timing boundaries', () => {
    const G1 = TragedyLooper.setup!({} as any) as TragedyGameState;
    G1.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G1.v1.ex.enabled = true;
    G1.v1.ex.gauge = 2;
    G1.v1.characters = {
      poisoner: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      serial: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      civilian: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G1.v1.hiddenRoles = {
      poisoner: 'poisoner',
      serial: 'serial_killer',
    };
    G1.v1.activeRuleDefinitions = [
      { ruleId: 'mc_poisoner_kill', timing: 'day_end', mandatory: true, characterId: 'poisoner', source: 'role:poisoner' },
      { ruleId: 'serial_killer_day_end_kill', timing: 'day_end', mandatory: true, characterId: 'serial', source: 'role:serial_killer' },
    ];

    autoResolve(G1, 'day_end');

    const deadCountG1 = Object.values(G1.v1.characters).filter(c => !c.alive).length;
    expect(deadCountG1).toBe(1);
    expect(G1.fullLog.some(line => line.includes('serial_killer_day_end_kill'))).toBe(false);

    const G2 = TragedyLooper.setup!({} as any) as TragedyGameState;
    G2.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G2.v1.ex.enabled = true;
    G2.v1.ex.gauge = 2;
    G2.v1.characters = {
      poisoner: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      serial: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G2.v1.hiddenRoles = {
      poisoner: 'poisoner',
      serial: 'serial_killer',
    };
    G2.v1.activeRuleDefinitions = [
      { ruleId: 'mc_poisoner_kill', timing: 'day_end', mandatory: true, characterId: 'poisoner', source: 'role:poisoner' },
      { ruleId: 'serial_killer_day_end_kill', timing: 'day_end', mandatory: true, characterId: 'serial', source: 'role:serial_killer' },
    ];

    autoResolve(G2, 'day_end');

    expect(G2.v1.characters.poisoner.alive).toBe(false);
    expect(G2.v1.characters.serial.alive).toBe(false);
  });

  it('applies the FS FAQ timing where two serial killers alone both die at day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'first_steps' } as any;
    G.v1.characters = {
      serialA: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      serialB: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      serialA: 'serial_killer',
      serialB: 'serial_killer',
    };
    G.v1.activeRuleDefinitions = [
      { ruleId: 'serial_killer_day_end_kill', timing: 'day_end', mandatory: true, characterId: 'serialA', source: 'role:serial_killer' },
      { ruleId: 'serial_killer_day_end_kill', timing: 'day_end', mandatory: true, characterId: 'serialB', source: 'role:serial_killer' },
    ];

    autoResolve(G, 'day_end');

    expect(G.v1.characters.serialA.alive).toBe(false);
    expect(G.v1.characters.serialB.alive).toBe(false);
  });

  it('keeps day_end mandatory abilities in an explicit queue instead of resolving them on phase entry', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.settings.autoResolve = true;
    G.day = 1;
    G.daysPerLoop = 7;
    G.v1.characters = {
      serial: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victim: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      serial: 'serial_killer',
    };
    G.v1.activeRuleDefinitions = [
      { ruleId: 'serial_killer_day_end_kill', timing: 'day_end', mandatory: true, characterId: 'serial', source: 'role:serial_killer' },
    ];

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.characters.victim.alive).toBe(true);
    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'serial_killer_day_end_kill',
        timing: 'day_end',
        phase: 'day_end',
        mandatory: true,
      }),
    ]);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({
        kind: 'mastermind_ability',
        phase: 'day_end',
        ruleId: 'serial_killer_day_end_kill',
      }),
    ]);
  });

  it('keeps all FS scripts auto-playable after the FAQ depth audit baseline', () => {
    const fsScripts = getScriptsByModule('first_steps');
    expect(fsScripts.length).toBe(35);
    expect(fsScripts.every(script => getScriptPlayability(script.id).playable)).toBe(true);
  });

  it('applies threads_of_fate only to characters present at loop start, except fantasy retaining tokens off-board', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      transfer_student: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      temp_worker: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      fantasy: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.loopState.lastLoopGoodwillChars = [
      'transfer_student',
      'temp_worker',
      'fantasy',
      'office_worker',
    ];
    G.v1.loopState.abilityUsage.__removed_from_board_transfer_student = {
      usedToday: false,
      usedThisLoop: true,
    };
    G.v1.loopState.abilityUsage.__removed_from_board_temp_worker = {
      usedToday: false,
      usedThisLoop: true,
    };
    G.v1.loopState.abilityUsage.__removed_from_board_fantasy = {
      usedToday: false,
      usedThisLoop: true,
    };

    const processor = getProcessor('threads_of_fate_loop_start_rule');
    expect(processor).toBeTruthy();

    processor!.execute({ G, timing: 'loop_start' });

    expect(getToken(G.v1.characters.transfer_student, 'paranoia')).toBe(0);
    expect(getToken(G.v1.characters.temp_worker, 'paranoia')).toBe(0);
    expect(getToken(G.v1.characters.fantasy, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.office_worker, 'paranoia')).toBe(2);
  });

  it('does not retroactively apply factor city loss after the factor was already dead', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      factor: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { factor: 'factor' };
    G.v1.locations = {
      city: { tokens: { ...createEmptyTokenBag(), intrigue: 1 } },
      school: { tokens: createEmptyTokenBag() },
    } as any;

    const processor = getProcessor('factor_city_key_person');
    expect(processor).toBeTruthy();

    const beforeCityHitsTwo = processor!.check({
      G,
      timing: 'always',
      characterId: 'factor',
    });
    expect(beforeCityHitsTwo.triggered).toBe(false);

    G.v1.locations.city.tokens = { ...createEmptyTokenBag(), intrigue: 2 };

    const afterCityHitsTwo = processor!.check({
      G,
      timing: 'always',
      characterId: 'factor',
    });
    expect(afterCityHitsTwo.triggered).toBe(false);
  });

  it('applies paranoia_virus before BTX day_end and rebuilds dynamic serial killer rules', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.activePlots = ['paranoia_virus'];
    G.v1.characters = {
      civilian: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      witness: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {};
    G.v1.activeRuleDefinitions = buildActiveRules(
      'basic_tragedy',
      G.v1.activePlots,
      G.v1.hiddenRoles,
      [],
    );

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.hiddenRoles.civilian).toBe('serial_killer');
    expect(
      G.v1.activeRuleDefinitions.some(
        rule => rule.ruleId === 'serial_killer_day_end_kill' && rule.characterId === 'civilian',
      ),
    ).toBe(true);
    expect(G.v1.characters.witness.alive).toBe(true);
    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'serial_killer_day_end_kill',
        characterId: 'civilian',
        timing: 'day_end',
        phase: 'day_end',
      }),
    ]);
  });

  it('keeps sign_with_me scoped to the true key person instead of factor city borrow semantics', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      factor: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 2 },
      },
    };
    G.v1.hiddenRoles = {
      factor: 'factor',
    };
    G.v1.activeRuleDefinitions = [
      {
        ruleId: 'sign_with_me_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        source: 'plot:sign_with_me',
      },
    ];

    autoResolve(G, 'loop_end');

    expect(G.v1.loopLost).toBe(false);
  });

  it('treats factor school as borrowing the conspiracy theorist ability in mastermind_abilities', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      factor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      factor: 'factor',
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    } as any;
    G.v1.activeRuleDefinitions = buildActiveRules(
      'basic_tragedy',
      ['unknown_factor_x'],
      G.v1.hiddenRoles,
      [],
    );

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'conspiracy_theorist_unease_ability',
        characterId: 'factor',
        mandatory: false,
      }),
    ]);
  });

  it('triggers the BTX time traveler loss only on end_of_last_day, not on earlier day_end windows', () => {
    const buildTravelerState = (day: number) => {
      const G = TragedyLooper.setup!({} as any) as TragedyGameState;
      G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
      G.v1.settings.autoResolve = true;
      G.daysPerLoop = 3;
      G.day = day;
      G.v1.characters = {
        traveler: {
          locationId: 'city',
          alive: true,
          tokens: { ...createEmptyTokenBag(), goodwill: 2 },
        },
      };
      G.v1.hiddenRoles = { traveler: 'time_traveler' };
      G.v1.activeRuleDefinitions = buildActiveRules(
        'basic_tragedy',
        ['change_of_future'],
        G.v1.hiddenRoles,
        [],
      );
      return G;
    };

    const nonFinal = buildTravelerState(2);
    (phases.day_end.onBegin as any)({
      G: nonFinal,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });
    (phases.day_end.onEnd as any)({
      G: nonFinal,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });
    expect(nonFinal.v1.loopLost).toBe(false);

    const finalDay = buildTravelerState(3);
    (phases.day_end.onBegin as any)({
      G: finalDay,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });
    (phases.day_end.onEnd as any)({
      G: finalDay,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });
    expect(finalDay.v1.loopLost).toBe(true);
  });

  it('keeps the AHR AI alive when a serial killer attacks during day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      ai: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      killer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      ai: 'ai',
      killer: 'serial_killer',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['thread_of_the_end', 'the_hidden_freak'],
      G.v1.hiddenRoles,
      [],
    );

    autoResolve(G, 'day_end');

    expect(G.v1.characters.ai.alive).toBe(true);
    expect(G.fullLog.some(line => line.includes('不死'))).toBe(true);
  });

  it('queues the AHR untouchable mandatory unease ability in mastermind_abilities', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      untouchable: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      untouchable: 'untouchable',
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['thread_of_the_end'],
      G.v1.hiddenRoles,
      [],
    );

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_untouchable_add_unease',
        characterId: 'untouchable',
        mandatory: true,
      }),
    ]);
  });

  it('treats the AHR untouchable as must_reject for goodwill resolution', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.hiddenRoles = {
      untouchable: 'untouchable',
    };

    expect(getGoodwillTrait(G, 'untouchable')).toBe('must_reject');
  });

  it('kills an AHR illusion when resolve_cards pushes paranoia to 3', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      illusion: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    G.v1.hiddenRoles = {
      illusion: 'illusion',
    };
    G.v1.playedCards = [{
      id: 'pc1',
      cardTemplateId: 'protagonist_unease_plus_1',
      owner: 'protagonist',
      targetType: 'character',
      targetId: 'illusion',
      faceUp: false,
      playedBySeat: '1',
      playedByColor: 'blue',
    }];

    (phases.resolve_cards.onBegin as any)({ G });

    expect(getToken(G.v1.characters.illusion, 'paranoia')).toBe(3);
    expect(G.v1.characters.illusion.alive).toBe(false);
  });

  it('kills an AHR illusion when a goodwill ability pushes paranoia to 3', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      journalist: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      illusion: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    G.v1.hiddenRoles = {
      illusion: 'illusion',
    };

    executeGoodwillAbility(G, 'journalist', 'journalist_gw2_paranoia');

    expect(getToken(G.v1.characters.illusion, 'paranoia')).toBe(3);
    expect(G.v1.characters.illusion.alive).toBe(false);
  });

  it('kills an AHR illusion when the mastermind manually adds the third paranoia token', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      illusion: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    G.v1.hiddenRoles = {
      illusion: 'illusion',
    };

    (moves.modifyToken as any)(
      { G, playerID: '0' },
      'illusion',
      'paranoia',
      1,
    );

    expect(getToken(G.v1.characters.illusion, 'paranoia')).toBe(3);
    expect(G.v1.characters.illusion.alive).toBe(false);
  });

  it('queues and resolves the AHR magician teleport once per loop', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      magician: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 1 } },
    };
    G.v1.hiddenRoles = {
      magician: 'magician',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['secret_magician'],
      G.v1.hiddenRoles,
      [],
    );

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'ahr_magician_teleport',
        characterId: 'magician',
        mandatory: false,
      }),
    ]);
    expect(G.v1.pendingAbilities[0]?.targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: ['target'],
      }),
      expect.objectContaining({
        slotId: 'location',
        eligibleLocationIds: expect.arrayContaining(['hospital', 'school']),
      }),
    ]);

    (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events: { endPhase: vi.fn() }, playerID: '0' },
      G.v1.pendingAbilities[0].id,
      { target: 'target', location: 'school' },
    );

    expect(G.v1.characters.target.locationId).toBe('school');
    expect(G.v1.loopState.abilityUsage.ahr_magician_teleport?.usedThisLoop).toBe(true);

    (phases.mastermind_abilities.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });
    expect(G.v1.pendingAbilities).toEqual([]);
  });

  it('applies the AHR time traveler forbid-goodwill immunity during card_resolve', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      traveler: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      traveler: 'time_traveler',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['change_of_future'],
      G.v1.hiddenRoles,
      [],
    );

    autoResolve(G, 'card_resolve');

    expect(G.v1.cardResolveImmunities).toContainEqual({
      characterId: 'traveler',
      immuneToForbid: 'forbid_goodwill',
    });
  });

  it('keeps the AHR black cat alive when a serial killer attacks during day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      cat: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      killer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      cat: 'black_cat',
      killer: 'serial_killer',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['secret_magician', 'the_hidden_freak'],
      G.v1.hiddenRoles,
      [],
    );

    autoResolve(G, 'day_end');

    expect(G.v1.characters.cat.alive).toBe(true);
    expect(G.fullLog.some(line => line.includes('不死'))).toBe(true);
  });

  it('triggers thread_of_the_end loss when the AHR AI is already dead at day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      ai: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      ai: 'ai',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['thread_of_the_end'],
      G.v1.hiddenRoles,
      [],
    );

    autoResolve(G, 'day_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('triggers black_school loss when school intrigue reaches loopIndex - 1', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = true;
    G.loopIndex = 1;
    G.v1.locations = {
      school: { tokens: { ...createEmptyTokenBag(), intrigue: 1 } },
    } as any;
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['black_school'],
      {},
      [],
    );

    autoResolve(G, 'loop_end');

    expect(G.v1.loopLost).toBe(true);
  });

  it('lets the AHR vampire kill a colocated key person with 2 intrigue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      vampire: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      key: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    };
    G.v1.hiddenRoles = {
      vampire: 'vampire',
      key: 'key_person',
    };

    const processor = getProcessor('ahr_vampire_kill_key_person');
    expect(processor).toBeTruthy();

    const check = processor!.check({
      G,
      timing: 'day_end',
      characterId: 'vampire',
    });
    expect(check.triggered).toBe(true);

    processor!.execute({
      G,
      timing: 'day_end',
      characterId: 'vampire',
    });

    expect(G.v1.characters.key.alive).toBe(false);
  });

  it('uses the current AHR effective role for vampire day-end kills in the back world', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    configureExForSet(G, 'another_horizon_revised');
    G.v1.ex.gauge = 1;
    G.v1.characters = {
      vampire: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    };
    G.v1.hiddenRoles = {
      vampire: 'vampire',
      target: 'obsessive',
    };
    G.v1.ahrVariableRoles = {
      target: { frontRoleId: 'obsessive', backRoleId: 'key_person' },
    };

    const processor = getProcessor('ahr_vampire_kill_key_person');
    expect(processor).toBeTruthy();

    const check = processor!.check({
      G,
      timing: 'day_end',
      characterId: 'vampire',
    });
    expect(check.triggered).toBe(true);

    processor!.execute({
      G,
      timing: 'day_end',
      characterId: 'vampire',
    });

    expect(G.v1.characters.target.alive).toBe(false);
  });

  it('treats the AHR vampire as must_reject for goodwill resolution', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.hiddenRoles = { vampire: 'vampire' };

    expect(getGoodwillTrait(G, 'vampire')).toBe('must_reject');
  });

  it('forces system_error through machine_heart when the culprit is untouchable', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      untouchable: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      untouchable: 'untouchable',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['machine_heart'],
      G.v1.hiddenRoles,
      [{ day: 1, incidentId: 'system_error' }],
    );

    resolveTimingWindow(G, 'incident_resolve', {
      day: 1,
      incidentId: 'system_error',
      culpritId: 'untouchable',
    });

    expect(G.v1.characters.untouchable.alive).toBe(false);
  });

  it('treats machine_heart untouchable system_error as triggered in the auto incident pipeline', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      untouchable: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      untouchable: 'untouchable',
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'system_error' }];
    G.v1.incidentCulprits = { '1_system_error': 'untouchable' };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['machine_heart'],
      G.v1.hiddenRoles,
      G.v1.scheduledIncidents,
    );

    const triggerStatus = getIncidentTriggerStatus(G, 1, 'system_error', 'untouchable');
    expect(triggerStatus.shouldTrigger).toBe(true);

    const result = autoResolveIncidents(G);
    expect(result.executed.some(item => item.ruleId === 'ahr_machine_heart_event')).toBe(true);
    expect(G.v1.characters.untouchable.alive).toBe(false);
  });

  it('forces machine_heart through the manual incident move when the untouchable has no intrigue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      untouchable: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      untouchable: 'untouchable',
    };
    G.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['machine_heart'],
      G.v1.hiddenRoles,
      [{ day: 1, incidentId: 'system_error' }],
    );
    G.v1.pendingInteractions = [
      {
        id: 'incident:1_system_error',
        kind: 'incident_resolution',
        actorSeat: '0',
        phase: 'incidents',
        blocking: true,
        sourceId: '1_system_error',
        description: '系统错误',
        day: 1,
        incidentId: 'system_error',
        culpritId: 'untouchable',
        targetSlots: [],
      },
    ];
    G.v1.activeInteractionId = 'incident:1_system_error';

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_system_error',
      true,
      {},
    );

    expect(G.v1.characters.untouchable.alive).toBe(false);
    expect(G.fullLog.some(line => line.includes('机器之心'))).toBe(true);
  });

  it('triggers tragedy_of_reincarnation loss when serial_murder kills a non-illusion', () => {
    const murder = TragedyLooper.setup!({} as any) as TragedyGameState;
    murder.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    murder.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victim: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    murder.v1.hiddenRoles = {};
    murder.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['tragedy_of_reincarnation'],
      murder.v1.hiddenRoles,
      [],
    );

    getProcessor('incident_murder_effect')!.execute({
      G: murder,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'serial_murder', culpritId: 'culprit' },
      selectedTargets: { target: 'victim' },
    });
    autoResolve(murder, 'loop_end');
    expect(murder.v1.loopLost).toBe(true);

    const spared = TragedyLooper.setup!({} as any) as TragedyGameState;
    spared.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    spared.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      illusion: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    spared.v1.hiddenRoles = {
      illusion: 'illusion',
    };
    spared.v1.activeRuleDefinitions = buildActiveRules(
      'another_horizon_revised',
      ['tragedy_of_reincarnation'],
      spared.v1.hiddenRoles,
      [],
    );

    getProcessor('incident_murder_effect')!.execute({
      G: spared,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'serial_murder', culpritId: 'culprit' },
      selectedTargets: { target: 'illusion' },
    });
    autoResolve(spared, 'loop_end');
    expect(spared.v1.loopLost).toBe(false);
  });

  it('enforces MC poisoner once-per-loop kill and Ex>=4 protagonist death', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 4;
    G.v1.characters = {
      poisoner: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victimA: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victimB: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      poisoner: 'poisoner',
    };
    G.v1.activeRuleDefinitions = [
      { ruleId: 'mc_poisoner_kill', timing: 'day_end', mandatory: true, characterId: 'poisoner', source: 'role:poisoner' },
      { ruleId: 'mc_poisoner_protagonist_kill', timing: 'day_end', mandatory: true, characterId: 'poisoner', source: 'role:poisoner' },
    ];

    autoResolve(G, 'day_end');

    expect(Object.values(G.v1.characters).filter(c => !c.alive)).toHaveLength(1);
    expect(G.v1.protagonistKilled).toBe(true);
    expect(G.v1.loopState.abilityUsage['mc_poisoner_kill:poisoner']?.usedThisLoop).toBe(true);

    G.v1.ex.gauge = 4;
    autoResolve(G, 'day_end');
    expect(Object.values(G.v1.characters).filter(c => !c.alive)).toHaveLength(1);
  });

  it('allows boss poisoner to treat territory as same area for the Ex>=2 kill once', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 2;
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.characters = {
      boss: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      hospitalVictim: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      cityWitness: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.hiddenRoles = {
      boss: 'poisoner',
    };
    const setResult = (moves.setCharacterTerritory as any)(
      { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
      'boss',
      'hospital',
    );
    expect(setResult).toBeUndefined();
    expect(G.v1.characters.boss.territoryLocationId).toBe('hospital');
    G.v1.activeRuleDefinitions = [
      { ruleId: 'mc_poisoner_kill', timing: 'day_end', mandatory: true, characterId: 'boss', source: 'role:poisoner' },
    ];

    autoResolve(G, 'day_end');

    expect(G.v1.characters.hospitalVictim.alive).toBe(false);
    expect(G.v1.loopState.abilityUsage['mc_poisoner_kill:boss']?.usedThisLoop).toBe(true);
  });

  it('rejects setting boss territory outside lobby_wait', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.characters = {
      boss: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    const result = (moves.setCharacterTerritory as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'boss',
      'hospital',
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.characters.boss.territoryLocationId).toBeUndefined();
  });

  it('rejects rewriting boss territory after it is already set once', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.characters = {
      boss: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    const first = (moves.setCharacterTerritory as any)(
      { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
      'boss',
      'hospital',
    );
    const second = (moves.setCharacterTerritory as any)(
      { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
      'boss',
      'shrine',
    );

    expect(first).toBeUndefined();
    expect(second).toBe(INVALID_MOVE);
    expect(G.v1.characters.boss.territoryLocationId).toBe('hospital');
  });

  it('allows switching between resolution and tabletop-sim modes during normal gameplay', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = false;

    const toAuto = (moves.updateSetting as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'autoResolve',
      true,
    );
    expect(toAuto).toBeUndefined();
    expect(G.v1.settings.autoResolve).toBe(true);
    expect(G.publicLog.at(-1)).toBe('⚡ 已切换到结算模式');

    const toSandbox = (moves.updateSetting as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'autoResolve',
      false,
    );
    expect(toSandbox).toBeUndefined();
    expect(G.v1.settings.autoResolve).toBe(false);
    expect(G.publicLog.at(-1)).toBe('🏖️ 已切换到桌游模拟模式');
  });

  it('only allows changing leaderMode during lobby setup', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;

    const invalid = (moves.updateSetting as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'leaderMode',
      true,
    );
    const valid = (moves.updateSetting as any)(
      { G, ctx: { phase: 'lobby_wait' }, playerID: '0' },
      'leaderMode',
      true,
    );

    expect(invalid).toBe(INVALID_MOVE);
    expect(valid).toBeUndefined();
    expect(G.v1.settings.leaderMode).toBe(true);
  });

  it('only allows adjusting playerCount during safe setup windows', () => {
    const activeLoopGame = TragedyLooper.setup!({} as any) as TragedyGameState;
    const activeLoopResult = (moves.setPlayerCount as any)(
      { G: activeLoopGame, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
      2,
    );

    const transientTimeSpiralGame = TragedyLooper.setup!({} as any) as TragedyGameState;
    transientTimeSpiralGame.v1.readyPlayers = { '1': true };
    const transientTimeSpiralResult = (moves.setPlayerCount as any)(
      { G: transientTimeSpiralGame, ctx: { phase: 'time_spiral' }, playerID: '0' },
      2,
    );

    const safeTimeSpiralGame = TragedyLooper.setup!({} as any) as TragedyGameState;
    const safeTimeSpiralResult = (moves.setPlayerCount as any)(
      { G: safeTimeSpiralGame, ctx: { phase: 'time_spiral' }, playerID: '0' },
      2,
    );

    expect(activeLoopResult).toBe(INVALID_MOVE);
    expect(transientTimeSpiralResult).toBe(INVALID_MOVE);
    expect(safeTimeSpiralResult).toBeUndefined();
    expect(safeTimeSpiralGame.v1.settings.playerCount).toBe(2);
  });

  it('rejects jumping to final guess from time_spiral before all loops are exhausted', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.maxLoops = 3;
    G.loopIndex = 1;

    const events = { setPhase: vi.fn(), endPhase: vi.fn() };
    const result = (moves.skipToFinalGuess as any)(
      { G, ctx: { phase: 'time_spiral' }, events, playerID: '1' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(events.setPhase).not.toHaveBeenCalled();
  });

  it('allows entering final guess from time_spiral only after all loops are exhausted', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.maxLoops = 3;
    G.loopIndex = 3;

    const events = { setPhase: vi.fn(), endPhase: vi.fn() };
    const result = (moves.skipToFinalGuess as any)(
      { G, ctx: { phase: 'time_spiral' }, events, playerID: '1' },
    );

    expect(result).toBeUndefined();
    expect(events.setPhase).toHaveBeenCalledWith('final_guess');
  });

  it('stores detective guesses per incident instance and only accepts traitor C submissions', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.daysPerLoop = 3;
    G.v1.activePlots = ['ll_i_am_the_detective'];
    G.v1.exCardAssignment = { '1': 'C', '2': 'A' };
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      patient: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'murder' },
      { day: 1, incidentId: 'murder' },
    ];

    const wrongSeat = (moves.submitDetectiveGuess as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '2' },
      { day: 1, incidentId: 'murder', occurrenceIndex: 0, culpritId: 'doctor' },
    );
    const missingIncident = (moves.submitDetectiveGuess as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '1' },
      { day: 1, culpritId: 'doctor' },
    );
    const firstGuess = (moves.submitDetectiveGuess as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '1' },
      { day: 1, incidentId: 'murder', occurrenceIndex: 0, culpritId: 'doctor' },
    );
    const secondGuess = (moves.submitDetectiveGuess as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '1' },
      { day: 1, incidentId: 'murder', occurrenceIndex: 1, culpritId: 'patient' },
    );

    expect(wrongSeat).toBe(INVALID_MOVE);
    expect(missingIncident).toBe(INVALID_MOVE);
    expect(firstGuess).toBeUndefined();
    expect(secondGuess).toBeUndefined();
    expect(G.v1.detectiveGuesses).toEqual({
      '1_murder': 'doctor',
      '1_murder_1': 'patient',
    });
  });

  it('rejects overwriting an already submitted detective guess', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.daysPerLoop = 3;
    G.v1.activePlots = ['ll_i_am_the_detective'];
    G.v1.exCardAssignment = { '1': 'C' };
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      patient: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'murder' }];
    G.v1.detectiveGuesses = { '1_murder': 'doctor' };

    const result = (moves.submitDetectiveGuess as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '1' },
      { day: 1, incidentId: 'murder', occurrenceIndex: 0, culpritId: 'patient' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.detectiveGuesses).toEqual({ '1_murder': 'doctor' });
  });

  it('requires detective C to guess every incident instance correctly for LL victory C', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'murder' },
      { day: 1, incidentId: 'murder' },
    ];
    G.v1.incidentCulprits = {
      '1_murder': 'doctor',
      '1_murder_1': 'patient',
    };
    G.v1.detectiveGuesses = {
      '1_murder': 'doctor',
      '1_murder_1': 'patient',
    };

    const processor = getProcessor('ll_i_am_the_detective_victory')!;
    const success = processor.check({ G, timing: 'final_guess' });

    G.v1.detectiveGuesses = {
      '1_murder': 'doctor',
    };
    const failure = processor.check({ G, timing: 'final_guess' });

    expect(success.triggered).toBe(true);
    expect(failure.triggered).toBe(false);
  });

  it('rejects switching to resolution mode with pending mastermind abilities', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = false;
    G.v1.pendingAbilities = [{
      id: 'brain_intrigue_ability:doctor',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: '医生发动主谋能力',
      targetSlots: [],
    }];

    const result = (moves.updateSetting as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, playerID: '0' },
      'autoResolve',
      true,
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.settings.autoResolve).toBe(false);
  });

  it('rejects switching to resolution mode with pending goodwill interaction', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = false;
    G.v1.goodwillInteraction = {
      phase: 'leader_choosing',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'heal',
        label: '治疗',
        used: false,
      }],
      currentDeclaration: null,
    };

    const result = (moves.updateSetting as any)(
      { G, ctx: { phase: 'goodwill_window' }, playerID: '0' },
      'autoResolve',
      true,
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.settings.autoResolve).toBe(false);
  });

  it('rejects switching to resolution mode with pending incidents or butterfly choice', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = false;
    G.v1.pendingInteractions = [{
      id: 'incident:1_murder',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: '1_murder',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      description: '事件裁定：murder',
      targetSlots: [],
    }];
    G.v1.activeInteractionId = 'incident:1_murder';

    const withIncident = (moves.updateSetting as any)(
      { G, ctx: { phase: 'incidents' }, playerID: '0' },
      'autoResolve',
      true,
    );

    expect(withIncident).toBe(INVALID_MOVE);
    expect(G.v1.settings.autoResolve).toBe(false);

    G.v1.pendingInteractions = [];
    G.v1.activeInteractionId = null;
    G.v1.pendingInteractions = [{
      id: 'butterfly:character:doctor',
      kind: 'butterfly_choice',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: 'doctor',
      targetId: 'doctor',
      targetKind: 'character',
      allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
      description: '蝴蝶效应三选一',
    }];
    G.v1.activeInteractionId = 'butterfly:character:doctor';

    const withButterfly = (moves.updateSetting as any)(
      { G, ctx: { phase: 'incidents' }, playerID: '0' },
      'autoResolve',
      true,
    );

    expect(withButterfly).toBe(INVALID_MOVE);
    expect(G.v1.settings.autoResolve).toBe(false);
  });

  it('blocks phase advance while mastermind abilities are still pending', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingAbilities = [{
      id: 'brain_intrigue_ability:doctor',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: '医生发动主谋能力',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [{
      id: 'ability:brain_intrigue_ability:doctor',
      kind: 'mastermind_ability',
      actorSeat: '0',
      phase: 'mastermind_abilities',
      blocking: true,
      sourceId: 'brain_intrigue_ability:doctor',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: '医生发动主谋能力',
      targetSlots: [],
    }];

    const events = { endPhase: vi.fn() };
    const result = (moves.advancePhase as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('blocks phase advance while the goodwill window is still being resolved', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
    G.v1.goodwillInteraction = {
      phase: 'leader_choosing',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'doctor_gw2',
        label: '医生友好能力',
        used: false,
        targetSlots: [],
      }],
      currentDeclaration: null,
    };
    G.v1.pendingInteractions = [{
      id: 'goodwill:leader_choosing',
      kind: 'goodwill',
      actorSeat: '1',
      phase: 'leader_choosing',
      blocking: true,
      sourceId: 'leader_choosing',
      description: '友好能力阶段：leader_choosing',
      eligibleAbilities: G.v1.goodwillInteraction.eligibleAbilities,
      currentDeclaration: null,
    }];

    const events = { endPhase: vi.fn() };
    const result = (moves.advancePhase as any)(
      { G, ctx: { phase: 'goodwill_window' }, events, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('allows the leader to advance goodwill_window when no goodwill interaction is pending', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
    G.v1.goodwillInteraction = {
      phase: 'done',
      eligibleAbilities: [],
      currentDeclaration: null,
    };

    const events = { endPhase: vi.fn() };
    const result = (moves.advancePhase as any)(
      { G, ctx: { phase: 'goodwill_window' }, events, playerID: '1' },
    );

    expect(result).toBeUndefined();
    expect(events.endPhase).toHaveBeenCalledOnce();
  });

  it('keeps mastermind_abilities open after confirming the last pending ability', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      doctor: {
        locationId: 'city',
        alive: true,
        exCardCount: 0,
        tokens: createEmptyTokenBag(),
      } as any,
    };
    G.v1.pendingAbilities = [{
      id: 'brain_intrigue_ability:doctor',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: '医生发动主谋能力',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [{
      id: 'ability:brain_intrigue_ability:doctor',
      kind: 'mastermind_ability',
      actorSeat: '0',
      phase: 'mastermind_abilities',
      blocking: true,
      sourceId: 'brain_intrigue_ability:doctor',
      ruleId: 'brain_intrigue_ability',
      characterId: 'doctor',
      mandatory: true,
      description: '医生发动主谋能力',
      targetSlots: [],
    }] as any;
    G.v1.activeInteractionId = 'ability:brain_intrigue_ability:doctor';

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'mastermind_abilities' }, events, playerID: '0' },
      'brain_intrigue_ability:doctor',
      {},
    );

    expect(result).toBeUndefined();
    expect(G.v1.pendingAbilities).toEqual([]);
    expect(G.v1.abilityPhase).toBe('done');
    expect(G.v1.pendingInteractions).toEqual([]);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('keeps goodwill_window open after the mastermind resolves the last declared goodwill ability', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.leader = '1';
    G.v1.goodwillInteraction = {
      phase: 'mastermind_resolving',
      eligibleAbilities: [{
        characterId: 'doctor',
        abilityId: 'doctor_gw2',
        label: '医生友好能力',
        used: false,
        targetSlots: [],
      }],
      currentDeclaration: {
        characterId: 'doctor',
        abilityId: 'doctor_gw2',
      },
    };
    G.v1.pendingInteractions = [{
      id: 'goodwill:mastermind_resolving',
      kind: 'goodwill',
      actorSeat: '0',
      phase: 'mastermind_resolving',
      blocking: true,
      sourceId: 'mastermind_resolving',
      description: '友好能力阶段：mastermind_resolving',
      eligibleAbilities: G.v1.goodwillInteraction.eligibleAbilities,
      currentDeclaration: G.v1.goodwillInteraction.currentDeclaration,
    }] as any;

    const events = { endPhase: vi.fn() };
    const result = (moves.resolveAbility as any)(
      { G, ctx: { phase: 'goodwill_window' }, events, playerID: '0' },
      true,
    );

    expect(result).toBeUndefined();
    expect(G.v1.goodwillInteraction.phase).toBe('done');
    expect(G.v1.pendingInteractions).toEqual([]);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('blocks phase advance while a butterfly choice is still unresolved outside incidents', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingInteractions = [{
      id: 'butterfly:character:doctor',
      kind: 'butterfly_choice',
      actorSeat: '0',
      phase: 'resolve_cards',
      blocking: true,
      sourceId: 'doctor',
      targetId: 'doctor',
      targetKind: 'character',
      allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
      description: '蝴蝶效应三选一',
    }];
    G.v1.activeInteractionId = 'butterfly:character:doctor';

    const events = { endPhase: vi.fn() };
    const result = (moves.advancePhase as any)(
      { G, ctx: { phase: 'resolve_cards' }, events, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('rejects finishAbilities when no pending mastermind abilities exist', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingInteractions = [{
      id: 'incident:1_murder',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: '1_murder',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      description: '事件裁定：murder',
      targetSlots: [],
    }];
    G.v1.activeInteractionId = 'incident:1_murder';

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    const result = (moves.finishAbilities as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.pendingInteractions).toHaveLength(1);
    expect(G.v1.pendingInteractions[0]?.kind).toBe('incident_resolution');
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('only removes mastermind ability interactions when finishing cross-phase optional abilities', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingAbilities = [{
      id: 'ahr_pied_piper_day_end_kill:piper',
      ruleId: 'ahr_pied_piper_day_end_kill',
      characterId: 'piper',
      mandatory: false,
      description: '吹笛人能力',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [
      {
        id: 'ability:ahr_pied_piper_day_end_kill:piper',
        kind: 'mastermind_ability',
        actorSeat: '0',
        phase: 'day_end',
        blocking: true,
        sourceId: 'ahr_pied_piper_day_end_kill:piper',
        ruleId: 'ahr_pied_piper_day_end_kill',
        characterId: 'piper',
        mandatory: false,
        description: '吹笛人能力',
        targetSlots: [],
      },
      {
        id: 'butterfly:character:doctor',
        kind: 'butterfly_choice',
        actorSeat: '0',
        phase: 'day_end',
        blocking: true,
        sourceId: 'doctor',
        targetId: 'doctor',
        targetKind: 'character',
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'],
        description: '蝴蝶效应三选一',
      },
    ] as any;
    G.v1.activeInteractionId = 'ability:ahr_pied_piper_day_end_kill:piper';

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    const result = (moves.finishAbilities as any)(
      { G, ctx: { phase: 'day_end' }, events, playerID: '0' },
    );

    expect(result).toBeUndefined();
    expect(G.v1.pendingAbilities).toEqual([]);
    expect(G.v1.pendingInteractions).toEqual([
      expect.objectContaining({ kind: 'butterfly_choice' }),
    ]);
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('keeps day_end open after the explicit queue is resolved', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingAbilities = [{
      id: 'ahr_pied_piper_day_end_kill:piper',
      ruleId: 'ahr_pied_piper_day_end_kill',
      characterId: 'piper',
      timing: 'day_end',
      phase: 'day_end',
      mandatory: false,
      description: '吹笛人能力',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [{
      id: 'ability:ahr_pied_piper_day_end_kill:piper',
      kind: 'mastermind_ability',
      actorSeat: '0',
      phase: 'day_end',
      blocking: true,
      sourceId: 'ahr_pied_piper_day_end_kill:piper',
      ruleId: 'ahr_pied_piper_day_end_kill',
      characterId: 'piper',
      mandatory: false,
      description: '吹笛人能力',
      targetSlots: [],
    }] as any;
    G.v1.activeInteractionId = 'ability:ahr_pied_piper_day_end_kill:piper';

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    const result = (moves.finishAbilities as any)(
      { G, ctx: { phase: 'day_end' }, events, playerID: '0' },
    );

    expect(result).toBeUndefined();
    expect(G.v1.pendingAbilities).toEqual([]);
    expect(G.v1.pendingInteractions).toEqual([]);
    expect(G.v1.abilityPhase).toBe('done');
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('rejects advancePhase during setup phases that require dedicated moves', () => {
    const scriptSelectEvents = { endPhase: vi.fn() };
    const scriptSelectGame = TragedyLooper.setup!({} as any) as TragedyGameState;
    const scriptSelectResult = (moves.advancePhase as any)(
      { G: scriptSelectGame, ctx: { phase: 'script_select' }, events: scriptSelectEvents, playerID: '0' },
    );

    const lobbyEvents = { endPhase: vi.fn() };
    const lobbyGame = TragedyLooper.setup!({} as any) as TragedyGameState;
    lobbyGame.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    const lobbyResult = (moves.advancePhase as any)(
      { G: lobbyGame, ctx: { phase: 'lobby_wait' }, events: lobbyEvents, playerID: '0' },
    );

    expect(scriptSelectResult).toBe(INVALID_MOVE);
    expect(scriptSelectEvents.endPhase).not.toHaveBeenCalled();
    expect(lobbyResult).toBe(INVALID_MOVE);
    expect(lobbyEvents.endPhase).not.toHaveBeenCalled();
  });

  it('only allows the mastermind to advance time_spiral', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;

    const protagonistEvents = { endPhase: vi.fn() };
    const protagonistResult = (moves.advancePhase as any)(
      { G, ctx: { phase: 'time_spiral' }, events: protagonistEvents, playerID: '1' },
    );

    const mastermindEvents = { endPhase: vi.fn() };
    const mastermindResult = (moves.advancePhase as any)(
      { G, ctx: { phase: 'time_spiral' }, events: mastermindEvents, playerID: '0' },
    );

    expect(protagonistResult).toBe(INVALID_MOVE);
    expect(protagonistEvents.endPhase).not.toHaveBeenCalled();
    expect(mastermindResult).toBeUndefined();
    expect(mastermindEvents.endPhase).toHaveBeenCalledOnce();
  });

  it('rejects declareLoopLoss outside active loop phases', () => {
    const invalidPhaseEvents = { endPhase: vi.fn() };
    const invalidPhaseGame = TragedyLooper.setup!({} as any) as TragedyGameState;
    const invalidPhaseResult = (moves.declareLoopLoss as any)(
      { G: invalidPhaseGame, ctx: { phase: 'time_spiral' }, events: invalidPhaseEvents, playerID: '0' },
    );

    const validPhaseEvents = { endPhase: vi.fn() };
    const validPhaseGame = TragedyLooper.setup!({} as any) as TragedyGameState;
    const validPhaseResult = (moves.declareLoopLoss as any)(
      { G: validPhaseGame, ctx: { phase: 'mastermind_plan' }, events: validPhaseEvents, playerID: '0' },
    );

    expect(invalidPhaseResult).toBe(INVALID_MOVE);
    expect(invalidPhaseEvents.endPhase).not.toHaveBeenCalled();
    expect(invalidPhaseGame.v1.loopLost).toBe(false);
    expect(validPhaseResult).toBeUndefined();
    expect(validPhaseGame.v1.loopLost).toBe(true);
    expect(validPhaseEvents.endPhase).toHaveBeenCalledOnce();
  });

  it('blocks detective as incident culprit and makes detective immortal in incident kill flow', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      detective: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
      culprit: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), paranoia: 3 } },
    };
    G.v1.hiddenRoles = {
      detective: 'detective',
    };

    const culpritAsDetective = getIncidentTriggerStatus(G, 1, 'suicide', 'detective');
    expect(culpritAsDetective.shouldTrigger).toBe(false);
    expect(culpritAsDetective.reason).toContain('侦探不能成为事件当事人');

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };
    G.v1.pendingIncidents = [{
      id: '1_serial_murder',
      day: 1,
      incidentId: 'serial_murder',
      culpritId: 'culprit',
      targetSlots: [{
        slotId: 'target',
        label: '被害者',
        kind: 'character',
        eligibleCharacterIds: ['detective'],
      }],
    }];

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_serial_murder',
      true,
      { target: 'detective' },
    );
    expect(G.v1.characters.detective.alive).toBe(true);
  });

  it('forces incident trigger with detective at Ex=0 in manual and auto paths', () => {
    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };

    const G1 = TragedyLooper.setup!({} as any) as TragedyGameState;
    G1.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G1.v1.ex.enabled = true;
    G1.v1.ex.gauge = 0;
    G1.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      detective: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G1.v1.hiddenRoles = { detective: 'detective' };
    G1.v1.pendingIncidents = [{ id: '1_suicide', day: 1, incidentId: 'suicide', culpritId: 'culprit', targetSlots: [] }];

    const forcedStatus = getIncidentTriggerStatus(G1, 1, 'suicide', 'culprit');
    expect(forcedStatus.shouldTrigger).toBe(true);

    (moves.resolveIncident as any)(
      { G: G1, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_suicide',
      true,
      {},
    );
    expect(G1.v1.ex.gauge).toBe(1);
    expect(G1.v1.characters.culprit.alive).toBe(false);

    const G2 = TragedyLooper.setup!({} as any) as TragedyGameState;
    G2.day = 1;
    G2.loopIndex = 0;
    G2.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G2.v1.ex.enabled = true;
    G2.v1.ex.gauge = 0;
    G2.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      detective: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G2.v1.hiddenRoles = { detective: 'detective' };
    G2.v1.scheduledIncidents = [{ day: 1, incidentId: 'suicide' }];
    G2.v1.incidentCulprits = { '1_suicide': 'culprit' };
    G2.v1.activeRuleDefinitions = buildActiveRules(
      'mystery_circle',
      [],
      G2.v1.hiddenRoles,
      G2.v1.scheduledIncidents,
    );

    const autoResult = autoResolveIncidents(G2);
    expect(autoResult.executed.length).toBeGreaterThan(0);
    expect(G2.v1.ex.gauge).toBe(1);
    expect(G2.v1.characters.culprit.alive).toBe(false);
  });

  it('does not force incident when culprit is incident-immune even with detective and Ex=0', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      detective: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { detective: 'detective' };
    G.v1.loopState.abilityUsage.__incident_immune_culprit = {
      usedToday: false,
      usedThisLoop: true,
    };
    G.v1.pendingIncidents = [{ id: '1_suicide', day: 1, incidentId: 'suicide', culpritId: 'culprit', targetSlots: [] }];

    const status = getIncidentTriggerStatus(G, 1, 'suicide', 'culprit');
    expect(status.shouldTrigger).toBe(false);
    expect(status.reason).toContain('免疫');

    const events = {
      endPhase: vi.fn(),
      setPhase: vi.fn(),
    };
    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      '1_suicide',
      false,
    );

    expect(G.v1.ex.gauge).toBe(0);
    expect(G.v1.loopState.triggeredIncidents).toHaveLength(0);
    expect(G.v1.loopState.incidentHistory).toHaveLength(0);
    expect(G.v1.characters.culprit.alive).toBe(true);
  });

  it('does not trigger panic_in_ward_loop_start on the initial loop', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.loopIndex = 0;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.ex.lastLoopEndGauge = 0;
    G.v1.activeRuleDefinitions = [
      { ruleId: 'panic_in_ward_loop_start', timing: 'loop_start', mandatory: true, source: 'plot:panic_in_ward' },
    ];

    autoResolve(G, 'loop_start');

    expect(G.v1.ex.gauge).toBe(0);
  });

  it('bumps Ex by 1 at the start of day_end after a current AHR world shift earlier that day', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.leader = '1';
    G.v1.loopState.abilityUsage.__ahr_world_shift_today = {
      usedToday: true,
      usedThisLoop: true,
    };

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.ex.gauge).toBe(1);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(false);
  });

  it('marks a current AHR world shift after resolving a once-per-loop goodwill ability', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.leader = '1';
    G.seatHands['1'] = [];
    G.board.usedOncePerLoopCards = ['1:protagonist_goodwill_plus_2'];
    G.v1.characters = {
      class_rep: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 2 },
      },
    };

    executeGoodwillAbility(G, 'class_rep', 'class_rep_gw2');

    expect(G.v1.ex.gauge).toBe(0);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);
  });

  it('grants protagonists hope on the next loop setup after current AHR last_will triggered', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 1;
    G.v1.loopState.lastWillHopeNextLoop = true;

    (phases.loop_setup.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(getToken(G.v1.protagonists, 'hope')).toBe(1);
    expect(G.v1.loopState.lastWillHopeNextLoop).toBe(false);
  });

  it('grants current AHR initial loop resources on the first loop setup', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 0;

    (phases.loop_setup.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(getToken(G.v1.protagonists, 'paranoia')).toBe(2);
    expect(getToken(G.v1.mastermind, 'goodwill')).toBe(1);
    expect(getToken(G.v1.mastermind, 'despair')).toBe(1);
  });

  it('grants current AHR recurring loop resources without repeating first-loop despair', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.loopIndex = 2;

    (phases.loop_setup.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(getToken(G.v1.protagonists, 'paranoia')).toBe(2);
    expect(getToken(G.v1.mastermind, 'goodwill')).toBe(1);
    expect(getToken(G.v1.mastermind, 'despair')).toBe(0);
  });

  it('assigns LL Ex cards and betrayer victory conditions during first loop setup', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.loopIndex = 0;
    G.v1.settings.playerCount = 4;
    G.v1.activePlots = ['ll_true_monster', 'll_i_am_the_detective'];

    (phases.loop_setup.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(Object.keys(G.v1.exCardAssignment || {})).toHaveLength(3);
    expect(Object.values(G.v1.exCardAssignment || {}).sort()).toEqual(['A', 'B', 'C']);
    expect(G.v1.betrayerVictoryConditions).toEqual({
      A: { ruleId: 'll_true_monster', description: '总计放置过5枚或以上已死亡标志' },
      C: { ruleId: 'll_i_am_the_detective', description: '最终决战前正确推理所有事件当事人' },
    });
  });

  it('applies weird mythology day_start Ex threshold effects through module lifecycle hooks', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'weird_mythology' } as any;
    G.day = 0;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 1;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    (phases.day_start.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(getToken(G.v1.characters.office_worker, 'goodwill')).toBe(2);
    expect(G.publicLog.some(line => line.includes('感应咒文'))).toBe(true);
  });

  it('surfaces weird mythology loop_end_check Ex threshold effects in result confirmation and applies them on confirm', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'weird_mythology' } as any;
    G.maxLoops = 5;
    G.loopIndex = 1;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 4;
    G.v1.loopLost = true;
    G.v1.activePlots = ['main_plot', 'wm_secret_x1'];

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    (phases.loop_end_check.onBegin as any)({ G, events });

    const pending = G.v1.pendingInteractions.find(
      interaction => interaction.kind === 'loop_result_resolution',
    ) as Extract<TragedyGameState['v1']['pendingInteractions'][number], { kind: 'loop_result_resolution' }>;

    expect(G.maxLoops).toBe(5);
    expect(pending.effectOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'wm_ancestor_memory_reveal_x1',
        stage: 'after_loss_declared',
      }),
      expect.objectContaining({
        id: 'wm_berserk_burn_remaining_loops',
        stage: 'after_progression',
        outcomeOverride: 'final_guess',
      }),
    ]));
    expect(pending.availableOutcomes).toEqual([
      expect.objectContaining({
        id: 'final_guess',
      }),
    ]);
    expect(G.publicLog.some(line => line.includes('先祖记忆'))).toBe(false);
    expect(G.publicLog.some(line => line.includes('失去所有剩余轮回'))).toBe(false);

    (moves.confirmLoopResult as any)(
      { G, ctx: { phase: 'loop_end_check' }, playerID: '0' },
      undefined,
      'final_guess',
    );

    expect(G.maxLoops).toBe(G.loopIndex);
    expect(G.publicLog.some(line => line.includes('先祖记忆'))).toBe(true);
    expect(G.publicLog.some(line => line.includes('失去所有剩余轮回'))).toBe(true);
  });

  it('derives current AHR front/back world state and reversed-emotion mode from Ex parity', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;

    expect(isFrontWorld(G)).toBe(true);
    expect(isBackWorld(G)).toBe(false);
    expect(usesReversedEmotionRules(G)).toBe(false);

    G.v1.ex.gauge = 1;

    expect(isFrontWorld(G)).toBe(false);
    expect(isBackWorld(G)).toBe(true);
    expect(usesReversedEmotionRules(G)).toBe(true);
  });

  it('uses goodwill instead of paranoia for current AHR incident triggers in the back world', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      office_worker: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 0, goodwill: 5 },
      },
    };

    G.v1.ex.gauge = 0;
    expect(getIncidentTriggerStatus(G, 1, 'dimension_warp', 'office_worker').shouldTrigger).toBe(false);

    G.v1.ex.gauge = 1;
    expect(getIncidentTriggerStatus(G, 1, 'dimension_warp', 'office_worker').shouldTrigger).toBe(true);
  });

  it('uses paranoia instead of goodwill to collect current AHR goodwill abilities in the back world', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      boy_student: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2, goodwill: 0 },
      },
      class_rep: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    G.v1.ex.gauge = 0;
    expect(collectEligibleAbilities(G).some(ability => ability.abilityId === 'boy_student_gw1')).toBe(false);

    G.v1.ex.gauge = 1;
    expect(collectEligibleAbilities(G).some(ability => ability.abilityId === 'boy_student_gw1')).toBe(true);
  });

  it('uses current AHR variable-role assignments when deriving goodwill refusal traits', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;
    G.v1.hiddenRoles = {
      doctor: 'obsessive',
    };
    (G.v1 as any).ahrVariableRoles = {
      doctor: {
        frontRoleId: 'obsessive',
        backRoleId: 'key_person',
      },
    };

    G.v1.ex.gauge = 0;
    expect(getGoodwillTrait(G, 'doctor')).toBe('must_reject');

    G.v1.ex.gauge = 1;
    expect(getGoodwillTrait(G, 'doctor')).toBe('must_allow');
  });

  it('uses current AHR variable-role assignments for illusion paranoia limits', () => {
    const frontWorld = TragedyLooper.setup!({} as any) as TragedyGameState;
    frontWorld.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    frontWorld.v1.ex.enabled = true;
    frontWorld.v1.characters = {
      doctor: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    frontWorld.v1.hiddenRoles = {
      doctor: 'illusion',
    };
    (frontWorld.v1 as any).ahrVariableRoles = {
      doctor: {
        frontRoleId: 'illusion',
        backRoleId: 'person',
      },
    };

    applyCharacterTokenDelta(frontWorld, 'doctor', 'paranoia', 1);
    expect(frontWorld.v1.characters.doctor.alive).toBe(false);

    const backWorld = TragedyLooper.setup!({} as any) as TragedyGameState;
    backWorld.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    backWorld.v1.ex.enabled = true;
    backWorld.v1.ex.gauge = 1;
    backWorld.v1.characters = {
      doctor: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    backWorld.v1.hiddenRoles = {
      doctor: 'illusion',
    };
    (backWorld.v1 as any).ahrVariableRoles = {
      doctor: {
        frontRoleId: 'illusion',
        backRoleId: 'person',
      },
    };

    applyCharacterTokenDelta(backWorld, 'doctor', 'paranoia', 1);
    expect(backWorld.v1.characters.doctor.alive).toBe(true);
  });

  it('flushes a current AHR world shift from dimension_shift into Ex at the next day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.ex.enabled = true;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    const processor = getProcessor('ahr_incident_dimension_shift');
    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'dimension_shift', culpritId: 'culprit' },
    });

    expect(G.v1.ex.gauge).toBe(0);

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn() },
    });

    expect(G.v1.ex.gauge).toBe(1);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(false);
  });

  it('resolves current AHR dimension_warp with an explicit world-shift choice and flushes Ex at day_end', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      fearful: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      friendly: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'dimension_warp' }];
    G.v1.incidentCulprits = { '1_dimension_warp': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(
      (G.v1.pendingInteractions || []).find(
        interaction => interaction.kind === 'incident_resolution' && interaction.incidentId === 'dimension_warp',
      ),
    ).toBeTruthy();

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_dimension_warp',
      true,
      {
        worldShiftChoice: 'shift',
        paranoiaTarget: 'fearful',
        goodwillTarget: 'friendly',
      },
    );

    expect(getToken(G.v1.characters.fearful, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.friendly, 'goodwill')).toBe(2);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.ex.gauge).toBe(2);
  });

  it('resolves current AHR dimension_warp without world shift when no_shift is selected', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      fearful: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      friendly: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'dimension_warp' }];
    G.v1.incidentCulprits = { '1_dimension_warp': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_dimension_warp',
      true,
      {
        worldShiftChoice: 'no_shift',
        paranoiaTarget: 'fearful',
        goodwillTarget: 'friendly',
      },
    );

    expect(getToken(G.v1.characters.fearful, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.friendly, 'goodwill')).toBe(2);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBeFalsy();

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.ex.gauge).toBe(1);
  });

  it('emits one incident announcement per affected target instead of showing the culprit', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      fearful: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      friendly: {
        locationId: 'hospital',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'dimension_warp' }];
    G.v1.incidentCulprits = { '1_dimension_warp': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_dimension_warp',
      true,
      {
        worldShiftChoice: 'shift',
        paranoiaTarget: 'fearful',
        goodwillTarget: 'friendly',
      },
    );

    const incidentEvents = G.v1.eventLogs.filter(event => event.type === 'incident');

    expect(incidentEvents).toHaveLength(2);
    expect(incidentEvents.map(event => (event.payload as any).targetId)).toEqual(['fearful', 'friendly']);
    expect(incidentEvents.map(event => (event.payload as any).characterId)).toEqual(['fearful', 'friendly']);
    expect(incidentEvents.some(event => (event.payload as any).characterId === 'culprit')).toBe(false);
  });

  it('resolves current AHR dimension_fault with world shift and kills protagonists at three token types', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: {
          ...createEmptyTokenBag(),
          paranoia: 3,
          intrigue: 1,
          goodwill: 1,
        },
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'dimension_fault' }];
    G.v1.incidentCulprits = { '1_dimension_fault': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_dimension_fault',
      true,
      {
        worldShiftChoice: 'shift',
      },
    );

    expect(G.v1.protagonistKilled).toBe(true);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.ex.gauge).toBe(2);
  });

  it('resolves current AHR lost_item by adding intrigue to a same-area target and moving the culprit', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      },
      nearby: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      far: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'lost_item' }];
    G.v1.incidentCulprits = { '1_lost_item': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_lost_item',
      true,
      {
        intrigueTarget: 'nearby',
        location: 'shrine',
      },
    );

    expect(getToken(G.v1.characters.nearby, 'intrigue')).toBe(1);
    expect(G.v1.characters.culprit.locationId).toBe('shrine');
    expect(G.v1.ex.gauge).toBe(1);
  });

  it('kills protagonists on the first current AHR singularity occurrence in the front world', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      doctor: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3, goodwill: 3 },
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'singularity' }];
    G.v1.incidentCulprits = { '1_singularity': 'doctor' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_singularity',
      true,
      {},
    );

    expect(G.v1.protagonistKilled).toBe(true);
    expect((G.v1 as any).ahrSingularityOccurred).toBe(true);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBeFalsy();
  });

  it('resolves later current AHR singularity occurrences in the front world as world shifts', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    (G.v1 as any).ahrSingularityOccurred = true;
    G.v1.characters = {
      doctor: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3, goodwill: 3 },
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'singularity' }];
    G.v1.incidentCulprits = { '1_singularity': 'doctor' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_singularity',
      true,
      {},
    );

    expect(G.v1.protagonistKilled).toBe(false);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);

    (phases.day_end.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.ex.gauge).toBe(2);
  });

  it('kills protagonists on current AHR singularity in the back world when the culprit initial area has intrigue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    const initialLocationId = CHARACTERS.doctor.startingLocations[0]!;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 1;
    G.v1.characters = {
      doctor: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3, goodwill: 3 },
      },
    };
    G.v1.locations[initialLocationId] = {
      tokens: { ...createEmptyTokenBag(), intrigue: 1 },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'singularity' }];
    G.v1.incidentCulprits = { '1_singularity': 'doctor' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_singularity',
      true,
      {},
    );

    expect(G.v1.protagonistKilled).toBe(true);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBeFalsy();
  });

  it('resolves current AHR impulse_murder at uneaseLimit-1 and kills a same-area target', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
      victim: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'impulse_murder' }];
    G.v1.incidentCulprits = { '1_impulse_murder': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_impulse_murder',
      true,
      { target: 'victim' },
    );

    expect(G.v1.characters.victim.alive).toBe(false);
    expect(G.v1.ex.gauge).toBe(1);
  });

  it('resolves current AHR imaginary_incident through the lost_item branch without requiring unrelated targets', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.ex.enabled = true;
    G.v1.ex.gauge = 0;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 3 },
      },
      nearby: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      far: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'imaginary_incident' }];
    G.v1.incidentCulprits = { '1_imaginary_incident': 'culprit' };

    (phases.incidents.onBegin as any)({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const result = (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      '1_imaginary_incident',
      true,
      {
        incidentChoice: 'lost_item',
        intrigueTarget: 'nearby',
        location: 'school',
      },
    );

    expect(result).toBeUndefined();
    expect(getToken(G.v1.characters.nearby, 'intrigue')).toBe(1);
    expect(G.v1.characters.culprit.locationId).toBe('school');
    expect(G.v1.ex.gauge).toBe(1);
  });

  // ── AHR 处理器覆盖率 TDD ────────────────────────────────────────────
  it('has processors registered for all AHR-unique role ruleIds', () => {
    const ahrRoleRuleIds = [
      'ahr_ai_undead',
      'ahr_time_traveler_undead',
      'ahr_time_traveler_ignore_forbid_goodwill',
      'ahr_time_traveler_end_loss',
      'ahr_untouchable_ignore_goodwill',
      'ahr_untouchable_add_unease',
      'ahr_magician_teleport',
      'ahr_magician_death_clear_unease',
      'ahr_black_cat_undead',
      'ahr_black_cat_move',
      'ahr_vampire_undead_and_ignore',
      'ahr_vampire_kill_key_person',
      'ahr_illusion_undead',
      'ahr_illusion_unease_limit',
    ];
    const missing = ahrRoleRuleIds.filter(id => !getProcessor(id));
    expect(missing).toEqual([]);
  });

  it('has processors registered for all AHR-unique plot ruleIds', () => {
    const ahrPlotRuleIds = [
      'ahr_sign_with_me_loop_end_loss',
      'ahr_change_of_future_loop_end_loss',
      'ahr_thread_of_the_end_day_end_loss',
      'ahr_a_long_night_generation_rule',
      'ahr_hidden_world_setup',
      'ahr_black_school_loop_end_loss',
      'ahr_tragedy_of_reincarnation_loop_end_loss',
      'ahr_machine_heart_event',
    ];
    const missing = ahrPlotRuleIds.filter(id => !getProcessor(id));
    expect(missing).toEqual([]);
  });

  it('has processors registered for all AHR-unique incident ruleIds', () => {
    const ahrIncidentRuleIds = [
      'ahr_incident_butterfly_effect',
      'ahr_incident_missing_person',
      'ahr_incident_serial_murder',
      'ahr_incident_spreading',
      'ahr_incident_increasing_unease',
      'ahr_incident_faraway_murder',
      'ahr_incident_system_error',
      'ahr_incident_bizarre_murder',
    ];
    const missing = ahrIncidentRuleIds.filter(id => !getProcessor(id));
    expect(missing).toEqual([]);
  });

  // ── MZ 处理器覆盖率 TDD ────────────────────────────────────────────
  it('has processors registered for all MZ-unique role ruleIds', () => {
    const mzRoleRuleIds = [
      'mz_cultist_ignore_forbid_intrigue',
      'mz_ninja_assassinate',
      'mz_ninja_false_claim',
      'mz_compulsive_incident_target',
      'mz_compulsive_incident_guarantee',
      'mz_magician_teleport',
      'mz_magician_death_clear_unease',
      'mz_factor_school_intrigue',
      'mz_factor_city_intrigue',
      'mz_immortal_cannot_die',
      'mz_prophet_no_cards',
      'mz_prophet_prevent_incidents',
    ];
    const missing = mzRoleRuleIds.filter(id => !getProcessor(id));
    expect(missing).toEqual([]);
  });

  it('has processors registered for all MZ-unique plot ruleIds', () => {
    const mzPlotRuleIds = [
      'the_sealed_item_mz_loop_end_loss',
      'top_secret_report_loop_end_loss',
      'a_mans_battle_male_requirement',
      'a_mans_battle_loop_end_loss',
      'bonds_of_karma_loop_start',
      'bonds_of_karma_ex_key_person',
      'x_factor_anomaly_intrigue',
      'death_reality_show_loop_end_loss',
      'disconnect_of_hearts_forbid_move',
      'song_of_destruction_suicide_incident',
      'song_of_destruction_prophet_unease_down',
      'dice_of_the_gods_loop_start',
    ];
    const missing = mzPlotRuleIds.filter(id => !getProcessor(id));
    expect(missing).toEqual([]);
  });

  it('has processors registered for all MZ-unique incident ruleIds', () => {
    const mzIncidentRuleIds = [
      'mz_incident_serial_murder',
      'mz_incident_suicide',
      'mz_incident_confession',
      'mz_incident_breaking_the_board',
      'mz_incident_faked_suicide',
      'mz_incident_hospital_incident',
      'mz_incident_forged_incident',
      'mz_incident_riot',
      'mz_incident_increasing_unease',
      'mz_incident_missing_person',
      'mz_incident_conspiracy_activity',
    ];
    const missing = mzIncidentRuleIds.filter(id => !getProcessor(id));
    expect(missing).toEqual([]);
  });

  it('does not kill a character with the immortal role (MZ eternal)', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      miko: { locationId: 'shrine', alive: true, tokens: createEmptyTokenBag() },
      killer_char: { locationId: 'shrine', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      miko: 'immortal',
      killer_char: 'serial_killer',
    };
    G.v1.activeRuleDefinitions = [
      { ruleId: 'serial_killer_day_end_kill', timing: 'day_end', mandatory: true, characterId: 'killer_char', source: 'role:serial_killer' },
    ];

    autoResolve(G, 'day_end');

    // immortal should NOT die — serial killer alone with immortal
    expect(G.v1.characters.miko.alive).toBe(true);
    expect(G.fullLog.some(line => line.includes('不死'))).toBe(true);
  });

  it('resolves MZ prefix ruleIds via getProcessor fallback', () => {
    // mz_ prefix should strip down to cultist_ignore_forbid_intrigue
    expect(getProcessor('mz_cultist_ignore_forbid_intrigue')).toBeTruthy();
    // core ruleId should still work
    expect(getProcessor('cultist_ignore_forbid_intrigue')).toBeTruthy();
  });

  // ── MZ 处理器功能测试 ────────────────────────────────────────────────

  it('triggers a_mans_battle loss when ninja has intrigue >= 2', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      boy_student: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 3 } },
    };
    G.v1.hiddenRoles = { boy_student: 'ninja' };

    const processor = getProcessor('a_mans_battle_loop_end_loss')!;
    const result = processor.check({ G, timing: 'loop_end' });
    expect(result.triggered).toBe(true);

    processor.execute({ G, timing: 'loop_end' });
    expect(G.v1.loopLost).toBe(true);
  });

  it('does NOT trigger a_mans_battle when ninja intrigue < 2', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      boy_student: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 1 } },
    };
    G.v1.hiddenRoles = { boy_student: 'ninja' };

    const result = getProcessor('a_mans_battle_loop_end_loss')!.check({ G, timing: 'loop_end' });
    expect(result.triggered).toBe(false);
  });

  it('triggers death_reality_show loss when alive count <= 6', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    // 设置只有 5 个存活角色
    G.v1.characters = {};
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      G.v1.characters[name] = { locationId: 'city', alive: true, tokens: createEmptyTokenBag() };
    }

    const processor = getProcessor('death_reality_show_loop_end_loss')!;
    const result = processor.check({ G, timing: 'loop_end' });
    expect(result.triggered).toBe(true);

    processor.execute({ G, timing: 'loop_end' });
    expect(G.v1.loopLost).toBe(true);
  });

  it('does NOT trigger death_reality_show when alive count > 6', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {};
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      G.v1.characters[name] = { locationId: 'city', alive: true, tokens: createEmptyTokenBag() };
    }

    const result = getProcessor('death_reality_show_loop_end_loss')!.check({ G, timing: 'loop_end' });
    expect(result.triggered).toBe(false);
  });

  it('x_factor adds intrigue to factor location and respects per-loop limit', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { office_worker: 'factor' };
    G.v1.locations.city = { tokens: createEmptyTokenBag() };

    const processor = getProcessor('x_factor_anomaly_intrigue')!;

    // 第一次触发
    let result = processor.check({ G, timing: 'mastermind_ability' });
    expect(result.triggered).toBe(true);
    processor.execute({ G, timing: 'mastermind_ability' });
    expect(getToken(G.v1.locations.city, 'intrigue')).toBe(1);

    // 第二次应被限制
    result = processor.check({ G, timing: 'mastermind_ability' });
    expect(result.triggered).toBe(false);
  });

  it('triggers AHR beyond the world line despair only on even-numbered loops', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    const processor = getProcessor('ahr_beyond_the_world_line_loop_start_despair')!;

    G.loopIndex = 0;
    expect(processor.check({ G, timing: 'loop_start' }).triggered).toBe(false);

    G.loopIndex = 1;
    const result = processor.check({ G, timing: 'loop_start' });
    expect(result.triggered).toBe(true);
    processor.execute({ G, timing: 'loop_start' });
    expect(getToken(G.v1.mastermind, 'despair')).toBe(1);
  });

  it('ll_x_factor adds intrigue to factor location and respects per-loop limit', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { office_worker: 'factor' };
    G.v1.locations.city = { tokens: createEmptyTokenBag() };

    const processor = getProcessor('ll_x_factor_intrigue_ability')!;

    let result = processor.check({ G, timing: 'mastermind_ability' });
    expect(result.triggered).toBe(true);
    processor.execute({ G, timing: 'mastermind_ability' });
    expect(getToken(G.v1.locations.city, 'intrigue')).toBe(1);

    result = processor.check({ G, timing: 'mastermind_ability' });
    expect(result.triggered).toBe(false);
  });

  it('queues LL watcher final-day death check as an optional day_end ability', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.v1.settings.autoResolve = true;
    G.day = 4;
    G.daysPerLoop = 4;
    G.v1.characters = {
      watcher: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), hope: 1 } },
    };
    G.v1.hiddenRoles = { watcher: 'watcher' };
    G.v1.activeRuleDefinitions = buildActiveRules('last_liar', ['ll_devils_script'], G.v1.hiddenRoles, []);

    (phases.day_end.onBegin as any)({ G, events: { endPhase: vi.fn(), setPhase: vi.fn() } });

    expect(G.v1.pendingAbilities).toEqual([
      expect.objectContaining({
        ruleId: 'll_devils_script_watcher_day_end',
        phase: 'day_end',
        mandatory: false,
      }),
    ]);
  });

  it('kills protagonists when confirming LL watcher final-day death check with one or fewer tokens', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'last_liar' } as any;
    G.day = 4;
    G.daysPerLoop = 4;
    G.v1.characters = {
      watcher: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), hope: 1 } },
    };
    G.v1.hiddenRoles = { watcher: 'watcher' };
    G.v1.pendingAbilities = [{
      id: 'll_devils_script_watcher_day_end:global',
      ruleId: 'll_devils_script_watcher_day_end',
      characterId: '',
      timing: 'day_end',
      phase: 'day_end',
      mandatory: false,
      description: '恶魔的剧本：最终日监视者指示物≤1，可发动主人公死亡',
      targetSlots: [],
    }];

    const result = (moves.confirmAbility as any)(
      { G, ctx: { phase: 'day_end' }, events: { endPhase: vi.fn(), setPhase: vi.fn() }, playerID: '0' },
      'll_devils_script_watcher_day_end:global',
    );

    expect(result).toBeUndefined();
    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('ninja assassinates a target with intrigue >= 2 at same location', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      boy_student: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      girl_student: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    };
    G.v1.hiddenRoles = { boy_student: 'ninja' };

    const processor = getProcessor('mz_ninja_assassinate')!;
    const result = processor.check({ G, timing: 'day_end', characterId: 'boy_student' });
    expect(result.triggered).toBe(true);

    processor.execute({ G, timing: 'day_end', characterId: 'boy_student' });
    expect(G.v1.characters.girl_student.alive).toBe(false);
  });

  it('ninja does not assassinate when no target has intrigue >= 2', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      boy_student: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      girl_student: { locationId: 'school', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 1 } },
    };
    G.v1.hiddenRoles = { boy_student: 'ninja' };

    const result = getProcessor('mz_ninja_assassinate')!.check({ G, timing: 'day_end', characterId: 'boy_student' });
    expect(result.triggered).toBe(false);
  });

  it('confession reveals the culprit identity via revealedRoles', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { office_worker: 'brain' };

    const processor = getProcessor('mz_incident_confession')!;
    processor.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'confession', culpritId: 'office_worker' },
    });

    expect(G.v1.loopState.revealedRoles.office_worker).toBe('brain');
  });

  it('top_secret_report triggers loss when brain identity was revealed via confession', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { office_worker: 'brain' };

    // 先触发自白
    getProcessor('mz_incident_confession')!.execute({
      G, timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'confession', culpritId: 'office_worker' },
    });

    // 然后检查绝密报告
    const result = getProcessor('top_secret_report_loop_end_loss')!.check({ G, timing: 'loop_end' });
    expect(result.triggered).toBe(true);
  });

  it('riot kills all characters at city/school with intrigue >= 1', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      culprit: { locationId: 'shrine', alive: true, tokens: createEmptyTokenBag() },
      city_char: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      school_char: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      hospital_char: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {};
    G.v1.locations.city = { tokens: { ...createEmptyTokenBag(), intrigue: 1 } };
    G.v1.locations.school = { tokens: createEmptyTokenBag() };

    const processor = getProcessor('mz_incident_riot')!;
    processor.execute({
      G, timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'riot', culpritId: 'culprit' },
    });

    // 都市有密谋 → 角色死亡
    expect(G.v1.characters.city_char.alive).toBe(false);
    // 学校无密谋 → 角色存活
    expect(G.v1.characters.school_char.alive).toBe(true);
    // 医院不受影响
    expect(G.v1.characters.hospital_char.alive).toBe(true);
  });

  it('forged_incident kills protagonists when culprit initial area has intrigue >= 2', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    // office_worker 初始区域是 city
    G.v1.characters = {
      office_worker: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {};
    G.v1.locations.city = { tokens: { ...createEmptyTokenBag(), intrigue: 2 } };

    const processor = getProcessor('mz_incident_forged_incident')!;
    processor.execute({
      G, timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'forged_incident', culpritId: 'office_worker' },
    });

    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('builds manual breaking_the_board slot as character_or_location target', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      police_officer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'breaking_the_board' }];
    G.v1.incidentCulprits = { '1_breaking_the_board': 'culprit' };

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const interaction = findPendingIncidentInteraction(G, 'breaking_the_board');
    expect(interaction).toBeTruthy();
    const targetSlot = interaction?.targetSlots?.find((slot: any) => slot.slotId === 'target');
    expect(targetSlot?.kind).toBe('character_or_location');
    expect(targetSlot?.eligibleLocationIds).toEqual(expect.arrayContaining(['school']));
    expect(targetSlot?.eligibleCharacterIds).toEqual(expect.arrayContaining(['police_officer']));
  });

  it('breaking_the_board removes up to 2 intrigue from a chosen location via target slot', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations.school = { tokens: { ...createEmptyTokenBag(), intrigue: 3 } };

    const processor = getProcessor('mz_incident_breaking_the_board')!;
    processor.execute({
      G, timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'breaking_the_board', culpritId: 'culprit' },
      selectedTargets: { target: 'school' },
    });

    expect(getToken(G.v1.locations.school, 'intrigue')).toBe(1);
  });

  it('builds manual conspiracy_activity slots for branch choice and targets', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      police_officer: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'conspiracy_activity' }];
    G.v1.incidentCulprits = { '1_conspiracy_activity': 'office_worker' };

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const interaction = findPendingIncidentInteraction(G, 'conspiracy_activity');
    expect(interaction).toBeTruthy();
    expect(interaction?.targetSlots?.map((slot: any) => slot.slotId)).toEqual(
      expect.arrayContaining(['incidentChoice', 'target', 'location']),
    );
    const choiceSlot = interaction?.targetSlots?.find((slot: any) => slot.slotId === 'incidentChoice');
    expect(choiceSlot?.eligibleChoices?.map((choice: any) => choice.id)).toEqual(
      expect.arrayContaining(['serial_murder', 'missing_person']),
    );
  });

  it('resolves MZ conspiracy_activity missing_person as move plus intrigue instead of removal', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;

    getProcessor('mz_incident_conspiracy_activity')!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'conspiracy_activity', culpritId: 'office_worker' },
      selectedTargets: { incidentChoice: 'missing_person', location: 'school' },
    });

    expect(G.v1.characters.office_worker.locationId).toBe('school');
    expect(getToken(G.v1.locations.school, 'intrigue')).toBe(1);
    expect(G.v1.loopState.abilityUsage.__removed_from_board_office_worker).toBeUndefined();
  });

  it('lets MZ ninja confession use false claim through reveal tracking', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      office_worker: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { office_worker: 'ninja' };
    G.v1.activeRuleDefinitions = buildActiveRules('midnight_zone', [], G.v1.hiddenRoles, []);

    getProcessor('mz_incident_confession')!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'confession', culpritId: 'office_worker' },
    });

    expect(G.v1.loopState.revealedRoles.office_worker).toBe('serial_killer');
  });

  it('reveals a dead ninja as ninja for forensic_scientist_gw5', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      forensic_scientist: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      office_worker: { locationId: 'city', alive: false, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { office_worker: 'ninja' };
    G.v1.activeRuleDefinitions = buildActiveRules('midnight_zone', [], G.v1.hiddenRoles, []);

    executeGoodwillAbility(G, 'forensic_scientist', 'forensic_scientist_gw5');

    expect(G.v1.loopState.revealedRoles.office_worker).toBe('ninja');
  });

  it('flags a_mans_battle scripts when ninja is assigned to a non-male character', () => {
    const invalidIssues = getScriptValidationIssues({
      id: 'mz_invalid_ninja_gender',
      tragedySetId: 'midnight_zone',
      mainPlotId: 'a_mans_battle',
      subplotIds: [],
      cast: [{ characterId: 'boy_student', roleId: 'ninja' }],
      incidents: [],
    } as any);
    const validIssues = getScriptValidationIssues({
      id: 'mz_valid_ninja_gender',
      tragedySetId: 'midnight_zone',
      mainPlotId: 'a_mans_battle',
      subplotIds: [],
      cast: [{ characterId: 'office_worker', roleId: 'ninja' }],
      incidents: [],
    } as any);

    expect(invalidIssues).toContain('a_mans_battle_male_requirement');
    expect(validIssues).not.toContain('a_mans_battle_male_requirement');
  });

  it('flags MZ scripts where compulsive is not assigned as any incident culprit', () => {
    const invalidIssues = getScriptValidationIssues({
      id: 'mz_invalid_compulsive_culprit',
      tragedySetId: 'midnight_zone',
      mainPlotId: 'the_sealed_item',
      subplotIds: [],
      cast: [
        { characterId: 'office_worker', roleId: 'compulsive' },
        { characterId: 'boy_student', roleId: 'brain' },
      ],
      incidents: [
        { day: 1, incidentId: 'suicide', culpritCharacterId: 'boy_student' },
      ],
    } as any);
    const validIssues = getScriptValidationIssues({
      id: 'mz_valid_compulsive_culprit',
      tragedySetId: 'midnight_zone',
      mainPlotId: 'the_sealed_item',
      subplotIds: [],
      cast: [
        { characterId: 'office_worker', roleId: 'compulsive' },
        { characterId: 'boy_student', roleId: 'brain' },
      ],
      incidents: [
        { day: 1, incidentId: 'suicide', culpritCharacterId: 'office_worker' },
      ],
    } as any);

    expect(invalidIssues).toContain('mz_compulsive_incident_target');
    expect(validIssues).not.toContain('mz_compulsive_incident_target');
  });

  it('flags song_of_destruction scripts without any suicide incident', () => {
    const invalidIssues = getScriptValidationIssues({
      id: 'mz_invalid_song_of_destruction',
      tragedySetId: 'midnight_zone',
      mainPlotId: 'song_of_destruction',
      subplotIds: [],
      cast: [
        { characterId: 'office_worker', roleId: 'prophet' },
        { characterId: 'boy_student', roleId: 'brain' },
      ],
      incidents: [
        { day: 1, incidentId: 'missing_person', culpritCharacterId: 'boy_student' },
      ],
    } as any);
    const validIssues = getScriptValidationIssues({
      id: 'mz_valid_song_of_destruction',
      tragedySetId: 'midnight_zone',
      mainPlotId: 'song_of_destruction',
      subplotIds: [],
      cast: [
        { characterId: 'office_worker', roleId: 'prophet' },
        { characterId: 'boy_student', roleId: 'brain' },
      ],
      incidents: [
        { day: 1, incidentId: 'suicide', culpritCharacterId: 'boy_student' },
      ],
    } as any);

    expect(invalidIssues).toContain('song_of_destruction_suicide_incident');
    expect(validIssues).not.toContain('song_of_destruction_suicide_incident');
  });

  it('applies bonds_of_karma Ex key_person conversion during loop_start', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.loopIndex = 1;
    G.v1.settings.autoResolve = true;
    G.v1.characters = {
      office_worker: {
        locationId: 'city',
        alive: true,
        exCardCount: 0,
        tokens: { ...createEmptyTokenBag(), paranoia: 3 },
      } as any,
    };
    G.v1.hiddenRoles = { office_worker: 'friend' };
    G.v1.activePlots = ['bonds_of_karma'];
    G.v1.scheduledIncidents = [];
    G.v1.loopState.lastLoopDeadCharacters = ['office_worker'];
    G.v1.activeRuleDefinitions = buildActiveRules('midnight_zone', ['bonds_of_karma'], G.v1.hiddenRoles, []);

    (phases as any).loop_setup.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(G.v1.characters.office_worker.exCardCount).toBe(1);
    expect(G.v1.hiddenRoles.office_worker).toBe('key_person');
    expect(G.v1.originalRoles?.office_worker).toBe('friend');
  });

  it('applies bonds_of_karma Ex key_person conversion after faked_suicide', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'midnight_zone' } as any;
    G.v1.characters = {
      office_worker: {
        locationId: 'city',
        alive: true,
        exCardCount: 0,
        tokens: createEmptyTokenBag(),
      } as any,
    };
    G.v1.hiddenRoles = { office_worker: 'friend' };
    G.v1.activePlots = ['bonds_of_karma'];
    G.v1.activeRuleDefinitions = buildActiveRules('midnight_zone', ['bonds_of_karma'], G.v1.hiddenRoles, []);

    getProcessor('mz_incident_faked_suicide')!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'faked_suicide', culpritId: 'office_worker' },
    });

    expect(G.v1.characters.office_worker.exCardCount).toBe(1);
    expect(G.v1.hiddenRoles.office_worker).toBe('key_person');
    expect(G.v1.originalRoles?.office_worker).toBe('friend');
  });

  it('keeps mastermind_abilities open after finishing the last optional ability', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingAbilities = [{
      id: 'optional-ability',
      ruleId: 'test_optional_ability',
      characterId: 'doctor',
      timing: 'mastermind_ability',
      phase: 'mastermind_abilities',
      mandatory: false,
      description: 'test',
      targetSlots: [],
    }];
    G.v1.abilityPhase = 'optional';

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    const result = (moves.finishAbilities as any)({
      G,
      ctx: { phase: 'mastermind_abilities' },
      events,
      playerID: '0',
    });

    expect(result).toBeUndefined();
    expect(G.v1.pendingAbilities).toEqual([]);
    expect(G.v1.abilityPhase).toBe('done');
    expect(events.endPhase).not.toHaveBeenCalled();
  });

  it('keeps incidents open after resolving the last queued incident', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.pendingIncidents = [{
      id: 'manual-incident',
      day: 1,
      incidentId: 'murder',
      culpritId: 'missing_culprit',
      targetSlots: [],
    }];

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    const result = (moves.resolveIncident as any)(
      { G, ctx: { phase: 'incidents' }, events, playerID: '0' },
      'manual-incident',
      false,
      {},
    );

    expect(result).toBeUndefined();
    expect(events.endPhase).not.toHaveBeenCalled();
    expect(events.setPhase).not.toHaveBeenCalled();
  });

  it('waits for explicit NEXT after loop_end_check finishes evaluating progression', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.loopLost = true;
    G.loopIndex = 0;
    G.maxLoops = 3;

    const events = { endPhase: vi.fn(), setPhase: vi.fn() };
    (phases.loop_end_check.onBegin as any)({ G, events });

    expect(events.endPhase).not.toHaveBeenCalled();
    expect(G.loopIndex).toBe(1);

    const blockedAdvance = (moves.advancePhase as any)({
      G,
      ctx: { phase: 'loop_end_check' },
      events,
      playerID: '0',
    });

    expect(blockedAdvance).toBe(INVALID_MOVE);

    const confirmResult = (moves.confirmLoopResult as any)({
      G,
      ctx: { phase: 'loop_end_check' },
      playerID: '0',
    });

    expect(confirmResult).toBeUndefined();

    const result = (moves.advancePhase as any)({
      G,
      ctx: { phase: 'loop_end_check' },
      events,
      playerID: '0',
    });

    expect(result).toBeUndefined();
    expect(events.endPhase).toHaveBeenCalledOnce();
  });
});
