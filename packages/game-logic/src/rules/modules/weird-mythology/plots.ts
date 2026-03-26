import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

export const weirdMythologyPlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  processor.ruleId.startsWith('wm_'),
);
