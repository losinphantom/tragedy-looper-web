#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function fileExists(target) {
  try {
    return fs.existsSync(target);
  } catch {
    return false;
  }
}

function readFile(target) {
  return fs.readFileSync(target, 'utf8');
}

function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (true) {
    if (fileExists(path.join(dir, '.planning'))) {
      return dir;
    }
    if (dir === root) {
      return null;
    }
    dir = path.dirname(dir);
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    result[key] = value;
  }
  return result;
}

function parseCurrentPhase(markdown) {
  const labelMatch =
    markdown.match(/\*\*当前阶段\*\*:\s*(阶段\s+.+)$/m) ||
    markdown.match(/\*\*当前\s+Phase:\*\*\s*(Phase\s+.+)$/im) ||
    markdown.match(/\*\*当前阶段\*\*:\s*(Phase\s+.+)$/im);
  if (!labelMatch) {
    return null;
  }
  const phaseText = labelMatch[1].trim().replace(/^(阶段|Phase)\s+/i, '');
  const match = phaseText.match(/^(\d+)(?:\s*-\s*(\d+))?(?:\s*[—-]{1,2}\s*|\s+)?(.*)$/);
  if (!match) {
    return null;
  }
  const startNumber = Number(match[1]);
  const endNumber = match[2] ? Number(match[2]) : startNumber;
  return {
    number: endNumber,
    startNumber,
    endNumber,
    description: (match[3] || '').trim(),
  };
}

