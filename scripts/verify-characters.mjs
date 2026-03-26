/**
 * 自动化角色核验脚本
 * 对比 official/*.json 与 characterAbilities.ts + characters.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE = path.resolve(__dirname, '..');
const JSON_DIR = path.join(BASE, 'docs', 'game-knowledge', 'characters', 'official');

function loadAllJsons() {
  const chars = [];
  for (const group of ['base_game', 'script_book', 'tenth_anniversary', 'promo']) {
    const dir = path.join(JSON_DIR, group);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      chars.push({ file: `${group}/${f}`, ...data });
    }
  }
  return chars;
}

function parseAbilityCosts(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const costs = {};
  const blocks = src.split(/\n\s+(?=\w+_\w+.*:\s*\{)/);
  for (const block of blocks) {
    const idM = block.match(/id:\s*'(\w+)'/);
    const costM = block.match(/goodwillCost:\s*(\d+)/);
    const summaryM = block.match(/summary:\s*\{\s*'zh-CN':\s*'([^']+)'/);
    if (idM) {
      costs[idM[1]] = {
        goodwillCost: costM ? parseInt(costM[1]) : null,
        summary: summaryM ? summaryM[1] : ''
      };
    }
  }
  return costs;
}

function parseCharacterProfiles(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const profiles = {};
  const entries = src.match(/\w+:\s*\{\s*\n\s+id:[\s\S]*?source:[\s\S]*?\},?\n/g) || [];
  for (const entry of entries) {
    const idM = entry.match(/id:\s*'(\w+)'/);
    if (!idM) continue;
    const id = idM[1];
    const uneaseM = entry.match(/uneaseLimit:\s*(\d+)/);
    const traitsM = entry.match(/traits:\s*\[([^\]]*)\]/);
    const startM = entry.match(/startingLocations:\s*\[([^\]]*)\]/);
    const forbidM = entry.match(/forbiddenLocations:\s*\[([^\]]*)\]/);
    const gwM = entry.match(/goodwillAbilities:\s*\[([^\]]*)\]/);
    const passiveM = entry.match(/passiveAbilities:\s*\[([^\]]*)\]/);
    profiles[id] = {
      uneaseLimit: uneaseM ? parseInt(uneaseM[1]) : null,
      traits: traitsM ? traitsM[1].replace(/['\s]/g, '').split(',').filter(Boolean) : [],
      startingLocations: startM ? startM[1].replace(/['\s]/g, '').split(',').filter(Boolean) : [],
      forbiddenLocations: forbidM ? forbidM[1].replace(/['\s]/g, '').split(',').filter(Boolean) : [],
      goodwillAbilities: gwM ? gwM[1].replace(/\s|A\./g, '').split(',').filter(Boolean) : [],
      passiveAbilities: passiveM ? passiveM[1].replace(/\s|A\./g, '').split(',').filter(Boolean) : [],
    };
  }
  return profiles;
}

const slugToCode = {
  'boy-student':'boy_student','girl-student':'girl_student','rich-mans-daughter':'rich_mans_daughter',
  'class-rep':'class_rep','mystery-boy':'mystery_boy','shrine-maiden':'shrine_maiden','alien':'alien',
  'godly-being':'godly_being','police-officer':'police_officer','office-worker':'office_worker',
  'informer':'informer','pop-idol':'pop_idol','journalist':'journalist','boss':'boss','doctor':'doctor',
  'patient':'patient','nurse':'nurse','henchman':'henchman','transfer-student':'transfer_student',
  'forensic-specialist':'forensic_specialist','ai':'ai','teacher':'teacher','soldier':'soldier',
  'black-cat':'black_cat','scientist':'scholar','illusion':'illusion','young-girl':'little_girl',
  'copycat':'copycat','sect-founder':'cult_leader','sacred-tree':'sacred_tree','servant':'servant',
  'metaworld-denizen':'metaworld_denizen','part-timer':'part_timer','part-timer-question':'part_timer_question',
  'little-sister':'sister','sennin':'sennin','uploader':'uploader',
};
const locMap = { '学校':'school','都市':'city','神社':'shrine','医院':'hospital' };
const traitMap = { '学生':'student','少年':'boy','少女':'girl','男性':'man','女性':'woman','成人':'adult','动物':'animal','造物':'construct','植物':'plant','虚构':'fictional','妹妹':'sister' };

const jsons = loadAllJsons();
const abilities = parseAbilityCosts(path.join(BASE, 'packages', 'domain', 'src', 'data', 'characterAbilities.ts'));
const profiles = parseCharacterProfiles(path.join(BASE, 'packages', 'domain', 'src', 'data', 'characters.ts'));

let errors = [], warnings = [], ok = 0;

for (const json of jsons) {
  const codeId = slugToCode[json.slug];
  if (!codeId) { errors.push(`❌ [${json.file}] slug "${json.slug}" 无映射`); continue; }
  const prof = profiles[codeId];
  if (!prof) { errors.push(`❌ [${json.file}] "${codeId}" 不在 characters.ts`); continue; }
  const p = json.profile;
  let charOk = true;

  // uneaseLimit
  if (p.unease_limit !== null && prof.uneaseLimit !== p.unease_limit)
    { errors.push(`❌ [${json.name.zh}] uneaseLimit: 官方=${p.unease_limit} 代码=${prof.uneaseLimit}`); charOk=false; }

  // startingLocations
  const expStart = p.initial_locations.map(l=>locMap[l]).filter(Boolean).sort();
  const codeStart = [...prof.startingLocations].sort();
  if (expStart.length > 0 && JSON.stringify(expStart) !== JSON.stringify(codeStart))
    { errors.push(`❌ [${json.name.zh}] start: 官方=${JSON.stringify(expStart)} 代码=${JSON.stringify(codeStart)}`); charOk=false; }

  // forbiddenLocations
  const expForbid = p.forbidden_locations.map(l=>locMap[l]).filter(Boolean).sort();
  const codeForbid = [...prof.forbiddenLocations].sort();
  if (JSON.stringify(expForbid) !== JSON.stringify(codeForbid))
    { errors.push(`❌ [${json.name.zh}] forbidden: 官方=${JSON.stringify(expForbid)} 代码=${JSON.stringify(codeForbid)}`); charOk=false; }

  // traits
  const expTraits = p.attributes.map(a=>traitMap[a]).filter(Boolean).sort();
  const codeTraits = [...prof.traits].sort();
  if (JSON.stringify(expTraits) !== JSON.stringify(codeTraits))
    { errors.push(`❌ [${json.name.zh}] traits: 官方=${JSON.stringify(expTraits)} 代码=${JSON.stringify(codeTraits)}`); charOk=false; }

  // goodwillAbilities count
  const gwCount = json.text.goodwill_abilities.length;
  if (gwCount > 0 && prof.goodwillAbilities.length === 0)
    { errors.push(`❌ [${json.name.zh}] 有${gwCount}个友好能力但代码为空`); charOk=false; }
  if (gwCount === 0 && prof.goodwillAbilities.length > 0)
    { warnings.push(`⚠️ [${json.name.zh}] 官方无友好能力但代码有 ${prof.goodwillAbilities.join(', ')}`); }

  // check ability refs exist
  for (const aId of prof.goodwillAbilities) {
    if (!abilities[aId]) { errors.push(`❌ [${json.name.zh}] 能力 "${aId}" 不在 characterAbilities.ts`); charOk=false; }
    else if (!abilities[aId].goodwillCost) { warnings.push(`⚠️ [${json.name.zh}] "${aId}" 缺 goodwillCost`); }
  }
  for (const aId of prof.passiveAbilities) {
    if (!abilities[aId]) { errors.push(`❌ [${json.name.zh}] 被动 "${aId}" 不在 characterAbilities.ts`); charOk=false; }
  }

  if (charOk) ok++;
}

console.log('═══════════════════════════════════════════');
console.log(`角色数据核验 (${jsons.length}个角色)`);
console.log('═══════════════════════════════════════════');
console.log(`\n✅ 通过: ${ok}/${jsons.length}`);
if (errors.length) { console.log(`\n❌ 错误 (${errors.length}):`); errors.forEach(e => console.log('  ' + e)); }
if (warnings.length) { console.log(`\n⚠️ 警告 (${warnings.length}):`); warnings.forEach(w => console.log('  ' + w)); }
if (!errors.length && !warnings.length) console.log('\n🎉 全部通过！');
