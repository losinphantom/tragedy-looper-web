const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(ROOT, 'docs', '真剧本全集');
const SCRIPTS_DIR = path.join(ROOT, 'docs', 'game-knowledge', 'scripts');
const ENUM_MAP_PATH = path.join(SCRIPTS_DIR, 'enum-mapping.json');

const OUTPUTS = {
  official: path.join(SCRIPTS_DIR, 'scripts-collection-zj-official.json'),
  legacy: path.join(SCRIPTS_DIR, 'scripts-collection-zj-legacy.json'),
  custom: path.join(SCRIPTS_DIR, 'scripts-collection-zj-custom.json'),
  report: path.join(SCRIPTS_DIR, 'zhenjubenquanji-conversion-report.json'),
};

const FOLDER_CONFIGS = {
  '官方&剧本集剧本（公开）': { category: 'official', visibility: 'public', namespace: 'OFF' },
  '官方&剧本集剧本（非公开）': { category: 'official', visibility: 'private', namespace: 'OFF' },
  '民间模组&旧模组剧本（公开）': { category: 'legacy', visibility: 'public', namespace: 'LEG' },
  '民间模组&旧模组剧本（非公开）': { category: 'legacy', visibility: 'private', namespace: 'LEG' },
  '自制剧本（公开）': { category: 'custom', visibility: 'public', namespace: 'CUS' },
  '自制剧本（非公开）': { category: 'custom', visibility: 'private', namespace: 'CUS' },
};

const MODULE_BY_PREFIX = {
  AHR: { module: 'MOD_ANOTHER_HORIZON_REVISED', moduleId: 'anotherHorizonR' },
  BTX: { module: 'MOD_BASIC_TRAGEDY', moduleId: 'basicTragedy' },
  FS: { module: 'MOD_FIRST_STEPS', moduleId: 'firstSteps' },
  HS: { module: 'MOD_HAUNTED_STAGE', moduleId: 'hauntedStage' },
  HSA: { module: 'MOD_HAUNTED_STAGE_AGAIN', moduleId: 'hauntedStageAgain' },
  LL: { module: 'MOD_LAST_LIAR', moduleId: 'lastLiar' },
  MC: { module: 'MOD_MYSTERY_CIRCLE', moduleId: 'mysteryCircle' },
  MZ: { module: 'MOD_MIDNIGHT_ZONE', moduleId: 'midnightZone' },
  SC: { module: 'MOD_SUPERNATURAL', moduleId: 'supernatural' },
  WM: { module: 'MOD_COSMIC_MYTHOLOGY', moduleId: 'cosmicMythology' },
};

const MODULE_LINE_ALIASES = {
  AHR: 'AHR',
  'AHR +': 'AHR',
  'AHR+': 'AHR',
  BTX: 'BTX',
  'BTX +': 'BTX',
  'BTX+': 'BTX',
  FS: 'FS',
  HS: 'HS',
  HSA: 'HSA',
  'HSA +': 'HSA',
  'HSA+': 'HSA',
  LL: 'LL',
  MC: 'MC',
  'MC +': 'MC',
  'MC+': 'MC',
  MZ: 'MZ',
  'MZ +': 'MZ',
  'MZ+': 'MZ',
  SC: 'SC',
  WM: 'WM',
  'WM +': 'WM',
  'WM+': 'WM',
};

const CHARACTER_ALIASES = {
  AI: 'A.I.',
  'A I': 'A.I.',
  'A.I': 'A.I.',
  警察: '刑警',
  病人: '住院患者',
  社畜: '职员',
  法医: '鉴别员',
  记者: '媒体人',
  神树: '御神木',
  士兵: '军人',
  异世界人: '异界人',
  上班族: '职员',
  患者: '住院患者',
  黑貓: '黑猫',
  猫: '黑猫',
};

const ROLE_ALIASES = {
  KP: '关键人物',
  kp: '关键人物',
  '关键人物/主谋': '关键人物 / 主谋',
  '关键人物／主谋': '关键人物 / 主谋',
  '传谣人/强迫症': '传谣人 / 强迫症',
  '传谣人／强迫症': '传谣人 / 强迫症',
  '传谣人/杀人狂': '传谣人 / 杀人狂',
  '传谣人／杀人狂': '传谣人 / 杀人狂',
  '平民/杀人狂': '平民 / 杀人狂',
  '平民／杀人狂': '平民 / 杀人狂',
  '强迫症/关键人物': '强迫症 / 关键人物',
  '强迫症／关键人物': '强迫症 / 关键人物',
  '魔笛手/布道者': '魔笛手 / 布道者',
  '魔笛手／布道者': '魔笛手 / 布道者',
  叙事者: '叙述者',
  傀儡木偶: '提线木偶',
  传谣: '传谣人',
  秘钥: '密钥',
};

