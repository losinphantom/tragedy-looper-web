import { AHR_INCIDENTS } from '@tragedy/domain';

import { createIncidentDefinition } from './incidentDefinition';

export const impulseMurderIncidentDefinition = createIncidentDefinition(
  AHR_INCIDENTS.impulse_murder,
  'rules/incidents/impulseMurderIncidentDefinition.ts',
);
