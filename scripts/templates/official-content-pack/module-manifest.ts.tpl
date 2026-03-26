import type { ModuleManifest } from '../../moduleManifest';

export const moduleId = '{{MODULE_ID}}';

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId: '{{TRAGEDY_SET_ID}}',
  roleIds: [
    // TODO: declare module-owned role ids here.
    'TODO_role_id',
  ],
  incidentIds: [
    // TODO: declare module-owned incident ids here.
    'TODO_incident_id',
  ],
  plotIds: [
    // TODO: declare module-owned plot ids here.
    'TODO_plot_id',
  ],
  scriptIds: ['{{SCRIPT_ID}}'],
  moduleSpecialRuleIds: [
    // TODO: declare module-level special rule ids here.
  ],
  processors: {
    plots: [],
    roles: [],
    incidents: [],
  },
};
