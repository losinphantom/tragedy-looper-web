/**
 * verify-domain-data.ts
 *
 * 自动校验 domain 数据层的 ID 引用完整性。
 * 运行：npx tsx scripts/verify-domain-data.ts
 *
 * 校验项：
 *   1. tragedySets ↔ plots/roles/incidents 三向 ID 引用完整性
 *   2. plots.*.roleRequirements[].roleId 在对应模组 roles 中存在
 *   3. roles.*.appearsInPlotIds 在对应模组 plots 中存在
 *   4. source.setId 与所属模组匹配
 *   5. 对照 official JSON：plots/roles/incidents 的中文名称精确匹配
 */

import { TRAGEDY_SETS } from '../packages/domain/src/data/tragedySets';
import { FIRST_STEPS_PLOTS } from '../packages/domain/src/data/plots.firstSteps';
import { FIRST_STEPS_ROLES } from '../packages/domain/src/data/roles.firstSteps';
import { FIRST_STEPS_INCIDENTS } from '../packages/domain/src/data/incidents.firstSteps';
import { BTX_PLOTS } from '../packages/domain/src/data/plots.basicTragedy';
import { BTX_ROLES } from '../packages/domain/src/data/roles.basicTragedy';
import { BTX_INCIDENTS } from '../packages/domain/src/data/incidents.basicTragedy';
import { MZ_PLOTS } from '../packages/domain/src/data/plots.midnightZone';
import { MZ_ROLES } from '../packages/domain/src/data/roles.midnightZone';
import { MZ_INCIDENTS } from '../packages/domain/src/data/incidents.midnightZone';
import { MC_PLOTS } from '../packages/domain/src/data/plots.mysteryCircle';
import { MC_ROLES } from '../packages/domain/src/data/roles.mysteryCircle';
import { MC_INCIDENTS } from '../packages/domain/src/data/incidents.mysteryCircle';
import { HSA_PLOTS } from '../packages/domain/src/data/plots.hauntedStageAgain';
import { HSA_ROLES } from '../packages/domain/src/data/roles.hauntedStageAgain';
import { HSA_INCIDENTS } from '../packages/domain/src/data/incidents.hauntedStageAgain';
import { WM_PLOTS } from '../packages/domain/src/data/plots.weirdMythology';
import { WM_ROLES } from '../packages/domain/src/data/roles.weirdMythology';
import { WM_INCIDENTS } from '../packages/domain/src/data/incidents.weirdMythology';
import { AHR_PLOTS } from '../packages/domain/src/data/plots.anotherHorizonRevised';
import { AHR_ROLES } from '../packages/domain/src/data/roles.anotherHorizonRevised';
import { AHR_INCIDENTS } from '../packages/domain/src/data/incidents.anotherHorizonRevised';
import { LL_PLOTS } from '../packages/domain/src/data/plots.lastLair';
import { LL_ROLES } from '../packages/domain/src/data/roles.lastLair';
import { LL_INCIDENTS } from '../packages/domain/src/data/incidents.lastLair';

import * as fs from 'fs';
import * as path from 'path';

import type { PlotRecord, RoleRecord, IncidentRecord } from '../packages/domain/src/dictionary';
import { buildContentWorkflowAuditResults } from './audit-content-workflow';

// ─── Registry ────────────────────────────────────────────────

type ModuleData = {
  setId: string;
  plots: Record<string, PlotRecord>;
  roles: Record<string, RoleRecord>;
  incidents: Record<string, IncidentRecord>;
};

const modules: ModuleData[] = [
  { setId: 'first_steps', plots: FIRST_STEPS_PLOTS, roles: FIRST_STEPS_ROLES, incidents: FIRST_STEPS_INCIDENTS },
  { setId: 'basic_tragedy', plots: BTX_PLOTS, roles: BTX_ROLES, incidents: BTX_INCIDENTS },
  { setId: 'midnight_zone', plots: MZ_PLOTS, roles: MZ_ROLES, incidents: MZ_INCIDENTS },
  { setId: 'mystery_circle', plots: MC_PLOTS, roles: MC_ROLES, incidents: MC_INCIDENTS },
  { setId: 'haunted_stage_again', plots: HSA_PLOTS, roles: HSA_ROLES, incidents: HSA_INCIDENTS },
  { setId: 'weird_mythology', plots: WM_PLOTS, roles: WM_ROLES, incidents: WM_INCIDENTS },
  { setId: 'another_horizon_revised', plots: AHR_PLOTS, roles: AHR_ROLES, incidents: AHR_INCIDENTS },
  { setId: 'last_liar', plots: LL_PLOTS, roles: LL_ROLES, incidents: LL_INCIDENTS },
];

