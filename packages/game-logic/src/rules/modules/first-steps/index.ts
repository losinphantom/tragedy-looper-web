export { firstStepsPlotProcessors } from './plots';
export { firstStepsRoleProcessors } from './roles';
export { firstStepsIncidentProcessors } from './incidents';

export { moduleId as firstStepsModuleId, moduleManifest as firstStepsManifest } from './manifest';

export { firstStepsPlotProcessors as plots } from './plots';
export { firstStepsRoleProcessors as roles } from './roles';
export { firstStepsIncidentProcessors as incidents } from './incidents';

import { firstStepsIncidentProcessors } from './incidents';
import { firstStepsPlotProcessors } from './plots';
import { firstStepsRoleProcessors } from './roles';

export const allFirstStepsProcessors = [
  ...firstStepsPlotProcessors,
  ...firstStepsRoleProcessors,
  ...firstStepsIncidentProcessors,
];
