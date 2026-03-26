/**
 * 剧本门禁模块验证脚本
 * 测试 getScriptPlayability 功能
 */

const { getAllScripts } = require('../packages/domain/src');
const { getScriptPlayability } = require('../packages/game-logic/src/scriptLoader');

console.log('── 剧本可玩性门禁验证 ──\n');

const allScripts = getAllScripts();
console.log(`总剧本数: ${allScripts.length}`);

let playable = 0;
let unplayable = 0;
const coverageBuckets: Record<string, number> = {};

for (const script of allScripts) {
  const p = getScriptPlayability(script.id);
  if (p.playable) {
    playable++;
  } else {
    unplayable++;
  }
  const bucket = `${Math.floor(p.coveragePercent / 10) * 10}%`;
  coverageBuckets[bucket] = (coverageBuckets[bucket] || 0) + 1;
}

console.log(`✅ 可玩: ${playable}`);
console.log(`🔒 不可玩: ${unplayable}`);
console.log(`覆盖率: ${Math.round(playable / allScripts.length * 100)}%\n`);

// 覆盖率分布
console.log('── 覆盖率分布 ──');
for (const [bucket, count] of Object.entries(coverageBuckets).sort()) {
  console.log(`  ${bucket.padEnd(5)} : ${'█'.repeat(Math.ceil(count / 3))} ${count}`);
}

// 展示前 5 个可玩剧本
console.log('\n── 前 5 个可玩剧本 ──');
let shown = 0;
for (const script of allScripts) {
  if (shown >= 5) break;
  const p = getScriptPlayability(script.id);
  if (p.playable) {
    const def = script.def as any;
    const title = typeof def.title === 'string' ? def.title : def.title?.['zh-CN'] || script.id;
    console.log(`  ✅ ${title} (${p.total} rules, 100%)`);
    shown++;
  }
}

// 展示前 5 个不可玩剧本
console.log('\n── 前 5 个不可玩剧本 ──');
shown = 0;
for (const script of allScripts) {
  if (shown >= 5) break;
  const p = getScriptPlayability(script.id);
  if (!p.playable) {
    const def = script.def as any;
    const title = typeof def.title === 'string' ? def.title : def.title?.['zh-CN'] || script.id;
    console.log(`  🔒 ${title} (${p.covered}/${p.total} rules, ${p.coveragePercent}%)`);
    console.log(`     缺少: ${p.missing.slice(0, 3).join(', ')}${p.missing.length > 3 ? '...' : ''}`);
    shown++;
  }
}

console.log('\n✅ 门禁模块验证完成');
