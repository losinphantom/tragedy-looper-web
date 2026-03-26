import { AHR_INCIDENTS } from '@tragedy/domain';

import { createIncidentDefinition } from './incidentDefinition';

export const lastWillIncidentDefinition = createIncidentDefinition(
  AHR_INCIDENTS.last_will,
  'rules/incidents/lastWillIncidentDefinition.ts',
);
