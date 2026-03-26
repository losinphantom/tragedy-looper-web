import { 
  CHARACTERS, 
  BTX_ROLES, BTX_INCIDENTS,
  FIRST_STEPS_ROLES, FIRST_STEPS_INCIDENTS,
  MZ_ROLES, MZ_INCIDENTS,
  MC_ROLES, MC_INCIDENTS,
  HSA_ROLES, HSA_INCIDENTS,
  WM_ROLES, WM_INCIDENTS,
  AHR_ROLES, AHR_INCIDENTS,
  LL_ROLES, LL_INCIDENTS,
  FIRST_STEPS_PLOTS,
  BTX_PLOTS,
  MZ_PLOTS,
  MC_PLOTS,
  HSA_PLOTS,
  WM_PLOTS,
  AHR_PLOTS,
  LL_PLOTS,
} from '@tragedy/domain';

/**
 * TranslationService — Centralized utility for fetching localized labels
 * across characters, roles, incidents, and plots by pulling from the domain database.
 */

const ROLE_DATABASES = [
  BTX_ROLES,
  FIRST_STEPS_ROLES,
  MZ_ROLES,
  MC_ROLES,
  HSA_ROLES,
  WM_ROLES,
  AHR_ROLES,
  LL_ROLES,
];

const INCIDENT_DATABASES = [
  BTX_INCIDENTS,
  FIRST_STEPS_INCIDENTS,
  MZ_INCIDENTS,
  MC_INCIDENTS,
  HSA_INCIDENTS,
  WM_INCIDENTS,
  AHR_INCIDENTS,
  LL_INCIDENTS,
];

const PLOT_DATABASES = [
  FIRST_STEPS_PLOTS,
  BTX_PLOTS,
  MZ_PLOTS,
  MC_PLOTS,
  HSA_PLOTS,
  WM_PLOTS,
  AHR_PLOTS,
  LL_PLOTS,
];

export function getCharacterLabel(id: string): string {
  return CHARACTERS[id]?.label?.['zh-CN'] || id;
}

export function getRoleLabel(id: string): string {
  for (const db of ROLE_DATABASES) {
    if (db[id]) return db[id].label['zh-CN'];
  }
  return id;
}

export function getIncidentLabel(id: string): string {
  for (const db of INCIDENT_DATABASES) {
    if (db[id]) return db[id].label['zh-CN'];
  }
  return id;
}

export function getPlotLabel(id: string): string {
  for (const db of PLOT_DATABASES) {
    if (db[id]) return db[id].label['zh-CN'];
  }
  return id;
}

// Helper for UI components to get any label by ID
export function getLocalizedTerm(id: string): string {
  if (CHARACTERS[id]) return getCharacterLabel(id);
  
  const role = getRoleLabel(id);
  if (role !== id) return role;
  
  const incident = getIncidentLabel(id);
  if (incident !== id) return incident;

  const plot = getPlotLabel(id);
  if (plot !== id) return plot;

  // Fallback: 硬编码映射（JSON 脚本中 converter 产生的 snake_case ID）
  if (FALLBACK_LABELS[id]) return FALLBACK_LABELS[id];

  return id;
}

/**
 * 全覆盖 Fallback 映射表
 * 覆盖所有模组的 plot / role / incident / character 的 snake_case ID → 中文名
 * 这些 ID 由 scriptConverter.ts 的 enumToSnake 转换产生
 */