const INCIDENT_ALIASES = {
  '2不安扩散': '不安扩散',
  '3医院事故': '医院事故',
  '2医院事故': '医院事故',
  '5失踪': '失踪',
  '4失踪': '失踪',
  '3失踪': '失踪',
  '1自杀': '自杀',
  '3自杀': '自杀',
  '4自杀': '自杀',
  集体自杀: '自杀',
  咒怨: '诅咒活化',
  黑暗学园: '黑暗学院',
  魔女的茶会: '魔女们的茶会',
  诅咒觉醒: '诅咒活化',
  对角破坏: 'Diagonal Destruction',
  '对角破坏 2': 'Diagonal Destruction 2',
  '对角破坏 3': 'Diagonal Destruction 3',
  替代行刑: '代行者',
  蔓延: '散播',
  庭达罗斯之嗅: '廷达罗斯之嗅',
};

const RULE_ALIASES = {
  黑暗学园: '黑暗学院',
  魔女的茶会: '魔女们的茶会',
};

const SPECIAL_HEADINGS = [
  '特殊规则',
  '特规',
  '背景故事',
  '剧作家指引',
  '固定出牌',
  '里故事',
  '里世界',
  '表世界',
  '下面是在',
  '游戏过程中',
  '猎犬来了',
  '这其实只是',
  '梦境并非',
  '一切的疯狂',
  '行动规则',
  '行动阶段',
  '剧作家指南',
  '主人公通关指南',
  '主人公操作',
  '公开信息',
  '公开信息表',
  '非公开信息',
  '非公开信息表',
  '登场人物',
  '登场角色',
  '规则',
  '规则与角色身份',
];

const SECTION_HEADINGS = [
  '事件',
  '事件表',
  '日程',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\t/g, ' ')
    .replace(/[　]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingBullet(value) {
  return value.replace(/^[・•·\-]+\s*/, '').trim();
}

function canonicalSlash(value) {
  return normalizeWhitespace(value)
    .replace(/[／|]/g, '/')
    .replace(/\s*\/\s*/g, ' / ');
}

function safeFileStem(name) {
  return name.replace(/\.txt$/i, '');
}

function filenameMeta(stem) {
  const authorMatch = stem.match(/\s+作者[:：]\s*(.+)$/);
  const creator = authorMatch ? normalizeWhitespace(authorMatch[1]) : '';
  const beforeAuthor = authorMatch ? stem.slice(0, authorMatch.index) : stem;
  const codeMatch = beforeAuthor.match(/^((?:特殊-\d+[A-Z]?|[A-Z]{2,4}\+?-\d+[A-Z]*))(.*)$/i);
  if (!codeMatch) {
    return {
      rawCode: beforeAuthor,
      title: beforeAuthor,
      creator,
    };
  }

  const rawCode = codeMatch[1].trim().replace(/-$/, '');
  const title = normalizeWhitespace(codeMatch[2].replace(/^[\s\-–—]+/, ''));
  return { rawCode, title, creator };
}

function normalizeCode(rawCode) {
  return rawCode
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[（）()]/g, '')
    .replace(/[^\w+\-一-龥]/g, '');
}

function inferPrefix(rawCode) {
  if (rawCode.startsWith('特殊-')) return '特殊';
  const match = rawCode.match(/^([A-Z]{2,4})\+?-/);
  return match ? match[1] : '';
}

