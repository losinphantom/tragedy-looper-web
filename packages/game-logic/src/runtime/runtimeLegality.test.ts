import { describe, expect, it, vi } from 'vitest';
import { INVALID_MOVE } from 'boardgame.io/core';

import { TragedyLooper } from '../game';
import type { TragedyGameState } from '../game';
import { getIncidentTriggerStatus } from '../engine/autoResolve';
import { moves } from '../moves';
import { phases } from '../phases';
import { getProcessor } from '../ruleEngine';
import { buildIncidentTargetSlots } from './incidents';
import { createEmptyTokenBag, getToken } from '../utils/tokenHelpers';

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

describe('runtime legality for incident targeting', () => {
  it('limits missing_person locations to legal destinations and allows staying in place', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      patient: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'missing_person' }];
    G.v1.incidentCulprits = { '1_missing_person': 'patient' };

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const slot = findPendingIncidentInteraction(G, 'missing_person')?.targetSlots?.[0];
    expect(slot?.eligibleLocationIds).toContain('hospital');
    expect(slot?.eligibleLocationIds).not.toContain('city');
    expect(slot?.eligibleLocationIds).not.toContain('school');
    expect(slot?.eligibleLocationIds).not.toContain('shrine');
  });

  it('keeps missing_person fallback on a legal location when no target is selected', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      patient: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;

    const processor = getProcessor('incident_missing_person_effect');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'missing_person',
        culpritId: 'patient',
      },
    });

    expect(G.v1.characters.patient.locationId).toBe('hospital');
    expect(getToken(G.v1.locations.hospital as any, 'intrigue')).toBe(1);
  });

  it('treats FS hospital_incident as occurring with no effect when the hospital has no intrigue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      patient: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      hospital: { tokens: createEmptyTokenBag() },
    } as any;

    const processor = getProcessor('incident_hospital_incident_effect');
    expect(processor).toBeTruthy();

    const check = processor!.check({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'hospital_incident',
        culpritId: 'patient',
      },
    });
    expect(check.triggered).toBe(true);

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'hospital_incident',
        culpritId: 'patient',
      },
    });

    expect(G.v1.characters.patient.alive).toBe(true);
    expect(G.v1.protagonistKilled).toBe(false);
    expect(G.publicLog).toContain('📋 医院恐惧事件发生但没有现象');
  });

  it('keeps FS hospital_incident public logs generic when a key person dies there', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      patient: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      patient: 'key_person',
    };
    G.v1.locations = {
      hospital: { tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    } as any;

    const processor = getProcessor('incident_hospital_incident_effect');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'hospital_incident',
        culpritId: 'patient',
      },
    });

    expect(G.v1.characters.patient.alive).toBe(false);
    expect(G.v1.characters.witness.alive).toBe(false);
    expect(G.v1.protagonistKilled).toBe(true);
    expect(G.publicLog.some(line => line.includes('关键人物'))).toBe(false);
  });

  it('adds the current AHR hospital_incident extra protagonist death at hospital intrigue 2+', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      hospital: { tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    } as any;

    const processor = getProcessor('ahr_incident_hospital_incident');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'hospital_incident',
        culpritId: 'culprit',
      },
    });

    expect(G.v1.characters.culprit.alive).toBe(false);
    expect(G.v1.characters.witness.alive).toBe(false);
    expect(G.v1.protagonistKilled).toBe(true);
  });

  it('does not trigger lover-linked +6 paranoia when hospital_incident kills the BTX pair simultaneously', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      loved: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
      suitor: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      loved: 'loved_one',
      suitor: 'lover',
    };
    G.v1.locations = {
      hospital: { tokens: { ...createEmptyTokenBag(), intrigue: 2 } },
    } as any;

    const processor = getProcessor('incident_hospital_incident_effect');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'hospital_incident',
        culpritId: 'loved',
      },
    });

    expect(G.v1.characters.loved.alive).toBe(false);
    expect(G.v1.characters.suitor.alive).toBe(false);
    expect(getToken(G.v1.characters.suitor, 'paranoia')).toBe(0);
    expect(G.publicLog.some(line => line.includes('极度不安'))).toBe(false);
  });

  it('applies the BTX lover +6 paranoia link when hospital_incident kills only the loved one', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      loved: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
      suitor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      loved: 'loved_one',
      suitor: 'lover',
    };
    G.v1.locations = {
      hospital: { tokens: { ...createEmptyTokenBag(), intrigue: 1 } },
      city: { tokens: createEmptyTokenBag() },
    } as any;

    const processor = getProcessor('incident_hospital_incident_effect');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'hospital_incident',
        culpritId: 'loved',
      },
    });

    expect(G.v1.characters.loved.alive).toBe(false);
    expect(getToken(G.v1.characters.suitor, 'paranoia')).toBe(6);
    expect(G.publicLog.some(line => line.includes('极度不安'))).toBe(true);
  });

  it('kills the AHR system_error culprit only when they have intrigue', () => {
    const processor = getProcessor('ahr_incident_system_error');
    expect(processor).toBeTruthy();

    const triggered = TragedyLooper.setup!({} as any) as TragedyGameState;
    triggered.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 1 },
      },
    };

    const triggeredCheck = processor!.check({
      G: triggered,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'system_error', culpritId: 'culprit' },
    });
    expect(triggeredCheck.triggered).toBe(true);

    processor!.execute({
      G: triggered,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'system_error', culpritId: 'culprit' },
    });
    expect(triggered.v1.characters.culprit.alive).toBe(false);

    const skipped = TragedyLooper.setup!({} as any) as TragedyGameState;
    skipped.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    const skippedCheck = processor!.check({
      G: skipped,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'system_error', culpritId: 'culprit' },
    });
    expect(skippedCheck.triggered).toBe(false);

    processor!.execute({
      G: skipped,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'system_error', culpritId: 'culprit' },
    });
    expect(skipped.v1.characters.culprit.alive).toBe(true);
  });

  it('kills the current AHR last_will culprit and stores next-loop hope', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    const processor = getProcessor('ahr_incident_last_will');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'last_will', culpritId: 'culprit' },
    });

    expect(G.v1.characters.culprit.alive).toBe(false);
    expect(G.v1.loopState.lastWillHopeNextLoop).toBe(true);
  });

  it('marks a current AHR world shift after dimension_shift resolves while the culprit is alive', () => {
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
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'dimension_shift', culpritId: 'culprit' },
    });

    expect(G.v1.ex.gauge).toBe(0);
    expect(G.v1.loopState.abilityUsage.__ahr_world_shift_today?.usedToday).toBe(true);
  });

  it('applies AHR bizarre_murder as serial_murder plus increasing_unease', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victim: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      paranoid: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      schemer: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };

    const processor = getProcessor('ahr_incident_bizarre_murder');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'bizarre_murder', culpritId: 'culprit' },
      selectedTargets: {
        murderTarget: 'victim',
        paranoiaTarget: 'paranoid',
        intrigueTarget: 'schemer',
      },
    });

    expect(G.v1.characters.victim.alive).toBe(false);
    expect(getToken(G.v1.characters.paranoid, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.schemer, 'intrigue')).toBe(1);
  });

  it('kills an AHR illusion when bizarre_murder pushes its paranoia to 3', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      victim: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      illusion: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1 },
      },
      schemer: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      illusion: 'illusion',
    };

    const processor = getProcessor('ahr_incident_bizarre_murder');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'bizarre_murder', culpritId: 'culprit' },
      selectedTargets: {
        murderTarget: 'victim',
        paranoiaTarget: 'illusion',
        intrigueTarget: 'schemer',
      },
    });

    expect(getToken(G.v1.characters.illusion, 'paranoia')).toBe(3);
    expect(G.v1.characters.illusion.alive).toBe(false);
  });

  it('clears AHR magician paranoia when they die', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      magician: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
      },
    };
    G.v1.hiddenRoles = {
      magician: 'magician',
    };
    G.v1.locations = {
      hospital: { tokens: { ...createEmptyTokenBag(), intrigue: 1 } },
    } as any;

    getProcessor('incident_hospital_incident_effect')!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'hospital_incident', culpritId: 'magician' },
    });

    expect(G.v1.characters.magician.alive).toBe(false);
    expect(getToken(G.v1.characters.magician, 'paranoia')).toBe(0);
  });

  it('allows FS spreading to select characters with one or zero goodwill', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      patient: {
        locationId: 'hospital',
        alive: true,
        tokens: { ...createEmptyTokenBag(), goodwill: 1 },
      },
      doctor: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    const processor = getProcessor('incident_spreading_effect');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'spreading',
        culpritId: 'patient',
      },
      selectedTargets: {
        fromCharacter: 'patient',
        toCharacter: 'doctor',
      },
    });

    expect(getToken(G.v1.characters.patient, 'goodwill')).toBe(0);
    expect(getToken(G.v1.characters.doctor, 'goodwill')).toBe(2);
  });

  it('applies only the paranoia half of FS increasing_unease when there is one living character', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      patient: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };

    const processor = getProcessor('incident_increasing_unease_effect');
    expect(processor).toBeTruthy();

    processor!.execute({
      G,
      timing: 'incident_resolve',
      incident: {
        day: 1,
        incidentId: 'increasing_unease',
        culpritId: 'patient',
      },
      selectedTargets: {
        paranoiaTarget: 'patient',
      },
    });

    expect(getToken(G.v1.characters.patient, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.patient, 'intrigue')).toBe(0);
  });

  it('includes the culprit in faraway_murder targets when the culprit has enough intrigue', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 2 },
      },
      witness: {
        locationId: 'school',
        alive: true,
        tokens: { ...createEmptyTokenBag(), intrigue: 2 },
      },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'faraway_murder' }];
    G.v1.incidentCulprits = { '1_faraway_murder': 'culprit' };

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const slot = findPendingIncidentInteraction(G, 'faraway_murder')?.targetSlots?.[0];
    expect(slot?.eligibleCharacterIds).toContain('culprit');
    expect(slot?.eligibleCharacterIds).toContain('witness');
  });

  it('keeps the BTX butterfly_effect culprit in the eligible runtime target list', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'butterfly_effect' }];
    G.v1.incidentCulprits = { '1_butterfly_effect': 'culprit' };

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const slot = findPendingIncidentInteraction(G, 'butterfly_effect')?.targetSlots?.[0];
    expect(slot?.eligibleCharacterIds).toContain('culprit');
    expect(slot?.eligibleCharacterIds).toContain('witness');
  });

  it('allows brain target slots to include the role holder themselves', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.settings.autoResolve = false;
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.activeRuleDefinitions = [{
      ruleId: 'brain_intrigue_ability',
      timing: 'mastermind_ability',
      mandatory: false,
      characterId: 'doctor',
      source: 'test',
    }];

    (phases as any).mastermind_abilities.onBegin({
      G,
      events: { endPhase: vi.fn() },
    });

    const slot = G.v1.pendingAbilities[0]?.targetSlots?.[0];
    expect(slot?.eligibleCharacterIds).toContain('doctor');
    expect(slot?.eligibleCharacterIds).toContain('witness');
  });

  it('builds character target slots for current AHR light_in_the_gap and darkness_of_despair', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };

    expect(buildIncidentTargetSlots(G, 'light_in_the_gap', 'culprit')).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'target']),
      }),
    ]);
    expect(buildIncidentTargetSlots(G, 'darkness_of_despair', 'culprit')).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'target']),
      }),
    ]);
  });

  it('builds choice and character target slots for current AHR dimension_warp', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      fearful: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      friendly: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };

    expect(buildIncidentTargetSlots(G, 'dimension_warp', 'culprit')).toEqual([
      expect.objectContaining({
        slotId: 'worldShiftChoice',
        kind: 'choice',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'shift' }),
          expect.objectContaining({ id: 'no_shift' }),
        ]),
      }),
      expect.objectContaining({
        slotId: 'paranoiaTarget',
        kind: 'character',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'fearful', 'friendly']),
      }),
      expect.objectContaining({
        slotId: 'goodwillTarget',
        kind: 'character',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'fearful', 'friendly']),
      }),
    ]);
  });

  it('builds a choice target slot for current AHR dimension_fault', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    expect(buildIncidentTargetSlots(G, 'dimension_fault', 'culprit')).toEqual([
      expect.objectContaining({
        slotId: 'worldShiftChoice',
        kind: 'choice',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'shift' }),
          expect.objectContaining({ id: 'no_shift' }),
        ]),
      }),
    ]);
  });

  it('builds same-area character and location target slots for current AHR lost_item', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      nearby: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      far: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };

    expect(buildIncidentTargetSlots(G, 'lost_item', 'culprit')).toEqual([
      expect.objectContaining({
        slotId: 'intrigueTarget',
        kind: 'character',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'nearby']),
      }),
      expect.objectContaining({
        slotId: 'location',
        kind: 'location',
        eligibleLocationIds: expect.arrayContaining(['city', 'school', 'hospital', 'shrine']),
      }),
    ]);
  });

  it('brain and conspiracy_theorist executions honor self-target selections', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
    } as any;

    const brain = getProcessor('brain_intrigue_ability');
    const theorist = getProcessor('conspiracy_theorist_unease_ability');
    expect(brain).toBeTruthy();
    expect(theorist).toBeTruthy();

    brain!.execute({
      G,
      timing: 'mastermind_ability',
      characterId: 'doctor',
      selectedTargets: { target: 'doctor' },
    });
    theorist!.execute({
      G,
      timing: 'mastermind_ability',
      characterId: 'doctor',
      selectedTargets: { target: 'doctor' },
    });

    expect(getToken(G.v1.characters.doctor, 'intrigue')).toBe(1);
    expect(getToken(G.v1.characters.doctor, 'paranoia')).toBe(1);
  });

  it('applies MC trigger threshold modifiers for omen, bizarre_murder, and strychnine tincture', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2, intrigue: 1 },
      },
    };
    G.v1.activeRuleDefinitions = [{
      ruleId: 'strychnine_tincture_intrigue_is_unease',
      timing: 'incident_resolve',
      mandatory: true,
      source: 'plot:strychnine_tincture',
    }];

    expect(getIncidentTriggerStatus(G, 1, 'omen', 'culprit').shouldTrigger).toBe(true);
    expect(getIncidentTriggerStatus(G, 1, 'bizarre_murder', 'culprit').shouldTrigger).toBe(false);
    expect(getIncidentTriggerStatus(G, 1, 'suicide', 'culprit').shouldTrigger).toBe(true);
    expect(getIncidentTriggerStatus(G, 1, 'serial_murder', 'culprit').shouldTrigger).toBe(true);
  });

  it('applies the current AHR impulse_murder lower trigger threshold and same-area target slot', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 2 },
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

    expect(getIncidentTriggerStatus(G, 1, 'impulse_murder', 'culprit').shouldTrigger).toBe(true);
    expect(buildIncidentTargetSlots(G, 'impulse_murder', 'culprit')).toEqual([
      expect.objectContaining({
        slotId: 'target',
        kind: 'character',
        eligibleCharacterIds: ['nearby'],
      }),
    ]);
  });

  it('applies the current AHR imaginary_incident intrigue trigger and combined target contract', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.scriptOpen = { tragedySetId: 'another_horizon_revised' } as any;
    G.v1.characters = {
      culprit: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 3, intrigue: 2 },
      },
      nearby: {
        locationId: 'city',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
      friendly: {
        locationId: 'school',
        alive: true,
        tokens: createEmptyTokenBag(),
      },
    };

    expect(getIncidentTriggerStatus(G, 1, 'imaginary_incident', 'culprit').shouldTrigger).toBe(false);

    G.v1.characters.culprit.tokens.intrigue = 3;

    expect(getIncidentTriggerStatus(G, 1, 'imaginary_incident', 'culprit').shouldTrigger).toBe(true);
    expect(buildIncidentTargetSlots(G, 'imaginary_incident', 'culprit')).toEqual([
      expect.objectContaining({
        slotId: 'incidentChoice',
        kind: 'choice',
        eligibleChoices: expect.arrayContaining([
          expect.objectContaining({ id: 'impulse_murder' }),
          expect.objectContaining({ id: 'dimension_warp' }),
          expect.objectContaining({ id: 'lost_item' }),
        ]),
      }),
      expect.objectContaining({
        slotId: 'murderTarget',
        kind: 'character',
        eligibleCharacterIds: ['nearby'],
      }),
      expect.objectContaining({
        slotId: 'worldShiftChoice',
        kind: 'choice',
      }),
      expect.objectContaining({
        slotId: 'paranoiaTarget',
        kind: 'character',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'nearby', 'friendly']),
      }),
      expect.objectContaining({
        slotId: 'goodwillTarget',
        kind: 'character',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'nearby', 'friendly']),
      }),
      expect.objectContaining({
        slotId: 'intrigueTarget',
        kind: 'character',
        eligibleCharacterIds: expect.arrayContaining(['culprit', 'nearby']),
      }),
      expect.objectContaining({
        slotId: 'location',
        kind: 'location',
        eligibleLocationIds: expect.arrayContaining(['city', 'school', 'hospital', 'shrine']),
      }),
    ]);
  });

  it('uses the twins diagonal area when building incident targets', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.characters = {
      twins: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      shrineWitness: { locationId: 'shrine', alive: true, tokens: createEmptyTokenBag() },
      cityWitness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { twins: 'twins' };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'suspicious_letter' }];
    G.v1.incidentCulprits = { '1_suspicious_letter': 'twins' };
    G.v1.activeRuleDefinitions = [{
      ruleId: 'mc_twins_incident',
      timing: 'always',
      mandatory: true,
      characterId: 'twins',
      source: 'role:twins',
    }];

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    const targetSlot = findPendingIncidentInteraction(G, 'suspicious_letter')?.targetSlots?.find(
      (slot: any) => slot.slotId === 'target',
    );
    expect(targetSlot?.eligibleCharacterIds).toContain('twins');
    expect(targetSlot?.eligibleCharacterIds).toContain('shrineWitness');
    expect(targetSlot?.eligibleCharacterIds).not.toContain('cityWitness');
  });

  it('reuses the shared incident target-slot builder for console-side culprit edits', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.v1.settings.autoResolve = false;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.characters = {
      twins: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      shrineWitness: { locationId: 'shrine', alive: true, tokens: createEmptyTokenBag() },
      cityWitness: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { twins: 'twins' };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;
    G.v1.scheduledIncidents = [{ day: 1, incidentId: 'suspicious_letter' }];
    G.v1.incidentCulprits = { '1_suspicious_letter': 'twins' };
    G.v1.activeRuleDefinitions = [{
      ruleId: 'mc_twins_incident',
      timing: 'always',
      mandatory: true,
      characterId: 'twins',
      source: 'role:twins',
    }];

    (phases as any).incidents.onBegin({
      G,
      events: { endPhase: vi.fn(), setPhase: vi.fn() },
    });

    expect(buildIncidentTargetSlots(G, 'suspicious_letter', 'twins')).toEqual(
      findPendingIncidentInteraction(G, 'suspicious_letter')?.targetSlots ?? [],
    );
  });

  it('suspicious_letter only locks movement on the next day if the card actually moved', () => {
    const moved = TragedyLooper.setup!({} as any) as TragedyGameState;
    moved.day = 1;
    moved.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    moved.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    moved.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;

    const suspiciousLetter = getProcessor('mc_incident_suspicious_letter');
    expect(suspiciousLetter).toBeTruthy();

    suspiciousLetter!.execute({
      G: moved,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'suspicious_letter', culpritId: 'culprit' },
      selectedTargets: { target: 'target', location: 'school' },
    });
    expect(moved.v1.characters.target.locationId).toBe('school');

    moved.day = 2;
    const blockedMove = (moves.moveCharacter as any)(
      { G: moved, playerID: '0' },
      'target',
      'city',
    );
    expect(blockedMove).toBe(INVALID_MOVE);

    moved.day = 3;
    const allowedMove = (moves.moveCharacter as any)(
      { G: moved, playerID: '0' },
      'target',
      'city',
    );
    expect(allowedMove).toBeUndefined();
    expect(moved.v1.characters.target.locationId).toBe('city');

    const unmoved = TragedyLooper.setup!({} as any) as TragedyGameState;
    unmoved.day = 1;
    unmoved.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    unmoved.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    unmoved.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;

    suspiciousLetter!.execute({
      G: unmoved,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'suspicious_letter', culpritId: 'culprit' },
      selectedTargets: { target: 'target', location: 'city' },
    });

    unmoved.day = 2;
    const sameDayMove = (moves.moveCharacter as any)(
      { G: unmoved, playerID: '0' },
      'target',
      'school',
    );
    expect(sameDayMove).toBeUndefined();
    expect(unmoved.v1.characters.target.locationId).toBe('school');
  });

  it('blockade prevents entering or leaving the blocked location for three days', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.day = 1;
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      inside: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      outside: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
    } as any;

    const blockade = getProcessor('mc_incident_blockade');
    expect(blockade).toBeTruthy();

    blockade!.execute({
      G,
      timing: 'incident_resolve',
      incident: { day: 1, incidentId: 'blockade', culpritId: 'culprit' },
      selectedTargets: { location: 'school' },
    });

    expect((moves.moveCharacter as any)({ G, playerID: '0' }, 'inside', 'city')).toBe(INVALID_MOVE);
    expect((moves.moveCharacter as any)({ G, playerID: '0' }, 'outside', 'school')).toBe(INVALID_MOVE);

    G.day = 3;
    expect((moves.moveCharacter as any)({ G, playerID: '0' }, 'inside', 'city')).toBe(INVALID_MOVE);

    G.day = 4;
    expect((moves.moveCharacter as any)({ G, playerID: '0' }, 'inside', 'city')).toBeUndefined();
    expect(G.v1.characters.inside.locationId).toBe('city');
  });

  it('dark_school uses the current loop index as its intrigue threshold baseline', () => {
    const G = TragedyLooper.setup!({} as any) as TragedyGameState;
    G.v1.locations = {
      school: { tokens: createEmptyTokenBag() },
    } as any;

    const darkSchool = getProcessor('dark_school_loop_end_loss');
    expect(darkSchool).toBeTruthy();

    G.loopIndex = 0;
    expect(darkSchool!.check({ G, timing: 'loop_end' }).triggered).toBe(true);

    G.loopIndex = 2;
    G.v1.locations.school.tokens.intrigue = 1;
    expect(darkSchool!.check({ G, timing: 'loop_end' }).triggered).toBe(false);

    G.v1.locations.school.tokens.intrigue = 2;
    expect(darkSchool!.check({ G, timing: 'loop_end' }).triggered).toBe(true);
  });
});
