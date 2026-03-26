export { weirdMythologyPlotProcessors } from './plots';
export { weirdMythologyRoleProcessors } from './roles';
export { weirdMythologyIncidentProcessors } from './incidents';

export { moduleId as weirdMythologyModuleId, moduleManifest as weirdMythologyManifest } from './manifest';

export { weirdMythologyPlotProcessors as plots } from './plots';
export { weirdMythologyRoleProcessors as roles } from './roles';
export { weirdMythologyIncidentProcessors as incidents } from './incidents';

import { weirdMythologyIncidentProcessors } from './incidents';
import { weirdMythologyPlotProcessors } from './plots';
import { weirdMythologyRoleProcessors } from './roles';

export const allWeirdMythologyProcessors = [
  ...weirdMythologyPlotProcessors,
  ...weirdMythologyRoleProcessors,
  ...weirdMythologyIncidentProcessors,
];