function inferModule(rawCode, moduleLine) {
  const directPrefix = inferPrefix(rawCode);
  if (MODULE_BY_PREFIX[directPrefix]) return MODULE_BY_PREFIX[directPrefix];
  const normalizedModuleLine = normalizeWhitespace(moduleLine);
  let modulePrefix = MODULE_LINE_ALIASES[normalizedModuleLine] || '';
  if (!modulePrefix && normalizedModuleLine) {
    const candidates = Object.keys(MODULE_BY_PREFIX);
    modulePrefix = candidates.find(prefix => new RegExp(`\\b${prefix}\\+?\\b`, 'i').test(normalizedModuleLine)) || '';
  }
  if (!modulePrefix && normalizedModuleLine.includes('平行世界')) modulePrefix = 'AHR';
  if (!modulePrefix && normalizedModuleLine.includes('基础惨剧')) modulePrefix = 'BTX';
  if (!modulePrefix && normalizedModuleLine.includes('午夜')) modulePrefix = 'MZ';
  if (!modulePrefix && normalizedModuleLine.includes('神秘圆环')) modulePrefix = 'MC';
  if (!modulePrefix && normalizedModuleLine.includes('寰宇神话')) modulePrefix = 'WM';
  if (!modulePrefix && normalizedModuleLine.includes('怪异舞台')) modulePrefix = 'HSA';
  if (MODULE_BY_PREFIX[modulePrefix]) return MODULE_BY_PREFIX[modulePrefix];
  return { module: 'MOD_UNKNOWN', moduleId: 'unknown' };
}

function looksLikeLoopDayLine(line) {
  return /(轮|輪|轮回).*(天|日)|无限轮|輪回数不定/.test(line);
}

function parseLoopDay(line) {
  const raw = normalizeWhitespace(line).replace(/，/g, ' ').replace(/,/g, ' ');
  const dayMatch = raw.match(/([0-9Xx]+)\s*天/);
  const loopMatch = raw.match(/(无限|∞|輪回数不定|不定|[0-9]+(?:\s*-\s*[0-9]+)?)\s*轮(?:回)?/);

  let loops = 0;
  let loopSpec = '';
  let daysPerLoop = 0;
  let daySpec = '';
  const unclear = [];

  if (loopMatch) {
    loopSpec = normalizeWhitespace(loopMatch[1].replace(/\s+/g, ''));
    if (/^(无限|∞|輪回数不定|不定)$/.test(loopMatch[1])) {
      loops = -1;
    } else if (/^\d+\s*-\s*\d+$/.test(loopMatch[1])) {
      const parts = loopMatch[1].split('-').map(part => Number.parseInt(part.trim(), 10));
      loops = Math.max(...parts);
    } else if (/^\d+$/.test(loopMatch[1])) {
      loops = Number.parseInt(loopMatch[1], 10);
    } else {
      unclear.push(`non_numeric_loops:${raw}`);
    }
  } else {
    unclear.push(`missing_loops:${raw}`);
  }

  if (dayMatch) {
    daySpec = normalizeWhitespace(dayMatch[1]).toUpperCase();
    if (/^\d+$/.test(dayMatch[1])) {
      daysPerLoop = Number.parseInt(dayMatch[1], 10);
    } else {
      unclear.push(`non_numeric_days:${raw}`);
    }
  } else {
    unclear.push(`missing_days:${raw}`);
  }

  return { loops, loopSpec, daysPerLoop, daySpec, unclear };
}

function classifyScript(script) {
  const unresolvedCast = (script.cast || []).filter(c => !c.id || !c.roleId).length;
  const unresolvedIncidents = (script.incidents || []).filter(i => !i.incidentId || (i.culprit && !i.culpritId)).length;
  const onlyBenignUnclear = (script.unclear || []).every(entry =>
    entry.startsWith('non_numeric_loops:') || entry.startsWith('non_numeric_days:'),
  );

  const missingCoreStructure = !script.mainPlot || !(script.cast || []).length;
  const severeCastGap =
    unresolvedCast >= 3 && unresolvedCast >= Math.ceil(((script.cast || []).length || 1) / 2);
  const severeIncidentGap =
    unresolvedIncidents >= 3 && unresolvedIncidents >= Math.ceil(((script.incidents || []).length || 1) / 2);
  const metaOnlyScript =
    !(script.cast || []).length &&
    !(script.incidents || []).length &&
    (script.specialRules || []).length > 0;

  if (missingCoreStructure || severeCastGap || severeIncidentGap || metaOnlyScript) {
    return 'manual_review';
  }

  if (
    (script.specialRules || []).length > 0 ||
    unresolvedCast > 0 ||
    unresolvedIncidents > 0 ||
    !onlyBenignUnclear ||
    (script.unclear || []).length > 0
  ) {
    return 'import_with_special_rules';
  }

  return 'direct_import';
}

