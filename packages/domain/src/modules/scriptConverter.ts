/**
 * Script Converter — 枚举 ID → domain ID 转换器
 *
 * 将 script-reader 的 JSON 集合格式转换为标准 ScriptDef。
 * 枚举 ID 通过 enum-mapping.json 中的反向查找表进行转换。
 */

import type { ScriptDef } from '../script';

// ── 枚举 → domain ID 反向查找表 ─────────────────────────────────────────────
// 从 enum-mapping.json 提取的反向映射（enum ID → domain snake_case ID）

const MODULE_MAP: Record<string, string> = {
  MOD_FIRST_STEPS: 'first_steps',
  MOD_BASIC_TRAGEDY: 'basic_tragedy',
  MOD_MIDNIGHT_ZONE: 'midnight_zone',
  MOD_MYSTERY_CIRCLE: 'mystery_circle',
  MOD_HAUNTED_STAGE_AGAIN: 'haunted_stage_again',
  MOD_ANOTHER_HORIZON_REVISED: 'another_horizon_revised',
  MOD_WEIRD_MYTHOLOGY: 'weird_mythology',
  MOD_COSMIC_MYTHOLOGY: 'weird_mythology',
  MOD_LAST_LIAR: 'last_liar',
  MOD_ANOTHER_HORIZON: 'another_horizon',
  MOD_HAUNTED_STAGE: 'haunted_stage',
  MOD_SUPERNATURAL: 'supernatural_tragedy',
  MOD_UNKNOWN: 'unknown',
};

const PLOT_ALIAS_MAP_BY_SET: Record<string, Record<string, string>> = {
  first_steps: {
    an_unsettling_rumour: 'an_unsettling_rumor',
  },
  basic_tragedy: {
    an_unsettling_rumour: 'an_unsettling_rumor',
  },
  mystery_circle: {
    tightrope_plan: 'plan_on_a_tightrope',
    a_quilt_of_incidents: 'spiderweb_of_incidents',
    a_drop_of_strychnine: 'strychnine_tincture',
    the_black_school: 'dark_school',
    i_am_a_master_detective: 'i_am_detective',
    dance_of_fools: 'fools_dance',
    an_absolute_will: 'absolute_will',
    tricky_twins: 'twins_trick',
    dance_of_patients: 'panic_in_ward',
    isolated_institution_psycho: 'panic_in_ward',
  },
  weird_mythology: {
    // 主阴谋 Y
    giant_time_bomb_again: 'giant_time_bomb_y',
    bloody_rites: 'bloody_ritual_y',
    choir_to_the_outside_god: 'chorus_of_the_outer_gods',
    the_king_in_yellow: 'king_in_yellow',
    the_sacred_words_of_dagon: 'gospel_of_dagon',
    // 副阴谋 X
    an_unsettling_rumour: 'spreading_rumors',
    the_resistance: 'the_resistor',
    people_who_saw: 'witnessing_fear',
    witness_panic: 'witnessing_fear',
    the_profound_race: 'great_race_of_yith',
    whispers_from_the_deep: 'whisper_of_the_abyss',
    the_faceless_god: 'faceless_god',
    twisted_truth: 'truth_of_madness',
    twisted_truth_bloody_rites: 'truth_of_madness',
    twisted_truth_bomb_y: 'truth_of_madness',
    twisted_truth_choir: 'truth_of_madness',
    twisted_truth_dagon: 'truth_of_madness',
    twisted_truth_yellow_king: 'truth_of_madness',
  },
};

const ROLE_ALIAS_MAP_BY_SET: Record<string, Record<string, string>> = {
  mystery_circle: {
    private_investigator: 'detective',
    therapist: 'psychiatrist',
    twin: 'twins',
  },
  haunted_stage_again: {
    show_off: 'paper_tiger',
  },
  weird_mythology: {
    wizard: 'spellcaster',
  },
};

const INCIDENT_ALIAS_MAP_BY_SET: Record<string, Record<string, string>> = {
  mystery_circle: {
    bestial_murder: 'bizarre_murder',
    the_silver_bullet: 'silver_bullet',
    a_suspicious_letter: 'suspicious_letter',
    terrorism: 'terrorist_attack',
    portent: 'omen',
    closed_circle: 'blockade',
  },
  weird_mythology: {
    insane_murder: 'serial_murder',
    mass_suicide: 'collective_suicide',
    hound_dog_scent: 'scent_of_tindalos',
    the_executioner: 'funeral',
    uproar: 'riot',
    fire_of_demise: 'extinction_fire',
  },
};

