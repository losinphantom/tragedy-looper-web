import { describe, expect, it } from 'vitest';

import './scriptLoader';
import { classifyContentPackage } from './contentPackageCompliance';

describe('content package compliance', () => {
  it('classifies content package module ownership as compliant when one script resolves to one owning module', () => {
    const result = classifyContentPackage({
      id: 'traditional_ensemble_murder',
      title: 'Traditional Ensemble Murder',
      moduleId: 'basic-tragedy',
      tragedySetId: 'basic_tragedy',
      loops: 4,
      daysPerLoop: 7,
      scriptSpecialRules: [],
      specialRules: [],
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
    });

    expect(result.status).toBe('compliant');
    expect(result.moduleId).toBe('basic-tragedy');
    expect(result.scope?.scriptIds).toEqual(expect.arrayContaining(['traditional_ensemble_murder']));
    expect(result.reasons).toEqual([]);
  });

  it('classifies content package cross-module references as invalid', () => {
    const result = classifyContentPackage({
      id: 'btx_cross_module_fixture',
      title: 'Cross Module Fixture',
      moduleId: 'basic-tragedy',
      tragedySetId: 'basic_tragedy',
      loops: 3,
      daysPerLoop: 4,
      scriptSpecialRules: [],
      specialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['the_hidden_freak', 'an_unsettling_rumor'],
      cast: [
        { characterId: 'doctor', roleId: 'obsessive' },
      ],
      incidents: [
        { day: 1, incidentId: 'murder', culpritCharacterId: 'doctor' },
      ],
    });

    expect(result.status).toBe('invalid');
    expect(result.reasons.map(reason => reason.reasonCode)).toContain('resource_outside_module_role_pool');
  });

  it('treats direct content package fixtures as compliant when workflow metadata is not layered in', () => {
    const result = classifyContentPackage({
      id: 'first_steps_transitional_fixture',
      title: 'First Steps Sample',
      moduleId: 'first-steps',
      tragedySetId: 'first_steps',
      loops: 3,
      daysPerLoop: 4,
      scriptSpecialRules: [],
      specialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['an_unsettling_rumor'],
      cast: [
        { characterId: 'girl_student', roleId: 'key_person' },
        { characterId: 'boy_student', roleId: 'killer' },
        { characterId: 'office_worker', roleId: 'brain' },
      ],
      incidents: [
        { day: 1, incidentId: 'murder', culpritCharacterId: 'boy_student' },
      ],
    });

    expect(result.status).toBe('compliant');
  });
});
