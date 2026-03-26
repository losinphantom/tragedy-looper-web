/**
 * Tragedy Sets Module — 模组统一查询 API
 *
 * 自动聚合各模组的 plots/roles/incidents 数据，
 * 消费方只需 getModuleData(setId) 即可获得完整数据。
 */

import type { TragedySetRecord, PlotRecord, RoleRecord, IncidentRecord } from '../dictionary';
import { TRAGEDY_SETS } from '../data/tragedySets';

// ── 各模组数据导入（使用实际导出名称） ───────────────────────────────────────
import { FIRST_STEPS_PLOTS } from '../data/plots.firstSteps';
import { FIRST_STEPS_ROLES } from '../data/roles.firstSteps';
import { FIRST_STEPS_INCIDENTS } from '../data/incidents.firstSteps';

import { BTX_PLOTS } from '../data/plots.basicTragedy';
import { BTX_ROLES } from '../data/roles.basicTragedy';
import { BTX_INCIDENTS } from '../data/incidents.basicTragedy';

import { MZ_PLOTS } from '../data/plots.midnightZone';
import { MZ_ROLES } from '../data/roles.midnightZone';
import { MZ_INCIDENTS } from '../data/incidents.midnightZone';

import { MC_PLOTS } from '../data/plots.mysteryCircle';
import { MC_ROLES } from '../data/roles.mysteryCircle';
import { MC_INCIDENTS } from '../data/incidents.mysteryCircle';

import { HSA_PLOTS } from '../data/plots.hauntedStageAgain';
import { HSA_ROLES } from '../data/roles.hauntedStageAgain';
import { HSA_INCIDENTS } from '../data/incidents.hauntedStageAgain';

import { WM_PLOTS } from '../data/plots.weirdMythology';
import { WM_ROLES } from '../data/roles.weirdMythology';
import { WM_INCIDENTS } from '../data/incidents.weirdMythology';

import { AHR_PLOTS } from '../data/plots.anotherHorizonRevised';
import { AHR_ROLES } from '../data/roles.anotherHorizonRevised';
import { AHR_INCIDENTS } from '../data/incidents.anotherHorizonRevised';

import { LL_PLOTS } from '../data/plots.lastLair';
import { LL_ROLES } from '../data/roles.lastLair';
import { LL_INCIDENTS } from '../data/incidents.lastLair';

import { BT_OLD_PLOTS } from '../data/plots.basicTragedyOld';
import { BT_OLD_ROLES } from '../data/roles.basicTragedyOld';
import { BT_OLD_INCIDENTS } from '../data/incidents.basicTragedyOld';

import { HS_PLOTS } from '../data/plots.hauntedStage';
import { HS_ROLES } from '../data/roles.hauntedStage';
import { HS_INCIDENTS } from '../data/incidents.hauntedStage';

import { AH_PLOTS } from '../data/plots.anotherHorizon';
import { AH_ROLES } from '../data/roles.anotherHorizon';
import { AH_INCIDENTS } from '../data/incidents.anotherHorizon';

import { ST_PLOTS } from '../data/plots.supernaturalTragedy';
import { ST_ROLES } from '../data/roles.supernaturalTragedy';
import { ST_INCIDENTS } from '../data/incidents.supernaturalTragedy';

import { ELA_PLOTS } from '../data/plots.echoingLoveA';
import { ELA_ROLES } from '../data/roles.echoingLoveA';
import { ELA_INCIDENTS } from '../data/incidents.echoingLoveA';

import { OF_PLOTS } from '../data/plots.oldFashion';
import { OF_ROLES } from '../data/roles.oldFashion';
import { OF_INCIDENTS } from '../data/incidents.oldFashion';

import { SC_PLOTS } from '../data/plots.sinCity';
import { SC_ROLES } from '../data/roles.sinCity';
import { SC_INCIDENTS } from '../data/incidents.sinCity';

import { UM_PLOTS } from '../data/plots.unheardMalice';
import { UM_ROLES } from '../data/roles.unheardMalice';
import { UM_INCIDENTS } from '../data/incidents.unheardMalice';

// ── 模组数据映射表 ──────────────────────────────────────────────────────────

export interface ModuleData {
  plots: Record<string, PlotRecord>;
  roles: Record<string, RoleRecord>;
  incidents: Record<string, IncidentRecord>;
}

const MODULE_DATA_MAP: Record<string, ModuleData> = {
  first_steps:             { plots: FIRST_STEPS_PLOTS, roles: FIRST_STEPS_ROLES, incidents: FIRST_STEPS_INCIDENTS },
  basic_tragedy:           { plots: BTX_PLOTS,         roles: BTX_ROLES,         incidents: BTX_INCIDENTS },
  midnight_zone:           { plots: MZ_PLOTS,          roles: MZ_ROLES,          incidents: MZ_INCIDENTS },
  mystery_circle:          { plots: MC_PLOTS,           roles: MC_ROLES,           incidents: MC_INCIDENTS },
  haunted_stage_again:     { plots: HSA_PLOTS,          roles: HSA_ROLES,          incidents: HSA_INCIDENTS },
  weird_mythology:         { plots: WM_PLOTS,           roles: WM_ROLES,           incidents: WM_INCIDENTS },
  another_horizon_revised: { plots: AHR_PLOTS,          roles: AHR_ROLES,          incidents: AHR_INCIDENTS },
  last_liar:               { plots: LL_PLOTS,            roles: LL_ROLES,            incidents: LL_INCIDENTS },
  basic_tragedy_old:       { plots: BT_OLD_PLOTS,       roles: BT_OLD_ROLES,       incidents: BT_OLD_INCIDENTS },
  haunted_stage:           { plots: HS_PLOTS,           roles: HS_ROLES,           incidents: HS_INCIDENTS },
  another_horizon:         { plots: AH_PLOTS,           roles: AH_ROLES,           incidents: AH_INCIDENTS },
  supernatural_tragedy:    { plots: ST_PLOTS,           roles: ST_ROLES,           incidents: ST_INCIDENTS },
  echoing_love_a:          { plots: ELA_PLOTS,          roles: ELA_ROLES,          incidents: ELA_INCIDENTS },
  old_fashion:             { plots: OF_PLOTS,           roles: OF_ROLES,           incidents: OF_INCIDENTS },
  sin_city:                { plots: SC_PLOTS,           roles: SC_ROLES,           incidents: SC_INCIDENTS },
  unheard_malice:          { plots: UM_PLOTS,           roles: UM_ROLES,           incidents: UM_INCIDENTS },
};

// ── 查询 API ────────────────────────────────────────────────────────────────

/** 按 ID 获取模组定义 */
export function getTragedySetById(id: string): TragedySetRecord | undefined {
  return TRAGEDY_SETS[id];
}

/** 获取所有模组 */
export function getAllTragedySets(): TragedySetRecord[] {
  return Object.values(TRAGEDY_SETS);
}

/** 获取所有模组 ID */
export function getAllTragedySetIds(): string[] {
  return Object.keys(TRAGEDY_SETS);
}

/** 获取模组的完整数据（plots + roles + incidents） */
export function getModuleData(setId: string): ModuleData | undefined {
  return MODULE_DATA_MAP[setId];
}

/** 快速检查模组是否已注册 */
export function isTragedySetRegistered(setId: string): boolean {
  return setId in MODULE_DATA_MAP;
}
