export { basicTragedyPlotProcessors } from './plots';
export { basicTragedyRoleProcessors } from './roles';
export { basicTragedyIncidentProcessors } from './incidents';

export { moduleId as basicTragedyModuleId, moduleManifest as basicTragedyManifest } from './manifest';

export { basicTragedyPlotProcessors as plots } from './plots';
export { basicTragedyRoleProcessors as roles } from './roles';
export { basicTragedyIncidentProcessors as incidents } from './incidents';

import { basicTragedyIncidentProcessors } from './incidents';
import { basicTragedyPlotProcessors } from './plots';
import { basicTragedyRoleProcessors } from './roles';

export const allBasicTragedyProcessors = [
  ...basicTragedyPlotProcessors,
  ...basicTragedyRoleProcessors,
  ...basicTragedyIncidentProcessors,
];