/**
 * 通用枚举 ID → snake_case ID 转换。
 * 例：RULE_MURDER_PLAN → murder_plan
 *     ROLE_KEY_PERSON → key_person
 *     CH_STUDENT_M → student_m → boy_student
 *     INC_MURDER → murder
 */
function enumToSnake(enumId: string, prefix: string): string {
  if (!enumId) return '';
  const stripped = enumId.startsWith(prefix)
    ? enumId.slice(prefix.length)
    : enumId;
  return stripped.toLowerCase();
}

// 角色 enum → domain characterId 映射
const CHAR_MAP: Record<string, string> = {
  CH_STUDENT_M: 'boy_student',
  CH_STUDENT_F: 'girl_student',
  CH_SHRINE_MAIDEN: 'shrine_maiden',
  CH_OFFICE_WORKER: 'office_worker',
  CH_POP_IDOL: 'pop_idol',
  CH_PATIENT: 'patient',
  CH_DOCTOR: 'doctor',
  CH_CLASS_REP: 'class_rep',
  CH_RICH_DAUGHTER: 'rich_mans_daughter',
  CH_POLICE_OFFICER: 'police_officer',
  CH_INFORMER: 'informer',
  CH_BOSS: 'boss',
  CH_ALIEN: 'alien',
  CH_SACRED_TREE: 'sacred_tree',
  CH_TEACHER: 'teacher',
  CH_NURSE: 'nurse',
  CH_HENCHMAN: 'henchman',
  CH_TRANSFER_STUDENT: 'transfer_student',
  CH_SOLDIER: 'soldier',
  CH_JOURNALIST: 'journalist',
  CH_SCIENTIST: 'scholar',
  CH_SCHOOL_MOB: 'school_mob',
  CH_LITTLE_SISTER: 'sister',
  CH_MYSTERY_BOY: 'mystery_boy',
  CH_COPYCAT: 'copycat',
  CH_YOUNG_GIRL: 'little_girl',
  CH_A_I: 'ai',
  CH_PART_TIMER: 'part_timer',
  CH_ILLUSION: 'illusion',
  CH_FORENSIC_SPECIALIST: 'forensic_specialist',
  CH_BLACK_CAT: 'black_cat',
  CH_SENNIN: 'sennin',
  CH_GODLY_BEING: 'godly_being',
  CH_OBSERVER: 'observer',
  CH_UPLOADER: 'uploader',
  CH_HOSPITAL_MOB: 'hospital_mob',
  CH_CRUSADER: 'crusader',
  CH_CITY_MOB: 'city_mob',
  CH_CULTIST: 'cult_leader',
  CH_SECT_FOUNDER: 'cult_leader',
  CH_METAWORLD_DENIZEN: 'metaworld_denizen',
  CH_SERVANT: 'servant',
  CH_SHRINE_MOB: 'shrine_mob',
  CH_TRANSFER_STUDENT_A: 'transfer_student_a',
  CH_TRANSFER_STUDENT_B: 'transfer_student_b',
  CH_TRANSFER_STUDENT_C: 'transfer_student_c',
  CH_TRANSFER_STUDENT_D: 'transfer_student_d',
};

