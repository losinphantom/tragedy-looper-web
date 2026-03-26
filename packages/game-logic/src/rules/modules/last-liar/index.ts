export { lastLiarPlotProcessors } from './plots';
export { lastLiarRoleProcessors } from './roles';
export { lastLiarIncidentProcessors } from './incidents';

export { moduleId as lastLiarModuleId, moduleManifest as lastLiarManifest } from './manifest';

export { lastLiarPlotProcessors as plots } from './plots';
export { lastLiarRoleProcessors as roles } from './roles';
export { lastLiarIncidentProcessors as incidents } from './incidents';

import { lastLiarIncidentProcessors } from './incidents';
import { lastLiarPlotProcessors } from './plots';
import { lastLiarRoleProcessors } from './roles';

export const allLastLiarProcessors = [
  ...lastLiarPlotProcessors,
  ...lastLiarRoleProcessors,
  ...lastLiarIncidentProcessors,
];
