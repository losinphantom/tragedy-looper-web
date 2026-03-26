import { AHR_ROLES } from '@tragedy/domain';

import { createRoleDefinition } from './roleDefinition';

export const fragmentRoleDefinition = createRoleDefinition(
  AHR_ROLES.fragment,
  'rules/roles/fragmentRoleDefinition.ts',
);