function getManualReviewReasons(script) {
  const reasons = [];
  const cast = script.cast || [];
  const incidents = script.incidents || [];
  const unresolvedCast = cast.filter(c => !c.id || !c.roleId).length;
  const unresolvedIncidents = incidents.filter(i => !i.incidentId || (i.culprit && !i.culpritId)).length;
  const missingCoreStructure = !script.mainPlot || !cast.length;
  const severeCastGap = unresolvedCast >= 3 && unresolvedCast >= Math.ceil((cast.length || 1) / 2);
  const severeIncidentGap =
    unresolvedIncidents >= 3 && unresolvedIncidents >= Math.ceil((incidents.length || 1) / 2);
  const metaOnlyScript = !cast.length && !incidents.length && (script.specialRules || []).length > 0;

  if (missingCoreStructure) {
    reasons.push('missing_core_structure');
  }
  if (severeCastGap) {
    reasons.push(`severe_cast_gap:${unresolvedCast}/${cast.length}`);
  }
  if (severeIncidentGap) {
    reasons.push(`severe_incident_gap:${unresolvedIncidents}/${incidents.length}`);
  }
  if (metaOnlyScript) {
    reasons.push('meta_only_script');
  }

  return reasons;
}

function normalizeCharacterName(value) {
  const stripped = stripLeadingBullet(normalizeWhitespace(value))
    .replace(/[：:]+$/, '')
    .trim();
  return CHARACTER_ALIASES[stripped] || stripped;
}

function normalizeRoleName(value) {
  const canonical = canonicalSlash(value).replace(/[：:]+$/, '').trim();
  return ROLE_ALIASES[canonical] || canonical;
}

function normalizeIncidentName(value) {
  const cleaned = normalizeWhitespace(value)
    .replace(/[：:]+$/, '')
    .replace(/[()（）]/g, match => (match === '(' || match === '（' ? '（' : '）'));
  return INCIDENT_ALIASES[cleaned] || cleaned;
}

function normalizeRuleName(value) {
  const cleaned = normalizeWhitespace(value);
  return RULE_ALIASES[cleaned] || cleaned;
}

function isSpecialHeading(line) {
  return SPECIAL_HEADINGS.some(heading => line.startsWith(heading));
}

function isSectionHeading(line) {
  return SECTION_HEADINGS.includes(line) || SECTION_HEADINGS.includes(line.replace(/[：:]$/, ''));
}

function isPlainDayHeading(line) {
  return /^(第?[一二三四五六七八九十0-9]+天|D[0-9]+)$/i.test(line);
}

function scoreCandidate(candidate) {
  let score = candidate.sourceVisibility === 'private' ? 100 : 0;
  score += candidate.title && candidate.title !== candidate.rawCode ? 30 : 0;
  score += Math.min((candidate.cast || []).length, 15) * 3;
  score += Math.min((candidate.incidents || []).length, 12) * 2;
  score += candidate.mainPlot ? 10 : 0;
  score += candidate.subplot1 ? 8 : 0;
  score += candidate.subplot2 ? 6 : 0;
  score += Math.min((candidate.specialRules || []).length, 10);
  score -= Math.min((candidate.unclear || []).length, 10);
  return score;
}

function buildLookupTables(enumMap) {
  const roleKeys = Object.keys(enumMap.roles).sort((a, b) => canonicalSlash(b).length - canonicalSlash(a).length);
  return {
    roleKeys,
  };
}