// ─── Helpers ─────────────────────────────────────────────────

const errors: string[] = [];
const warnings: string[] = [];

function err(msg: string) { errors.push(`❌ ${msg}`); }
function warn(msg: string) { warnings.push(`⚠️ ${msg}`); }

// ─── 1. tragedySets ↔ module data ID 引用 ─────────────────

for (const mod of modules) {
  const ts = TRAGEDY_SETS[mod.setId];
  if (!ts) {
    err(`tragedySets 中不存在 setId="${mod.setId}"`);
    continue;
  }

  const plotIds = new Set(Object.keys(mod.plots));
  const roleIds = new Set(Object.keys(mod.roles));
  const incidentIds = new Set(Object.keys(mod.incidents));

  // tragedySets.availablePlotIds → plots.*.ts
  for (const pid of ts.availablePlotIds) {
    if (!plotIds.has(pid)) {
      err(`[${mod.setId}] tragedySets.availablePlotIds 引用了 "${pid}" 但 plots.*.ts 中不存在`);
    }
  }
  // plots.*.ts 中存在但 tragedySets 未引用
  for (const pid of plotIds) {
    if (!ts.availablePlotIds.includes(pid)) {
      warn(`[${mod.setId}] plots.*.ts 中存在 "${pid}" 但 tragedySets.availablePlotIds 未引用`);
    }
  }

  // tragedySets.availableRoleIds → roles.*.ts
  for (const rid of ts.availableRoleIds) {
    if (!roleIds.has(rid)) {
      err(`[${mod.setId}] tragedySets.availableRoleIds 引用了 "${rid}" 但 roles.*.ts 中不存在`);
    }
  }
  for (const rid of roleIds) {
    if (!ts.availableRoleIds.includes(rid)) {
      warn(`[${mod.setId}] roles.*.ts 中存在 "${rid}" 但 tragedySets.availableRoleIds 未引用`);
    }
  }

  // tragedySets.availableIncidentIds → incidents.*.ts
  for (const iid of ts.availableIncidentIds) {
    if (!incidentIds.has(iid)) {
      err(`[${mod.setId}] tragedySets.availableIncidentIds 引用了 "${iid}" 但 incidents.*.ts 中不存在`);
    }
  }
  for (const iid of incidentIds) {
    if (!ts.availableIncidentIds.includes(iid)) {
      warn(`[${mod.setId}] incidents.*.ts 中存在 "${iid}" 但 tragedySets.availableIncidentIds 未引用`);
    }
  }
}

// ─── 2. plots.roleRequirements[].roleId 在 roles 中存在 ──

for (const mod of modules) {
  const roleIds = new Set(Object.keys(mod.roles));
  for (const [plotId, plot] of Object.entries(mod.plots)) {
    for (const req of plot.roleRequirements) {
      if (!roleIds.has(req.roleId)) {
        err(`[${mod.setId}] plot "${plotId}" 的 roleRequirements 引用了 roleId="${req.roleId}" 但 roles.*.ts 中不存在`);
      }
    }
  }
}

// ─── 3. roles.appearsInPlotIds 在 plots 中存在 ──────────

for (const mod of modules) {
  const plotIds = new Set(Object.keys(mod.plots));
  for (const [roleId, role] of Object.entries(mod.roles)) {
    for (const pid of role.appearsInPlotIds) {
      if (!plotIds.has(pid)) {
        err(`[${mod.setId}] role "${roleId}" 的 appearsInPlotIds 引用了 "${pid}" 但 plots.*.ts 中不存在`);
      }
    }
  }
}

// ─── 4. source.setId 一致性 ─────────────────────────────