// 中文显示名 → domain characterId 映射（导入剧本中 culprit 用中文名而非枚举 ID）
const DISPLAY_NAME_MAP: Record<string, string> = {
  // 基本角色
  '男学生': 'boy_student',
  '女学生': 'girl_student',
  '巫女': 'shrine_maiden',
  '职员': 'office_worker',
  '偶像': 'pop_idol',
  '住院患者': 'patient',
  '医生': 'doctor',
  '班长': 'class_rep',
  '大小姐': 'rich_mans_daughter',
  '刑警': 'police_officer',
  '情报商': 'informer',
  '老板': 'boss',
  '异界人': 'alien',
  '神灵': 'godly_being',
  '教师': 'teacher',
  '护士': 'nurse',
  '手下': 'henchman',
  '转校生': 'transfer_student',
  '士兵': 'soldier',
  '媒体人': 'journalist',
  '科学家': 'scholar',
  '小妹妹': 'sister',
  '神秘少年': 'mystery_boy',
  '模仿犯': 'copycat',
  '少女': 'little_girl',
  'AI': 'ai',
  '打工仔': 'part_timer',
  '幻想': 'illusion',
  '鉴别员': 'forensic_specialist',
  '黑猫': 'black_cat',
  '观察者': 'observer',
  '圣战士': 'crusader',
  '邪教徒': 'cult_leader',
  '教团创始人': 'cult_leader',
  '异世界住民': 'metaworld_denizen',
  '仆人': 'servant',
  '局外人': 'mystery_boy', // 局外人 = 神秘少年的别名
  // Codex 审查补全的缺失映射
  'A.I.': 'ai',
  'a.i.': 'ai',
  '人工智能': 'ai',
  '学者': 'scholar',     // 学者 = 科学家的别名
  '临时工': 'part_timer',
  '军人': 'soldier',
  '大人物': 'boss',        // 大人物 = 老板的别名
  '从者': 'servant',
  '教主': 'cult_leader',
  '上位存在': 'godly_being', // 上位存在 = 神灵的别名
  '御神木': 'sacred_tree',
  '仙人': 'sennin',
  '女中学生': 'girl_student',
  '小女孩': 'little_girl',
  'UP主': 'uploader',
  '学校群众': 'school_mob',
  '神社群众': 'shrine_mob',
  '医院群众': 'hospital_mob',
  '都市群众': 'city_mob',
  '记者': 'journalist',    // 记者 = 媒体人的别名
  '患者': 'patient',       // 患者 = 住院患者的别名
  '警官': 'police_officer', // 警官 = 刑警的别名
  '警察': 'police_officer',
  '富家千金': 'rich_mans_daughter', // 富家千金 = 大小姐的别名
  '教团领袖': 'cult_leader',
  // 转校生变体
  '转校生 A': 'transfer_student_a',
  '转校生 B': 'transfer_student_b',
  '转校生 C': 'transfer_student_c',
  '转校生 D': 'transfer_student_d',
};

const NORMALIZED_DISPLAY_NAME_MAP = Object.fromEntries(
  Object.entries(DISPLAY_NAME_MAP).map(([name, characterId]) => [
    normalizeDisplayName(name),
    characterId,
  ]),
);

function normalizeDisplayName(input: string): string {
  return input.trim().toLowerCase().replace(/[.\s]/g, '');
}

function applySetAlias(
  setId: string,
  value: string,
  aliasMapBySet: Record<string, Record<string, string>>,
): string {
  return aliasMapBySet[setId]?.[value] ?? value;
}