const FALLBACK_LABELS: Record<string, string> = {
  // ═══ Characters（角色）═══
  boy_student: '男学生', girl_student: '女学生', rich_mans_daughter: '大小姐',
  class_rep: '班长', mystery_boy: '局外人', shrine_maiden: '巫女',
  alien: '异界人', godly_being: '神灵', police_officer: '刑警',
  office_worker: '职员', informer: '情报商', pop_idol: '偶像',
  journalist: '媒体人', boss: '大人物', doctor: '医生', patient: '住院患者',
  nurse: '护士', henchman: '手下', transfer_student: '转校生',
  forensic_specialist: '鉴别员', ai: 'A.I.', teacher: '教师', soldier: '军人',
  black_cat: '黑猫', scholar: '学者', illusion: '幻想', little_girl: '小女孩',
  copycat: '模仿犯', cult_leader: '教主', sacred_tree: '御神木',
  servant: '从者', metaworld_denizen: '上位存在', part_timer: '临时工',
  part_timer_question: '临时工？', sister: '妹妹', sennin: '仙人',
  uploader: 'UP主', young_girl: '小女孩', little_sister: '妹妹',
  student_m: '男学生', student_f: '女学生',
  school_mob: '学校群众', shrine_mob: '神社群众',
  hospital_mob: '医院群众', city_mob: '都市群众',

  // ═══ Plots — First Steps ═══
  murder_plan: '谋杀计划', light_of_the_avenger: '复仇的火种',
  a_place_to_protect: '守护此地',
  shadow_of_the_ripper: '开膛者的魔影', an_unsettling_rumor: '流言四起',
  a_hideous_script: '最黑暗的剧本',

  // ═══ Plots — Basic Tragedy X ═══
  the_sealed_item: '被封印的邪灵', sign_with_me: '和我签订契约吧！',
  change_of_future: '改变未来', giant_time_bomb: '巨大定时炸弹X',
  circle_of_friends: '好友圈', paranoia_virus: '妄想扩大病毒',
  threads_of_fate: '因果线', unknown_factor_x: '未知因子χ',

  // ═══ Plots — Midnight Zone ═══
  sealed_item: '被封印的邪灵', confidential_file: '绝密报告',
  a_war_between_men: '男子汉的战争', shadow_approaching: '魔爪渐进',
  the_bonds_of_fate: '因果之绊',
  spiral_of_love_and_hate: '爱与恨的螺旋', witches_tea_party: '魔女们的茶会',
  dice_of_the_gods: '诸神之骰', x_factor: 'χ异因子',
  lethal_reality: '死亡真人秀', crossed_signals: '心无灵犀',
  the_ode_to_destruction: '灭亡讴歌',

  // ═══ Plots — Mystery Circle ═══
  a_quilt_of_incidents: '事件交织的罗网', tightrope_plan: '命悬一线的计划',
  the_black_school: '黑暗学院', a_drop_of_strychnine: '士的宁毒液',
  the_hidden_freak_mc: '潜伏的杀人狂',
  isolated_institution_psycho: '隔离病房惊魂记', smell_of_gunpowder: '火药的味道',
  i_am_a_master_detective: '我是名侦探', dance_of_fools: '愚者之舞',
  an_absolute_will: '绝对意志', tricky_twins: '双子的诡计',

  // ═══ Plots — Haunted Stage Again ═══
  the_noble_bloodline: '高贵的血族', moonlight_beast: '月夜凶兽',
  night_mist_nightmare: '雾中夜惊梦', the_ones_from_the_grave: '古墓活尸',
  the_cursed_land: '被诅咒的土地',
  those_with_habits: '心慌派对', a_love_affair: '恋爱风景线',
  witchs_curse: '魔女遗咒', the_key_girl: '少女大危机',
  monster_intrigue: '怪物们的阴谋', panic_and_obsession: '恐慌与妄想',
  people_who_dont_listen: '不听劝的人',

  // ═══ Plots — Weird Mythology ═══
  choir_to_the_outside_god: '外神合唱曲', the_sacred_words_of_dagon: '达贡的福音书',
  the_king_in_yellow: '黄衣之王', bloody_rites: '染血的仪式',
  giant_time_bomb_y: '巨大定时炸弹Y',
  an_unsettling_rumour: '流言四起', the_resistance: '抗争者',
  people_who_saw: '见证恐惧', the_profound_race: '伊斯之伟大种族',
  whispers_from_the_deep: '深渊之都的私语', the_faceless_god: '无貌之神',
  twisted_truth: '疯狂的真相',

  // ═══ Plots — Another Horizon Revised ═══
  the_locked_future: '闭锁的未来', fairy_tale_killer: '童话里的杀人鬼',
  mother_goose_mystery: '鹅妈妈神秘故事', dimension_fusion: '次元融合计划',
  illusory_world: '虚幻世界',
  dr_jekyll_and_mr_hyde: '化身博士', devil_plays_the_flute: '恶魔吹着笛子来',
  puppet_strings: '傀儡之线', alice_in_wonderland: '爱丽丝梦游仙境',
  beyond_the_world_line: '超越世界线', unspeakable_monster: '难以言喻的怪物',
  paranoia_virus_expanded: '空想扩大病毒',

  // ═══ Plots — Last Liar ═══
  last_plan: '最终计划', sealed_end: '封印的终末',
  rebel_world: '叛逆的世界', the_demon_s_script: '恶魔的剧本',
  giant_time_bomb_z: '巨大定时炸弹Z',
  the_real_monster: '真正的怪物', keeper_of_mythology: '神话搜集者',
  i_am_the_detective: '我才是名侦探', beyond_world_line: '超越世界线',
  x_unusual_factor: 'χ异因子', sns_panic: 'SNS恐慌',
  fabricated_secret: '捏造的秘密',

  // ═══ Roles（身份）═══
  key_person: '关键人物', brain: '主谋', killer: '杀手', cultist: '邪教徒',
  witch: '魔女', time_traveler: '时间旅者', friend: '亲友', loved_one: '心上人',
  lover: '求爱者', serial_killer: '杀人狂', factor: '不安定因子',
  conspiracy_theorist: '传谣人', curmudgeon: '暴徒',
  // MZ 身份
  ninja: '忍者', obstinate: '强迫症', magician: '魔术师', immortal: '永生者',
  prophet: '预言家',
  // MC 身份
  twin: '双胞胎', fool: '愚者', paranoiac: '偏执狂', therapist: '心理医生',
  private_investigator: '侦探', poisoner: '投毒者',
  // HSA 身份
  show_off: '纸老虎', coward: '胆小鬼',
  vampire: '吸血鬼', werewolf: '狼人', nightmare: '梦魇',
  zombie: '丧尸', ghost: '鬼魂',
  // WM 身份
  deep_one: '深潜者', witness: '目击者',
  wizard: '巫师', sacrifice: '祭品', faceless: '无面者',
  // AHR 身份
  marionette: '提线木偶', storyteller: '叙述者', lullaby: '童谣',
  dimension_traveler: '次元旅者', fragment: '因果残片',
  pied_piper: '魔笛手', evangelist: '布道者', alice: '爱丽丝',
  // LL 身份
  watcher: '监视者', influencer: '网络名流', secretkeeper: '密钥',
  wildcard: '怪杰', instigator: '煽动者',
  gossip: '传谣人',
  // 其他/派生模组
  person: '平民', agent: '代理人', shifter: '变形者',
  poltergeist: '骚灵', potentate: '权贵', curse_god: '诅咒神',
  horror: '恐怖', mad_genius: '疯狂天才', overlord: '统治者',
  contract_killer: '契约杀手', human_doll: '人偶',
  augur: '占卜师', person_in_painting: '画中人',
  psychopath: '精神变态', overlord_of_death: '死之统治者',
  incarnation_of_horror: '恐怖化身', light_of_dawn: '黎明之光',
  supplicant: '恳求者', spellcaster: '施法者',

  // ═══ Incidents（事件）═══
  murder: '谋杀', increasing_unease: '不安扩散', suicide: '自杀',
  hospital_incident: '医院事故', missing_person: '失踪',
  foul_contamination: '邪气污染', spreading: '散播', butterfly_effect: '蝴蝶效应',
  far_reaching_murder: '远距离杀人',
  // MZ 事件
  serial_murder: '连续杀人', intrigue_activity: '阴谋活动',
  confession: '自白', breakthrough: '破局',
  fake_suicide: '伪装自杀', fabricated_incident: '伪造事件', riot: '暴乱',
  // MC 事件
  terrorism: '恐怖袭击', portent: '前兆',
  bestial_murder: '猎奇杀人', a_suspicious_letter: '可疑信件',
  closed_circle: '封锁', the_silver_bullet: '银色子弹',
  // HSA 事件
  sacrilegious_murder: '亵渎杀人', the_executioner: '送葬',
  dark_rumor: '言灵诅咒', barricade: '孤守',
  night_of_madness: '疯狂之夜', awakened_curse: '诅咒活化',
  fountain_of_filth: '污秽溢出', evangelium_of_the_dead: '死者默示录',
  // WM 事件
  insane_murder: '疯狂杀人', mass_suicide: '集体自杀',
  fire_of_demise: '灭绝之火', hound_dog_scent: '廷达罗斯之嗅',
  discovery: '发现', the_murk_of_despair: '绝望之暗',
  // AHR 事件
  impulse_murder: '冲动杀人', dimension_shift: '次元转换',
  dimension_warp: '次元歪曲', dimension_fault: '次元断层',
  lost_item: '遗失物', imaginary_incident: '空想事件',
  last_will: '遗言', singularity: '奇点',
  light_in_the_gap: '隙间的阳光', darkness_of_despair: '绝望之暗',
  // LL 事件
  agent_event: '代行者', sudden_change: '骤变',
  light_of_hope: '希望之光',

  // ═══ 特殊规则 ═══
  none: '无',
};

