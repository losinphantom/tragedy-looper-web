import type { GoodwillHandlerRegistry } from '../../../engine/goodwill/types';
import { aiGoodwillHandlers } from './ai';
import { alienGoodwillHandlers } from './alien';
import { boyStudentGoodwillHandlers } from './boyStudent';
import { classRepGoodwillHandlers } from './classRep';
import { copycatGoodwillHandlers } from './copycat';
import { cultLeaderGoodwillHandlers } from './cultLeader';
import { deityGoodwillHandlers } from './deity';
import { doctorGoodwillHandlers } from './doctor';
import { followerGoodwillHandlers } from './follower';
import { forensicScientistGoodwillHandlers } from './forensicScientist';
import { henchmanGoodwillHandlers } from './henchman';
import { higherBeingGoodwillHandlers } from './higherBeing';
import { illusionGoodwillHandlers } from './illusion';
import { immortalGoodwillHandlers } from './immortal';
import { informantGoodwillHandlers } from './informant';
import { journalistGoodwillHandlers } from './journalist';
import { littleGirlGoodwillHandlers } from './littleGirl';
import { mikoGoodwillHandlers } from './miko';
import { nurseGoodwillHandlers } from './nurse';
import { officeWorkerGoodwillHandlers } from './officeWorker';
import { outsiderGoodwillHandlers } from './outsider';
import { policeGoodwillHandlers } from './police';
import { popIdolGoodwillHandlers } from './popIdol';
import { richManGoodwillHandlers } from './richMan';
import { scholarGoodwillHandlers } from './scholar';
import { sisterGoodwillHandlers } from './sister';
import { soldierGoodwillHandlers } from './soldier';
import { teacherGoodwillHandlers } from './teacher';
import { teacherSupportGoodwillHandlers } from './teacherSupport';
import { tempWorkerGoodwillHandlers } from './tempWorker';
import { transferStudentGoodwillHandlers } from './transferStudent';
import { vloggerGoodwillHandlers } from './vlogger';
import { youngLadyGoodwillHandlers } from './youngLady';

export const ownedCharacterGoodwillHandlers = {
  ...aiGoodwillHandlers,
  ...alienGoodwillHandlers,
  ...boyStudentGoodwillHandlers,
  ...classRepGoodwillHandlers,
  ...copycatGoodwillHandlers,
  ...cultLeaderGoodwillHandlers,
  ...deityGoodwillHandlers,
  ...doctorGoodwillHandlers,
  ...followerGoodwillHandlers,
  ...forensicScientistGoodwillHandlers,
  ...henchmanGoodwillHandlers,
  ...higherBeingGoodwillHandlers,
  ...illusionGoodwillHandlers,
  ...immortalGoodwillHandlers,
  ...informantGoodwillHandlers,
  ...journalistGoodwillHandlers,
  ...littleGirlGoodwillHandlers,
  ...mikoGoodwillHandlers,
  ...nurseGoodwillHandlers,
  ...officeWorkerGoodwillHandlers,
  ...outsiderGoodwillHandlers,
  ...policeGoodwillHandlers,
  ...popIdolGoodwillHandlers,
  ...richManGoodwillHandlers,
  ...scholarGoodwillHandlers,
  ...sisterGoodwillHandlers,
  ...soldierGoodwillHandlers,
  ...teacherGoodwillHandlers,
  ...teacherSupportGoodwillHandlers,
  ...tempWorkerGoodwillHandlers,
  ...transferStudentGoodwillHandlers,
  ...vloggerGoodwillHandlers,
  ...youngLadyGoodwillHandlers,
} satisfies GoodwillHandlerRegistry;