// 身份 enum → domain roleId 映射
const ROLE_MAP: Record<string, string> = {
  ROLE_PERSON: 'person',
  ROLE_KEY_PERSON: 'key_person',
  ROLE_BRAIN: 'brain',
  ROLE_KILLER: 'killer',
  ROLE_CULTIST: 'cultist',
  ROLE_FRIEND: 'friend',
  ROLE_SERIAL_KILLER: 'serial_killer',
  ROLE_CONSPIRACY_THEORIST: 'conspiracy_theorist',
  ROLE_OBSTINATE: 'obstinate',
  ROLE_FACTOR: 'factor',
  ROLE_NINJA: 'ninja',
  ROLE_MAGICIAN: 'magician',
  ROLE_WITCH: 'witch',
  ROLE_IMMORTAL: 'immortal',
  ROLE_PROPHET: 'prophet',
  ROLE_FRAGMENT: 'fragment',
  ROLE_LOVER: 'lover',
  ROLE_FOOL: 'fool',
  ROLE_TWIN: 'twin',
  ROLE_POISONER: 'poisoner',
  ROLE_PARANOIAC: 'paranoiac',
  ROLE_THERAPIST: 'therapist',
  ROLE_PRIVATE_INVESTIGATOR: 'private_investigator',
  ROLE_CURMUDGEON: 'curmudgeon',
  ROLE_TIME_TRAVELER: 'time_traveler',
  ROLE_SHOW_OFF: 'show_off',
  ROLE_COWARD: 'coward',
  ROLE_WITNESS: 'witness',
  ROLE_VAMPIRE: 'vampire',
  ROLE_WEREWOLF: 'werewolf',
  ROLE_NIGHTMARE: 'nightmare',
  ROLE_ZOMBIE: 'zombie',
  ROLE_GHOST: 'ghost',
  ROLE_MARIONETTE: 'marionette',
  ROLE_WIZARD: 'wizard',
  ROLE_ALICE: 'alice',
  ROLE_SACRIFICE: 'sacrifice',
  ROLE_FACELESS: 'faceless',
  ROLE_STORYTELLER: 'storyteller',
  ROLE_WILDCARD: 'wildcard',
  ROLE_INFLUENCER: 'influencer',
  ROLE_LULLABY: 'lullaby',
  ROLE_MONSTER: 'monster',
  ROLE_DEEP_ONE: 'deep_one',
  ROLE_ZEALOT: 'zealot',
  ROLE_INSTIGATOR: 'instigator',
  ROLE_GOSSIP: 'gossip',
  ROLE_SECRETKEEPER: 'secretkeeper',
  ROLE_SPELLCASTER: 'spellcaster',
  ROLE_AGENT: 'agent',
  ROLE_SHIFTER: 'shifter',
  ROLE_POLTERGEIST: 'poltergeist',
  ROLE_POTENTATE: 'potentate',
  ROLE_CURSE_GOD: 'curse_god',
  ROLE_HORROR: 'horror',
  ROLE_MAD_GENIUS: 'mad_genius',
  ROLE_OVERLORD: 'overlord',
  ROLE_CONTRACT_KILLER: 'contract_killer',
  ROLE_HUMAN_DOLL: 'human_doll',
  ROLE_AUGUR: 'augur',
  ROLE_WATCHER: 'watcher',
  ROLE_PERSON_IN_PAINTING: 'person_in_painting',
  ROLE_PSYCHOPATH: 'psychopath',
  ROLE_OVERLORD_OF_DEATH: 'overlord_of_death',
  ROLE_LOVED_ONE: 'loved_one',
  ROLE_INCARNATION_OF_HORROR: 'incarnation_of_horror',
  ROLE_LIGHT_OF_DAWN: 'light_of_dawn',
  ROLE_SUPPLICANT: 'supplicant',
};

// 复合身份映射
const COMPOUND_ROLE_MAP: Record<string, string> = {
  ROLE_KEY_PERSON_AND_BRAIN: 'key_person',
  ROLE_CONSPIRACY_THEORIST_AND_SERIAL_KILLER: 'conspiracy_theorist',
  ROLE_CONSPIRACY_THEORIST_AND_OBSTINATE: 'conspiracy_theorist',
  ROLE_OBSTINATE_AND_KEY_PERSON: 'obstinate',
  ROLE_PERSON_AND_SERIAL_KILLER: 'person',
  ROLE_PIED_PIPER_AND_GOSSIP: 'gossip',
};

const COMPOUND_ROLE_PAIR_MAP: Record<string, { roleId: string; backRoleId: string }> = {
  ROLE_KEY_PERSON_AND_BRAIN: { roleId: 'key_person', backRoleId: 'brain' },
  ROLE_CONSPIRACY_THEORIST_AND_SERIAL_KILLER: { roleId: 'conspiracy_theorist', backRoleId: 'serial_killer' },
  ROLE_CONSPIRACY_THEORIST_AND_OBSTINATE: { roleId: 'conspiracy_theorist', backRoleId: 'obstinate' },
  ROLE_OBSTINATE_AND_KEY_PERSON: { roleId: 'obstinate', backRoleId: 'key_person' },
  ROLE_PERSON_AND_SERIAL_KILLER: { roleId: 'person', backRoleId: 'serial_killer' },
  ROLE_PIED_PIPER_AND_GOSSIP: { roleId: 'gossip', backRoleId: 'pied_piper' },
};

function resolveRoleId(enumId: string, setId: string): string {
  if (!enumId) return 'person';
  const baseId = ROLE_MAP[enumId] ?? COMPOUND_ROLE_MAP[enumId] ?? enumToSnake(enumId, 'ROLE_');
  return applySetAlias(setId, baseId, ROLE_ALIAS_MAP_BY_SET);
}

