import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

export const lastLiarPlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  processor.ruleId.startsWith('ll_'),
);
