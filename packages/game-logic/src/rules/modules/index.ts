import { collectModuleProcessors, registerModuleManifests } from '../moduleRegistry';
import { moduleManifest as anotherHorizonRevisedManifest } from './another-horizon-revised/manifest';
import { moduleManifest as basicTragedyManifest } from './basic-tragedy/manifest';
import { moduleManifest as firstStepsManifest } from './first-steps/manifest';
import { moduleManifest as hauntedStageAgainManifest } from './haunted-stage-again/manifest';
import { moduleManifest as lastLiarManifest } from './last-liar/manifest';
import { moduleManifest as midnightZoneManifest } from './midnight-zone/manifest';
import { moduleManifest as mysteryCircleManifest } from './mystery-circle/manifest';
import { moduleManifest as weirdMythologyManifest } from './weird-mythology/manifest';

export const officialModuleManifests = registerModuleManifests([
  firstStepsManifest,
  basicTragedyManifest,
  mysteryCircleManifest,
  hauntedStageAgainManifest,
  anotherHorizonRevisedManifest,
  weirdMythologyManifest,
  lastLiarManifest,
  midnightZoneManifest,
] as const);

export const allModuleProcessors = collectModuleProcessors(officialModuleManifests);

export {
  allAnotherHorizonRevisedProcessors,
  anotherHorizonRevisedIncidentProcessors,
  anotherHorizonRevisedManifest,
  anotherHorizonRevisedModuleId,
  anotherHorizonRevisedPlotProcessors,
  anotherHorizonRevisedRoleProcessors,
} from './another-horizon-revised';
export {
  allBasicTragedyProcessors,
  basicTragedyIncidentProcessors,
  basicTragedyManifest,
  basicTragedyModuleId,
  basicTragedyPlotProcessors,
  basicTragedyRoleProcessors,
} from './basic-tragedy';
export {
  allFirstStepsProcessors,
  firstStepsIncidentProcessors,
  firstStepsManifest,
  firstStepsModuleId,
  firstStepsPlotProcessors,
  firstStepsRoleProcessors,
} from './first-steps';
export {
  allHauntedStageAgainProcessors,
  hauntedStageAgainIncidentProcessors,
  hauntedStageAgainManifest,
  hauntedStageAgainModuleId,
  hauntedStageAgainPlotProcessors,
  hauntedStageAgainRoleProcessors,
} from './haunted-stage-again';
export {
  allLastLiarProcessors,
  lastLiarIncidentProcessors,
  lastLiarManifest,
  lastLiarModuleId,
  lastLiarPlotProcessors,
  lastLiarRoleProcessors,
} from './last-liar';
export {
  allMidnightZoneProcessors,
  midnightZoneIncidentProcessors,
  midnightZoneManifest,
  midnightZoneModuleId,
  midnightZonePlotProcessors,
  midnightZoneRoleProcessors,
} from './midnight-zone';
export {
  allMysteryCircleProcessors,
  mysteryCircleIncidentProcessors,
  mysteryCircleManifest,
  mysteryCircleModuleId,
  mysteryCirclePlotProcessors,
  mysteryCircleRoleProcessors,
} from './mystery-circle';
export {
  allWeirdMythologyProcessors,
  weirdMythologyManifest,
  weirdMythologyIncidentProcessors,
  weirdMythologyModuleId,
  weirdMythologyPlotProcessors,
  weirdMythologyRoleProcessors,
} from './weird-mythology';
