import type { AbilityRecord } from '../dictionary';

export const CHARACTER_ABILITIES: Record<string, AbilityRecord> = {
  // 01 男学生
  boy_student_gw1: {
    id: 'boy_student_gw1',
    goodwillCost: 2,
    label: { 'zh-CN': '男学生 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'boy_student_gw1_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点）移除同一区域另外1名角色身上的1枚不安指示物。' }
    }]
  },

  // 02 仙人
  immortal_gw1: {
    id: 'immortal_gw1',
    goodwillCost: 5,
    label: { 'zh-CN': '仙人 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'immortal_gw1_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）将该角色移动至任意版图或远方。随后，复活同一区域任意1具尸体，并在那张卡牌上放置X枚友好指示物。' }
    }]
  },
  immortal_gw3: {
    id: 'immortal_gw3',
    label: { 'zh-CN': '仙人 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'immortal_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（特殊）在事件判定之外需要参照该角色的不安临界时，该角色的不安临界视为0。结算该角色作为当事人的事件时，该角色可以视为位于原本所在区域顺时针相邻的版图。' }
    }]
  },

  // 03 UP主
  vlogger_gw2_move_paranoia: {
    id: 'vlogger_gw2_move_paranoia',
    goodwillCost: 3,
    label: { 'zh-CN': 'UP主 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'vlogger_gw2_move_paranoia_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）往同一区域另外1名角色身上放置1枚友好指示物，并移除1枚不安指示物。那之后，可以将那名角色身上的Ex牌转移到与那名角色位于同一区域、且非UP主的1名角色上。' }
    }]
  },
  vlogger_gw3_add_intrigue: {
    id: 'vlogger_gw3_add_intrigue',
    label: { 'zh-CN': 'UP主 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'vlogger_passive_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '在每轮轮回第一次事件发生当天的回合结束阶段，往1名少年或少女身上设置1张Ex牌。在使用该角色的能力时，可以将放置有Ex牌的角色所在区域视为该角色所在区域。' }
    }]
  },

  // 04 上位存在
  higher_being_gw2: {
    id: 'higher_being_gw2',
    goodwillCost: 3,
    label: { 'zh-CN': '上位存在 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'higher_being_gw2_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点，每轮限1次）往同一区域任意1名角色身上放置1枚希望/绝望指示物。如果该角色具有无视友好特性，并且身上已经放置了1枚或以上的友好指示物，则剧作家可以在剧作家能力阶段使用该能力。' }
    }]
  },
  higher_being_gw4: {
    id: 'higher_being_gw4',
    label: { 'zh-CN': '上位存在 友好能力保留' },
    timing: 'always',
    controller: 'system',
    rules: []
  },
  higher_being_passive_immunity: {
    id: 'higher_being_passive_immunity',
    label: { 'zh-CN': '上位存在 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: []
  },

  // 05 从者
  follower_gw2: {
    id: 'follower_gw2',
    goodwillCost: 4,
    label: { 'zh-CN': '从者 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'follower_gw2_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（4点，每轮限1次）选择场上的另外1名角色，本轮轮回中，将那名角色追加至该角色的特性适用对象中。' }
    }]
  },
  follower_gw3: {
    id: 'follower_gw3',
    label: { 'zh-CN': '从者 保留能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: []
  },
  follower_passive_death: {
    id: 'follower_passive_death',
    label: { 'zh-CN': '从者 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'follower_passive_death_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '同一区域的大小姐或大人物移动时，无视自身的移动并跟随那名角色移动（如果有多名角色同时移动，由主人公选择跟随哪名角色）。同一区域的大小姐或大人物死亡时，代替那些角色死亡。' }
    }]
  },

  // 06 临时工？
  temp_worker_question_gw2: {
    id: 'temp_worker_question_gw2',
    goodwillCost: 3,
    label: { 'zh-CN': '临时工？ 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'temp_worker_question_gw2_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点，每轮限1次）公开该角色的身份，并选择同一区域的1名角色放置2枚友好指示物。' }
    }]
  },
  temp_worker_question_gw4: {
    id: 'temp_worker_question_gw4',
    label: { 'zh-CN': '临时工？ 友好能力保留' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: []
  },
  temp_worker_question_passive_fake: {
    id: 'temp_worker_question_passive_fake',
    label: { 'zh-CN': '临时工？ 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'temp_worker_question_passive_fake_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '该角色的身份以及事件当事人的配置与临时工的配置一致。' }
    }]
  },

  // 07 临时工
  temp_worker_gw2: {
    id: 'temp_worker_gw2',
    label: { 'zh-CN': '临时工 友好能力保留' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: []
  },
  temp_worker_gw4: {
    id: 'temp_worker_gw4',
    label: { 'zh-CN': '临时工 友好能力保留' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: []
  },
  temp_worker_passive_true: {
    id: 'temp_worker_passive_true',
    label: { 'zh-CN': '临时工 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'temp_worker_passive_true_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '该卡牌的身份为平民。回合结束阶段，如果该角色身上合计有3枚或以上的任意指示物，则该角色死亡。回合开始阶段，如果该卡牌为死亡状态，则将临时工？在都市配置上场。' }
    }]
  },

  // 08 御神木
  goshinboku_passive_transfer: {
    id: 'goshinboku_passive_transfer',
    label: { 'zh-CN': '御神木 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'goshinboku_passive_transfer_rule',
      timing: 'protagonist_plan',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '每个回合的主人公能力阶段，主人公可以将该角色上的1枚指示物移动至同一区域另1名角色上。如果该角色具有无视友好特性，则剧作家必须在剧作家能力阶段使用该特性（强制）。' }
    }]
  },

  // 09 妹妹
  sister_gw6: {
    id: 'sister_gw6',
    goodwillCost: 5,
    label: { 'zh-CN': '妹妹 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'sister_gw6_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点）同一区域的1名成人使用1个友好能力，此时无视该成人的友好指示物数量。即使该成人带有无视友好特性，也不能拒绝使用那个能力。但能力依然受到次数限制。' }
    }]
  },
  sister_passive_no_refusal: {
    id: 'sister_passive_no_refusal',
    label: { 'zh-CN': '妹妹 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'sister_passive_no_refusal_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'secret_cause',
      summary: { 'zh-CN': '剧本制作时，该角色的身份不能为具有无视友好特性的身份。' }
    }]
  },

  // 10 教主
  cult_leader_gw3: {
    id: 'cult_leader_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '教主 友好能力 1' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'cult_leader_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）往另外1名不安达到或超出不安限度的角色身上放置1枚友好指示物。' }
    }]
  },
  cult_leader_gw4: {
    id: 'cult_leader_gw4',
    goodwillCost: 4,
    label: { 'zh-CN': '教主 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'cult_leader_gw4_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（4点，每轮限1次）公开同一区域另外1名不安达到或超出不安限度的角色的身份。' }
    }, {
      id: 'cult_leader_passive_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '该角色作为当事人的事件，按事件文字表述结算2次。' }
    }]
  },
  
  // 11 小女孩
  little_girl_gw1: {
    id: 'little_girl_gw1',
    goodwillCost: 1,
    label: { 'zh-CN': '小女孩 友好能力 1' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'little_girl_gw1_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（1点）本轮轮回中，该角色不再拥有禁行区域，可以移动至学校之外。' }
    }]
  },
  little_girl_gw3: {
    id: 'little_girl_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '小女孩 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'little_girl_gw3_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点，每轮限1次）将该角色移动至相邻的版图。' }
    }]
  },

  // 12 模仿者
  copycat_gw3: {
    id: 'copycat_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '模仿者 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'copycat_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）必须在第2轮轮回或之后才可使用。公开场上与该角色身份相同的所有角色名。即使带有无视友好特性，也不能拒绝使用该能力。' }
    }]
  },
  copycat_passive_role: {
    id: 'copycat_passive_role',
    label: { 'zh-CN': '模仿者 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'copycat_passive_role_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'secret_cause',
      summary: { 'zh-CN': '剧本制作时，为其分配与当前剧本中另1名角色相同的身份（无视剧本身份上限）。' }
    }]
  },

  // 13 黑猫
  black_cat_passive_intrigue: {
    id: 'black_cat_passive_intrigue',
    label: { 'zh-CN': '黑猫 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'black_cat_passive_intrigue_rule',
      timing: 'loop_setup',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '每轮轮回开始时，往神社放置1枚密谋指示物。' }
    }]
  },
  black_cat_passive_incident: {
    id: 'black_cat_passive_incident',
    label: { 'zh-CN': '黑猫 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'black_cat_passive_incident_rule',
      timing: 'incident_resolve',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '本角色作为当事人的事件，其效果变为「没有现象」（不进行额外宣言）。' }
    }]
  },

  // 14 军人
  soldier_gw2: {
    id: 'soldier_gw2',
    goodwillCost: 2,
    label: { 'zh-CN': '军人 友好能力 1' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'soldier_gw2_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点，每轮限1次）往同一区域任意1名角色身上放置2枚不安指示物。' }
    }]
  },
  soldier_gw5: {
    id: 'soldier_gw5',
    goodwillCost: 5,
    label: { 'zh-CN': '军人 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'soldier_gw5_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）本轮轮回中，主人公不会死亡。' }
    }]
  },

  // 15 转校生
  transfer_student_gw2: {
    id: 'transfer_student_gw2',
    goodwillCost: 2,
    label: { 'zh-CN': '转校生 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'transfer_student_gw2_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点）将同一区域另外1名角色身上的1枚密谋指示物替换为友好指示物。' }
    }]
  },
  transfer_student_passive_delay: {
    id: 'transfer_student_passive_delay',
    label: { 'zh-CN': '转校生 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'transfer_student_passive_delay_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '剧本制作时，指定该角色在每轮轮回的第几天登场。该角色不会在轮回准备时配置上场，而是在指定天数的回合开始阶段时配置上场。' }
    }]
  },

  // 16 教师
  teacher_gw3: {
    id: 'teacher_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '教师 友好能力 1' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'teacher_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）放置/移除同一区域1名学生身上的1枚不安指示物。' }
    }]
  },
  teacher_gw4: {
    id: 'teacher_gw4',
    goodwillCost: 4,
    label: { 'zh-CN': '教师 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'teacher_gw4_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（4点，每轮限1次）公开同一区域1名学生的身份。' }
    }]
  },

  // 17 A.I.
  ai_gw3: {
    id: 'ai_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': 'A.I. 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'ai_gw3_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点，每轮限1次）选择公开信息表中记述的1个事件，处理该事件的效果。处理时，当事人默认为A.I.，且一切需要剧作家决定的内容由队长代为决定（所选事件本身不视作已发生）。' }
    }]
  },
  ai_passive_bystander: {
    id: 'ai_passive_bystander',
    label: { 'zh-CN': 'A.I. 被动特性 1' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'ai_passive_bystander_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'secret_cause',
      summary: { 'zh-CN': '剧本制作时，该角色的身份不能为平民。' }
    }]
  },
  ai_passive_tokens: {
    id: 'ai_passive_tokens',
    label: { 'zh-CN': 'A.I. 被动特性 2' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'ai_passive_tokens_rule',
      timing: 'incident_check',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '仅在判定该角色作为当事人的事件（由不安触发的）是否发生时，该角色身上的所有指示物都视为不安指示物。' }
    }]
  },

  // 18 鉴识官
  forensic_scientist_gw2: {
    id: 'forensic_scientist_gw2',
    goodwillCost: 2,
    label: { 'zh-CN': '鉴识官 友好能力 1' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'forensic_scientist_gw2_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点，每轮限1次）选择同一区域另外2名角色，将1枚任意指示物在两者之间移动。' }
    }]
  },
  forensic_scientist_gw5: {
    id: 'forensic_scientist_gw5',
    goodwillCost: 5,
    label: { 'zh-CN': '鉴识官 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'forensic_scientist_gw5_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）公开任意1具尸体的身份。' }
    }]
  },

  // 19 幻想
  illusion_gw3: {
    id: 'illusion_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '幻想 友好能力 1' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'illusion_gw3_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点，每轮限1次）将同一区域任意1名角色移动至任意版图。' }
    }]
  },
  illusion_gw4: {
    id: 'illusion_gw4',
    goodwillCost: 4,
    label: { 'zh-CN': '幻想 友好能力 2' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'illusion_gw4_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（4点）本轮轮回中，将该角色从版图上移除。' }
    }]
  },
  illusion_passive_cards: {
    id: 'illusion_passive_cards',
    label: { 'zh-CN': '幻想 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'illusion_passive_cards_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '无法在该角色身上放置行动牌。在与该角色所在区域对应版图上放置的行动牌，同样会影响到该角色（可重复结算）。' }
    }]
  },

  // 20 学者
  scholar_gw3: {
    id: 'scholar_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '学者 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'scholar_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）移除该角色身上所有的指示物。随后，如果本局游戏使用Ex槽，选择Ex槽+1或-1。' }
    }]
  },
  scholar_passive_start: {
    id: 'scholar_passive_start',
    label: { 'zh-CN': '学者 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'scholar_passive_start_rule',
      timing: 'loop_setup',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '每轮轮回开始时，往该角色身上放置友好、不安、密谋指示物中的任意1枚。' }
    }]
  },

  // 21 手下
  henchman_gw3: {
    id: 'henchman_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '手下 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'henchman_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）本轮轮回中，该角色作为当事人的事件不会发生。' }
    }]
  },
  henchman_passive_start: {
    id: 'henchman_passive_start',
    label: { 'zh-CN': '手下 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'henchman_passive_start_rule',
      timing: 'loop_setup',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '每轮轮回开始前，由剧作家决定该角色所在的初始版图。' }
    }]
  },

  // 22 护士
  nurse_gw2: {
    id: 'nurse_gw2',
    goodwillCost: 2,
    label: { 'zh-CN': '护士 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'nurse_gw2_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点）移除同一区域不安达到或超出不安限度的另外1名角色身上的1枚不安指示物。即使带有无视友好特性，也不能拒绝使用该能力。' }
    }]
  },

  // 23 大人物
  rich_man_gw4: {
    id: 'rich_man_gw4',
    goodwillCost: 5,
    label: { 'zh-CN': '大人物 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'rich_man_gw4_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）公开领地中另外1名角色的身份。' }
    }]
  },
  rich_man_passive_domain: {
    id: 'rich_man_passive_domain',
    label: { 'zh-CN': '大人物 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'rich_man_passive_domain_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '剧本制作时，指定1块版图作为领地。剧作家在使用该角色的能力时，可以将领地视作该角色所在区域。' }
    }]
  },

  // 24 媒体人
  journalist_gw2_paranoia: {
    id: 'journalist_gw2_paranoia',
    goodwillCost: 2,
    label: { 'zh-CN': '媒体人 友好能力 1' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'journalist_gw2_paranoia_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点）往另外1名角色身上放置1枚不安指示物。' }
    }]
  },
  journalist_gw2_intrigue: {
    id: 'journalist_gw2_intrigue',
    goodwillCost: 2,
    label: { 'zh-CN': '媒体人 友好能力 2' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'journalist_gw2_intrigue_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点）往同一区域任意1名角色身上，或该角色所在版图上放置1枚密谋指示物。' }
    }]
  },

  // 25 偶像
  pop_idol_gw3: {
    id: 'pop_idol_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '偶像 友好能力 1' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'pop_idol_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）移除同一区域另外1名角色身上的1枚不安指示物。' }
    }]
  },
  pop_idol_gw4: {
    id: 'pop_idol_gw4',
    goodwillCost: 4,
    label: { 'zh-CN': '偶像 友好能力 2' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'pop_idol_gw4_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（4点）往同一区域另外1名角色身上放置1枚友好指示物。' }
    }]
  },

  // 26 神灵
  deity_gw3: {
    id: 'deity_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '神灵 友好能力 1' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'deity_gw3_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点，每轮限1次）公开1个事件的当事人。' }
    }]
  },
  deity_gw5: {
    id: 'deity_gw5',
    goodwillCost: 5,
    label: { 'zh-CN': '神灵 友好能力 2' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'deity_gw5_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点）移除同一区域任意1名角色身上，或者该角色所在版图上的1枚密谋指示物。' }
    }]
  },
  deity_passive_delay: {
    id: 'deity_passive_delay',
    label: { 'zh-CN': '神灵 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'deity_passive_delay_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'public_result',
      summary: { 'zh-CN': '剧本制作时，指定该角色在第几轮轮回登场。在所指定的轮回与那之后，该角色才会在轮回准备时配置上场。' }
    }]
  },

  // 27 异界人
  alien_gw4: {
    id: 'alien_gw4',
    goodwillCost: 4,
    label: { 'zh-CN': '异界人 友好能力 1' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'alien_gw4_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（4点，每轮限1次）使同一区域另外1名角色死亡。' }
    }]
  },
  alien_gw5: {
    id: 'alien_gw5',
    goodwillCost: 5,
    label: { 'zh-CN': '异界人 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'alien_gw5_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）使同一区域任意1具尸体复活。' }
    }]
  },

  // 28 局外人
  outsider_gw3: {
    id: 'outsider_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '局外人 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'outsider_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）必须在第2轮轮回或之后才可使用。公开该角色身份。即使具有无视友好特性，也不能拒绝使用该能力。' }
    }]
  },
  outsider_passive_role: {
    id: 'outsider_passive_role',
    label: { 'zh-CN': '局外人 被动特性' },
    timing: 'always',
    controller: 'system',
    rules: [{
      id: 'outsider_passive_role_rule',
      timing: 'always',
      mandatory: true,
      visibility: 'secret_cause',
      summary: { 'zh-CN': '剧本制作时，为其分配当前模组中存在、并且剧本所选规则中未带有的某一身份。' }
    }]
  },

  // 29 班长
  class_rep_gw2: {
    id: 'class_rep_gw2',
    goodwillCost: 2,
    label: { 'zh-CN': '班长 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'class_rep_gw2_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点，每轮限1次）必须存在属于队长、每轮限1次且已使用完毕的行动牌时才可以使用。队长选择那之中的任意1张牌收回至自己手牌。' }
    }]
  },

  // 30 住院患者 (无能力)

  // 30.5 职员
  office_worker_gw3: {
    id: 'office_worker_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '职员 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'office_worker_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）公开该角色的身份。' }
    }]
  },

  // 31 刑警
  police_gw4: {
    id: 'police_gw4',
    goodwillCost: 4,
    label: { 'zh-CN': '刑警 友好能力 1' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'police_gw4_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（4点，每轮限1次）公开1个本轮已发生事件的当事人。' }
    }]
  },
  police_gw5: {
    id: 'police_gw5',
    goodwillCost: 5,
    label: { 'zh-CN': '刑警 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'police_gw5_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）往同一区域任意1名角色身上放置1枚护卫指示物。放置护卫指示物的角色死亡时，移除护卫指示物代替其死亡处理。' }
    }]
  },

  // 32 巫女
  miko_gw3: {
    id: 'miko_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '巫女 友好能力 1' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'miko_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）必须位于神社才可以使用。移除神社的1枚密谋指示物。' }
    }]
  },
  miko_gw5: {
    id: 'miko_gw5',
    goodwillCost: 5,
    label: { 'zh-CN': '巫女 友好能力 2' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'miko_gw5_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）公开同一区域任意1名角色的身份。' }
    }]
  },

  // 33 医生
  doctor_gw2: {
    id: 'doctor_gw2',
    goodwillCost: 2,
    label: { 'zh-CN': '医生 友好能力 1' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'doctor_gw2_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（2点）放置/移除同一区域另外1名角色身上的1枚不安指示物。如果本角色的身份带有无视友好的特性，并且身上已经放置了2枚或以上的友好指示物，则剧作家可以在剧作家能力阶段使用该能力。' }
    }]
  },
  doctor_gw3: {
    id: 'doctor_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '医生 友好能力 2' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'doctor_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）本轮轮回中，住院患者不再拥有禁行区域，可以移动至医院之外。' }
    }]
  },

  // 34 住院患者 (无能力),

  // 35 大小姐
  young_lady_gw3: {
    id: 'young_lady_gw3',
    goodwillCost: 3,
    label: { 'zh-CN': '大小姐 友好能力' },
    timing: 'goodwill_window',
    controller: 'leader',
    rules: [{
      id: 'young_lady_gw3_rule',
      timing: 'goodwill_window',
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（3点）必须位于学校或都市才可以使用，往同一区域任意1名角色身上放置1枚友好指示物。' }
    }]
  },

  // 情报商
  informant_gw5: {
    id: 'informant_gw5',
    goodwillCost: 5,
    label: { 'zh-CN': '情报商 友好能力' },
    timing: 'goodwill_window',
    oncePerLoop: true,
    controller: 'leader',
    rules: [{
      id: 'informant_gw5_rule',
      timing: 'goodwill_window',
      oncePerLoop: true,
      mandatory: false,
      visibility: 'public_result',
      summary: { 'zh-CN': '（5点，每轮限1次）声明1条规则X的名称。剧作家从当前剧本所选用的规则X中，公开1条主人公未声明的规则X。' }
    }]
  },
};
