import { AHR_ROLES } from '@tragedy/domain';

import { createRoleDefinition } from './roleDefinition';

export const storytellerRoleDefinition = createRoleDefinition(
  AHR_ROLES.storyteller,
  'rules/roles/storytellerRoleDefinition.ts',
);