function parseCastLine(line, enumMap, lookups) {
  if (!line || looksLikeLoopDayLine(line) || isPlainDayHeading(line) || isSpecialHeading(line) || isSectionHeading(line)) {
    return null;
  }
  if (/^[0-9]+/.test(line)) return null;

  let character = '';
  let remainder = '';
  let characterNotes = '';

  if (line.includes('：') || line.includes(':')) {
    const match = line.match(/^(.+?)[：:]\s*(.+)$/);
    if (!match) return null;
    character = normalizeCharacterName(match[1]);
    remainder = normalizeWhitespace(match[2]);
  } else {
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return null;
    character = normalizeCharacterName(parts[0]);
    remainder = normalizeWhitespace(parts.slice(1).join(' '));
  }

  const characterNoteMatch = character.match(/^(.+?)[（(]([^()（）]+)[）)]$/);
  if (characterNoteMatch) {
    character = normalizeCharacterName(characterNoteMatch[1]);
    characterNotes = normalizeWhitespace(characterNoteMatch[2]);
  }

  if (!character || !remainder) return null;
  if (/^D\d+$/i.test(character)) return null;
  if (['模组', '主线', '支线', '支线1', '支线2', '备注', '奖金', '截止日期', '寻找bug奖', '作弊奖', '事件', '事件表'].includes(character)) return null;
  if (!enumMap.characters[character] && enumMap.roles[character] && /^(密谋|不安|友尽|左右|上下|斜|绝望|希望|[A-Z0-9\-]+)/.test(remainder)) {
    return null;
  }
  if (!enumMap.characters[character] && !/^[A-Za-z0-9_.+\-一-龥]{1,16}$/.test(character)) return null;

  let role = '';
  let notes = '';
  let working = canonicalSlash(remainder);
  let directRole = '';

  const trailingNoteMatch = working.match(/[（(]([^()（）]+)[）)]$/);
  if (trailingNoteMatch) {
    notes = normalizeWhitespace(trailingNoteMatch[1]);
    working = normalizeWhitespace(working.slice(0, trailingNoteMatch.index));
  }

  if (!working && notes) {
    const maybeRole = normalizeRoleName(notes);
    if (enumMap.roles[maybeRole]) {
      directRole = maybeRole;
      notes = '';
    }
  }

  if (directRole) {
    role = directRole;
  } else {
    const matchedRoleKey = lookups.roleKeys.find(key => {
      const canonicalKey = canonicalSlash(key);
      return working === canonicalKey || working.startsWith(`${canonicalKey} `);
    });

    if (matchedRoleKey) {
      role = normalizeRoleName(matchedRoleKey);
      const rest = normalizeWhitespace(working.slice(canonicalSlash(matchedRoleKey).length));
      notes = [notes, rest].filter(Boolean).join(' | ');
    } else {
      const parts = working.split(' ');
      role = normalizeRoleName(parts[0]);
      notes = [notes, normalizeWhitespace(parts.slice(1).join(' '))].filter(Boolean).join(' | ');
    }
  }

  const castEntry = {
    character,
    role,
    notes: [characterNotes, notes].filter(Boolean).join(' | '),
  };

  if (enumMap.characters[character]?.id) castEntry.id = enumMap.characters[character].id;
  if (enumMap.roles[role]?.id) castEntry.roleId = enumMap.roles[role].id;

  return castEntry;
}

function chineseNumberToInt(text) {
  const dict = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  if (text === '十') return 10;
  if (text.startsWith('十')) return 10 + (dict[text.slice(1)] || 0);
  if (text.endsWith('十')) return (dict[text[0]] || 0) * 10;
  const parts = text.split('十');
  if (parts.length === 2) return (dict[parts[0]] || 0) * 10 + (dict[parts[1]] || 0);
  return dict[text] || 0;
}

function parseIncidentLine(line, enumMap) {
  if (!line || isSpecialHeading(line)) return null;

  let day = 0;
  let rest = '';
  const normalized = normalizeWhitespace(stripLeadingBullet(line));

  let match = normalized.match(/^第?([一二三四五六七八九十0-9]+)天[：:]?\s*(.*)$/);
  if (match) {
    day = chineseNumberToInt(match[1]);
    rest = normalizeWhitespace(match[2]);
  } else {
    match = normalized.match(/^D\s*([0-9]+)\s+(.*)$/i);
    if (match) {
      day = Number.parseInt(match[1], 10);
      rest = normalizeWhitespace(match[2]);
    } else {
      match = normalized.match(/^([0-9]+)\s*(.+)$/);
      if (match) {
        day = Number.parseInt(match[1], 10);
        rest = normalizeWhitespace(match[2]);
      } else {
        return null;
      }
    }
  }

  if (!day) return null;
  if (!rest) return { day, incident: '', culprit: '' };
  if (/(禁止友好|密谋|上下|左右|移动)/.test(rest)) return null;

  let culprit = '';
  let incident = '';

  const culpritParenMatch = rest.match(/^(.+)[（(]([^()（）]+)[）)]$/);
  if (culpritParenMatch) {
    incident = normalizeIncidentName(culpritParenMatch[1]);
    culprit = normalizeCharacterName(culpritParenMatch[2]);
  } else {
    const fauxWrappedCulpritMatch = rest.match(/^(.+[）)])([^（）()\s]+)$/);
    if (fauxWrappedCulpritMatch) {
      incident = normalizeIncidentName(fauxWrappedCulpritMatch[1]);
      culprit = normalizeCharacterName(fauxWrappedCulpritMatch[2]);
    } else {
    const parts = rest.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const last = normalizeCharacterName(parts[parts.length - 1]);
      if (enumMap.characters[last] || /^[A-Za-z0-9_.+\-一-龥]{1,16}$/.test(last)) {
        culprit = last;
        incident = normalizeIncidentName(parts.slice(0, -1).join(' '));
      } else {
        incident = normalizeIncidentName(rest);
      }
    } else {
      incident = normalizeIncidentName(rest);
    }
    }
  }

  const incidentEntry = {
    day,
    incident,
    culprit,
  };

  if (enumMap.incidents[incident]?.id) incidentEntry.incidentId = enumMap.incidents[incident].id;
  if (culprit && enumMap.characters[culprit]?.id) incidentEntry.culpritId = enumMap.characters[culprit].id;
  return incidentEntry;
}

