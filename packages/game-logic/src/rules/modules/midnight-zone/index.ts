export { midnightZonePlotProcessors } from './plots';
export { midnightZoneRoleProcessors } from './roles';
export { midnightZoneIncidentProcessors } from './incidents';

export { moduleId as midnightZoneModuleId, moduleManifest as midnightZoneManifest } from './manifest';

export { midnightZonePlotProcessors as plots } from './plots';
export { midnightZoneRoleProcessors as roles } from './roles';
export { midnightZoneIncidentProcessors as incidents } from './incidents';

import { midnightZoneIncidentProcessors } from './incidents';
import { midnightZonePlotProcessors } from './plots';
import { midnightZoneRoleProcessors } from './roles';

export const allMidnightZoneProcessors = [
  ...midnightZonePlotProcessors,
  ...midnightZoneRoleProcessors,
  ...midnightZoneIncidentProcessors,
];
