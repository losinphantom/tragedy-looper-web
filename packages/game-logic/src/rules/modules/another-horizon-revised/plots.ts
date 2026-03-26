import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

export const anotherHorizonRevisedPlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  processor.ruleId.startsWith('ahr_'),
);
