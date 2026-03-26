import { describe, expect, it } from 'vitest';

import { auditOfficialModuleSurface, buildAuditResult } from './audit-module-manifests';

describe('audit-module-manifests', () => {
  it('treats official manifest omissions as errors', () => {
    const result = auditOfficialModuleSurface({
      moduleId: 'basic-tragedy',
      tragedySetId: 'basic_tragedy',
      declaredScriptIds: [],
      presentHooks: [],
      errors: [],
      warnings: [],
    });

    expect(result.errors).toContain('missing_hook:goodwillHooks.leaderTargetSlots');
    expect(result.errors.some(error => error.startsWith('missing_script_id:'))).toBe(true);
  });

  it('passes for the current official manifest baseline', () => {
    const result = buildAuditResult();

    expect(result.status).toBe('passed');
    expect(result.summary.surfaceStatus.scriptIds).toBe('passed');
    expect(result.summary.surfaceStatus['goodwillHooks.leaderTargetSlots']).toBe('passed');
    expect(result.officialCompleteness.errors).toHaveLength(0);
  });
});
