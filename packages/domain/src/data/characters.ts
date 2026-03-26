import type { CharacterRecord } from '../dictionary';
import { CHARACTER_ABILITIES as A } from './characterAbilities';

/**
 * 全角色注册表 — 按来源分组
 * 所有数据以 docs/game-knowledge/characters/official/ 的 wiki JSON 为唯一权威源
 * 能力定义统一引用 characterAbilities.ts，此处仅存放 profile 元数据
 */
export const CHARACTERS: Record<string, CharacterRecord> = {
  // ═══════════════════════════════════════════════════
  //  基础游戏角色 (base_game) — 24 张
  // ═══════════════════════════════════════════════════

  boy_student: {
    id: 'boy_student',
    label: { 'zh-CN': '男学生', en: 'Boy Student' },
    traits: ['student', 'boy'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.boy_student_gw1],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_男学生_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_男学生_01.png', color: '/assets/color_skins/boy_student.png', dr: '/assets/danganronpa_skins/boy_student.png' } },
  },

  girl_student: {
    id: 'girl_student',
    label: { 'zh-CN': '女学生', en: 'Girl Student' },
    traits: ['student', 'girl'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.boy_student_gw1], // 同男学生：（友好2）移除同一区域另外1名角色身上的1枚不安指示物
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_女学生_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_女学生_01.png', color: '/assets/color_skins/girl_student.png', dr: '/assets/danganronpa_skins/girl_student.png' } },
  },

  rich_mans_daughter: {
    id: 'rich_mans_daughter',
    label: { 'zh-CN': '大小姐', en: "Rich Man's Daughter" },
    traits: ['student', 'girl'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 1,
    goodwillAbilities: [A.young_lady_gw3],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_大小姐_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_大小姐_01.png', color: '/assets/color_skins/lady.png', dr: '/assets/danganronpa_skins/lady.png' } },
  },

  class_rep: {
    id: 'class_rep',
    label: { 'zh-CN': '班长', en: 'Class Rep' },
    traits: ['student', 'girl'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.class_rep_gw2],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_班长_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_班长_01.png', color: '/assets/color_skins/class_rep.png', dr: '/assets/danganronpa_skins/class_rep.png' } },
  },

  mystery_boy: {
    id: 'mystery_boy',
    label: { 'zh-CN': '局外人', en: 'Mystery Boy' },
    traits: ['student', 'boy'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.outsider_gw3],
    passiveAbilities: [A.outsider_passive_role],
    scriptCreationRules: [
      {
        id: 'mystery_boy_script_rule',
        summary: { 'zh-CN': '剧本制作时，该角色不参与剧本所选规则的身份分配，但不直接视作平民，而是为其分配当前模组中存在、并且剧本所选规则中未带有的某一身份' },
      },
    ],
    source: { cardAssetPath: '/assets/color_skins/outsider.png', alternateCardAssets: { new: '/assets/color_skins/outsider.png', color: '/assets/color_skins/outsider.png', dr: '/assets/danganronpa_skins/outsider.png' } },
  },

  shrine_maiden: {
    id: 'shrine_maiden',
    label: { 'zh-CN': '巫女', en: 'Shrine Maiden' },
    traits: ['student', 'girl'],
    startingLocations: ['shrine'],
    forbiddenLocations: ['city'],
    uneaseLimit: 2,
    goodwillAbilities: [A.miko_gw3, A.miko_gw5],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_巫女_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_巫女_01.png', color: '/assets/color_skins/shrine_maiden.png', dr: '/assets/danganronpa_skins/shrine_maiden.png' } },
  },

  alien: {
    id: 'alien',
    label: { 'zh-CN': '异界人', en: 'Alien' },
    traits: ['student', 'girl'],
    startingLocations: ['shrine'],
    forbiddenLocations: ['hospital'],
    uneaseLimit: 2,
    goodwillAbilities: [A.alien_gw4, A.alien_gw5],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_异世界人_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_异世界人_01.png', color: '/assets/color_skins/alien.png', dr: '/assets/danganronpa_skins/alien.png' } },
  },

  godly_being: {
    id: 'godly_being',
    label: { 'zh-CN': '神灵', en: 'Godly Being' },
    traits: ['man', 'woman'],
    startingLocations: ['shrine'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.deity_gw3, A.deity_gw5],
    passiveAbilities: [A.deity_passive_delay],
    scriptCreationRules: [
      {
        id: 'godly_being_script_rule',
        summary: { 'zh-CN': '剧本制作时，指定该角色在第几轮轮回登场。在所指定的轮回之前，该角色不会在轮回准备时配置上场。' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_神格_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_神格_01.png', color: '/assets/color_skins/god.png', dr: '/assets/danganronpa_skins/god.png' } },
  },

  police_officer: {
    id: 'police_officer',
    label: { 'zh-CN': '刑警', en: 'Police Officer' },
    traits: ['man', 'adult'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.police_gw4, A.police_gw5],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_刑警_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_刑警_01.png', color: '/assets/color_skins/detective.png', dr: '/assets/danganronpa_skins/detective.png' } },
  },

  office_worker: {
    id: 'office_worker',
    label: { 'zh-CN': '职员', en: 'Office Worker' },
    traits: ['man', 'adult'],
    startingLocations: ['city'],
    forbiddenLocations: ['school'],
    uneaseLimit: 2,
    goodwillAbilities: [A.office_worker_gw3],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_上班族_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_上班族_01.png', color: '/assets/color_skins/office_worker.png', dr: '/assets/danganronpa_skins/office_worker.png' } },
  },

  informer: {
    id: 'informer',
    label: { 'zh-CN': '情报商', en: 'Informer' },
    traits: ['woman', 'adult'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.informant_gw5],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_情报贩子_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_情报贩子_01.png', color: '/assets/color_skins/informant.png', dr: '/assets/danganronpa_skins/informant.png' } },
  },

  pop_idol: {
    id: 'pop_idol',
    label: { 'zh-CN': '偶像', en: 'Pop Idol' },
    traits: ['student', 'girl'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.pop_idol_gw3, A.pop_idol_gw4],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_偶像_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_偶像_01.png', color: '/assets/color_skins/idol.png', dr: '/assets/danganronpa_skins/idol.png' } },
  },

  journalist: {
    id: 'journalist',
    label: { 'zh-CN': '媒体人', en: 'Journalist' },
    traits: ['adult', 'man'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.journalist_gw2_paranoia, A.journalist_gw2_intrigue],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_媒体记者_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_媒体记者_01.png', color: '/assets/color_skins/journalist.png', dr: '/assets/danganronpa_skins/journalist.png' } },
  },

  boss: {
    id: 'boss',
    label: { 'zh-CN': '大人物', en: 'Boss' },
    traits: ['adult', 'man'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 4,
    goodwillAbilities: [A.rich_man_gw4],
    passiveAbilities: [A.rich_man_passive_domain],
    scriptCreationRules: [
      {
        id: 'boss_script_rule',
        summary: { 'zh-CN': '剧本制作时，指定1块版图，将领地标志放置在该版图。本局游戏中，所选定的版图视作大人物的领地。剧作家在使用该角色的能力时，可以将领地视作该角色所在区域。' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_大人物_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_大人物_01.png', color: '/assets/color_skins/rich_man.png', dr: '/assets/danganronpa_skins/rich_man.png' } },
  },

  doctor: {
    id: 'doctor',
    label: { 'zh-CN': '医生', en: 'Doctor' },
    traits: ['adult', 'man'],
    startingLocations: ['hospital'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.doctor_gw2, A.doctor_gw3],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_医生_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_医生_01.png', color: '/assets/color_skins/doctor.png', dr: '/assets/danganronpa_skins/doctor.png' } },
  },

  patient: {
    id: 'patient',
    label: { 'zh-CN': '住院患者', en: 'Patient' },
    traits: ['boy'],
    startingLocations: ['hospital'],
    forbiddenLocations: ['school', 'city', 'shrine'],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_入院患者_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_入院患者_01.png', color: '/assets/color_skins/patient.png', dr: '/assets/danganronpa_skins/patient.png' } },
  },

  nurse: {
    id: 'nurse',
    label: { 'zh-CN': '护士', en: 'Nurse' },
    traits: ['adult', 'woman'],
    startingLocations: ['hospital'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.nurse_gw2],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_护士_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_护士_01.png', color: '/assets/color_skins/nurse.png', dr: '/assets/danganronpa_skins/nurse.png' } },
  },

  henchman: {
    id: 'henchman',
    label: { 'zh-CN': '手下', en: 'Henchman' },
    traits: ['adult', 'man'],
    startingLocations: [],
    forbiddenLocations: [],
    uneaseLimit: 1,
    goodwillAbilities: [A.henchman_gw3],
    passiveAbilities: [A.henchman_passive_start],
    scriptCreationRules: [
      {
        id: 'henchman_script_rule',
        summary: { 'zh-CN': '每轮轮回开始前，由剧作家决定该角色的初始区域。' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_手下_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_手下_01.png', color: '/assets/color_skins/henchman.png', dr: '/assets/danganronpa_skins/henchman.png' } },
  },

  transfer_student: {
    id: 'transfer_student',
    label: { 'zh-CN': '转校生', en: 'Transfer Student' },
    traits: ['student', 'girl'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.transfer_student_gw2],
    passiveAbilities: [A.transfer_student_passive_delay],
    scriptCreationRules: [
      {
        id: 'transfer_student_script_rule',
        summary: { 'zh-CN': '剧本制作时，指定该角色在每轮轮回第几天登场。该角色不会在轮回准备时配置上场，在指定天数的回合开始阶段将该角色配置上场。' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_转校生_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_转校生_01.png', color: '/assets/color_skins/transfer_student.png', dr: '/assets/danganronpa_skins/transfer_student.png' } },
  },

  forensic_specialist: {
    id: 'forensic_specialist',
    label: { 'zh-CN': '鉴别员', en: 'Forensic Specialist' },
    traits: ['adult', 'man'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.forensic_scientist_gw2, A.forensic_scientist_gw5],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/color_skins/forensic_scientist.png', alternateCardAssets: { new: '/assets/color_skins/forensic_scientist.png', color: '/assets/color_skins/forensic_scientist.png', dr: '/assets/danganronpa_skins/forensic_scientist.png' } },
  },

  ai: {
    id: 'ai',
    label: { 'zh-CN': 'A.I.', en: 'A.I.' },
    traits: ['construct'],
    startingLocations: ['city'],
    forbiddenLocations: ['shrine', 'hospital', 'school'],
    uneaseLimit: 4,
    goodwillAbilities: [A.ai_gw3],
    passiveAbilities: [A.ai_passive_bystander, A.ai_passive_tokens],
    scriptCreationRules: [
      {
        id: 'ai_script_rule',
        summary: { 'zh-CN': '剧本制作时，该角色不能为"平民"。' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_人工智能_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_人工智能_01.png', color: '/assets/color_skins/ai.png', dr: '/assets/danganronpa_skins/ai.png' } },
  },

  teacher: {
    id: 'teacher',
    label: { 'zh-CN': '教师', en: 'Teacher' },
    traits: ['woman', 'adult'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.teacher_gw3, A.teacher_gw4],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_教师_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_教师_01.png', color: '/assets/color_skins/teacher.png', dr: '/assets/danganronpa_skins/teacher.png' } },
  },

  soldier: {
    id: 'soldier',
    label: { 'zh-CN': '军人', en: 'Soldier' },
    traits: ['man', 'adult'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.soldier_gw2, A.soldier_gw5],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_军人_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_军人_01.png', color: '/assets/color_skins/soldier.png', dr: '/assets/danganronpa_skins/soldier.png' } },
  },

  black_cat: {
    id: 'black_cat',
    label: { 'zh-CN': '黑猫', en: 'Black Cat' },
    traits: ['animal'],
    startingLocations: ['shrine'],
    forbiddenLocations: [],
    uneaseLimit: 0,
    goodwillAbilities: [],
    passiveAbilities: [A.black_cat_passive_intrigue, A.black_cat_passive_incident],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_黑猫_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_黑猫_01.png', color: '/assets/color_skins/black_cat.png', dr: '/assets/danganronpa_skins/black_cat.png' } },
  },

  // ═══════════════════════════════════════════════════
  //  剧本集角色 (script_book) — 6 张
  // ═══════════════════════════════════════════════════

  scholar: {
    id: 'scholar',
    label: { 'zh-CN': '学者', en: 'Scientist' },
    traits: ['man', 'adult'],
    startingLocations: ['hospital'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.scholar_gw3],
    passiveAbilities: [A.scholar_passive_start],
    scriptCreationRules: [
      {
        id: 'scholar_script_rule',
        summary: { 'zh-CN': '每轮轮回开始时，往该角色身上放置友好，不安，密谋指示物中的任意1枚。' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_学者_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_学者_01.png', color: '/assets/color_skins/scholar.png', dr: '/assets/danganronpa_skins/scholar.png' } },
  },

  illusion: {
    id: 'illusion',
    label: { 'zh-CN': '幻想', en: 'Illusion' },
    traits: ['fictional', 'woman'],
    startingLocations: ['shrine'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.illusion_gw3, A.illusion_gw4],
    passiveAbilities: [A.illusion_passive_cards],
    scriptCreationRules: [
      {
        id: 'illusion_script_rule',
        summary: { 'zh-CN': '无法在该角色身上放置行动牌。在与该角色所在区域对应的版图上放置的行动牌，同样会作用于该角色。' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_幻想_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_幻想_01.png', color: '/assets/color_skins/illusion.png', dr: '/assets/danganronpa_skins/illusion.png' } },
  },

  little_girl: {
    id: 'little_girl',
    label: { 'zh-CN': '小女孩', en: 'Young Girl' },
    traits: ['student', 'girl'],
    startingLocations: ['school'],
    forbiddenLocations: ['shrine', 'city', 'hospital'],
    uneaseLimit: 1,
    goodwillAbilities: [A.little_girl_gw1, A.little_girl_gw3],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_小女孩_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_小女孩_01.png', color: '/assets/color_skins/little_girl.png', dr: '/assets/danganronpa_skins/little_girl.png' } },
  },

  copycat: {
    id: 'copycat',
    label: { 'zh-CN': '模仿犯', en: 'Copycat' },
    traits: ['student', 'boy'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.copycat_gw3],
    passiveAbilities: [A.copycat_passive_role],
    scriptCreationRules: [
      {
        id: 'copycat_script_rule',
        summary: { 'zh-CN': '剧本制作时，该角色不参与剧本所选规则的身份分配，但不直接视作平民，而是选择剧本中的另外1名角色、将那名角色的身份额外分配给该角色（此时，无视模组规定的剧本身份上限）' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_模仿者_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_模仿者_01.png', color: '/assets/color_skins/copycat.png', dr: '/assets/danganronpa_skins/copycat.png' } },
  },

  cult_leader: {
    id: 'cult_leader',
    label: { 'zh-CN': '教主', en: 'Sect Founder' },
    traits: ['adult', 'woman'],
    startingLocations: ['shrine'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.cult_leader_gw3, A.cult_leader_gw4],
    passiveAbilities: [],
    scriptCreationRules: [
      {
        id: 'cult_leader_script_rule',
        summary: { 'zh-CN': '该角色为当事人的事件，按事件文字表述结算2次' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_教祖_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_教祖_01.png', color: '/assets/color_skins/cult_leader.png', dr: '/assets/danganronpa_skins/cult_leader.png' } },
  },

  sacred_tree: {
    id: 'sacred_tree',
    label: { 'zh-CN': '御神木', en: 'Sacred Tree' },
    traits: ['plant'],
    startingLocations: ['shrine'],
    forbiddenLocations: ['school', 'city', 'hospital'],
    uneaseLimit: 4,
    goodwillAbilities: [],
    passiveAbilities: [A.goshinboku_passive_transfer],
    scriptCreationRules: [
      {
        id: 'sacred_tree_script_rule',
        summary: { 'zh-CN': '主人公在每个回合的主人公能力阶段，可以将该角色身上的1枚指示物移动至同一区域的另外1名角色身上。如果该角色带有无视友好的特性，剧作家必须在剧作家能力阶段使用此特性（强制）' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_御神木_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_御神木_01.png', color: '/assets/color_skins/goshinboku.png', dr: '/assets/danganronpa_skins/sacred_tree.png' } },
  },

  // ═══════════════════════════════════════════════════
  //  十周年角色 (tenth_anniversary) — 4 张
  // ═══════════════════════════════════════════════════

  servant: {
    id: 'servant',
    label: { 'zh-CN': '从者', en: 'Servant' },
    traits: ['adult', 'woman'],
    startingLocations: ['school', 'city'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.follower_gw2],
    passiveAbilities: [A.follower_passive_death],
    scriptCreationRules: [
      {
        id: 'servant_script_rule',
        summary: { 'zh-CN': '同一区域的大人物或大小姐移动时，无视自身移动并跟随那名角色移动（如果多名角色同时移动，由主人公选择跟随哪名角色）。同一区域的大人物或大小姐死亡时，代替那名角色死亡' },
      },
    ],
    source: { cardAssetPath: '/assets/color_skins/follower.png', alternateCardAssets: { new: '/assets/color_skins/follower.png', color: '/assets/color_skins/follower.png', dr: '/assets/danganronpa_skins/follower.png' } },
  },

  metaworld_denizen: {
    id: 'metaworld_denizen',
    label: { 'zh-CN': '上位存在', en: 'Metaworld Denizen' },
    traits: ['girl'],
    startingLocations: ['shrine'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.higher_being_gw2],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: { cardAssetPath: '/assets/color_skins/higher_being.png', alternateCardAssets: { new: '/assets/color_skins/higher_being.png', color: '/assets/color_skins/higher_being.png', dr: '/assets/danganronpa_skins/higher_being.png' } },
  },

  part_timer: {
    id: 'part_timer',
    label: { 'zh-CN': '临时工', en: 'Part-Timer' },
    traits: ['adult', 'man'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 1,
    goodwillAbilities: [],
    passiveAbilities: [A.temp_worker_passive_true],
    scriptCreationRules: [
      {
        id: 'part_timer_script_rule',
        summary: { 'zh-CN': '该卡牌的身份为平民（无视其原本所配置的身份）。' },
      },
    ],
    source: { cardAssetPath: '/assets/color_skins/temp_worker.png', alternateCardAssets: { new: '/assets/color_skins/temp_worker.png', color: '/assets/color_skins/temp_worker.png', dr: '/assets/danganronpa_skins/temp_worker.png' } },
  },

  part_timer_question: {
    id: 'part_timer_question',
    label: { 'zh-CN': '临时工？', en: 'Part-Timer?' },
    traits: ['girl'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.temp_worker_question_gw2],
    passiveAbilities: [A.temp_worker_question_passive_fake],
    scriptCreationRules: [
      {
        id: 'part_timer_question_script_rule',
        summary: { 'zh-CN': '该角色的身份以及事件当事人的配置与临时工的配置一致。' },
      },
    ],
    source: { cardAssetPath: '/assets/color_skins/temp_worker_alt.png', alternateCardAssets: { new: '/assets/color_skins/temp_worker_alt.png', color: '/assets/color_skins/temp_worker_alt.png', dr: '/assets/danganronpa_skins/temp_worker_alt_1.png' } },
  },

  // ═══════════════════════════════════════════════════
  //  PROMO 角色 — 3 张
  // ═══════════════════════════════════════════════════

  sister: {
    id: 'sister',
    label: { 'zh-CN': '妹妹', en: 'Little Sister' },
    traits: ['girl', 'sister'],
    startingLocations: ['shrine'],
    forbiddenLocations: [],
    uneaseLimit: 3,
    goodwillAbilities: [A.sister_gw6],
    passiveAbilities: [A.sister_passive_no_refusal],
    scriptCreationRules: [
      {
        id: 'sister_script_rule',
        summary: { 'zh-CN': '剧本制作时，该角色的身份不可以为有无视友好特性的身份' },
      },
    ],
    source: { cardAssetPath: '/assets/角色卡面/character_card-front_妹妹_01.png', alternateCardAssets: { new: '/assets/角色卡面/character_card-front_妹妹_01.png', color: '/assets/color_skins/sister.png', dr: '/assets/danganronpa_skins/sister.png' } },
  },

  sennin: {
    id: 'sennin',
    label: { 'zh-CN': '仙人', en: 'Sennin' },
    traits: ['adult', 'man'],
    startingLocations: ['shrine', 'hospital'],
    forbiddenLocations: [],
    uneaseLimit: 0, // X(由剧本规定), 事件判定外视为0
    goodwillAbilities: [A.immortal_gw1],
    passiveAbilities: [A.immortal_gw3],
    scriptCreationRules: [
      {
        id: 'sennin_script_rule',
        summary: { 'zh-CN': 'X为剧本规定的数值。在事件判定之外需要参照该角色的不安限度时，该角色的不安限度视为0。' },
      },
    ],
    source: { cardAssetPath: '/assets/color_skins/immortal.png', alternateCardAssets: { new: '/assets/color_skins/immortal.png', color: '/assets/color_skins/immortal.png', dr: '/assets/danganronpa_skins/immortal.png' } },
  },

  uploader: {
    id: 'uploader',
    label: { 'zh-CN': 'UP主', en: 'Uploader' },
    traits: ['man', 'student'],
    startingLocations: [],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [A.vlogger_gw2_move_paranoia],
    passiveAbilities: [A.vlogger_gw3_add_intrigue],
    scriptCreationRules: [
      {
        id: 'uploader_script_rule',
        summary: { 'zh-CN': '在每轮轮回第一次事件发生当天的回合结束阶段，往1名少年或少女身上设置1张Ex牌。在使用该角色的能力（包括友好能力）时，可以将放置有Ex牌的角色所在区域视为该角色所在区域。' },
      },
    ],
    source: { cardAssetPath: '/assets/color_skins/vlogger.png', alternateCardAssets: { new: '/assets/color_skins/vlogger.png', color: '/assets/color_skins/vlogger.png', dr: '/assets/danganronpa_skins/vlogger.png' } },
  },
};
