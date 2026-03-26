/**
 * Script Adapter — converts JSON script collection entries into ScriptDef.
 *
 * The JSON data (scripts-collection-*.json) uses ENUM-style IDs like
 * CH_STUDENT_M, ROLE_BRAIN, INC_MURDER, etc.
 * The game engine's ScriptDef expects domain-style IDs like
 * boy_student, brain, murder, etc.
 */

import type { ScriptDef } from '@tragedy/domain';
import {
  resolveCharId,
  resolveRoleId,
  resolveIncidentId,
  resolveModuleId,
  resolvePlotId,
} from './enumToGameId';

/** Shape of a single script entry in scripts-collection JSON files. */
export interface JsonScriptEntry {
  id: string;
  title: string;
  module: string;       // e.g. "MOD_FIRST_STEPS"
  loops: number;
  daysPerLoop: number;
  difficulty?: string;
  difficultyStars?: number;
  discussionAllowed?: boolean;
  specialRules?: string[];
  mainPlot: string;     // e.g. "RULE_MURDER_PLAN"
  subplot1: string | null;
  subplot2?: string | null;
  cast: Array<{
    id: string;         // e.g. "CH_STUDENT_M"
    role: string;       // e.g. "ROLE_BRAIN"
    notes?: string;
  }>;
  incidents: Array<{
    day: number;
    incident: string;   // e.g. "INC_MURDER"
    culprit: string;    // Chinese name, e.g. "男学生"
  }>;
  scheduledEvents?: Array<{ day: number; event: string }>;
  titleEN?: string;
  creator?: string;
  verified?: boolean;
}

/** Reverse character lookup: Chinese name → CH_* enum → domain ID */
const ZH_CHAR_TO_ENUM: Record<string, string> = {
  '男学生': 'CH_STUDENT_M',
  '女学生': 'CH_STUDENT_F',
  '有钱人': 'CH_RICH_MAN',
  '富人': 'CH_RICH_MAN',
  '职员': 'CH_OFFICE_WORKER',
  '上班族': 'CH_OFFICE_WORKER',
  '情报商': 'CH_INFORMER',
  '消息通': 'CH_INFORMER',
  '刑警': 'CH_POLICE_OFFICER',
  '医生': 'CH_DOCTOR',
  '住院患者': 'CH_PATIENT',
  '入院患者': 'CH_PATIENT',
  '病人': 'CH_PATIENT',
  '巫女': 'CH_SHRINE_MAIDEN',
  '班长': 'CH_CLASS_REP',
  '神秘少年': 'CH_MYSTERY_BOY',
  '局外人': 'CH_MYSTERY_BOY',
  '异界人': 'CH_ALIEN',
  '神灵': 'CH_GODLY_BEING',
  '神座': 'CH_GODLY_BEING',
  '偶像': 'CH_POP_IDOL',
  '媒体人': 'CH_JOURNALIST',
  '大人物': 'CH_BOSS',
  '护士': 'CH_NURSE',
  '手下': 'CH_HENCHMAN',
  'A.I.': 'CH_A_I',
  '军人': 'CH_SOLDIER',
  '侦探': 'CH_DETECTIVE',
  '大小姐': 'CH_RICH_DAUGHTER',
  '妹妹': 'CH_LITTLE_SISTER',
  '学者': 'CH_SCIENTIST',
  '小女孩': 'CH_YOUNG_GIRL',
  '御神木': 'CH_GOSHINBOKU',
  '怪杰': 'CH_WILD_CARD',
  '教师': 'CH_TEACHER',
  '教主': 'CH_CULT_LEADER',
  '模仿犯': 'CH_COPYCAT',
  '转校生': 'CH_TRANSFER_STUDENT',
  '转校生 A': 'CH_TRANSFER_STUDENT',
  '转校生 B': 'CH_TRANSFER_STUDENT',
  '转校生 C': 'CH_TRANSFER_STUDENT',
  '转校生 D': 'CH_TRANSFER_STUDENT',
  '黑猫': 'CH_BLACK_CAT',
  '鉴别员': 'CH_FORENSIC_SPECIALIST',
  '临时工': 'CH_PART_TIMER',
  '从者': 'CH_SERVANT',
  '上位存在': 'CH_METAWORLD_DENIZEN',
  '十字军': 'CH_CRUSADER',
  '幻想': 'CH_ILLUSION',
  '邪教徒': 'CH_CULT_LEADER',
  '观察人': 'CH_INFORMER',
};

/**
 * Resolve a culprit name (Chinese) to a domain characterId.
 * The JSON data stores culprit as Chinese text, not as an enum.
 */
function resolveCulpritName(zhName: string, cast: JsonScriptEntry['cast']): string {
  // First, try direct Chinese → enum → domain lookup
  const enumId = ZH_CHAR_TO_ENUM[zhName];
  if (enumId) return resolveCharId(enumId);

  // Second, check if any cast member's enum ID resolves to something matching
  // This handles edge cases where culprit text doesn't match our map
  for (const c of cast) {
    const domainId = resolveCharId(c.id);
    if (domainId === zhName) return domainId;
  }

  // Fallback: return as-is (the game stores it but doesn't validate)
  return zhName;
}

/**
 * Convert a JSON script collection entry into a game-engine ScriptDef.
 */
export function jsonToScriptDef(json: JsonScriptEntry): ScriptDef {
  return {
    id: json.id,
    title: json.title,
    tragedySetId: resolveModuleId(json.module),
    loops: json.loops,
    daysPerLoop: json.daysPerLoop,
    specialRules: json.specialRules || [],
    mainPlotId: resolvePlotId(json.mainPlot),
    subplotIds: [json.subplot1, json.subplot2].filter((s): s is string => !!s).map(resolvePlotId),
    cast: json.cast.map(c => ({
      characterId: resolveCharId(c.id),
      roleId: resolveRoleId(c.role),
    })),
    incidents: json.incidents.map(inc => ({
      day: inc.day,
      incidentId: resolveIncidentId(inc.incident),
      culpritCharacterId: resolveCulpritName(inc.culprit, json.cast),
    })),
  };
}

/** Convert an array of JSON scripts into ScriptDef[] */
export function loadScriptCollection(jsonArray: JsonScriptEntry[]): ScriptDef[] {
  return jsonArray.map(jsonToScriptDef);
}
