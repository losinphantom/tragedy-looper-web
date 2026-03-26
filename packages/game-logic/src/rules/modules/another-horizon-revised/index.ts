export { anotherHorizonRevisedPlotProcessors } from './plots';
export { anotherHorizonRevisedRoleProcessors } from './roles';
export { anotherHorizonRevisedIncidentProcessors } from './incidents';

export { moduleId as anotherHorizonRevisedModuleId, moduleManifest as anotherHorizonRevisedManifest } from './manifest';

export { anotherHorizonRevisedPlotProcessors as plots } from './plots';
export { anotherHorizonRevisedRoleProcessors as roles } from './roles';
export { anotherHorizonRevisedIncidentProcessors as incidents } from './incidents';

import { anotherHorizonRevisedIncidentProcessors } from './incidents';
import { anotherHorizonRevisedPlotProcessors } from './plots';
import { anotherHorizonRevisedRoleProcessors } from './roles';

export const allAnotherHorizonRevisedProcessors = [
  ...anotherHorizonRevisedPlotProcessors,
  ...anotherHorizonRevisedRoleProcessors,
  ...anotherHorizonRevisedIncidentProcessors,
];