for (const mod of modules) {
  for (const [id, p] of Object.entries(mod.plots)) {
    if (p.source.setId !== mod.setId) {
      err(`[${mod.setId}] plot "${id}" source.setId="${p.source.setId}" 与模组不匹配`);
    }
  }
  for (const [id, r] of Object.entries(mod.roles)) {
    if (r.source.setId !== mod.setId) {
      err(`[${mod.setId}] role "${id}" source.setId="${r.source.setId}" 与模组不匹配`);
    }
  }
  for (const [id, inc] of Object.entries(mod.incidents)) {
    if (inc.source.setId !== mod.setId) {
      err(`[${mod.setId}] incident "${id}" source.setId="${inc.source.setId}" 与模组不匹配`);
    }
  }
}

// ─── 5. 对照 official JSON 的中文名称 ────────────────────

const JSON_DIR = path.resolve(__dirname, '../docs/game-knowledge/modules/official/current');

const setIdToJsonFile: Record<string, string> = {
  first_steps: 'first-steps.json',
  basic_tragedy: 'basic-tragedy-x.json',
  midnight_zone: 'midnight-zone.json',
  mystery_circle: 'mystery-circle.json',
  haunted_stage_again: 'haunted-stage-again.json',
  weird_mythology: 'weird-mythology.json',
  another_horizon_revised: 'another-horizon-revised.json',
  last_liar: 'last-liar.json',
};

for (const mod of modules) {
  const jsonFile = setIdToJsonFile[mod.setId];
  if (!jsonFile) continue;
  const filePath = path.join(JSON_DIR, jsonFile);
  if (!fs.existsSync(filePath)) {
    warn(`[${mod.setId}] 官方 JSON 文件不存在: ${filePath}`);
    continue;
  }

  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const categories = json.categories;

  // 收集 JSON 中的名称
  const jsonPlotNames = new Set<string>();
  const jsonRoleNames = new Set<string>();
  const jsonIncidentNames = new Set<string>();

  for (const p of [...(categories.rule_y || []), ...(categories.rule_x || [])]) {
    jsonPlotNames.add(p.name);
  }
  for (const r of (categories.roles || [])) {
    jsonRoleNames.add(r.name);
  }
  for (const i of (categories.incidents || [])) {
    jsonIncidentNames.add(i.name);
  }

  // 检查代码中 plot 的 zh-CN label 是否在 JSON 中存在
  for (const [plotId, plot] of Object.entries(mod.plots)) {
    const zhLabel = plot.label['zh-CN'];
    if (!jsonPlotNames.has(zhLabel)) {
      warn(`[${mod.setId}] plot "${plotId}" 中文名 "${zhLabel}" 在官方 JSON 中未找到`);
    }
  }

  // 检查代码中 role 的 zh-CN label 是否在 JSON 中存在
  for (const [roleId, role] of Object.entries(mod.roles)) {
    const zhLabel = role.label['zh-CN'];
    if (!jsonRoleNames.has(zhLabel)) {
      warn(`[${mod.setId}] role "${roleId}" 中文名 "${zhLabel}" 在官方 JSON 中未找到`);
    }
  }

  // 检查代码中 incident 的 zh-CN label 是否在 JSON 中存在
  for (const [incId, inc] of Object.entries(mod.incidents)) {
    const zhLabel = inc.label['zh-CN'];
    if (!jsonIncidentNames.has(zhLabel)) {
      warn(`[${mod.setId}] incident "${incId}" 中文名 "${zhLabel}" 在官方 JSON 中未找到`);
    }
  }
}

// ─── Output ──────────────────────────────────────────────────

console.log('\n========== Domain Data Verification ==========\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ 全部校验通过！无错误，无警告。\n');
} else {
  if (errors.length > 0) {
    console.log(`--- 错误 (${errors.length}) ---`);
    for (const e of errors) console.log(e);
    console.log('');
  }
  if (warnings.length > 0) {
    console.log(`--- 警告 (${warnings.length}) ---`);
    for (const w of warnings) console.log(w);
    console.log('');
  }
}

console.log(`总计: ${errors.length} 错误, ${warnings.length} 警告`);
const workflowResults = buildContentWorkflowAuditResults().filter(result => result.registrationPath !== 'fixture');
console.log('\n--- Content Workflow Audit ---');
for (const result of workflowResults) {
  const reasonCodes = result.classification.reasons.join(', ') || 'none';
  console.log(`${result.label}: ${result.classification.status} (${reasonCodes})`);
  if (result.classification.status !== 'compliant') {
    warn(`[content-workflow] ${result.label} => ${result.classification.status} (${reasonCodes})`);
  }
}
process.exit(errors.length > 0 ? 1 : 0);
