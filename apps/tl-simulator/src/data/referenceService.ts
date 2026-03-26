/**
 * Reference Service — 全模组通用化
 *
 * 自动从 domain 模块获取任意模组的 plots/roles/incidents 数据。
 * 不再硬编码任何特定模组。
 */

import { TRAGEDY_SETS, getModuleData } from '@tragedy/domain';

/** Returns list of all tragedy sets for the module selector dropdown. */
export function getAvailableTragedySets(): { id: string; label: string; labelEn: string; available: boolean }[] {
  return Object.entries(TRAGEDY_SETS).map(([id, set]) => ({
    id,
    label: set.label['zh-CN'],
    labelEn: set.label['en'] || '',
    available: true, // All modules now have reference data
  }));
}

export interface FormattedPlot {
  id: string;
  kind: 'main' | 'subplot';
  name: string;
  roleRequirements: { roleName: string; countStr: string }[];
  roleIdCounts: Record<string, string>;
  rules: { text: string }[];
}

export interface FormattedRole {
  id: string;
  name: string;
  maxCopies: string;
  roleTraits: string[];
  rules: { text: string }[];
  goodwillAbilities: { timing: string; cost: string; desc: string }[];
}

export interface FormattedIncident {
  id: string;
  name: string;
  rules: { text: string }[];
}

export interface ReferenceData {
  setName: string;
  setNameEn: string;
  mainPlots: FormattedPlot[];
  subplots: FormattedPlot[];
  roles: FormattedRole[];
  incidents: FormattedIncident[];
  specialRules: { title: string; rules: { text: string }[] }[];
}

export function getTragedySetReferenceData(setId: string): ReferenceData | null {
  const setRecord = TRAGEDY_SETS[setId];
  if (!setRecord) return null;

  const moduleData = getModuleData(setId);
  if (!moduleData) return null;

  const setName = setRecord.label['zh-CN'];
  const setNameEn = setRecord.label['en'] || setId;

  const allPlots = Object.values(moduleData.plots);
  const allRoles = moduleData.roles;

  const mainPlots = allPlots.filter(p => p.kind === 'main').map(p => formatPlot(p, allRoles));
  const subplots = allPlots.filter(p => p.kind === 'subplot').map(p => formatPlot(p, allRoles));
  const roles = Object.values(allRoles).map(formatRole);
  const incidents = Object.values(moduleData.incidents).map(formatIncident);

  const specialRules = (setRecord.specialRules ?? []).map((sr: any) => ({
    title: sr.title['zh-CN'],
    rules: sr.rules.map((r: any) => ({ text: (r.timing ? `【${r.timing}】` : '') + r.summary['zh-CN'] })),
  }));

  return { setName, setNameEn, mainPlots, subplots, roles, incidents, specialRules };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getRulePrefix(rule: any): string {
  if (!rule.timing) return '';

  if (rule.timing === 'always' && rule.id.includes('_loss')) {
    return '【强制：该角色死亡时】';
  }
  if (rule.timing === 'loop_end' && rule.id.includes('_loss')) {
    return '【失败条件：轮回结束时】';
  }

  let typeStr = rule.mandatory ? '强制' : '任意能力';
  let timingStr = '';
  switch(rule.timing) {
    case 'loop_start': timingStr = '轮回开始时'; break;
    case 'day_start': timingStr = '回合开始阶段'; break;
    case 'mastermind_plan': timingStr = '剧作家出牌阶段'; break;
    case 'protagonist_plan': timingStr = '主角出牌阶段'; break;
    case 'card_resolve': timingStr = '行动结算阶段'; break;
    case 'mastermind_ability': timingStr = '剧作家能力阶段'; break;
    case 'goodwill_window': timingStr = '友好能力阶段'; break;
    case 'day_end': timingStr = '回合结束阶段'; break;
    case 'loop_end': timingStr = '轮回结束时'; break;
    case 'always': timingStr = '常驻'; break;
    default: timingStr = rule.timing;
  }
  return `【${typeStr}：${timingStr}】`;
}

function formatPlot(plot: any, allRoles: Record<string, any>): FormattedPlot {
  const roleIdCounts: Record<string, string> = {};
  plot.roleRequirements.forEach((req: any) => {
    roleIdCounts[req.roleId] = formatCount(req.count);
  });

  return {
    id: plot.id,
    kind: plot.kind,
    name: plot.label['zh-CN'],
    roleIdCounts,
    roleRequirements: plot.roleRequirements.map((req: any) => ({
      roleName: getRoleName(req.roleId, allRoles),
      countStr: formatCount(req.count),
    })),
    rules: plot.rules.map((r: any) => ({ text: getRulePrefix(r) + r.summary['zh-CN'] })),
  };
}

function formatRole(role: any): FormattedRole {
  let traits: string[] = [];
  if (role.goodwillRefusal === 'mandatory') traits.push('必定无视友好');
  else if (role.goodwillRefusal === 'optional') traits.push('无视友好');
  
  return {
    id: role.id,
    name: role.label['zh-CN'],
    maxCopies: role.maxCopies === null ? '' : String(role.maxCopies),
    roleTraits: traits,
    rules: role.rules.map((r: any) => ({ text: getRulePrefix(r) + r.summary['zh-CN'] })),
    goodwillAbilities: [],
  };
}

function formatIncident(inc: any): FormattedIncident {
  return {
    id: inc.id,
    name: inc.label['zh-CN'],
    rules: inc.rules.map((r: any) => ({ text: r.summary['zh-CN'] })),
  };
}

function getRoleName(roleId: string, allRoles: Record<string, any>): string {
  const role = allRoles[roleId];
  return role ? role.label['zh-CN'] : roleId;
}

function formatCount(count: any): string {
  if (typeof count === 'number') return String(count);
  if (count.min === count.max) return String(count.min);
  return `${count.min}-${count.max}`;
}
