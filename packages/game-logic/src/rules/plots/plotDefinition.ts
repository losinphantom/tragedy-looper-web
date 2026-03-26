import type { PlotRecord } from '@tragedy/domain';

export interface PlotDefinition {
  contract: 'PlotDefinition';
  assembly: 'definition-reference';
  ownership: 'plot-owned';
  id: string;
  setId: string;
  sourcePath: string;
  record: PlotRecord;
  rules: PlotRecord['rules'];
}

export function createPlotDefinition(record: PlotRecord, sourcePath: string): PlotDefinition {
  return {
    contract: 'PlotDefinition',
    assembly: 'definition-reference',
    ownership: 'plot-owned',
    id: record.id,
    setId: record.source.setId,
    sourcePath,
    record,
    rules: record.rules,
  };
}
