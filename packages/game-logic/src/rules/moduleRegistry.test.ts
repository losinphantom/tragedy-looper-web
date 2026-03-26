import { describe, expect, it } from 'vitest';
import { getProcessor } from '../ruleEngine';
import { collectModuleProcessors } from './moduleRegistry';

describe('moduleRegistry', () => {
  it('deduplicates shared canonical processors when collecting manifests', () => {
    const sharedProcessor = {
      ruleId: 'shared_rule',
      check: () => ({ triggered: false, needsInput: false, message: 'noop' }),
      execute: () => {},
    };
    const collected = collectModuleProcessors([
      {
        moduleId: 'module-a',
        processors: {
          plots: [sharedProcessor],
          roles: [],
          incidents: [],
        },
      },
      {
        moduleId: 'module-b',
        processors: {
          plots: [],
          roles: [sharedProcessor],
          incidents: [{
            ruleId: 'module_b_only',
            check: () => ({ triggered: false, needsInput: false, message: 'noop' }),
            execute: () => {},
          }],
        },
      },
    ]);
    const ruleIds = collected.map(processor => processor.ruleId);

    expect(new Set(ruleIds).size).toBe(ruleIds.length);
    expect(ruleIds.filter(ruleId => ruleId === 'shared_rule')).toHaveLength(1);
    expect(ruleIds).toContain('module_b_only');
  });

  it('keeps manifest-selected legacy aliases available in the live rule registry', () => {
    expect(getProcessor('dice_of_the_gods_loop_start')).toBeTruthy();
    expect(getProcessor('hs_incident_blasphemy')).toBeTruthy();
    expect(getProcessor('btx_incident_murder_effect')).toBeTruthy();
    expect(getProcessor('suitor_loved_one_death')).toBeTruthy();
    expect(getProcessor('time_traveler_final_day_loss')).toBeTruthy();
  });
});
