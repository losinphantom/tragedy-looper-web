import type { RuleProcessor } from '../../../ruleEngine';
import { roleProcessors } from '../../roleProcessorCatalog';

// Transitional compatibility wrapper: new role ownership should land in
// `rules/roles/*RoleDefinition.ts` and manifest `roleIds`, not in module-local
// processor filtering.
export const anotherHorizonRevisedRoleProcessors: RuleProcessor[] = roleProcessors.filter(processor =>
  processor.ruleId.startsWith('ahr_'),
);
