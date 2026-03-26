import { BTX_ROLES } from '@tragedy/domain';

import { createRoleDefinition } from './roleDefinition';

export const keyPersonRoleDefinition = createRoleDefinition(
  BTX_ROLES.key_person,
  'rules/roles/keyPersonRoleDefinition.ts',
);
