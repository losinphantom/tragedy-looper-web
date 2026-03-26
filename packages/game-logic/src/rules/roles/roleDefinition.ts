import type { RoleRecord } from '@tragedy/domain';

export interface RoleDefinition {
  contract: 'RoleDefinition';
  assembly: 'definition-reference';
  ownership: 'role-owned';
  id: string;
  setId: string;
  sourcePath: string;
  record: RoleRecord;
  rules: RoleRecord['rules'];
}

export function createRoleDefinition(record: RoleRecord, sourcePath: string): RoleDefinition {
  return {
    contract: 'RoleDefinition',
    assembly: 'definition-reference',
    ownership: 'role-owned',
    id: record.id,
    setId: record.source.setId,
    sourcePath,
    record,
    rules: record.rules,
  };
}