function parsePhaseTitles(roadmap) {
  const matches = [
    ...roadmap.matchAll(/^###\s*阶段\s+(\d+)：(.+)$/gm),
    ...roadmap.matchAll(/^###\s*Phase\s+(\d+):\s*(.+)$/gim),
  ];
  return matches.map((match) => ({
    number: Number(match[1]),
    title: match[2].trim(),
  }));
}

function findPhaseDir(phasesRoot, phaseNumber) {
  if (!fileExists(phasesRoot)) {
    return null;
  }
  const direct = path.join(phasesRoot, String(phaseNumber));
  if (fileExists(direct)) {
    return direct;
  }
  const prefix = String(phaseNumber).padStart(2, '0');
  for (const name of fs.readdirSync(phasesRoot)) {
    const fullPath = path.join(phasesRoot, name);
    if (!fs.statSync(fullPath).isDirectory()) {
      continue;
    }
    if (name === prefix || name.startsWith(`${prefix}-`)) {
      return fullPath;
    }
  }
  return null;
}

function listFiles(dir, suffix) {
  if (!fileExists(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function listSummaryFiles(dir) {
  if (!fileExists(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name === 'SUMMARY.md' || name.endsWith('-SUMMARY.md'))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function getSummaryHeadline(summaryPath) {
  const content = readFile(summaryPath);
  const tableLine = content
    .split(/\r?\n/)
    .find((line) => /^\|\s*\d+\s*\|/.test(line));
  if (tableLine) {
    const cells = tableLine
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);
    if (cells.length >= 2) {
      return cells[1];
    }
  }
  const resultLine = content
    .split(/\r?\n/)
    .find((line) => line.startsWith('- ') && !line.includes('Verification'));
  return resultLine ? resultLine.replace(/^- /, '').trim() : path.basename(summaryPath);
}

function getRecentSummaries(phasesDir, limit) {
  const summaryPaths = [];
  for (const phaseName of fs.readdirSync(phasesDir)) {
    const phaseDir = path.join(phasesDir, phaseName);
    if (!fs.statSync(phaseDir).isDirectory()) {
      continue;
    }
    for (const name of listSummaryFiles(phaseDir)) {
      const fullPath = path.join(phaseDir, name);
      summaryPaths.push({
        path: fullPath,
        phase: phaseName,
        name,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      });
    }
  }
  return summaryPaths
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, limit)
    .map((item) => ({
      phase: item.phase,
      name: item.name,
      headline: getSummaryHeadline(item.path),
    }));
}

function getVerificationWarnings(phasesDir) {
  if (!fileExists(phasesDir)) {
    return [];
  }
  const warnings = [];
  for (const phaseName of fs.readdirSync(phasesDir)) {
    const verificationPath = path.join(phasesDir, phaseName, 'VERIFICATION.md');
    if (!fileExists(verificationPath)) {
      continue;
    }
    const frontmatter = parseFrontmatter(readFile(verificationPath));
    const status = frontmatter.status || frontmatter.verdict || '';
    if (status === 'human_needed' || status === 'partial' || status === 'diagnosed') {
      warnings.push({
        phase: phaseName,
        status,
      });
    }
  }
  return warnings.sort((a, b) => Number(a.phase) - Number(b.phase));
}

function getUatStatus(phaseDir) {
  const statuses = [];
  for (const name of listFiles(phaseDir, '-UAT.md')) {
    const frontmatter = parseFrontmatter(readFile(path.join(phaseDir, name)));
    statuses.push({
      name,
      status: frontmatter.status || 'unknown',
    });
  }
  return statuses;
}

function resolveGlobalGsdRoot(cwd) {
  const gitDir = spawnSync('git', ['rev-parse', '--git-dir'], {
    cwd,
    encoding: 'utf8',
  });
  const commonDir = spawnSync('git', ['rev-parse', '--git-common-dir'], {
    cwd,
    encoding: 'utf8',
  });
  if (gitDir.status !== 0 || commonDir.status !== 0) {
    return null;
  }
  const gitDirResolved = path.resolve(cwd, gitDir.stdout.trim());
  const commonDirResolved = path.resolve(cwd, commonDir.stdout.trim());
  if (gitDirResolved === commonDirResolved) {
    return cwd;
  }
  return path.dirname(commonDirResolved);
}

function collectStatus(projectRoot) {
  const gsdDir = path.join(projectRoot, '.planning');
  const roadmapPath = path.join(gsdDir, 'ROADMAP.md');
  const statePath = path.join(gsdDir, 'STATE.md');
  if (!fileExists(roadmapPath) || !fileExists(statePath)) {
    fail(`缺少 .planning 真理源: ${gsdDir}`);
  }

  const roadmap = readFile(roadmapPath);
  const state = readFile(statePath);
  const currentPhase = parseCurrentPhase(roadmap) || parseCurrentPhase(state);
  if (!currentPhase) {
    fail('无法从 .planning/ROADMAP.md 或 .planning/STATE.md 解析当前阶段');
  }

  const phaseTitles = parsePhaseTitles(roadmap);
  const maxPhase = phaseTitles.reduce((max, item) => Math.max(max, item.number), 0);
  const phasesRoot = path.join(gsdDir, 'phases');
  const phaseDir = findPhaseDir(phasesRoot, currentPhase.number);
  const plans = listFiles(phaseDir, '-PLAN.md');
  const summaries = listSummaryFiles(phaseDir);
  const uats = getUatStatus(phaseDir);
  const recent = getRecentSummaries(phasesRoot, 3);
  const warnings = getVerificationWarnings(phasesRoot);
  const contextExists = fileExists(path.join(phaseDir, 'CONTEXT.md'));
  const verificationExists = fileExists(path.join(phaseDir, 'VERIFICATION.md'));

  return {
    projectRoot,
    gsdDir,
    roadmap,
    state,
    currentPhase,
    phaseTitles,
    maxPhase,
    plans,
    summaries,
    uats,
    recent,
    warnings,
    contextExists,
    verificationExists,
  };
}

function buildNextAction(status) {
  const partial = status.uats.filter((item) => item.status === 'partial');
  if (partial.length > 0) {
    return {
      title: '继续 UAT',
      command: '继续人工/验收测试，并补齐 UAT 结果',
      detail: `${partial.map((item) => item.name).join(', ')} 仍是 partial`,
    };
  }

  const diagnosed = status.uats.filter((item) => item.status === 'diagnosed');
  if (diagnosed.length > 0) {
    return {
      title: '为 UAT 缺口开修复计划',
      command: '在当前 phase 下补 fix plan，而不是继续新增功能',
      detail: `${diagnosed.map((item) => item.name).join(', ')} 存在 diagnosed gap`,
    };
  }

  if (status.summaries.length < status.plans.length) {
    return {
      title: '执行未完成计划',
      command: `当前阶段还有 ${status.plans.length - status.summaries.length} 个 plan 未形成 summary`,
      detail: `${status.currentPhase.number} 阶段尚未执行完毕`,
    };
  }

  if (status.plans.length === 0) {
    return status.contextExists
      ? {
          title: '开始规划当前阶段',
          command: `基于 ${status.currentPhase.number}/CONTEXT.md 编写 plan`,
          detail: 'context 已存在，可以直接计划',
        }
      : {
          title: '先补阶段上下文',
          command: `为阶段 ${status.currentPhase.number} 补 CONTEXT.md 或讨论记录`,
          detail: '当前阶段目录还没有上下文文件',
        };
  }

  if (status.currentPhase.number < status.maxPhase) {
    const nextPhase = status.phaseTitles.find((item) => item.number === status.currentPhase.number + 1);
    return {
      title: `准备下一阶段 ${status.currentPhase.number + 1}`,
      command: nextPhase ? `进入 ${nextPhase.title}` : '进入下一阶段',
      detail: `阶段 ${status.currentPhase.number} 已完成`,
    };
  }

  return {
    title: `决定是否收口阶段 ${status.currentPhase.number}`,
    command: '二选一：直接收口当前阶段，或新开下一阶段承接精修技术债',
    detail: '当前已经没有未执行 plan，剩余项更像后续 phase',
  };
}

function printProgress(status) {
  const next = buildNextAction(status);
  process.stdout.write(`# ${path.basename(status.projectRoot)}\n\n`);
  process.stdout.write(`当前阶段: Phase ${status.currentPhase.number} - ${status.currentPhase.description}\n`);
  process.stdout.write(`计划完成度: ${status.summaries.length}/${status.plans.length} summaries\n`);
  process.stdout.write(`CONTEXT: ${status.contextExists ? 'yes' : 'no'} | VERIFICATION: ${status.verificationExists ? 'yes' : 'no'}\n\n`);

  if (status.recent.length > 0) {
    process.stdout.write('最近产出:\n');
    for (const item of status.recent) {
      process.stdout.write(`- Phase ${item.phase} ${item.name}: ${item.headline}\n`);
    }
    process.stdout.write('\n');
  }

  if (status.warnings.length > 0) {
    process.stdout.write('未完全收口的验证项:\n');
    for (const warning of status.warnings) {
      process.stdout.write(`- Phase ${warning.phase}: ${warning.status}\n`);
    }
    process.stdout.write('\n');
  }

  process.stdout.write('下一步:\n');
  process.stdout.write(`- ${next.title}\n`);
  process.stdout.write(`- ${next.command}\n`);
  process.stdout.write(`- ${next.detail}\n`);
}

function printNext(status) {
  const next = buildNextAction(status);
  process.stdout.write(`${next.title}\n`);
  process.stdout.write(`${next.command}\n`);
  process.stdout.write(`${next.detail}\n`);
}

function printDoctor(status) {
  const globalRoot = resolveGlobalGsdRoot(status.projectRoot);
  process.stdout.write('GSD doctor\n\n');
  process.stdout.write(`项目根: ${status.projectRoot}\n`);
  process.stdout.write(`本地真理源: ${status.gsdDir}\n`);
  process.stdout.write(`全局 gsd-tools 当前会落到: ${globalRoot || 'unknown'}\n`);
  process.stdout.write(`全局 gsd-tools 期望目录: ${globalRoot ? path.join(globalRoot, '.planning') : 'unknown'}\n\n`);
  process.stdout.write('结论:\n');
  process.stdout.write('- 这个 worktree 的真理源是 .planning。\n');
  process.stdout.write('- 全局 gsd-tools 会先跳回 git common dir 的主仓根，再查 .planning。\n');
  process.stdout.write('- 所以 stock gsd-progress/gsd-next 目前不会直接认这个项目。\n\n');
  process.stdout.write('建议入口:\n');
  process.stdout.write('- npm run gsd:progress\n');
  process.stdout.write('- npm run gsd:next\n');
  process.stdout.write('- npm run gsd:doctor\n');
}

function main() {
  const command = process.argv[2] || 'progress';
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    fail('向上未找到 .planning 目录');
  }

  const status = collectStatus(projectRoot);

  if (command === 'progress') {
    printProgress(status);
    return;
  }

  if (command === 'next') {
    printNext(status);
    return;
  }

  if (command === 'doctor') {
    printDoctor(status);
    return;
  }

  fail(`未知命令: ${command}`);
}

main();