function parseFile(filePath, folderConfig, enumMap, lookups) {
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const stem = safeFileStem(path.basename(filePath));
  const meta = filenameMeta(stem);
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw
    .split(/\r?\n/)
    .map(line => normalizeWhitespace(stripLeadingBullet(line)))
    .filter(Boolean);

  let loopIndex = lines.findIndex(looksLikeLoopDayLine);
  if (loopIndex < 0) loopIndex = 0;

  const loopData = lines[loopIndex] ? parseLoopDay(lines[loopIndex]) : {
    loops: 0,
    loopSpec: '',
    daysPerLoop: 0,
    daySpec: '',
    unclear: ['missing_loop_line'],
  };

  const working = lines.filter((_, index) => index !== loopIndex);
  let moduleLine = '';
  const plotCandidates = [];
  const cast = [];
  const incidents = [];
  const specialRules = [];
  const unclear = [...loopData.unclear];

  let section = 'pre';

  for (const line of working) {
    if (!line) continue;
    const firstToken = line.split(/\s+/)[0];

    if (/^模组[：:]/.test(line)) {
      moduleLine = normalizeWhitespace(line.split(/[：:]/).slice(1).join(':'));
      continue;
    }
    if (line === '模组不公开' || line === '模組不公開') {
      specialRules.push(line);
      continue;
    }
    if (!moduleLine && MODULE_LINE_ALIASES[line]) {
      moduleLine = line;
      continue;
    }

    if (/^主线[：:]/.test(line)) {
      const value = normalizeWhitespace(line.split(/[：:]/).slice(1).join(':'));
      if (value) {
        const parts = value.split(/[，,]/).map(part => normalizeRuleName(part)).filter(Boolean);
        if (parts[0]) plotCandidates.push(parts[0]);
      }
      continue;
    }
    if (/^支线\d*[：:]/.test(line)) {
      const value = normalizeWhitespace(line.split(/[：:]/).slice(1).join(':'));
      if (value) {
        const parts = value.split(/[，,]/).map(part => normalizeRuleName(part)).filter(Boolean);
        plotCandidates.push(...parts);
      }
      continue;
    }

    if (isSpecialHeading(line)) {
      section = 'special';
      const parts = line.split(/[：:]/);
      if (parts.length > 1) {
        const rest = normalizeWhitespace(parts.slice(1).join(':'));
        if (rest && !['登场角色', '登场人物', '公开信息', '公开信息表', '非公开信息', '非公开信息表'].includes(parts[0])) {
          specialRules.push(rest);
        }
      }
      continue;
    }

    if (isSectionHeading(line)) {
      section = 'incidents';
      continue;
    }

    if (isPlainDayHeading(line)) {
      section = 'incidents';
      continue;
    }

    if (section === 'special') {
      specialRules.push(line);
      continue;
    }

    if (!enumMap.characters[firstToken] && enumMap.roles[firstToken] && /(密谋|不安|友尽|左右|上下|斜|绝望|希望)/.test(line)) {
      specialRules.push(line);
      continue;
    }

    const incidentEntry = parseIncidentLine(line, enumMap);
    if (incidentEntry && section !== 'pre') {
      incidents.push(incidentEntry);
      section = 'incidents';
      continue;
    }

    const castEntry = parseCastLine(line, enumMap, lookups);
    if (castEntry && section !== 'incidents') {
      cast.push(castEntry);
      section = 'cast';
      continue;
    }

    if (incidentEntry) {
      incidents.push(incidentEntry);
      section = 'incidents';
      continue;
    }

    if (section === 'pre' && plotCandidates.length < 6) {
      plotCandidates.push(line);
      continue;
    }

    specialRules.push(line);
    section = 'special';
  }

  let title = meta.title || meta.rawCode;
  if (!meta.title && plotCandidates.length && !cast.length) {
    title = meta.rawCode;
  }

  const plotLines = [];
  for (const candidate of plotCandidates) {
    if (!candidate) continue;
    if (/^(模组|主线|支线|公开信息|登场角色|登场人物)/.test(candidate)) continue;
    if (plotLines.length < 3) {
      plotLines.push(normalizeRuleName(candidate));
    } else {
      specialRules.push(candidate);
    }
  }

  const moduleData = inferModule(meta.rawCode, moduleLine);
  const scheduledEvents = incidents
    .filter(incident => incident.day > 0)
    .map(incident => ({
      day: incident.day,
      event: incident.incident,
      ...(incident.incidentId ? { eventId: incident.incidentId } : {}),
    }));

  if (!plotLines.length) unclear.push('missing_plots');
  if (!cast.length) unclear.push('missing_cast');
  if (!incidents.length) unclear.push('missing_incidents');

  const sourceKey = `${folderConfig.category}:${normalizeCode(meta.rawCode)}`;
  const script = {
    id: `ZJ-${folderConfig.namespace}-${normalizeCode(meta.rawCode)}`,
    rawCode: meta.rawCode,
    title,
    creator: meta.creator,
    module: moduleData.module,
    moduleId: moduleData.moduleId,
    loops: loopData.loops,
    daysPerLoop: loopData.daysPerLoop,
    loopSpec: loopData.loopSpec,
    daySpec: loopData.daySpec,
    discussionAllowed: true,
    specialRules: [...new Set(specialRules)].filter(Boolean),
    mainPlot: plotLines[0] || '',
    subplot1: plotLines[1] || '',
    subplot2: plotLines[2] || '',
    cast,
    incidents,
    scheduledEvents,
    unclear: [...new Set(unclear)].filter(Boolean),
    sourceFolder: path.basename(path.dirname(filePath)),
    sourceVisibility: folderConfig.visibility,
    sourcePath: relPath,
    verified: false,
  };

  if (enumMap.rules[script.mainPlot]?.id) script.mainPlotId = enumMap.rules[script.mainPlot].id;
  if (enumMap.rules[script.subplot1]?.id) script.subplot1Id = enumMap.rules[script.subplot1].id;
  if (enumMap.rules[script.subplot2]?.id) script.subplot2Id = enumMap.rules[script.subplot2].id;
  script.importStatus = classifyScript(script);

  return { sourceKey, script };
}

