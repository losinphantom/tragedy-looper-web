import { AHR_INCIDENTS } from '@tragedy/domain';

import { createIncidentDefinition } from './incidentDefinition';

export const dimensionShiftIncidentDefinition = createIncidentDefinition(
  AHR_INCIDENTS.dimension_shift,
  'rules/incidents/dimensionShiftIncidentDefinition.ts',
);
