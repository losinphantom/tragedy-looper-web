/**
 * Incidents Module — 事件统一查询 API
 */

import type { IncidentRecord } from '../dictionary';
import { getModuleData, getAllTragedySetIds } from './tragedySets.module';

/** 按模组 + 事件 ID 查询 */
export function getIncidentById(setId: string, incidentId: string): IncidentRecord | undefined {
  const exact = getModuleData(setId)?.incidents[incidentId];
  if (exact) return exact;

  for (const candidateSetId of getAllTragedySetIds()) {
    if (candidateSetId === setId) continue;
    const fallback = getModuleData(candidateSetId)?.incidents[incidentId];
    if (fallback) return fallback;
  }

  return undefined;
}

/** 获取模组下所有事件 */
export function getIncidentsForSet(setId: string): IncidentRecord[] {
  const data = getModuleData(setId);
  return data ? Object.values(data.incidents) : [];
}

/** 跨模组查找事件（返回第一个匹配） */
export function findIncidentById(incidentId: string): IncidentRecord | undefined {
  for (const setId of getAllTragedySetIds()) {
    const inc = getIncidentById(setId, incidentId);
    if (inc) return inc;
  }
  return undefined;
}
