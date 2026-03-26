import { describe, expect, it } from 'vitest';

import {
  EXPECTED_FIXTURE_STATUSES,
  assertExpectedFixtureStatuses,
  buildContentWorkflowAuditResults,
} from './audit-content-workflow';

describe('audit content workflow', () => {
  it('classifies representative fixtures into compliant, manual-only transitional, and invalid buckets', () => {
    const results = buildContentWorkflowAuditResults();
    const statusByLabel = Object.fromEntries(
      results.map(result => [result.label, result.classification.status]),
    );

    expect(statusByLabel).toEqual(EXPECTED_FIXTURE_STATUSES);
    expect(
      results.find(result => result.label === 'first_steps_sample')?.classification.reasons,
    ).toEqual(expect.arrayContaining(['script_missing_from_owning_module_script_ids', 'transitional_registration_path']));
    expect(
      results.find(result => result.label === 'invalid_module_boundary_fixture')?.classification.reasons,
    ).toContain('resource_outside_module_role_pool');
  });

  it('throws when a representative fixture drifts from its expected workflow status', () => {
    expect(() => assertExpectedFixtureStatuses(buildContentWorkflowAuditResults())).not.toThrow();
    expect(() => assertExpectedFixtureStatuses([
      {
        label: 'traditional_ensemble_murder',
        registrationPath: 'manifest-backed-official',
        workflowStatus: 'compliant',
        classification: {
          status: 'invalid',
          reasons: ['resource_outside_module_incident_pool'],
        },
      },
    ])).toThrow('Unexpected classification for traditional_ensemble_murder');
  });
});
