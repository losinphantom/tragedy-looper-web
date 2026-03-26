import { AHR_INCIDENTS } from '@tragedy/domain';

import { createIncidentDefinition } from './incidentDefinition';

export const hospitalIncidentDefinition = createIncidentDefinition(
  AHR_INCIDENTS.hospital_incident,
  'rules/incidents/hospitalIncidentDefinition.ts',
);
