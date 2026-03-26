import { AHR_ROLES } from '@tragedy/domain';

import { createRoleDefinition } from './roleDefinition';

export const dimensionTravelerRoleDefinition = createRoleDefinition(
  AHR_ROLES.dimension_traveler,
  'rules/roles/dimensionTravelerRoleDefinition.ts',
);
