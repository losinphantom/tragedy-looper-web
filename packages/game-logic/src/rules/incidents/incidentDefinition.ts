import type { IncidentRecord } from '@tragedy/domain';

export interface IncidentDefinition {
  contract: 'IncidentDefinition';
  assembly: 'definition-reference';
  ownership: 'incident-owned';
  id: string;
  setId: string;
  sourcePath: string;
  record: IncidentRecord;
  rules: IncidentRecord['rules'];
}

export function createIncidentDefinition(record: IncidentRecord, sourcePath: string): IncidentDefinition {
  return {
    contract: 'IncidentDefinition',
    assembly: 'definition-reference',
    ownership: 'incident-owned',
    id: record.id,
    setId: record.source.setId,
    sourcePath,
    record,
    rules: record.rules,
  };
}