function summarizeUnknowns(collections, enumMap) {
  const unknown = {
    plots: {},
    roles: {},
    incidents: {},
    characters: {},
  };

  const add = (bucket, key) => {
    if (!key) return;
    bucket[key] = (bucket[key] || 0) + 1;
  };

  for (const scripts of Object.values(collections)) {
    for (const script of scripts) {
      if (script.mainPlot && !enumMap.rules[script.mainPlot]) add(unknown.plots, script.mainPlot);
      if (script.subplot1 && !enumMap.rules[script.subplot1]) add(unknown.plots, script.subplot1);
      if (script.subplot2 && !enumMap.rules[script.subplot2]) add(unknown.plots, script.subplot2);

      for (const cast of script.cast || []) {
        if (cast.role && !enumMap.roles[cast.role]) add(unknown.roles, cast.role);
        if (cast.character && !enumMap.characters[cast.character]) add(unknown.characters, cast.character);
      }

      for (const incident of script.incidents || []) {
        if (incident.incident && !enumMap.incidents[incident.incident]) add(unknown.incidents, incident.incident);
        if (incident.culprit && !enumMap.characters[incident.culprit]) add(unknown.characters, incident.culprit);
      }
    }
  }

  return Object.fromEntries(
    Object.entries(unknown).map(([key, value]) => [
      key,
      Object.entries(value)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
        .map(([name, count]) => ({ name, count })),
    ]),
  );
}