function resolveRoleAssignment(
  enumId: string,
  setId: string,
): { roleId: string | null; backRoleId?: string | null } {
  if (enumId === 'ROLE_PERSON') {
    return { roleId: null };
  }

  const compound = COMPOUND_ROLE_PAIR_MAP[enumId];
  if (compound) {
    return {
      roleId: applySetAlias(setId, compound.roleId, ROLE_ALIAS_MAP_BY_SET),
      backRoleId: applySetAlias(setId, compound.backRoleId, ROLE_ALIAS_MAP_BY_SET),
    };
  }

  return {
    roleId: resolveRoleId(enumId, setId),
  };
}

function resolveCharId(input: string): string {
  if (!input) return '';
  // 优先查枚举 ID 映射
  if (CHAR_MAP[input]) return CHAR_MAP[input];
  // 再查中文显示名映射
  const normalizedDisplayName = normalizeDisplayName(input);
  if (NORMALIZED_DISPLAY_NAME_MAP[normalizedDisplayName]) {
    return NORMALIZED_DISPLAY_NAME_MAP[normalizedDisplayName];
  }
  // fallback: 枚举转 snake_case
  return enumToSnake(input, 'CH_');
}

function resolvePlotId(enumId: string, setId: string): string {
  if (!enumId) return '';
  const baseId = enumToSnake(enumId, 'RULE_');
  return applySetAlias(setId, baseId, PLOT_ALIAS_MAP_BY_SET);
}

function resolveIncidentId(enumId: string, setId: string): string {
  if (!enumId) return '';
  const baseId = enumToSnake(enumId, 'INC_');
  return applySetAlias(setId, baseId, INCIDENT_ALIAS_MAP_BY_SET);
}

function resolveModuleId(enumId: string): string {
  if (!enumId) return 'unknown';
  return MODULE_MAP[enumId] ?? enumToSnake(enumId, 'MOD_');
}

// All scripts tagged as MOD_ANOTHER_HORIZON_REVISED belong to current AHR.
// AHR reuses all legacy AH vocabulary (into_nothingness, alice, crime_of_passion,
// compound roles, etc.), so no automatic heuristic can distinguish them reliably.
// If reclassification is needed, it must be done via explicit per-script overrides.
const LEGACY_AH_PLOT_IDS = new Set<string>([]);
const LEGACY_AH_ROLE_IDS = new Set<string>([]);
const LEGACY_AH_INCIDENT_IDS = new Set<string>([]);

function resolveBaseRoleId(enumId: string): string {
  if (!enumId) return 'person';
  return ROLE_MAP[enumId] ?? COMPOUND_ROLE_MAP[enumId] ?? enumToSnake(enumId, 'ROLE_');
}

function detectTragedySetId(raw: RawScript): string {
  const moduleId = resolveModuleId(raw.module ?? raw.moduleId ?? '');
  if (moduleId !== 'another_horizon_revised') {
    return moduleId;
  }

  const plotIds = [
    raw.mainPlot ?? raw.mainPlotId ?? '',
    raw.subplot1 ?? raw.subplot1Id ?? '',
    raw.subplot2 ?? '',
    ...(raw.specialRules ?? []),
  ]
    .filter(Boolean)
    .map(value => enumToSnake(value, 'RULE_'));

  if (plotIds.some(id => LEGACY_AH_PLOT_IDS.has(id))) {
    return 'another_horizon';
  }

  const roleIds = (raw.cast ?? [])
    .map(entry => resolveBaseRoleId(entry.role))
    .filter(roleId => roleId !== 'person');
  if (roleIds.some(id => LEGACY_AH_ROLE_IDS.has(id))) {
    return 'another_horizon';
  }

  const incidentIds = [
    ...(raw.incidents ?? []).map(entry => enumToSnake(entry.incident, 'INC_')),
    ...(raw.scheduledEvents ?? []).map(entry => enumToSnake(entry.incident ?? entry.event ?? '', 'INC_')),
  ].filter(Boolean);
  if (incidentIds.some(id => LEGACY_AH_INCIDENT_IDS.has(id))) {
    return 'another_horizon';
  }

  return moduleId;
}

// ── raw JSON 类型 ─────────────────────────────────────────────────────────────

