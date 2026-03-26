import { AHR_ROLES } from '@tragedy/domain';

import { createRoleDefinition } from './roleDefinition';

export const obsessiveRoleDefinition = createRoleDefinition(
  AHR_ROLES.obsessive,
  'rules/roles/obsessiveRoleDefinition.ts',
);
