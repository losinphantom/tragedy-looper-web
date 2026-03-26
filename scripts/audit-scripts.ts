/**
 * 完整审查 basic_tragedy 剧本：plots/roles/incidents
 * 对照 BT vs BTX 差异
 */
import { getAllScripts } from '../packages/domain/src/modules/scripts.module';
import { buildContentWorkflowAuditResults } from './audit-content-workflow';

// BT 旧版独有
const BT_ONLY_PLOTS = new Set(['protagonist_murder_plan', 'heartbreak_13_days', 'an_unsettling_rumor']);
const BT_ONLY_ROLES = new Set(['evil_spirit', 'obake', 'assassin', 'thug', 'rioter']);
const BT_ONLY_INCIDENTS = new Set(['hospital_incident_small']);

// 有差异的规则：同名但内容不同
const DIFF_PLOTS: Record<string, string> = {
  'paranoia_expansion_virus': 'BT:2密谋→杀人狂 vs BTX:3不安→杀人狂',
  'paranoia_virus': 'BT:2密谋→杀人狂 vs BTX:3不安→杀人狂',
  'sign_with_me': 'BT:1密谋→失败 vs BTX:2密谋→失败',
};

const scripts = getAllScripts().filter(s => s.def.tragedySetId === 'basic_tragedy');

const allPlots = new Set<string>();
const allRoles = new Set<string>();
const allIncidents = new Set<string>();
const issues: string[] = [];

for (const s of scripts) {
  const d = s.def as any;
  
  // Plots
  const plots: string[] = [];
  if (d.mainPlotId) plots.push(d.mainPlotId);
  if (d.subplotIds) for (const p of d.subplotIds) plots.push(p);
  
  // Roles
  const roles: string[] = [];
  if (d.cast) for (const c of d.cast) { if (c.roleId) roles.push(c.roleId); }
  if (d.castDefinitions) for (const c of d.castDefinitions) { if (c.roleId) roles.push(c.roleId); }

  // Incidents
  const incidents: string[] = [];
  if (d.incidents) for (const inc of d.incidents) { if (inc.incidentId) incidents.push(inc.incidentId); }

  plots.forEach(p => allPlots.add(p));
  roles.forEach(r => allRoles.add(r));
  incidents.forEach(i => allIncidents.add(i));

  // Check BT-only
  for (const p of plots) {
    if (BT_ONLY_PLOTS.has(p)) issues.push(`[BT-ONLY PLOT] ${s.id}: "${p}"`);
    if (DIFF_PLOTS[p]) issues.push(`[DIFF PLOT] ${s.id}: "${p}" — ${DIFF_PLOTS[p]}`);
  }
  for (const r of roles) {
    if (BT_ONLY_ROLES.has(r)) issues.push(`[BT-ONLY ROLE] ${s.id}: "${r}"`);
  }
  for (const i of incidents) {
    if (BT_ONLY_INCIDENTS.has(i)) issues.push(`[BT-ONLY INCIDENT] ${s.id}: "${i}"`);
  }
}

console.log(`=== ${scripts.length} basic_tragedy scripts ===`);
console.log('\n--- Unique plots ---');
for (const p of [...allPlots].sort()) console.log(`  ${p}`);
console.log('\n--- Unique roles ---');
for (const r of [...allRoles].sort()) console.log(`  ${r}`);
console.log('\n--- Unique incidents ---');
for (const i of [...allIncidents].sort()) console.log(`  ${i}`);
console.log(`\n=== ISSUES ===`);
if (issues.length === 0) console.log('  ✅ No issues');
else for (const i of issues) console.log(`  ⚠️ ${i}`);
console.log(`\n${allPlots.size} plots, ${allRoles.size} roles, ${allIncidents.size} incidents`);

const workflowResults = buildContentWorkflowAuditResults().filter(result => result.registrationPath !== 'fixture');
console.log('\n--- Content workflow status ---');
for (const result of workflowResults) {
  const reasonCodes = result.classification.reasons.join(', ') || 'none';
  console.log(`  ${result.label}: ${result.classification.status} (${reasonCodes})`);
}
