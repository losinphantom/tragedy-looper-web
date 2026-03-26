/**
 * Plots (Rules) Module — 规则/阴谋统一查询 API
 */

import type { PlotRecord } from '../dictionary';
import { getModuleData, getAllTragedySetIds } from './tragedySets.module';

/** 按模组 + 规则 ID 查询 */
export function getPlotById(setId: string, plotId: string): PlotRecord | undefined {
  const exact = getModuleData(setId)?.plots[plotId];
  if (exact) return exact;

  for (const candidateSetId of getAllTragedySetIds()) {
    if (candidateSetId === setId) continue;
    const fallback = getModuleData(candidateSetId)?.plots[plotId];
    if (fallback) return fallback;
  }

  return undefined;
}

/** 获取模组下所有规则 */
export function getPlotsForSet(setId: string): PlotRecord[] {
  const data = getModuleData(setId);
  return data ? Object.values(data.plots) : [];
}

/** 按规则类型（main/subplot）筛选 */
export function getPlotsByKind(setId: string, kind: 'main' | 'subplot'): PlotRecord[] {
  return getPlotsForSet(setId).filter(p => p.kind === kind);
}

/** 跨模组查找规则（返回第一个匹配） */
export function findPlotById(plotId: string): PlotRecord | undefined {
  for (const setId of getAllTragedySetIds()) {
    const plot = getPlotById(setId, plotId);
    if (plot) return plot;
  }
  return undefined;
}
