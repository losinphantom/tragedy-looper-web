import { BTX_INCIDENTS } from '@tragedy/domain';

import { createIncidentDefinition } from './incidentDefinition';

export const murderIncidentDefinition = createIncidentDefinition(
  BTX_INCIDENTS.murder,
  'rules/incidents/murderIncidentDefinition.ts',
);
