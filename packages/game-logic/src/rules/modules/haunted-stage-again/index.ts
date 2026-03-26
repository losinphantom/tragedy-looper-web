export { hauntedStageAgainPlotProcessors } from './plots';
export { hauntedStageAgainRoleProcessors } from './roles';
export { hauntedStageAgainIncidentProcessors } from './incidents';

export { moduleId as hauntedStageAgainModuleId, moduleManifest as hauntedStageAgainManifest } from './manifest';

export { hauntedStageAgainPlotProcessors as plots } from './plots';
export { hauntedStageAgainRoleProcessors as roles } from './roles';
export { hauntedStageAgainIncidentProcessors as incidents } from './incidents';

import { hauntedStageAgainIncidentProcessors } from './incidents';
import { hauntedStageAgainPlotProcessors } from './plots';
import { hauntedStageAgainRoleProcessors } from './roles';

export const allHauntedStageAgainProcessors = [
  ...hauntedStageAgainPlotProcessors,
  ...hauntedStageAgainRoleProcessors,
  ...hauntedStageAgainIncidentProcessors,
];