function main() {
  const enumMap = readJson(ENUM_MAP_PATH);
  const lookups = buildLookupTables(enumMap);

  const preferred = new Map();
  const duplicates = [];
  const skippedFiles = [];

  for (const [folderName, folderConfig] of Object.entries(FOLDER_CONFIGS)) {
    const folderPath = path.join(SOURCE_ROOT, folderName);
    if (!fs.existsSync(folderPath)) continue;
    const fileNames = fs.readdirSync(folderPath);
    for (const fileName of fileNames) {
      const fullPath = path.join(folderPath, fileName);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      if (!fileName.toLowerCase().endsWith('.txt')) {
        skippedFiles.push({
          path: path.relative(ROOT, fullPath).replace(/\\/g, '/'),
          reason: 'non_txt',
        });
        continue;
      }

      const { sourceKey, script } = parseFile(fullPath, folderConfig, enumMap, lookups);
      const existing = preferred.get(sourceKey);
      if (!existing) {
        preferred.set(sourceKey, script);
        continue;
      }

      const existingScore = scoreCandidate(existing);
      const nextScore = scoreCandidate(script);
      if (nextScore > existingScore) {
        duplicates.push({
          sourceKey,
          kept: script.sourcePath,
          dropped: existing.sourcePath,
          keptScore: nextScore,
          droppedScore: existingScore,
        });
        preferred.set(sourceKey, script);
      } else {
        duplicates.push({
          sourceKey,
          kept: existing.sourcePath,
          dropped: script.sourcePath,
          keptScore: existingScore,
          droppedScore: nextScore,
        });
      }
    }
  }

  const collections = {
    official: [],
    legacy: [],
    custom: [],
  };

  for (const script of preferred.values()) {
    collections[script.id.includes('ZJ-OFF-') ? 'official' : script.id.includes('ZJ-LEG-') ? 'legacy' : 'custom'].push(script);
  }

  for (const scripts of Object.values(collections)) {
    scripts.sort((a, b) => {
      const byCode = a.rawCode.localeCompare(b.rawCode, 'zh-Hans-CN');
      if (byCode !== 0) return byCode;
      return a.title.localeCompare(b.title, 'zh-Hans-CN');
    });
  }

  writeJson(OUTPUTS.official, collections.official);
  writeJson(OUTPUTS.legacy, collections.legacy);
  writeJson(OUTPUTS.custom, collections.custom);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: path.relative(ROOT, SOURCE_ROOT).replace(/\\/g, '/'),
    outputs: Object.fromEntries(Object.entries(OUTPUTS).map(([key, value]) => [key, path.relative(ROOT, value).replace(/\\/g, '/')])),
    definitions: {
      dirtyEntry: 'Only scripts classified as manual_review are treated as dirty entries.',
      direct_import: 'Core structure is complete and can be imported directly.',
      import_with_special_rules:
        'Can be imported, but some semantics are preserved in specialRules/unclear or still have minor unresolved mappings.',
      manual_review:
        'Core structure is incomplete, or cast/incident parsing has severe gaps, or the file is mostly meta rules that cannot yet be normalized safely.',
    },
    counts: {
      official: collections.official.length,
      legacy: collections.legacy.length,
      custom: collections.custom.length,
      total: collections.official.length + collections.legacy.length + collections.custom.length,
      duplicatesResolved: duplicates.length,
      skippedFiles: skippedFiles.length,
      directImport: [...preferred.values()].filter(script => script.importStatus === 'direct_import').length,
      importWithSpecialRules: [...preferred.values()].filter(script => script.importStatus === 'import_with_special_rules').length,
      manualReview: [...preferred.values()].filter(script => script.importStatus === 'manual_review').length,
    },
    duplicatesResolved: duplicates,
    skippedFiles,
    manualReviewScripts: [...preferred.values()]
      .filter(script => script.importStatus === 'manual_review')
      .map(script => ({
        id: script.id,
        rawCode: script.rawCode,
        title: script.title,
        sourcePath: script.sourcePath,
        reviewReasons: getManualReviewReasons(script),
        unclear: script.unclear,
      })),
    unknownTerms: summarizeUnknowns(collections, enumMap),
  };

  writeJson(OUTPUTS.report, report);

  console.log(`official\t${collections.official.length}`);
  console.log(`legacy\t${collections.legacy.length}`);
  console.log(`custom\t${collections.custom.length}`);
  console.log(`total\t${report.counts.total}`);
  console.log(`report\t${OUTPUTS.report}`);
}

main();
