/**
 * Scripts Module — 剧本注册表 + 查询 API
 *
 * 自动从 3 个 JSON 集合（中文源 1/2 + 英文源）批量导入 305 个剧本，
 * 加上 2 个手工定义的剧本，合计 307 个剧本。
 *
 * 新增剧本方式：
 *   1) 手工：创建 ScriptDef → 在下方 manualScripts 添加
 *   2) JSON：将 JSON 放入 docs/game-knowledge/scripts/ → 自动导入
 */

import type { ScriptDef, LocalizedScriptDef } from '../script';
import { TRAGEDY_SET_MODULE_IDS } from '../data/tragedySets';
import { FIRST_STEPS_SAMPLE_SCRIPT } from '../data/scripts/firstSteps/firstScript';
import { TRADITIONAL_ENSEMBLE_MURDER } from '../data/scripts/basicTragedy/traditionalEnsembleMurder';

// JSON 集合导入
import collection1 from '../../../../docs/game-knowledge/scripts/scripts-collection-1.json';
import collection2 from '../../../../docs/game-knowledge/scripts/scripts-collection-2.json';
import collectionEn from '../../../../docs/game-knowledge/scripts/scripts-collection-en.json';

import { convertCollection, type RawScript } from './scriptConverter';

// ── 注册条目类型 ─────────────────────────────────────────────────────────────

export interface ScriptRegistryEntry {
  id: string;
  def: ScriptDef | LocalizedScriptDef;
  moduleId: string;
  registrationPath: 'manifest-backed-official' | 'manual-transitional-entry' | 'imported-json-transitional-entry';
  workflowStatus: 'compliant' | 'manual-only-transitional';
  source?: string; // 来源标记
  difficulty?: string; // 难度文本
}

function resolveOwningModuleId(tragedySetId: string): string {
  return TRAGEDY_SET_MODULE_IDS[tragedySetId] ?? tragedySetId.replace(/_/g, '-');
}

function normalizeScriptDef<T extends ScriptDef | LocalizedScriptDef>(def: T): T {
  const scriptSpecialRules = def.scriptSpecialRules ?? def.specialRules ?? [];
  return {
    ...def,
    moduleId: def.moduleId ?? resolveOwningModuleId(def.tragedySetId),
    scriptSpecialRules: scriptSpecialRules as T['specialRules'],
    specialRules: scriptSpecialRules as T['specialRules'],
  };
}

const MANIFEST_BACKED_SCRIPT_IDS = new Set([
  'traditional_ensemble_murder',
]);

function buildRegistryEntry(
  id: string,
  def: ScriptDef | LocalizedScriptDef,
  options: {
    source?: string;
    difficulty?: string;
    transitionalKind: 'manual' | 'imported-json';
  },
): ScriptRegistryEntry {
  const normalizedDef = normalizeScriptDef(def);
  const moduleId = normalizedDef.moduleId ?? resolveOwningModuleId(normalizedDef.tragedySetId);
  const isManifestBackedOfficial = MANIFEST_BACKED_SCRIPT_IDS.has(id);

  return {
    id,
    def: normalizedDef,
    moduleId,
    registrationPath: isManifestBackedOfficial
      ? 'manifest-backed-official'
      : options.transitionalKind === 'manual'
        ? 'manual-transitional-entry'
        : 'imported-json-transitional-entry',
    workflowStatus: isManifestBackedOfficial ? 'compliant' : 'manual-only-transitional',
    source: options.source,
    difficulty: options.difficulty,
  };
}

// ── 手工定义的剧本 ───────────────────────────────────────────────────────────

const manualScripts: ScriptRegistryEntry[] = [
  buildRegistryEntry('first_steps_sample', FIRST_STEPS_SAMPLE_SCRIPT, {
    source: 'manual',
    transitionalKind: 'manual',
  }),
  buildRegistryEntry('traditional_ensemble_murder', TRADITIONAL_ENSEMBLE_MURDER, {
    source: 'manual',
    transitionalKind: 'manual',
  }),
];

// ── JSON 集合批量转换 ────────────────────────────────────────────────────────

const cn1Scripts = convertCollection(collection1 as unknown as RawScript[], 'default');
const cn2Scripts = convertCollection(collection2 as unknown as RawScript[], 'default');
const enScripts = convertCollection(collectionEn as unknown as RawScript[], 'en');

const jsonScripts: ScriptRegistryEntry[] = [
  ...cn1Scripts.map(s => buildRegistryEntry(s.id ?? '', s as ScriptDef, {
    source: s._source,
    difficulty: s._difficulty,
    transitionalKind: 'imported-json',
  })),
  ...cn2Scripts.map(s => buildRegistryEntry(s.id ?? '', s as ScriptDef, {
    source: s._source,
    difficulty: s._difficulty,
    transitionalKind: 'imported-json',
  })),
  ...enScripts.map(s => buildRegistryEntry(s.id ?? '', s as ScriptDef, {
    source: s._source,
    difficulty: s._difficulty,
    transitionalKind: 'imported-json',
  })),
];

// ── 合并注册表（手工优先，JSON 补充） ────────────────────────────────────────

const manualIds = new Set(manualScripts.map(s => s.id));

export const SCRIPT_REGISTRY: ScriptRegistryEntry[] = [
  ...manualScripts,
  ...jsonScripts.filter(s => !manualIds.has(s.id)),
];

// ── 查询 API ────────────────────────────────────────────────────────────────

/** 按 ID 查询剧本 */
export function getScriptById(id: string): ScriptRegistryEntry | undefined {
  return SCRIPT_REGISTRY.find(s => s.id === id);
}

/** 获取所有已注册剧本 */
export function getAllScripts(): ScriptRegistryEntry[] {
  return SCRIPT_REGISTRY;
}

/** 获取所有剧本 ID */
export function getAllScriptIds(): string[] {
  return SCRIPT_REGISTRY.map(s => s.id);
}

/** 按来源过滤剧本 */
export function getScriptsBySource(source: string): ScriptRegistryEntry[] {
  return SCRIPT_REGISTRY.filter(s => s.source === source);
}

/** 按模组过滤剧本 */
export function getScriptsByModule(tragedySetId: string): ScriptRegistryEntry[] {
  return SCRIPT_REGISTRY.filter(s => s.def.tragedySetId === tragedySetId);
}
