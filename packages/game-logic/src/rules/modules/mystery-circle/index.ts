export { mysteryCirclePlotProcessors } from './plots';
export { mysteryCircleRoleProcessors } from './roles';
export { mysteryCircleIncidentProcessors } from './incidents';

export { moduleId as mysteryCircleModuleId, moduleManifest as mysteryCircleManifest } from './manifest';

export { mysteryCirclePlotProcessors as plots } from './plots';
export { mysteryCircleRoleProcessors as roles } from './roles';
export { mysteryCircleIncidentProcessors as incidents } from './incidents';

import { mysteryCircleIncidentProcessors } from './incidents';
import { mysteryCirclePlotProcessors } from './plots';
import { mysteryCircleRoleProcessors } from './roles';

export const allMysteryCircleProcessors = [
  ...mysteryCirclePlotProcessors,
  ...mysteryCircleRoleProcessors,
  ...mysteryCircleIncidentProcessors,
];
