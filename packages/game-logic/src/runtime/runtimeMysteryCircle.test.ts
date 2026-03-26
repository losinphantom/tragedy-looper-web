import { describe, expect, it, vi } from 'vitest';

import { TragedyLooper } from '../game';
import type { TragedyGameState } from '../game';
import { phases } from '../phases';
import { getIncidentTriggerStatus } from '../engine/autoResolve';
import { getProcessor } from '../ruleEngine';
import { createEmptyTokenBag, getToken } from '../utils/tokenHelpers';
import { getIncidentLocationId } from '../runtime/incidents';

function createLocations(): TragedyGameState['v1']['locations'] {
  return {
    city: { tokens: createEmptyTokenBag() },
    school: { tokens: createEmptyTokenBag() },
    shrine: { tokens: createEmptyTokenBag() },
    hospital: { tokens: createEmptyTokenBag() },
  } as any;
}

function findPendingIncidentInteraction(
  G: TragedyGameState,
  incidentId: string,
): any {
  return ((G.v1.pendingInteractions || []) as any[]).find(
    interaction => interaction.kind === 'incident_resolution' && interaction.incidentId === incidentId,
  );
}

describe('Mystery Circle runtime coverage', () => {
  it('builds target slots for omen and bizarre_murder during incidents', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      ally: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      outsider: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = createLocations();
    G.v1.scheduledIncidents = [
      { day: 1, incidentId: 'omen' },
      { day: 1, incidentId: 'bizarre_murder' },
    ];
    G.v1.incidentCulprits = {
      '1_omen': 'culprit',
      '1_bizarre_murder': 'culprit',
    };

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const omen = findPendingIncidentInteraction(G, 'omen');
    const bizarre = findPendingIncidentInteraction(G, 'bizarre_murder');
    expect(omen?.targetSlots[0]?.eligibleCharacterIds).toEqual(['culprit', 'ally']);
    expect(bizarre?.targetSlots.map((slot: any) => slot.slotId)).toEqual([
      'murderTarget',
      'paranoiaTarget',
      'intrigueTarget',
    ]);
  });

  it('lets strychnine_tincture treat intrigue as paranoia for serial_murder trigger checks', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.activePlots = ['strychnine_tincture'];
    G.v1.activeRuleDefinitions = [{
      ruleId: 'strychnine_tincture_intrigue_is_unease',
      timing: 'incident_resolve',
      mandatory: true,
      source: 'plot:strychnine_tincture',
    }];
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 10 },
      },
    };

    const withoutPlot = TragedyLooper.setup!({} as any) as TragedyGameState;
    withoutPlot.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    withoutPlot.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 10 },
      },
    };

    expect(getIncidentTriggerStatus(withoutPlot, 1, 'serial_murder', 'culprit').shouldTrigger).toBe(false);
    expect(getIncidentTriggerStatus(G, 1, 'serial_murder', 'culprit').shouldTrigger).toBe(true);
  });

  it('applies dark_school loss threshold using current loop and fails automatically on the first loop', () => {
    const processor = getProcessor('dark_school_loop_end_loss');
    expect(processor).toBeTruthy();

    const firstLoop = TragedyLooper.setup!({} as any) as TragedyGameState;
    firstLoop.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    firstLoop.loopIndex = 0;
    firstLoop.v1.locations = createLocations();

    const firstCheck = processor!.check({
      G: firstLoop,
      timing: 'loop_end',
    });
    expect(firstCheck.triggered).toBe(true);

    const secondLoop = TragedyLooper.setup!({} as any) as TragedyGameState;
    secondLoop.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    secondLoop.loopIndex = 1;
    secondLoop.v1.locations = createLocations();
    secondLoop.v1.locations.school.tokens.intrigue = 0;
    expect(processor!.check({ G: secondLoop, timing: 'loop_end' }).triggered).toBe(false);
    secondLoop.v1.locations.school.tokens.intrigue = 1;
    expect(processor!.check({ G: secondLoop, timing: 'loop_end' }).triggered).toBe(true);
  });

  it('resolves twins incidents from the diagonal location for hospital_incident', () => {
    const processor = getProcessor('incident_hospital_incident_effect');
    expect(processor).toBeTruthy();

    const diagonalIn = TragedyLooper.setup!({} as any) as TragedyGameState;
    diagonalIn.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    diagonalIn.v1.hiddenRoles = { culprit: 'twins' };
    diagonalIn.v1.locations = createLocations();
    diagonalIn.v1.locations.hospital.tokens.intrigue = 1;
    diagonalIn.v1.characters = {
      culprit: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    processor!.execute({
      G: diagonalIn,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'hospital_incident', culpritId: 'culprit' },
    });
    expect(diagonalIn.v1.characters.culprit.alive).toBe(false);

    const diagonalOut = TragedyLooper.setup!({} as any) as TragedyGameState;
    diagonalOut.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    diagonalOut.v1.hiddenRoles = { culprit: 'twins' };
    diagonalOut.v1.locations = createLocations();
    diagonalOut.v1.locations.hospital.tokens.intrigue = 1;
    diagonalOut.v1.characters = {
      culprit: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    processor!.execute({
      G: diagonalOut,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'hospital_incident', culpritId: 'culprit' },
    });
    expect(diagonalOut.v1.characters.culprit.alive).toBe(true);
  });

  it('implements omen, bizarre_murder, terrorist_attack, silver_bullet and suspicious_letter core effects', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.locations = createLocations();
    G.v1.locations.city.tokens.intrigue = 2;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      ally: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victim: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
      witness: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };

    getProcessor('mc_incident_omen')!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'omen', culpritId: 'culprit' },
      selectedTargets: { target: 'ally' },
    });
    expect(getToken(G.v1.characters.ally, 'paranoia')).toBe(1);

    getProcessor('mc_incident_bizarre_murder')!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'bizarre_murder', culpritId: 'culprit' },
      selectedTargets: {
        murderTarget: 'victim',
        paranoiaTarget: 'ally',
        intrigueTarget: 'witness',
      },
    });
    expect(G.v1.characters.victim.alive).toBe(false);
    expect(getToken(G.v1.characters.ally, 'paranoia')).toBe(3);
    expect(getToken(G.v1.characters.witness, 'intrigue')).toBe(1);

    getProcessor('mc_incident_terrorist_attack')!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'terrorist_attack', culpritId: 'culprit' },
    });
    expect(G.v1.characters.culprit.alive).toBe(false);
    expect(G.v1.protagonistKilled).toBe(true);

    const silver = TragedyLooper.setup!({} as any) as TragedyGameState;
    silver.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    getProcessor('mc_incident_silver_bullet')!.execute({
      G: silver,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'silver_bullet', culpritId: 'culprit' },
    });
    expect(silver.v1.loopLost).toBe(true);

    const letter = TragedyLooper.setup!({} as any) as TragedyGameState;
    letter.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    letter.loopIndex = 0;
    letter.day = 1;
    letter.v1.locations = createLocations();
    letter.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      ally: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    getProcessor('mc_incident_suspicious_letter')!.execute({
      G: letter,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'suspicious_letter', culpritId: 'culprit' },
      selectedTargets: { target: 'ally', location: 'school' },
    });
    expect(letter.v1.characters.ally.locationId).toBe('school');
    expect(letter.v1.movementRestrictions.immobileCharacters.ally).toBe(2);
  });

  it('compulsive role forces incident trigger regardless of paranoia', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.hiddenRoles = { culprit: 'compulsive' };
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    // 不安为 0 — 普通角色不触发，强迫症必定触发
    const result = getIncidentTriggerStatus(G, 1, 'suicide', 'culprit');
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toContain('强迫症');
  });

  it('detective at Ex=0 forces incident trigger when co-located with culprit', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.ex = { enabled: true, gauge: 0, changedThisLoop: false, lastLoopEndGauge: 0 };
    G.v1.hiddenRoles = { detective: 'detective' };
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      detective: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    // 不安 0 + 侦探同区 + Ex=0 → 事件必发
    const result = getIncidentTriggerStatus(G, 1, 'suicide', 'culprit');
    expect(result.shouldTrigger).toBe(true);
    expect(result.reason).toContain('侦探');

    // Ex=1 → 侦探不强制
    G.v1.ex.gauge = 1;
    const result2 = getIncidentTriggerStatus(G, 1, 'suicide', 'culprit');
    expect(result2.shouldTrigger).toBe(false);
  });

  it('getIncidentLocationId returns diagonal for twins culprit', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.hiddenRoles = { twin: 'twins' };
    G.v1.characters = {
      twin: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    // school ↔ hospital (对角线)
    expect(getIncidentLocationId(G, 'twin')).toBe('hospital');

    // 非双胞胎 → 返回原始位置
    G.v1.hiddenRoles = { twin: 'person' };
    expect(getIncidentLocationId(G, 'twin')).toBe('school');
  });
});