export interface RawScript {
  id?: string;
  title?: string;
  titleEN?: string;
  author?: string;
  creator?: string;
  difficulty?: string;
  difficultyStars?: number;
  module?: string;
  moduleId?: string;
  loops?: number;
  daysPerLoop?: number;
  mainPlot?: string;
  mainPlotId?: string;
  subplot1?: string;
  subplot1Id?: string;
  subplot2?: string;
  specialRules?: string[];
  cast?: Array<{ id: string; role: string; notes?: string }>;
  incidents?: Array<{ day: number; incident: string; culprit: string }>;
  scheduledEvents?: Array<{ day: number; event?: string; incident?: string; culprit?: string; character?: string }>;
  // 来源标记（运行时注入）
  _source?: string;
}

export type ConvertedRawScript = ScriptDef & {
  _source?: string;
  _difficulty?: string;
};

// ── 转换函数 ──────────────────────────────────────────────────────────────────

export function convertRawScript(raw: RawScript, fallbackId: string): ConvertedRawScript {
  const id = raw.id ?? fallbackId;
  const title = raw.title ?? raw.titleEN ?? id;
  const tragedySetId = detectTragedySetId(raw);
  const moduleId = raw.module || raw.moduleId
    ? resolveModuleId(raw.module ?? raw.moduleId ?? '')
    : tragedySetId.replace(/_/g, '-');

  // 主要阴谋和辅助阴谋
  const mainPlotId = resolvePlotId(raw.mainPlot ?? raw.mainPlotId ?? '', tragedySetId);
  const subplotIds: string[] = [];
  if (raw.subplot1 ?? raw.subplot1Id) {
    subplotIds.push(resolvePlotId(raw.subplot1 ?? raw.subplot1Id ?? '', tragedySetId));
  }
  if (raw.subplot2) {
    subplotIds.push(resolvePlotId(raw.subplot2, tragedySetId));
  }

  // 角色列表
  const cast = (raw.cast ?? []).map(c => ({
    characterId: resolveCharId(c.id),
    ...resolveRoleAssignment(c.role, tragedySetId),
  }));

  // 事件列表：合并 incidents 和 scheduledEvents
  const incidents: Array<{ day: number; incidentId: string; culpritCharacterId: string }> = [];

  if (raw.incidents) {
    for (const inc of raw.incidents) {
      incidents.push({
        day: inc.day,
        incidentId: resolveIncidentId(inc.incident, tragedySetId),
        culpritCharacterId: resolveCharId(inc.culprit),
      });
    }
  }

  if (raw.scheduledEvents) {
    for (const evt of raw.scheduledEvents) {
      const incEnum = evt.incident ?? evt.event ?? '';
      const culpritEnum = evt.culprit ?? evt.character ?? '';
      if (incEnum) {
        incidents.push({
          day: evt.day,
          incidentId: resolveIncidentId(incEnum, tragedySetId),
          culpritCharacterId: resolveCharId(culpritEnum),
        });
      }
    }
  }

  // 去重：按 (day, incidentId) 去重，优先保留有 culpritCharacterId 的记录
  const deduped = new Map<string, typeof incidents[0]>();
  for (const inc of incidents) {
    const key = `${inc.day}::${inc.incidentId}`;
    const existing = deduped.get(key);
    if (!existing || (!existing.culpritCharacterId && inc.culpritCharacterId)) {
      deduped.set(key, inc);
    }
  }
  const dedupedIncidents = [...deduped.values()];

  return {
    id,
    title,
    moduleId,
    tragedySetId,
    loops: raw.loops ?? 3,
    daysPerLoop: raw.daysPerLoop ?? 4,
    specialRules: (raw.specialRules ?? []).map(r => resolvePlotId(r, tragedySetId)),
    mainPlotId,
    subplotIds,
    cast,
    incidents: dedupedIncidents,
    _source: raw._source,
    _difficulty: raw.difficulty,
  };
}

/**
 * 批量转换 JSON 集合数组为 ScriptDef[]
 */
export function convertCollection(
  rawScripts: RawScript[],
  source: string
): ConvertedRawScript[] {
  return rawScripts.map((raw, i) => {
    const tagged = { ...raw, _source: source };
    return convertRawScript(tagged, `${source}_${String(i).padStart(3, '0')}`);
  });
}
